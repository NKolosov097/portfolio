import { randomUUID } from 'node:crypto'

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  acceptContactSubmission,
  hashRateIdentity,
} from '@/home-sections/Contact/services/submission-policy'
import {
  claimContactNotification,
  markNotificationFailed,
  markNotificationSent,
} from '@/home-sections/Contact/services/notification-store'
import { deliverClaimedNotification } from '@/home-sections/Contact/services/notify-owner'
import { sendMail } from '@/lib/mail'
import { seedFeedback } from '../../scripts/seed-feedback'
import * as databaseSchema from '@/db/schema'
import { contactSubmissionKeys } from '@/db/schema'
import { saveContactMessageInTransaction } from '@/home-sections/Contact/services/save-message'

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required')
const parsedUrl = new URL(databaseUrl)
if (parsedUrl.hostname !== '127.0.0.1' || !parsedUrl.pathname.includes('feedback_test')) {
  throw new Error('Integration tests require the isolated local feedback_test database')
}

const pool = new Pool({ connectionString: databaseUrl, max: 12 })
const database = drizzle(pool, { schema: databaseSchema })
const run = randomUUID()
const secret = 'integration-contact-rate-secret'
const usedEmails = new Set<string>()
const usedIdentities = new Set<string>()
const email = (suffix: string) => {
  const value = `${run}-${suffix}@example.test`
  usedEmails.add(value)
  return value
}
const submission = (suffix: string, overrides = {}) => ({
  submissionId: randomUUID(),
  name: `Name ${suffix}`,
  email: email(suffix),
  company: `Company ${suffix}`,
  profession: `Profession ${suffix}`,
  message: `Message ${suffix}`,
  website: '',
  ...overrides,
})
const accept = (input: ReturnType<typeof submission>, identity: string) => {
  usedIdentities.add(identity)
  usedEmails.add(input.email.trim().toLowerCase())
  return acceptContactSubmission(input, identity, { pool, rateLimitSecret: secret })
}

beforeAll(async () => {
  await migrate(database, { migrationsFolder: 'drizzle' })
  await migrate(database, { migrationsFolder: 'drizzle' })
})

afterAll(async () => {
  const hashes = [
    ...[...usedIdentities].map((value) => hashRateIdentity(secret, 'identity', value)),
    ...[...usedEmails].map((value) => hashRateIdentity(secret, 'email', value)),
  ]
  if (hashes.length)
    await pool.query(`DELETE FROM contact_rate_limits WHERE value_hash = ANY($1::text[])`, [hashes])
  const keys = await pool.query(`SELECT submission_id FROM messages WHERE email LIKE $1`, [
    `${run}-%`,
  ])
  await pool.query(`DELETE FROM messages WHERE email LIKE $1`, [`${run}-%`])
  await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`${run}-%`])
  if (keys.rows.length)
    await pool.query(`DELETE FROM contact_submission_keys WHERE submission_id = ANY($1::uuid[])`, [
      keys.rows.map((row) => row.submission_id),
    ])
  await pool.end()
})

describe('contact persistence on PostgreSQL', () => {
  it('applies migrations to a fresh isolated schema and no-ops on the second run', async () => {
    const schemaName = `contact_test_${run.replaceAll('-', '')}`
    await pool.query(`CREATE SCHEMA "${schemaName}"`)
    const isolated = new Pool({
      connectionString: databaseUrl,
      max: 1,
      options: `-c search_path=${schemaName}`,
    })
    try {
      await migrate(drizzle(isolated), {
        migrationsFolder: 'drizzle',
        migrationsSchema: schemaName,
      })
      await migrate(drizzle(isolated), {
        migrationsFolder: 'drizzle',
        migrationsSchema: schemaName,
      })
      const tables = await isolated.query(
        `SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_name IN ('users', 'messages', 'contact_submission_keys', 'contact_rate_limits', 'contact_notification_jobs')`,
        [schemaName],
      )
      expect(tables.rows[0].count).toBe(5)
    } finally {
      await isolated.end()
      await pool.query(`DROP SCHEMA "${schemaName}" CASCADE`)
    }
  })

  it('seeds the synthetic record idempotently without pending mail', async () => {
    await seedFeedback(databaseUrl)
    await seedFeedback(databaseUrl)
    const seeded = await pool.query(
      `SELECT count(*)::int AS count, min(notification_state)::text AS state FROM messages WHERE submission_id = $1`,
      ['00000000-0000-4000-8000-000000000001'],
    )
    expect(seeded.rows[0]).toEqual({ count: 1, state: 'sent' })
  })

  it('stores parallel sender snapshots for one normalized email', async () => {
    const first = submission('same', { name: 'First', email: ` ${email('shared').toUpperCase()} ` })
    const second = submission('same', { name: 'Second', email: email('shared') })
    const results = await Promise.all([
      accept(first, `test:${run}:same-1`),
      accept(second, `test:${run}:same-2`),
    ])

    expect(results.every((result) => result.kind === 'accepted')).toBe(true)
    const users = await pool.query(`SELECT count(*)::int AS count FROM users WHERE email = $1`, [
      email('shared'),
    ])
    const messages = await pool.query(`SELECT name FROM messages WHERE email = $1 ORDER BY name`, [
      email('shared'),
    ])
    expect(users.rows[0].count).toBe(1)
    expect(messages.rows.map((row) => row.name)).toEqual(['First', 'Second'])
  })

  it('rolls back a user update when the message insert violates a database check', async () => {
    const valid = submission('rollback', { name: 'Original' })
    await accept(valid, `test:${run}:rollback-1`)

    const invalidUpdate = submission('rollback2', {
      email: valid.email,
      name: 'Must roll back',
      message: 'x'.repeat(5_001),
    })
    await expect(
      database.transaction(async (transaction) => {
        await transaction
          .insert(contactSubmissionKeys)
          .values({ submissionId: invalidUpdate.submissionId })
        await saveContactMessageInTransaction(transaction, invalidUpdate)
      }),
    ).rejects.toThrow()
    const user = await pool.query(`SELECT name FROM users WHERE email = $1`, [valid.email])
    expect(user.rows[0].name).toBe('Original')

    const newSender = submission('rollback-new', { message: 'x'.repeat(5_001) })
    await expect(
      database.transaction(async (transaction) => {
        await transaction
          .insert(contactSubmissionKeys)
          .values({ submissionId: newSender.submissionId })
        await saveContactMessageInTransaction(transaction, newSender)
      }),
    ).rejects.toThrow()
    const missingUser = await pool.query(
      `SELECT count(*)::int AS count FROM users WHERE email = $1`,
      [newSender.email],
    )
    expect(missingUser.rows[0].count).toBe(0)
  })

  it('serializes 20 identical submission IDs before quota is consumed', async () => {
    const input = submission('duplicate')
    const results = await Promise.all(
      Array.from({ length: 20 }, () => accept(input, `test:${run}:duplicate`)),
    )

    expect(results.filter((result) => result.kind === 'accepted')).toHaveLength(1)
    expect(results.filter((result) => result.kind === 'replay')).toHaveLength(19)
    const messages = await pool.query(
      `SELECT count(*)::int AS count FROM messages WHERE submission_id = $1`,
      [input.submissionId],
    )
    const counters = await pool.query(
      `SELECT count FROM contact_rate_limits WHERE value_hash = $1`,
      [hashRateIdentity(secret, 'identity', `test:${run}:duplicate`)],
    )
    expect(messages.rows[0].count).toBe(1)
    expect(counters.rows[0].count).toBe(1)
    const stored = results.find((result) => result.kind === 'accepted')
    if (!stored || stored.kind !== 'accepted') throw new Error('accepted result missing')
    const claims = await Promise.all(
      Array.from({ length: 20 }, () => claimContactNotification(pool, stored.messageId)),
    )
    expect(claims.filter(Boolean)).toHaveLength(1)
  })

  it('rejects a changed payload that reuses an accepted ID', async () => {
    const input = submission('mismatch')
    await accept(input, `test:${run}:mismatch`)
    await expect(
      accept({ ...input, message: 'A different message' }, `test:${run}:mismatch`),
    ).resolves.toEqual(expect.objectContaining({ kind: 'mismatch' }))
    const counter = await pool.query(
      `SELECT count FROM contact_rate_limits WHERE value_hash = $1`,
      [hashRateIdentity(secret, 'identity', `test:${run}:mismatch`)],
    )
    expect(counter.rows[0].count).toBe(1)
  })

  it('admits exactly five parallel identities per fixed window and resets after expiry', async () => {
    const identity = `test:${run}:limited`
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, index) => accept(submission(`limit-${index}`), identity)),
    )
    expect(results.filter((result) => result.kind === 'accepted')).toHaveLength(5)
    expect(results.filter((result) => result.kind === 'rate-limited')).toHaveLength(1)

    await pool.query(
      `UPDATE contact_rate_limits SET expires_at = clock_timestamp() - interval '1 second' WHERE value_hash = $1`,
      [hashRateIdentity(secret, 'identity', identity)],
    )
    await expect(accept(submission('limit-reset'), identity)).resolves.toEqual(
      expect.objectContaining({ kind: 'accepted' }),
    )
  })

  it('allows only one worker to claim a pending notification and recovers failed work', async () => {
    const input = submission('claim')
    const accepted = await accept(input, `test:${run}:claim`)
    if (accepted.kind !== 'accepted') throw new Error('setup did not persist a message')

    const claims = await Promise.all(
      Array.from({ length: 8 }, () => claimContactNotification(pool, accepted.messageId)),
    )
    const claimed = claims.filter((claim) => claim !== null)
    expect(claimed).toHaveLength(1)
    await markNotificationFailed(
      pool,
      claimed[0]!.id,
      claimed[0]!.notificationClaimToken,
      'timeout',
      1,
      new Date(Date.now() - 31_000),
    )
    const retry = await claimContactNotification(pool, accepted.messageId)
    expect(retry?.id).toBe(accepted.messageId)
    expect(await markNotificationSent(pool, retry!.id, retry!.notificationClaimToken)).toBe(true)
  })

  it('reclaims an expired sending lease once', async () => {
    const accepted = await accept(submission('expired-lease'), `test:${run}:expired-lease`)
    if (accepted.kind !== 'accepted') throw new Error('setup did not persist a message')
    const first = await claimContactNotification(pool, accepted.messageId)
    expect(first).not.toBeNull()
    await pool.query(
      `UPDATE messages SET notification_lease_until = clock_timestamp() - interval '1 second' WHERE id = $1`,
      [accepted.messageId],
    )

    const claims = await Promise.all(
      Array.from({ length: 5 }, () => claimContactNotification(pool, accepted.messageId)),
    )
    expect(claims.filter(Boolean)).toHaveLength(1)
  })

  it('bounds pool acquisition when the only connection is held', async () => {
    const constrained = new Pool({
      connectionString: databaseUrl,
      max: 1,
      connectionTimeoutMillis: 2_000,
    })
    const held = await constrained.connect()
    const started = Date.now()
    try {
      await expect(
        acceptContactSubmission(submission('pool-timeout'), `test:${run}:pool-timeout`, {
          pool: constrained,
          rateLimitSecret: secret,
        }),
      ).rejects.toThrow()
      expect(Date.now() - started).toBeLessThan(3_500)
    } finally {
      held.release()
      await constrained.end()
    }
  })

  it('recovers a failed notification through Mailpit without another database message', async () => {
    const input = submission('mailpit', { name: `Mailpit ${run}`, message: `<b>hello</b>&"'` })
    const accepted = await accept(input, `test:${run}:mailpit`)
    if (accepted.kind !== 'accepted') throw new Error('setup did not persist a message')
    const failedClaim = await claimContactNotification(pool, accepted.messageId)
    if (!failedClaim) throw new Error('setup did not claim notification')
    await deliverClaimedNotification(failedClaim, {
      ownerEmail: 'owner@example.test',
      send: async () => ({ ok: false, code: 'transport_failed' }),
      markSent: (id, token) => markNotificationSent(pool, id, token),
      markFailed: (id, token, code, attempts) =>
        markNotificationFailed(pool, id, token, code, attempts, new Date(Date.now() - 31_000)),
    })

    process.env.SMTP_SERVER_HOST = '127.0.0.1'
    process.env.SMTP_SERVER_PORT ||= '11025'
    process.env.SMTP_SERVER_SECURE = 'false'
    process.env.SMTP_FROM = 'portfolio@example.test'
    delete process.env.SMTP_SERVER_USERNAME
    delete process.env.SMTP_SERVER_PASSWORD
    const retry = await claimContactNotification(pool, accepted.messageId)
    if (!retry) throw new Error('failed notification was not retryable')
    await expect(
      deliverClaimedNotification(retry, {
        ownerEmail: 'owner@example.test',
        send: sendMail,
        markSent: (id, token) => markNotificationSent(pool, id, token),
        markFailed: (id, token, code, attempts) =>
          markNotificationFailed(pool, id, token, code, attempts),
      }),
    ).resolves.toEqual({ status: 'sent' })

    const mailpitApi = process.env.MAILPIT_API_URL ?? 'http://127.0.0.1:18025'
    const mailpitUrl = new URL(mailpitApi)
    if (!['127.0.0.1', 'localhost', '::1'].includes(mailpitUrl.hostname)) {
      throw new Error('MAILPIT_API_URL must target the isolated loopback sink')
    }
    const response = await fetch(`${mailpitApi}/api/v1/messages`)
    const mailbox = (await response.json()) as {
      messages: Array<{ ID: string; Subject: string; To: Array<{ Address: string }> }>
    }
    const mail = mailbox.messages.find(
      (item) => item.Subject === `Portfolio contact from Mailpit ${run}`,
    )
    expect(mail?.To.map((recipient) => recipient.Address)).toEqual(['owner@example.test'])
    const detailResponse = await fetch(`${mailpitApi}/api/v1/message/${mail!.ID}`)
    const detail = (await detailResponse.json()) as {
      HTML: string
      ReplyTo: Array<{ Address: string }>
      Attachments: unknown[]
    }
    expect(detail.ReplyTo.map((recipient) => recipient.Address)).toEqual([input.email])
    expect(detail.HTML).toContain('&lt;b&gt;hello&lt;/b&gt;&amp;&quot;&#39;')
    expect(detail.Attachments).toHaveLength(0)
    const count = await pool.query(
      `SELECT count(*)::int AS count FROM messages WHERE submission_id = $1`,
      [input.submissionId],
    )
    expect(count.rows[0].count).toBe(1)
    await fetch(`${mailpitApi}/api/v1/message/${mail!.ID}`, { method: 'DELETE' })
  })
})

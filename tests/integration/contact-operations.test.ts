import { randomUUID } from 'node:crypto'

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import * as databaseSchema from '@/db/schema'
import {
  acquireNotificationJob,
  completeNotificationJob,
  getContactOperationalStatus,
  requeueTerminalNotification,
  recoverExhaustedNotifications,
} from '@/home-sections/Contact/services/notification-operations'

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required')
const parsedUrl = new URL(databaseUrl)
if (parsedUrl.hostname !== '127.0.0.1' || !parsedUrl.pathname.includes('feedback_test')) {
  throw new Error('Integration tests require the isolated local feedback_test database')
}

const pool = new Pool({ connectionString: databaseUrl, max: 8 })
const database = drizzle(pool, { schema: databaseSchema })
const terminalSubmissionId = randomUUID()
const terminalEmail = `terminal-${terminalSubmissionId}@example.test`

beforeAll(async () => migrate(database, { migrationsFolder: 'drizzle' }))

afterAll(async () => {
  await pool.query(`DELETE FROM messages WHERE submission_id = $1`, [terminalSubmissionId])
  await pool.query(`DELETE FROM users WHERE email = $1`, [terminalEmail])
  await pool.query(`DELETE FROM contact_submission_keys WHERE submission_id = $1`, [
    terminalSubmissionId,
  ])
  await pool.query(`DELETE FROM contact_notification_jobs WHERE job_name = 'owner-email'`)
  await pool.end()
})

describe('contact notification operations', () => {
  it('leases one retry run at a time and protects completion with its token', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 6 }, () => acquireNotificationJob(pool, 70)),
    )
    const tokens = attempts.filter((value): value is string => value !== null)
    expect(tokens).toHaveLength(1)

    expect(
      await completeNotificationJob(pool, randomUUID(), {
        status: 'completed',
        claimed: 0,
        sent: 0,
        requeued: 0,
        lostLease: 0,
      }),
    ).toBe(false)
    expect(
      await completeNotificationJob(pool, tokens[0], {
        status: 'completed',
        claimed: 2,
        sent: 1,
        requeued: 1,
        lostLease: 0,
      }),
    ).toBe(true)
    expect(await acquireNotificationJob(pool, 70)).toEqual(expect.any(String))
  })

  it('reclaims an expired run and exposes aggregate operational status only', async () => {
    await pool.query(
      `UPDATE contact_notification_jobs SET lease_until = clock_timestamp() - interval '1 second' WHERE job_name = 'owner-email'`,
    )
    const token = await acquireNotificationJob(pool, 70)
    expect(token).toEqual(expect.any(String))
    await completeNotificationJob(pool, token!, {
      status: 'completed',
      claimed: 3,
      sent: 2,
      requeued: 1,
      lostLease: 0,
    })

    const status = await getContactOperationalStatus(pool)
    expect(status.database).toBe('ok')
    expect(status.lastRun).toMatchObject({ status: 'completed', claimed: 3, sent: 2 })
    expect(status.notifications).toEqual(
      expect.objectContaining({ due: expect.any(Number), terminal: expect.any(Number) }),
    )
    expect(JSON.stringify(status)).not.toContain('@')
  })

  it('moves an exhausted interrupted delivery to a terminal failed state', async () => {
    const user = await pool.query<{ id: number }>(
      `INSERT INTO users (name, email) VALUES ('Terminal test', $1) RETURNING id`,
      [terminalEmail],
    )
    await pool.query(`INSERT INTO contact_submission_keys (submission_id) VALUES ($1)`, [
      terminalSubmissionId,
    ])
    await pool.query(
      `INSERT INTO messages (
        submission_id, author_id, name, email, content, notification_state,
        notification_attempts, notification_lease_until, notification_claim_token
      ) VALUES ($1, $2, 'Terminal test', $3, 'Synthetic terminal message', 'sending', 5,
        clock_timestamp() - interval '1 second', $4)`,
      [terminalSubmissionId, user.rows[0].id, terminalEmail, randomUUID()],
    )

    expect(await recoverExhaustedNotifications(pool)).toBeGreaterThanOrEqual(1)
    const result = await pool.query(
      `SELECT notification_state, notification_claim_token, notification_lease_until
       FROM messages WHERE submission_id = $1`,
      [terminalSubmissionId],
    )
    expect(result.rows[0]).toEqual({
      notification_state: 'failed',
      notification_claim_token: null,
      notification_lease_until: null,
    })

    expect(await requeueTerminalNotification(pool, terminalSubmissionId)).toBe(true)
    expect(await requeueTerminalNotification(pool, terminalSubmissionId)).toBe(false)
    const requeued = await pool.query(
      `SELECT notification_state, notification_attempts, notification_error_code
       FROM messages WHERE submission_id = $1`,
      [terminalSubmissionId],
    )
    expect(requeued.rows[0]).toEqual({
      notification_state: 'pending',
      notification_attempts: 0,
      notification_error_code: null,
    })
  })
})

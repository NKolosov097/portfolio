import 'server-only'

import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'

import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'

import * as schema from '@/db/schema'
import { contactRateLimits, contactSubmissionKeys, messages } from '@/db/schema'
import { getContactPool } from '@/db/client'
import { contactSubmissionSchema } from '@/home-sections/Contact/schemas/send-message.schema'
import { saveContactMessageInTransaction } from '@/home-sections/Contact/services/save-message'
import type { ValidatedContactSubmission } from '@/home-sections/Contact/types/submission.type'

export type SubmissionAcceptance =
  | { kind: 'accepted'; messageId: number }
  | { kind: 'replay'; messageId: number }
  | { kind: 'mismatch' }
  | { kind: 'rate-limited' }

class RateLimitedError extends Error {}

export const hashRateIdentity = (secret: string, scope: string, value: string) =>
  createHmac('sha256', secret).update(`${scope}:${value}`).digest('hex')

export const resolveTrustedIdentity = (
  headers: Headers,
  environment: Partial<
    Pick<NodeJS.ProcessEnv, 'NODE_ENV' | 'CONTACT_TRUSTED_IP_HEADER'>
  > = process.env,
) => {
  const headerName = environment.CONTACT_TRUSTED_IP_HEADER?.trim().toLowerCase()
  if (!headerName) return environment.NODE_ENV === 'production' ? null : '127.0.0.1'
  const value = headers.get(headerName)?.trim()
  return value && isIP(value) !== 0 ? value : null
}

const consumeRateLimit = async (
  transaction: Parameters<
    Parameters<ReturnType<typeof drizzle<typeof schema>>['transaction']>[0]
  >[0],
  scope: 'identity' | 'email',
  valueHash: string,
  limit: number,
) => {
  const result = await transaction.execute(sql`
    INSERT INTO ${contactRateLimits} (scope, value_hash, count, expires_at)
    VALUES (${scope}, ${valueHash}, 1, clock_timestamp() + interval '10 minutes')
    ON CONFLICT (scope, value_hash) DO UPDATE SET
      count = CASE WHEN ${contactRateLimits.expiresAt} <= clock_timestamp() THEN 1 ELSE ${contactRateLimits.count} + 1 END,
      expires_at = CASE WHEN ${contactRateLimits.expiresAt} <= clock_timestamp() THEN clock_timestamp() + interval '10 minutes' ELSE ${contactRateLimits.expiresAt} END
    WHERE ${contactRateLimits.count} < ${limit} OR ${contactRateLimits.expiresAt} <= clock_timestamp()
    RETURNING count
  `)
  return result.rows.length === 1
}

const samePayload = (row: typeof messages.$inferSelect, input: ValidatedContactSubmission) =>
  row.name === input.name &&
  row.email === input.email &&
  row.company === input.company &&
  row.profession === input.profession &&
  row.content === input.message

export const acceptContactSubmission = async (
  rawInput: ValidatedContactSubmission,
  trustedIdentity: string,
  dependencies: { pool?: Pool; rateLimitSecret?: string; emailLimit?: number } = {},
): Promise<SubmissionAcceptance> => {
  const input = contactSubmissionSchema.parse(rawInput)
  const secret = dependencies.rateLimitSecret ?? process.env.CONTACT_RATE_LIMIT_SECRET
  if (!secret) throw new Error('contact persistence unavailable')
  const emailLimit = dependencies.emailLimit ?? Number(process.env.CONTACT_EMAIL_RATE_LIMIT ?? '20')
  if (!Number.isInteger(emailLimit) || emailLimit <= 5 || emailLimit > 1_000)
    throw new Error('contact persistence unavailable')
  const database = drizzle(dependencies.pool ?? getContactPool(), { schema })

  try {
    return await database.transaction(async (transaction) => {
      const [claimed] = await transaction
        .insert(contactSubmissionKeys)
        .values({ submissionId: input.submissionId })
        .onConflictDoNothing()
        .returning({ submissionId: contactSubmissionKeys.submissionId })

      if (!claimed) {
        const [stored] = await transaction
          .select()
          .from(messages)
          .where(eq(messages.submissionId, input.submissionId))
          .limit(1)
        if (!stored) throw new Error('contact persistence unavailable')
        return samePayload(stored, input)
          ? { kind: 'replay', messageId: stored.id }
          : { kind: 'mismatch' }
      }

      const identityHash = hashRateIdentity(secret, 'identity', trustedIdentity)
      const emailHash = hashRateIdentity(secret, 'email', input.email)
      if (!(await consumeRateLimit(transaction, 'identity', identityHash, 5)))
        throw new RateLimitedError()
      if (!(await consumeRateLimit(transaction, 'email', emailHash, emailLimit)))
        throw new RateLimitedError()

      const messageId = await saveContactMessageInTransaction(transaction, input)
      await transaction.execute(sql`DELETE FROM ${contactRateLimits} WHERE ctid IN (
        SELECT ctid FROM ${contactRateLimits} WHERE ${contactRateLimits.expiresAt} <= clock_timestamp() LIMIT 100
      )`)
      return { kind: 'accepted', messageId }
    })
  } catch (error) {
    if (error instanceof RateLimitedError) return { kind: 'rate-limited' }
    throw error
  }
}

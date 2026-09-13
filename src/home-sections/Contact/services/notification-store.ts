import 'server-only'

import { randomUUID } from 'node:crypto'

import type { Pool } from 'pg'

import type { MailFailureCode } from '@/lib/mail'
import type { ClaimedContactNotification } from '@/home-sections/Contact/services/notify-owner'

const MAX_NOTIFICATION_ATTEMPTS = 5

export const claimContactNotification = async (
  pool: Pool,
  messageId?: number,
): Promise<ClaimedContactNotification | null> => {
  const token = randomUUID()
  const result = await pool.query<ClaimedContactNotification>({
    text: `WITH candidate AS (
      SELECT id FROM messages
      WHERE ($1::integer IS NULL OR id = $1)
        AND notification_attempts < $2
        AND notification_next_attempt_at <= clock_timestamp()
        AND (notification_state IN ('pending', 'failed') OR (notification_state = 'sending' AND notification_lease_until <= clock_timestamp()))
      ORDER BY notification_next_attempt_at, id
      FOR UPDATE SKIP LOCKED LIMIT 1
    )
    UPDATE messages AS message SET
      notification_state = 'sending',
      notification_attempts = message.notification_attempts + 1,
      notification_lease_until = clock_timestamp() + interval '30 seconds',
      notification_claim_token = $3,
      notification_error_code = NULL
    FROM candidate WHERE message.id = candidate.id
    RETURNING message.id, message.submission_id AS "submissionId", message.name, message.email,
      message.company, message.profession, message.content,
      message.notification_attempts AS "notificationAttempts",
      message.notification_claim_token AS "notificationClaimToken"`,
    values: [messageId ?? null, MAX_NOTIFICATION_ATTEMPTS, token],
  })
  return result.rows[0] ?? null
}

export const markNotificationSent = async (pool: Pool, messageId: number, token: string) => {
  const result = await pool.query(
    `UPDATE messages SET notification_state = 'sent', notification_sent_at = clock_timestamp(),
      notification_lease_until = NULL, notification_claim_token = NULL, notification_error_code = NULL
     WHERE id = $1 AND notification_state = 'sending' AND notification_claim_token = $2 RETURNING id`,
    [messageId, token],
  )
  return result.rowCount === 1
}

export const markNotificationFailed = async (
  pool: Pool,
  messageId: number,
  token: string,
  code: MailFailureCode,
  attempts: number,
  now = new Date(),
) => {
  const delaySeconds = Math.min(3_600, 30 * 2 ** Math.max(0, attempts - 1))
  const result = await pool.query(
    `UPDATE messages SET notification_state = 'failed', notification_next_attempt_at = $4::timestamptz + ($5::integer * interval '1 second'),
      notification_lease_until = NULL, notification_claim_token = NULL, notification_error_code = $3
     WHERE id = $1 AND notification_state = 'sending' AND notification_claim_token = $2 RETURNING id`,
    [messageId, token, code, now, delaySeconds],
  )
  return result.rowCount === 1
}

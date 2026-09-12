import 'server-only'

import { randomUUID } from 'node:crypto'

import type { Pool } from 'pg'

const JOB_NAME = 'owner-email'

interface CompletedNotificationRun {
  status: 'completed' | 'failed'
  claimed: number
  sent: number
  requeued: number
  lostLease: number
}

export const acquireNotificationJob = async (pool: Pool, leaseSeconds: number) => {
  const token = randomUUID()
  const result = await pool.query<{ leaseToken: string }>({
    text: `INSERT INTO contact_notification_jobs (
      job_name, lease_token, lease_until, last_started_at, last_status
    ) VALUES ($1, $2, clock_timestamp() + ($3::integer * interval '1 second'), clock_timestamp(), 'running')
    ON CONFLICT (job_name) DO UPDATE SET
      lease_token = EXCLUDED.lease_token,
      lease_until = EXCLUDED.lease_until,
      last_started_at = EXCLUDED.last_started_at,
      last_status = 'running'
    WHERE contact_notification_jobs.lease_until IS NULL
       OR contact_notification_jobs.lease_until <= clock_timestamp()
    RETURNING lease_token AS "leaseToken"`,
    values: [JOB_NAME, token, leaseSeconds],
  })
  return result.rows[0]?.leaseToken ?? null
}

export const completeNotificationJob = async (
  pool: Pool,
  token: string,
  result: CompletedNotificationRun,
) => {
  const update = await pool.query(
    `UPDATE contact_notification_jobs SET
      lease_token = NULL,
      lease_until = NULL,
      last_completed_at = clock_timestamp(),
      last_status = $3,
      last_claimed = $4,
      last_sent = $5,
      last_requeued = $6,
      last_lost_lease = $7
    WHERE job_name = $1 AND lease_token = $2 RETURNING job_name`,
    [
      JOB_NAME,
      token,
      result.status,
      result.claimed,
      result.sent,
      result.requeued,
      result.lostLease,
    ],
  )
  return update.rowCount === 1
}

export const recoverExhaustedNotifications = async (pool: Pool) => {
  const result = await pool.query(
    `UPDATE messages SET
      notification_state = 'failed',
      notification_lease_until = NULL,
      notification_claim_token = NULL
    WHERE notification_state = 'sending'
      AND notification_attempts >= 5
      AND notification_lease_until <= clock_timestamp()`,
  )
  return result.rowCount ?? 0
}

export const requeueTerminalNotification = async (pool: Pool, submissionId: string) => {
  const result = await pool.query(
    `UPDATE messages SET
      notification_state = 'pending',
      notification_attempts = 0,
      notification_next_attempt_at = clock_timestamp(),
      notification_lease_until = NULL,
      notification_claim_token = NULL,
      notification_error_code = NULL,
      notification_sent_at = NULL
    WHERE submission_id = $1
      AND notification_state = 'failed'
      AND notification_attempts >= 5`,
    [submissionId],
  )
  return result.rowCount === 1
}

export const getContactOperationalStatus = async (pool: Pool) => {
  const [notifications, job] = await Promise.all([
    pool.query<{
      due: number
      delayed: number
      sendingActive: number
      terminal: number
      oldestDueAgeSeconds: number | null
    }>(`SELECT
      count(*) FILTER (WHERE notification_attempts < 5 AND notification_next_attempt_at <= clock_timestamp()
        AND (notification_state IN ('pending', 'failed') OR (notification_state = 'sending' AND notification_lease_until <= clock_timestamp())))::int AS due,
      count(*) FILTER (WHERE notification_attempts < 5 AND notification_state IN ('pending', 'failed')
        AND notification_next_attempt_at > clock_timestamp())::int AS delayed,
      count(*) FILTER (WHERE notification_state = 'sending' AND notification_lease_until > clock_timestamp())::int AS "sendingActive",
      count(*) FILTER (WHERE notification_state <> 'sent' AND notification_attempts >= 5)::int AS terminal,
      floor(extract(epoch FROM clock_timestamp() - min(notification_next_attempt_at) FILTER (
        WHERE notification_attempts < 5 AND notification_next_attempt_at <= clock_timestamp()
          AND notification_state IN ('pending', 'failed')
      )))::int AS "oldestDueAgeSeconds"
    FROM messages`),
    pool.query<{
      status: string | null
      completedAt: Date | null
      completedAgeSeconds: number | null
      claimed: number
      sent: number
      requeued: number
      lostLease: number
    }>(
      `SELECT last_status AS status, last_completed_at AS "completedAt",
      floor(extract(epoch FROM clock_timestamp() - last_completed_at))::int AS "completedAgeSeconds",
      last_claimed AS claimed,
      last_sent AS sent, last_requeued AS requeued, last_lost_lease AS "lostLease"
      FROM contact_notification_jobs WHERE job_name = $1`,
      [JOB_NAME],
    ),
  ])

  return {
    database: 'ok' as const,
    notifications: notifications.rows[0] ?? {
      due: 0,
      delayed: 0,
      sendingActive: 0,
      terminal: 0,
      oldestDueAgeSeconds: null,
    },
    lastRun: job.rows[0] ?? null,
  }
}

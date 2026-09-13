import 'server-only'

import { z } from 'zod'
import type { Pool } from 'pg'

import { getContactPool } from '@/db/client'
import { sendMail } from '@/lib/mail'
import {
  acquireNotificationJob,
  completeNotificationJob,
  recoverExhaustedNotifications,
} from './notification-operations'
import {
  claimContactNotification,
  markNotificationFailed,
  markNotificationSent,
} from './notification-store'
import { deliverClaimedNotification } from './notify-owner'
import { drainContactNotifications } from './retry-notifications'

const RUN_LEASE_SECONDS = 70
const RUN_BUDGET_MS = 45_000

const retryLimit = () =>
  Math.min(100, Math.max(1, Number(process.env.CONTACT_RETRY_LIMIT ?? '25') || 25))

export const runContactNotificationRetry = async (pool: Pool = getContactPool()) => {
  const startedAt = Date.now()
  const token = await acquireNotificationJob(pool, RUN_LEASE_SECONDS)
  if (!token) {
    return {
      status: 'already-running' as const,
      claimed: 0,
      sent: 0,
      requeued: 0,
      lostLease: 0,
      stoppedByDeadline: false,
    }
  }

  let latest = { claimed: 0, sent: 0, requeued: 0, lostLease: 0 }
  try {
    await recoverExhaustedNotifications(pool)
    const owner = z.email().parse(process.env.SITE_MAIL_RECIEVER)
    const result = await drainContactNotifications({
      maxClaims: retryLimit(),
      deadlineAt: startedAt + RUN_BUDGET_MS,
      claimNext: () => claimContactNotification(pool),
      deliver: async (notification) => {
        const outcome = await deliverClaimedNotification(notification, {
          ownerEmail: owner,
          send: sendMail,
          markSent: (id, claimToken) => markNotificationSent(pool, id, claimToken),
          markFailed: (id, claimToken, code, attempts) =>
            markNotificationFailed(pool, id, claimToken, code, attempts),
        })
        return outcome.status
      },
    })
    latest = result
    await completeNotificationJob(pool, token, { status: 'completed', ...result })
    console.info(
      JSON.stringify({
        event: 'contact_notification_retry',
        status: 'completed',
        ...result,
        durationMs: Date.now() - startedAt,
      }),
    )
    return { status: 'completed' as const, ...result }
  } catch (error) {
    await completeNotificationJob(pool, token, { status: 'failed', ...latest })
    console.error(
      JSON.stringify({
        event: 'contact_notification_retry',
        status: 'failed',
        durationMs: Date.now() - startedAt,
      }),
    )
    throw error
  }
}

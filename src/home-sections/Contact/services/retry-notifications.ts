import 'server-only'

import type { ClaimedContactNotification } from './notify-owner'

export type NotificationDeliveryOutcome = 'sent' | 'requeued' | 'lost-lease'

interface DrainContactNotificationsOptions {
  maxClaims: number
  deadlineAt: number
  now?: () => number
  claimNext(): Promise<ClaimedContactNotification | null>
  deliver(notification: ClaimedContactNotification): Promise<NotificationDeliveryOutcome>
}

export interface ContactNotificationDrainResult {
  claimed: number
  sent: number
  requeued: number
  lostLease: number
  stoppedByDeadline: boolean
}

const MINIMUM_DELIVERY_BUDGET_MS = 22_000

export const drainContactNotifications = async ({
  maxClaims,
  deadlineAt,
  now = Date.now,
  claimNext,
  deliver,
}: DrainContactNotificationsOptions): Promise<ContactNotificationDrainResult> => {
  const result: ContactNotificationDrainResult = {
    claimed: 0,
    sent: 0,
    requeued: 0,
    lostLease: 0,
    stoppedByDeadline: false,
  }

  while (result.claimed < maxClaims) {
    if (deadlineAt - now() < MINIMUM_DELIVERY_BUDGET_MS) {
      result.stoppedByDeadline = true
      break
    }

    const notification = await claimNext()
    if (!notification) break
    result.claimed += 1

    const outcome = await deliver(notification)
    if (outcome === 'sent') result.sent += 1
    if (outcome === 'requeued') result.requeued += 1
    if (outcome === 'lost-lease') result.lostLease += 1
  }

  return result
}

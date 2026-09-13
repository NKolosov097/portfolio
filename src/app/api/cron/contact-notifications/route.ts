import { getContactPool } from '@/db/client'
import { handleContactNotificationCron } from '@/home-sections/Contact/services/cron-handler'
import { runContactNotificationRetry } from '@/home-sections/Contact/services/run-contact-retry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export function GET(request: Request) {
  return handleContactNotificationCron(request, {
    secret: process.env.CRON_SECRET,
    run: () => runContactNotificationRetry(getContactPool()),
  })
}

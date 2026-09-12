import { getContactPool } from '@/db/client'
import { handleContactOperationsStatus } from '@/home-sections/Contact/services/cron-handler'
import { getContactOperationalStatus } from '@/home-sections/Contact/services/notification-operations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 10

export function GET(request: Request) {
  return handleContactOperationsStatus(request, {
    secret: process.env.OPERATIONS_SECRET,
    load: () => getContactOperationalStatus(getContactPool()),
  })
}

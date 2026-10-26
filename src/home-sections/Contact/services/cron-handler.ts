import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'

import { EContactNotificationRunStatus } from '@/home-sections/Contact/types/contact.type'

export type ContactCronRunResult = {
  status: EContactNotificationRunStatus.completed | EContactNotificationRunStatus.alreadyRunning
  claimed: number
  sent: number
  requeued: number
  lostLease: number
  stoppedByDeadline: boolean
  attachmentsDeleted: number
  orphansDeleted: number
}

interface ContactCronDependencies {
  secret: string | undefined
  run(): Promise<ContactCronRunResult>
}

interface ContactStatusDependencies<T> {
  secret: string | undefined
  load(): Promise<T>
}

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' }

const digest = (value: string) => createHash('sha256').update(value).digest()

const hasValidAuthorization = (request: Request, secret: string | undefined) => {
  if (!secret) return false
  const provided = request.headers.get('authorization') ?? ''
  return timingSafeEqual(digest(provided), digest(`Bearer ${secret}`))
}

export const handleContactNotificationCron = async (
  request: Request,
  dependencies: ContactCronDependencies,
) => {
  if (!hasValidAuthorization(request, dependencies.secret)) {
    return Response.json(
      { ok: false, code: 'unauthorized' },
      { status: 401, headers: NO_STORE_HEADERS },
    )
  }

  try {
    const result = await dependencies.run()
    return Response.json({ ok: true, ...result }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    // The response stays opaque to the caller; the cause belongs in the runtime log, not the body.
    console.error('Contact notification cron failed', error)
    return Response.json(
      { ok: false, code: 'retry_unavailable' },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }
}

export const handleContactOperationsStatus = async <T>(
  request: Request,
  dependencies: ContactStatusDependencies<T>,
) => {
  if (!hasValidAuthorization(request, dependencies.secret)) {
    return Response.json(
      { ok: false, code: 'unauthorized' },
      { status: 401, headers: NO_STORE_HEADERS },
    )
  }

  try {
    return Response.json(
      { ok: true, ...(await dependencies.load()) },
      { headers: NO_STORE_HEADERS },
    )
  } catch (error) {
    // Same reasoning as the cron handler: an unexplained 503 is what hid this failure for weeks.
    console.error('Contact operations status failed', error)
    return Response.json(
      { ok: false, database: 'unavailable' },
      { status: 503, headers: NO_STORE_HEADERS },
    )
  }
}

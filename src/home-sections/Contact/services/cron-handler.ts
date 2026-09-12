import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'

export type ContactCronRunResult = {
  status: 'completed' | 'already-running'
  claimed: number
  sent: number
  requeued: number
  lostLease: number
  stoppedByDeadline: boolean
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
  } catch {
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
  } catch {
    return Response.json(
      { ok: false, database: 'unavailable' },
      { status: 503, headers: NO_STORE_HEADERS },
    )
  }
}

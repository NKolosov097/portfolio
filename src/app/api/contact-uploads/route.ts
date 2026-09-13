import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { z } from 'zod'

import {
  CONTACT_ATTACHMENT_TYPES,
  MAX_CONTACT_ATTACHMENT_BYTES,
} from '@/home-sections/Contact/attachments'
import {
  consumeContactUploadLimit,
  resolveTrustedIdentity,
} from '@/home-sections/Contact/services/submission-policy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' }
const reject = (code: string, status: number) =>
  Response.json({ ok: false, code }, { status, headers: NO_STORE_HEADERS })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isContactPathname = (pathname: unknown) => {
  if (typeof pathname !== 'string') return false
  const parts = pathname.split('/')
  return (
    parts.length === 3 &&
    parts[0] === 'contact' &&
    z.uuid().safeParse(parts[1]).success &&
    Boolean(parts[2]) &&
    parts[2]!.length <= 255
  )
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    if (!isRecord(body) || !isRecord(body.payload)) return reject('upload_rejected', 400)

    if (body.type === 'blob.generate-client-token') {
      if (!isContactPathname(body.payload.pathname)) return reject('upload_rejected', 400)
      const identity = resolveTrustedIdentity(request.headers)
      if (!identity) return reject('unauthorized', 401)
      if (!(await consumeContactUploadLimit(identity))) return reject('rate_limited', 429)
    } else if (body.type !== 'blob.upload-completed') {
      return reject('upload_rejected', 400)
    }

    const result = await handleUpload({
      body: body as unknown as HandleUploadBody,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...CONTACT_ATTACHMENT_TYPES],
        maximumSizeInBytes: MAX_CONTACT_ATTACHMENT_BYTES,
        addRandomSuffix: true,
        validUntil: Date.now() + 10 * 60_000,
      }),
      onUploadCompleted: async () => {},
    })
    return Response.json(result, { headers: NO_STORE_HEADERS })
  } catch {
    return reject('upload_unavailable', 500)
  }
}

import 'server-only'

import { Readable } from 'node:stream'

import { del, get, head } from '@vercel/blob'

import { getContactPool } from '@/db/client'
import {
  CONTACT_ATTACHMENT_TYPES,
  detectAttachmentContentType,
  MAX_CONTACT_ATTACHMENTS,
  MAX_CONTACT_ATTACHMENT_BYTES,
  MAX_CONTACT_ATTACHMENT_TOTAL_BYTES,
  sanitizeAttachmentName,
  type AttachmentManifestItem,
  type ContactAttachmentType,
  type VerifiedContactAttachment,
} from '@/home-sections/Contact/attachments'

export class InvalidContactAttachmentError extends Error {}

const invalid = () => new InvalidContactAttachmentError('invalid contact attachment')
const unavailable = () => new Error('contact attachment unavailable')

const readSignature = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader()
  const bytes: number[] = []
  try {
    while (bytes.length < 8) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes.push(...chunk.value.subarray(0, 8 - bytes.length))
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }
  return Uint8Array.from(bytes)
}

export const verifyContactAttachments = async (
  submissionId: string,
  manifest: AttachmentManifestItem[],
): Promise<VerifiedContactAttachment[]> => {
  if (manifest.length > MAX_CONTACT_ATTACHMENTS) throw invalid()

  let totalBytes = 0
  const verified: VerifiedContactAttachment[] = []
  for (const item of manifest) {
    if (
      !item.url.includes('.private.blob.vercel-storage.com/') ||
      !item.pathname.startsWith(`contact/${submissionId}/`)
    )
      throw invalid()

    let details
    try {
      details = await head(item.url, { abortSignal: AbortSignal.timeout(5_000) })
    } catch {
      throw unavailable()
    }

    if (
      details.url !== item.url ||
      details.pathname !== item.pathname ||
      !CONTACT_ATTACHMENT_TYPES.includes(details.contentType as ContactAttachmentType) ||
      !Number.isInteger(details.size) ||
      details.size <= 0 ||
      details.size > MAX_CONTACT_ATTACHMENT_BYTES
    )
      throw invalid()

    totalBytes += details.size
    if (totalBytes > MAX_CONTACT_ATTACHMENT_TOTAL_BYTES) throw invalid()

    let result
    try {
      result = await get(item.pathname, {
        access: 'private',
        abortSignal: AbortSignal.timeout(5_000),
      })
    } catch {
      throw unavailable()
    }
    if (!result || result.statusCode !== 200) throw unavailable()
    const signature = await readSignature(result.stream)
    if (detectAttachmentContentType(signature) !== details.contentType) throw invalid()

    verified.push({
      ...item,
      name: sanitizeAttachmentName(item.name),
      contentType: details.contentType as ContactAttachmentType,
      size: details.size,
      etag: details.etag,
    })
  }
  return verified
}

export const openContactAttachment = async (pathname: string) => {
  let result
  try {
    result = await get(pathname, {
      access: 'private',
      abortSignal: AbortSignal.timeout(5_000),
    })
  } catch {
    throw unavailable()
  }
  if (!result || result.statusCode !== 200) throw unavailable()
  return Readable.fromWeb(
    result.stream as unknown as import('node:stream/web').ReadableStream<Uint8Array>,
  )
}

export const deleteDeliveredContactAttachments = async (
  messageId: number,
  attachments: VerifiedContactAttachment[],
) => {
  const urls = attachments.map(({ url }) => url)
  if (!urls.length) return
  await del(urls)
  await getContactPool().query(
    `UPDATE contact_attachments SET deleted_at = clock_timestamp()
     WHERE message_id = $1 AND blob_url = ANY($2::text[]) AND deleted_at IS NULL`,
    [messageId, urls],
  )
}

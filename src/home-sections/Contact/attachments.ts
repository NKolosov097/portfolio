import { z } from 'zod'

export const MAX_CONTACT_ATTACHMENTS = 3
export const MAX_CONTACT_ATTACHMENT_BYTES = 5 * 1024 * 1024
export const MAX_CONTACT_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024
export const CONTACT_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

export type ContactAttachmentType = (typeof CONTACT_ATTACHMENT_TYPES)[number]
export type AttachmentErrorCode =
  | 'too_many_files'
  | 'unsupported_file_type'
  | 'file_too_large'
  | 'files_too_large'
  | 'upload_failed'
  | 'attachment_invalid'

export const attachmentManifestItemSchema = z.strictObject({
  url: z.url(),
  pathname: z.string().min(1).max(768),
  name: z.string().min(1).max(255),
})
export const attachmentManifestSchema = z
  .array(attachmentManifestItemSchema)
  .max(MAX_CONTACT_ATTACHMENTS, 'too_many_files')

export type AttachmentManifestItem = z.infer<typeof attachmentManifestItemSchema>
export type VerifiedContactAttachment = AttachmentManifestItem & {
  contentType: ContactAttachmentType
  size: number
  etag: string
}

export const validateAttachmentFiles = (
  files: ReadonlyArray<Pick<File, 'size' | 'type'>>,
): AttachmentErrorCode | null => {
  if (files.length > MAX_CONTACT_ATTACHMENTS) return 'too_many_files'

  let total = 0
  for (const file of files) {
    if (!CONTACT_ATTACHMENT_TYPES.includes(file.type as ContactAttachmentType))
      return 'unsupported_file_type'
    if (file.size > MAX_CONTACT_ATTACHMENT_BYTES) return 'file_too_large'
    total += file.size
    if (total > MAX_CONTACT_ATTACHMENT_TOTAL_BYTES) return 'files_too_large'
  }
  return null
}

export const sanitizeAttachmentName = (name: string) =>
  (name.split(/[\\/]/).at(-1) ?? '')
    .replaceAll(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 255) || 'attachment'

const startsWith = (value: Uint8Array, prefix: readonly number[]) =>
  prefix.every((byte, index) => value[index] === byte)

export const detectAttachmentContentType = (bytes: Uint8Array): ContactAttachmentType | null => {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  return null
}

import 'server-only'

import { attachmentManifestSchema } from '@/home-sections/Contact/attachments'
import { contactSubmissionSchema } from '@/home-sections/Contact/schemas/send-message.schema'
import type { SubmissionAcceptance } from '@/home-sections/Contact/services/submission-policy'
import {
  EContactField,
  EContactSubmissionAcceptanceKind,
  EContactSubmissionStatus,
} from '@/home-sections/Contact/types/contact.type'
import type {
  ContactField,
  ContactFieldErrorCode,
  ContactSubmissionState,
  ValidatedContactSubmission,
} from '@/home-sections/Contact/types/submission.type'

interface SendMessageDependencies {
  accept(input: ValidatedContactSubmission, identity: string): Promise<SubmissionAcceptance>
  notify(messageId: number): Promise<void>
  getIdentity(): Promise<string | null>
}

const knownFields = [
  EContactField.name,
  EContactField.email,
  EContactField.company,
  EContactField.profession,
  EContactField.message,
  'submissionId',
  'website',
  'attachments',
] as const
const contactFields: Record<string, ContactField> = {
  [EContactField.name]: EContactField.name,
  [EContactField.email]: EContactField.email,
  [EContactField.company]: EContactField.company,
  [EContactField.profession]: EContactField.profession,
  [EContactField.message]: EContactField.message,
  submissionId: 'submissionId',
  website: 'form',
  attachments: 'attachments',
  form: 'form',
}
const errorCodes: Record<string, ContactFieldErrorCode> = {
  invalid_type: 'invalid_type',
  required: 'required',
  invalid_email: 'invalid_email',
  too_long: 'too_long',
  too_short: 'too_short',
  submission_id_invalid: 'submission_id_invalid',
  submission_id_reused: 'submission_id_reused',
  attachment_invalid: 'attachment_invalid',
  too_many_files: 'too_many_files',
}

const readFormData = (
  payload: FormData,
):
  | { errorField: ContactField; errorCode: ContactFieldErrorCode }
  | { value: Record<string, unknown> } => {
  const invalidDuplicates = knownFields.filter((field) => payload.getAll(field).length > 1)
  if (invalidDuplicates.length) {
    const duplicate = invalidDuplicates[0]
    return {
      errorField: duplicate === 'website' ? 'form' : duplicate,
      errorCode: duplicate === 'attachments' ? 'attachment_invalid' : 'invalid_type',
    }
  }
  for (const field of payload.keys())
    if (!knownFields.includes(field as (typeof knownFields)[number]))
      return { errorField: 'form', errorCode: 'invalid_type' }

  const value: Record<string, unknown> = Object.fromEntries(
    knownFields.flatMap((field) => {
      if (field === 'attachments') return []
      const entry = payload.get(field)
      return entry === null ? [] : [[field, entry]]
    }),
  )
  const rawAttachments = payload.get('attachments')
  if (rawAttachments === null) value.attachments = []
  else if (typeof rawAttachments !== 'string')
    return { errorField: 'attachments', errorCode: 'attachment_invalid' }
  else {
    try {
      const parsed = attachmentManifestSchema.safeParse(JSON.parse(rawAttachments))
      if (!parsed.success)
        return {
          errorField: 'attachments',
          errorCode: parsed.error.issues.some((issue) => issue.message === 'too_many_files')
            ? 'too_many_files'
            : 'attachment_invalid',
        }
      value.attachments = parsed.data
    } catch {
      return { errorField: 'attachments', errorCode: 'attachment_invalid' }
    }
  }
  return { value }
}

const validationState = (
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): ContactSubmissionState => {
  const fieldErrors: Partial<Record<ContactField, ContactFieldErrorCode[]>> = {}
  for (const issue of issues) {
    const candidate = issue.path[0]
    const field = typeof candidate === 'string' ? (contactFields[candidate] ?? 'form') : 'form'
    const code = errorCodes[issue.message] ?? 'invalid_type'
    if (!fieldErrors[field]?.includes(code))
      fieldErrors[field] = [...(fieldErrors[field] ?? []), code]
  }
  return { status: EContactSubmissionStatus.validationError, fieldErrors }
}

export const createSendMessage =
  (dependencies: SendMessageDependencies) =>
  async (
    _previousState: ContactSubmissionState,
    payload: FormData,
  ): Promise<ContactSubmissionState> => {
    if (!(payload instanceof FormData))
      return {
        status: EContactSubmissionStatus.validationError,
        fieldErrors: { form: ['invalid_type'] },
      }
    const read = readFormData(payload)
    if ('errorField' in read)
      return {
        status: EContactSubmissionStatus.validationError,
        fieldErrors: { [read.errorField]: [read.errorCode] },
      }

    const parsed = contactSubmissionSchema.safeParse(read.value)
    if (!parsed.success) return validationState(parsed.error.issues)
    if (parsed.data.website)
      return {
        status: EContactSubmissionStatus.validationError,
        fieldErrors: { form: ['invalid_type'] },
      }

    try {
      const identity = await dependencies.getIdentity()
      if (!identity)
        return { status: EContactSubmissionStatus.unavailable, code: 'service_unavailable' }
      const accepted = await dependencies.accept(parsed.data, identity)
      if (accepted.kind === EContactSubmissionAcceptanceKind.mismatch)
        return {
          status: EContactSubmissionStatus.validationError,
          fieldErrors: { submissionId: ['submission_id_reused'] },
        }
      if (accepted.kind === EContactSubmissionAcceptanceKind.rateLimited)
        return { status: EContactSubmissionStatus.rateLimited, code: 'rate_limited' }
      if (accepted.kind === EContactSubmissionAcceptanceKind.invalidAttachments)
        return {
          status: EContactSubmissionStatus.validationError,
          fieldErrors: { attachments: ['attachment_invalid'] },
        }
      if (accepted.kind === EContactSubmissionAcceptanceKind.accepted)
        await dependencies.notify(accepted.messageId).catch(() => undefined)
      return {
        status: EContactSubmissionStatus.success,
        submissionId: parsed.data.submissionId,
      }
    } catch {
      return { status: EContactSubmissionStatus.unavailable, code: 'service_unavailable' }
    }
  }

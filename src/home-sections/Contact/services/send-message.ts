import 'server-only'

import { contactSubmissionSchema } from '@/home-sections/Contact/schemas/send-message.schema'
import type { SubmissionAcceptance } from '@/home-sections/Contact/services/submission-policy'
import { EContactField } from '@/home-sections/Contact/types/contact.type'
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
] as const
const contactFields: Record<string, ContactField> = {
  [EContactField.name]: EContactField.name,
  [EContactField.email]: EContactField.email,
  [EContactField.company]: EContactField.company,
  [EContactField.profession]: EContactField.profession,
  [EContactField.message]: EContactField.message,
  submissionId: 'submissionId',
  website: 'form',
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
}

const readFormData = (
  payload: FormData,
): { errorField: ContactField } | { value: Record<string, FormDataEntryValue> } => {
  const invalidDuplicates = knownFields.filter((field) => payload.getAll(field).length > 1)
  if (invalidDuplicates.length) {
    const duplicate = invalidDuplicates[0]
    return { errorField: duplicate === 'website' ? 'form' : duplicate }
  }
  for (const field of payload.keys())
    if (!knownFields.includes(field as (typeof knownFields)[number])) return { errorField: 'form' }
  return {
    value: Object.fromEntries(
      knownFields.flatMap((field) => {
        const value = payload.get(field)
        return value === null ? [] : [[field, value]]
      }),
    ),
  }
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
  return { status: 'validation-error', fieldErrors }
}

export const createSendMessage =
  (dependencies: SendMessageDependencies) =>
  async (
    _previousState: ContactSubmissionState,
    payload: FormData,
  ): Promise<ContactSubmissionState> => {
    if (!(payload instanceof FormData))
      return { status: 'validation-error', fieldErrors: { form: ['invalid_type'] } }
    const read = readFormData(payload)
    if ('errorField' in read)
      return { status: 'validation-error', fieldErrors: { [read.errorField]: ['invalid_type'] } }

    const parsed = contactSubmissionSchema.safeParse(read.value)
    if (!parsed.success) return validationState(parsed.error.issues)
    if (parsed.data.website)
      return { status: 'validation-error', fieldErrors: { form: ['invalid_type'] } }

    try {
      const identity = await dependencies.getIdentity()
      if (!identity) return { status: 'unavailable', code: 'service_unavailable' }
      const accepted = await dependencies.accept(parsed.data, identity)
      if (accepted.kind === 'mismatch')
        return {
          status: 'validation-error',
          fieldErrors: { submissionId: ['submission_id_reused'] },
        }
      if (accepted.kind === 'rate-limited') return { status: 'rate-limited', code: 'rate_limited' }
      if (accepted.kind === 'accepted')
        await dependencies.notify(accepted.messageId).catch(() => undefined)
      return { status: 'success', submissionId: parsed.data.submissionId }
    } catch {
      return { status: 'unavailable', code: 'service_unavailable' }
    }
  }

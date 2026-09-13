import { EContactField, type ContactFormValues } from '@/home-sections/Contact/types/contact.type'

export type ContactField = EContactField | 'submissionId' | 'form'
export type ContactFieldErrorCode =
  | 'invalid_type'
  | 'required'
  | 'invalid_email'
  | 'too_long'
  | 'too_short'
  | 'submission_id_invalid'
  | 'submission_id_reused'

export type ContactSubmissionState =
  | { status: 'idle' }
  | { status: 'success'; submissionId: string }
  | {
      status: 'validation-error'
      fieldErrors: Partial<Record<ContactField, ContactFieldErrorCode[]>>
    }
  | { status: 'unavailable'; code: 'service_unavailable' }
  | { status: 'rate-limited'; code: 'rate_limited' }

export type ValidatedContactSubmission = ContactFormValues & {
  submissionId: string
  website: string
}

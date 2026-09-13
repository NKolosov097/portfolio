import {
  EContactField,
  EContactSubmissionStatus,
  type ContactFormValues,
} from '@/home-sections/Contact/types/contact.type'
import type {
  AttachmentErrorCode,
  AttachmentManifestItem,
} from '@/home-sections/Contact/attachments'

export type ContactField = EContactField | 'attachments' | 'submissionId' | 'form'
export type ContactFieldErrorCode =
  | 'invalid_type'
  | 'required'
  | 'invalid_email'
  | 'too_long'
  | 'too_short'
  | 'submission_id_invalid'
  | 'submission_id_reused'
  | AttachmentErrorCode

export type ContactSubmissionState =
  | { status: EContactSubmissionStatus.idle }
  | { status: EContactSubmissionStatus.success; submissionId: string }
  | {
      status: EContactSubmissionStatus.validationError
      fieldErrors: Partial<Record<ContactField, ContactFieldErrorCode[]>>
    }
  | { status: EContactSubmissionStatus.unavailable; code: 'service_unavailable' }
  | { status: EContactSubmissionStatus.rateLimited; code: 'rate_limited' }

export type ValidatedContactSubmission = ContactFormValues & {
  submissionId: string
  website: string
  attachments: AttachmentManifestItem[]
}

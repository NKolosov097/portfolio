import type { z } from 'zod'

import type { contactSchema } from '@/home-sections/Contact/schemas/send-message.schema'

export const enum EContactField {
  name = 'name',
  email = 'email',
  company = 'company',
  profession = 'profession',
  message = 'message',
}

export const enum EContactSubmissionStatus {
  idle = 'idle',
  success = 'success',
  validationError = 'validation-error',
  unavailable = 'unavailable',
  rateLimited = 'rate-limited',
}

export const enum EContactSubmissionAcceptanceKind {
  accepted = 'accepted',
  replay = 'replay',
  mismatch = 'mismatch',
  rateLimited = 'rate-limited',
  invalidAttachments = 'invalid-attachments',
}

export const enum EContactNotificationDeliveryStatus {
  sent = 'sent',
  requeued = 'requeued',
  lostLease = 'lost-lease',
}

export const enum EContactNotificationRunStatus {
  running = 'running',
  completed = 'completed',
  failed = 'failed',
  alreadyRunning = 'already-running',
}

export interface IContactSchema {
  name: {
    requireName: string
    invalidType: string
  }
  email: {
    requireEmail: string
    incorrectEmail: string
  }
  company: {
    invalidType: string
  }
  profession: {
    invalidType: string
  }
  message: {
    requireMessage: string
    invalidType: string
  }
}

export type ContactFormValues = z.output<typeof contactSchema>

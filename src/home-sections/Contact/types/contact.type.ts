import type { z } from 'zod'

import type { contactSchema } from '@/home-sections/Contact/schemas/send-message.schema'

export const enum EContactField {
  name = 'name',
  email = 'email',
  company = 'company',
  profession = 'profession',
  message = 'message',
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

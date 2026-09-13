import { z } from 'zod'

import { getContactSchema } from '@/home-sections/Contact/schemas/send-message.schema'
import { EContactField } from '@/home-sections/Contact/types/contact.type'

export const defaultContactForm: z.infer<ReturnType<typeof getContactSchema>> = {
  [EContactField.name]: '',
  [EContactField.email]: '',
  [EContactField.company]: '',
  [EContactField.profession]: '',
  [EContactField.message]: '',
}

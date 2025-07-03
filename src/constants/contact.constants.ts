import { z } from 'zod'

import { getContactSchema } from '@/home-sections/Contact/schemas/send-message.schema'

export const defaultContactForm: z.infer<ReturnType<typeof getContactSchema>> = {
  name: '',
  email: '',
  company: '',
  profession: '',
  message: '',
}

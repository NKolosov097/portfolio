import { z } from 'zod'

import { getContactSchema } from '@/schemas/Contact/Contact.schema'

export const defaultContactForm: z.infer<ReturnType<typeof getContactSchema>> = {
  name: '',
  email: '',
  companyName: '',
  profession: '',
  message: '',
}

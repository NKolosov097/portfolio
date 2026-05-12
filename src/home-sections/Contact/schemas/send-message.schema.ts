import { z } from 'zod'

import { IContactSchema } from '@/home-sections/Contact/types/contact.type'

export const getContactSchema = (errorsMsgs: IContactSchema) =>
  z.object({
    name: z
      .string({ error: errorsMsgs?.name?.invalidType })
      .trim()
      .min(1, errorsMsgs?.name?.requireName),
    email: z
      .string({ error: errorsMsgs?.email?.incorrectEmail })
      .trim()
      .email({ message: errorsMsgs?.email?.incorrectEmail }),
    company: z.string({ error: errorsMsgs?.company?.invalidType }).trim(),
    profession: z.string({ error: errorsMsgs?.profession?.invalidType }).trim(),
    message: z
      .string({ error: errorsMsgs?.message?.invalidType })
      .trim()
      .min(6, errorsMsgs?.message?.requireMessage),
  })

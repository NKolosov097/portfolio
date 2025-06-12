import { z } from 'zod'

import { IContactSchema } from '@/home-sections/Contact/types/contact.type'

export const getContactSchema = (errorsMsgs: IContactSchema) =>
  z.object({
    name: z
      .string({
        invalid_type_error: errorsMsgs?.name?.invalidType,
        required_error: errorsMsgs?.name?.requireName,
      })
      ?.trim()
      .min(1, errorsMsgs?.name?.requireName),
    email: z
      .string({
        invalid_type_error: errorsMsgs?.email?.incorrectEmail,
        required_error: errorsMsgs?.email?.requireEmail,
      })
      ?.trim()
      .email({ message: errorsMsgs?.email?.incorrectEmail }),
    company: z
      .string({
        invalid_type_error: errorsMsgs?.company?.invalidType,
      })
      ?.trim(),
    profession: z
      .string({
        invalid_type_error: errorsMsgs?.profession?.invalidType,
      })
      ?.trim(),
    message: z
      .string({
        invalid_type_error: errorsMsgs?.message?.invalidType,
        required_error: errorsMsgs?.message?.requireMessage,
      })
      ?.trim()
      .min(6, errorsMsgs?.message?.requireMessage),
  })

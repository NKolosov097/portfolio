import { z } from 'zod'

import { EContactField, type IContactSchema } from '@/home-sections/Contact/types/contact.type'

const stringField = () => z.string({ error: 'invalid_type' }).trim()

export const contactSchema = z.strictObject(
  {
    [EContactField.name]: stringField().min(1, 'required').max(100, 'too_long'),
    [EContactField.email]: stringField()
      .min(1, 'required')
      .max(254, 'too_long')
      .email('invalid_email')
      .transform((value) => value.toLowerCase()),
    [EContactField.company]: stringField().max(150, 'too_long').optional().default(''),
    [EContactField.profession]: stringField().max(150, 'too_long').optional().default(''),
    [EContactField.message]: stringField().min(6, 'too_short').max(5_000, 'too_long'),
  },
  { error: 'invalid_type' },
)

export const contactSubmissionSchema = contactSchema.safeExtend({
  submissionId: z.uuid({ error: 'submission_id_invalid' }),
  website: z.string({ error: 'invalid_type' }).max(0, 'invalid_type').optional().default(''),
})

export const getContactSchema = (errorsMsgs: IContactSchema) =>
  z.object({
    [EContactField.name]: z
      .string({ error: errorsMsgs?.name?.invalidType })
      .trim()
      .min(1, errorsMsgs?.name?.requireName)
      .max(100),
    [EContactField.email]: z
      .string({ error: errorsMsgs?.email?.incorrectEmail })
      .trim()
      .max(254)
      .email({ message: errorsMsgs?.email?.incorrectEmail }),
    [EContactField.company]: z.string({ error: errorsMsgs?.company?.invalidType }).trim().max(150),
    [EContactField.profession]: z
      .string({ error: errorsMsgs?.profession?.invalidType })
      .trim()
      .max(150),
    [EContactField.message]: z
      .string({ error: errorsMsgs?.message?.invalidType })
      .trim()
      .min(6, errorsMsgs?.message?.requireMessage)
      .max(5_000),
  })

'use server'

import 'server-only'

import { getContactSchema } from '@/home-sections/Contact/schemas/send-message.schema'
import { IContactSchema } from '@/home-sections/Contact/types/contact.type'

export interface ISendMessageFormState {
  success: boolean
  fields?: Record<string, string>
  errors?: Record<string, string[]>
}

export async function sendMessage(
  prevState: ISendMessageFormState,
  payload: FormData,
  errorsMsgs: IContactSchema,
): Promise<ISendMessageFormState> {
  console.log('payload received', payload)

  if (!(payload instanceof FormData)) {
    return {
      success: false,
      errors: { error: ['Invalid Form Data'] },
    }
  }

  const formData = Object.fromEntries(payload)
  console.log('form data', formData)

  const parsed = getContactSchema(errorsMsgs).safeParse(formData)

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const fields: Record<string, string> = {}

    for (const key of Object.keys(formData)) {
      fields[key] = formData[key].toString()
    }

    return {
      success: false,
      fields,
      errors,
    }
  }

  if (parsed.data.email === 'test@example.com') {
    return {
      success: false,
      errors: { email: ['email already taken'] },
      fields: parsed.data,
    }
  }
  console.log('parsed data', parsed.data)

  return {
    success: true,
  }
}

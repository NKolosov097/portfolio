'use server'

import 'server-only'

import { getContactSchema } from '@/home-sections/Contact/schemas/send-message.schema'
import { IContactSchema } from '@/home-sections/Contact/types/contact.type'

import prisma from '@/lib/prisma'

export interface ISendMessageFormState {
  success: boolean

  fields?: Record<string, string>
  errors?: Record<string, string[]>
}

const getDataFields = (formData: { [k: string]: FormDataEntryValue }) => {
  const fields: Record<string, string> = {}

  for (const key of Object.keys(formData)) {
    fields[key] = formData[key].toString()
  }

  return fields
}

export async function sendMessage(
  prevState: ISendMessageFormState,
  payload: FormData,
  errorsMsgs: IContactSchema,
): Promise<ISendMessageFormState> {
  if (!(payload instanceof FormData)) {
    return {
      success: false,
      errors: { error: ['Invalid Form Data'] },
    }
  }

  const formData = Object.fromEntries(payload)

  const parsed = getContactSchema(errorsMsgs).safeParse(formData)

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors

    return {
      success: false,
      fields: getDataFields(formData),
      errors,
    }
  }

  if (parsed.data) {
    try {
      await prisma.user.upsert({
        create: {
          name: parsed.data.name,
          email: parsed.data.email,
          company: parsed.data.company,
          profession: parsed.data.profession,
          messages: { create: { content: parsed.data.message } },
        },
        update: {
          email: parsed.data.email,
          name: parsed.data.name,
          company: parsed.data.company,
          profession: parsed.data.profession,
          messages: {
            create: {
              content: parsed.data.message,
            },
          },
        },
        where: { email: parsed.data?.email },
      })
    } catch (error) {
      const errorMsg = `Error with upserting user data: \n${error}`

      console.error(errorMsg)

      return {
        success: false,
        fields: getDataFields(formData),
        errors: { globalError: [errorMsg] },
      }
    }
  }

  return {
    success: true,
  }
}

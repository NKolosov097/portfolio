import en from '@public/locales/en.json'

import { IContactSchema } from '@/home-sections/Contact/types/contact.type'

export const CONTACT_ERROR_MESSAGES: IContactSchema = {
  name: {
    requireName: en.contact.requireName,
    invalidType: en.contact.invalidTypeOfName,
  },
  email: {
    requireEmail: en.contact.requireEmail,
    incorrectEmail: en.contact.incorrectEmail,
  },
  company: {
    invalidType: en.contact.invalidTypeOfcompany,
  },
  profession: {
    invalidType: en.contact.invalidTypeOfProfession,
  },
  message: {
    requireMessage: en.contact.requireMessage,
    invalidType: en.contact.invalidTypeOfMessage,
  },
}

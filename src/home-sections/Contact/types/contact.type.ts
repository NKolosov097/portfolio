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

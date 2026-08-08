import { describe, expect, it } from 'vitest'

import { CONTACT_ERROR_MESSAGES } from '@tests/fixtures/contact-error-messages'
import { getContactSchema } from '@/home-sections/Contact/schemas/send-message.schema'

const schema = getContactSchema(CONTACT_ERROR_MESSAGES)

/** Minimal payload that satisfies every rule; individual cases override one field at a time. */
const validPayload = {
  name: 'Peter Parker',
  email: 'peter@example.com',
  company: 'Daily Bugle',
  profession: 'Photographer',
  message: 'Hello there',
}

describe('getContactSchema', () => {
  it('accepts a complete payload', () => {
    const parsed = schema.safeParse(validPayload)

    expect(parsed.success).toBe(true)
  })

  it('trims surrounding whitespace on every field', () => {
    const parsed = schema.safeParse({
      name: '  Peter Parker  ',
      email: '  peter@example.com  ',
      company: '  Daily Bugle  ',
      profession: '  Photographer  ',
      message: '  Hello there  ',
    })

    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data).toEqual(validPayload)
  })

  it('rejects a missing name with the localised message', () => {
    const parsed = schema.safeParse({ ...validPayload, name: '' })

    expect(parsed.success).toBe(false)
    expect(parsed.success === false && parsed.error.flatten().fieldErrors.name).toContain(
      CONTACT_ERROR_MESSAGES.name.requireName,
    )
  })

  it('rejects a whitespace-only name, because trimming happens before the length check', () => {
    const parsed = schema.safeParse({ ...validPayload, name: '     ' })

    expect(parsed.success).toBe(false)
    expect(parsed.success === false && parsed.error.flatten().fieldErrors.name).toContain(
      CONTACT_ERROR_MESSAGES.name.requireName,
    )
  })

  it('rejects a malformed email with the localised message', () => {
    const parsed = schema.safeParse({ ...validPayload, email: 'peter(at)example.com' })

    expect(parsed.success).toBe(false)
    expect(parsed.success === false && parsed.error.flatten().fieldErrors.email).toContain(
      CONTACT_ERROR_MESSAGES.email.incorrectEmail,
    )
  })

  it('rejects a message shorter than six characters', () => {
    const parsed = schema.safeParse({ ...validPayload, message: 'Hi' })

    expect(parsed.success).toBe(false)
    expect(parsed.success === false && parsed.error.flatten().fieldErrors.message).toContain(
      CONTACT_ERROR_MESSAGES.message.requireMessage,
    )
  })

  it('accepts a message of exactly six characters', () => {
    const parsed = schema.safeParse({ ...validPayload, message: 'Hello!' })

    expect(parsed.success).toBe(true)
  })

  it('rejects a message that only reaches six characters through whitespace', () => {
    const parsed = schema.safeParse({ ...validPayload, message: 'Hi    ' })

    expect(parsed.success).toBe(false)
  })

  it('accepts empty company and profession, which are optional in the UI', () => {
    const parsed = schema.safeParse({ ...validPayload, company: '', profession: '' })

    expect(parsed.success).toBe(true)
  })

  it('rejects a non-string name with the localised type message', () => {
    const parsed = schema.safeParse({ ...validPayload, name: 42 })

    expect(parsed.success).toBe(false)
    expect(parsed.success === false && parsed.error.flatten().fieldErrors.name).toContain(
      CONTACT_ERROR_MESSAGES.name.invalidType,
    )
  })

  it('reports every invalid field at once rather than stopping at the first', () => {
    const parsed = schema.safeParse({
      name: '',
      email: 'nope',
      company: 'Daily Bugle',
      profession: 'Photographer',
      message: 'Hi',
    })

    expect(parsed.success).toBe(false)

    const fieldErrors = parsed.success === false ? parsed.error.flatten().fieldErrors : {}

    expect(Object.keys(fieldErrors).sort()).toEqual(['email', 'message', 'name'])
  })
})

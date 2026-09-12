import { describe, expect, it } from 'vitest'

import {
  contactSchema,
  contactSubmissionSchema,
} from '@/home-sections/Contact/schemas/send-message.schema'
import { EContactField } from '@/home-sections/Contact/types/contact.type'

const valid = {
  name: 'Peter Parker',
  email: 'Peter@Example.com',
  company: 'Daily Bugle',
  profession: 'Photographer',
  message: 'Hello!',
}

describe('contactSchema', () => {
  it('normalizes the accepted five contact fields', () => {
    expect(
      contactSchema.parse({
        name: '  Peter Parker ',
        email: ' Peter@Example.com ',
        message: ' Hello! ',
      }),
    ).toEqual({
      name: 'Peter Parker',
      email: 'peter@example.com',
      company: '',
      profession: '',
      message: 'Hello!',
    })
  })

  it.each([
    [EContactField.name, '', 'required'],
    [EContactField.name, 'n'.repeat(101), 'too_long'],
    [EContactField.email, 'invalid', 'invalid_email'],
    [EContactField.email, `${'e'.repeat(244)}@example.com`, 'too_long'],
    [EContactField.company, 'c'.repeat(151), 'too_long'],
    [EContactField.profession, 'p'.repeat(151), 'too_long'],
    [EContactField.message, '12345', 'too_short'],
    [EContactField.message, 'm'.repeat(5001), 'too_long'],
  ] as const)('rejects %s at its boundary with %s', (field, value, code) => {
    const parsed = contactSchema.safeParse({ ...valid, [field]: value })

    expect(parsed.success).toBe(false)
    expect(parsed.success ? [] : parsed.error.issues.map((issue) => issue.message)).toContain(code)
  })

  it.each([
    EContactField.name,
    EContactField.email,
    EContactField.company,
    EContactField.profession,
    EContactField.message,
  ] as const)('rejects File values for %s', (field) => {
    const parsed = contactSchema.safeParse({ ...valid, [field]: new Blob(['file']) })

    expect(parsed.success).toBe(false)
    expect(parsed.success ? '' : parsed.error.issues[0]?.message).toBe('invalid_type')
  })

  it('accepts all exact maximum lengths', () => {
    expect(
      contactSchema.safeParse({
        name: 'n'.repeat(100),
        email: `${'e'.repeat(242)}@example.com`,
        company: 'c'.repeat(150),
        profession: 'p'.repeat(150),
        message: 'm'.repeat(5000),
      }).success,
    ).toBe(true)
  })
})

describe('contactSubmissionSchema', () => {
  it('accepts a UUID and empty honeypot', () => {
    expect(
      contactSubmissionSchema.safeParse({
        ...valid,
        submissionId: 'aa1d1085-6b07-4c18-99fe-dc1ee32179dc',
        website: '',
      }).success,
    ).toBe(true)
  })

  it('rejects invalid UUIDs and unknown fields', () => {
    const parsed = contactSubmissionSchema.safeParse({
      ...valid,
      submissionId: 'not-a-uuid',
      admin: 'true',
    })

    expect(parsed.success).toBe(false)
    expect(parsed.success ? [] : parsed.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining(['submission_id_invalid', 'invalid_type']),
    )
  })
})

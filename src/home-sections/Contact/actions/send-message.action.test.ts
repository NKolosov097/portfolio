import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CONTACT_ERROR_MESSAGES } from '@tests/fixtures/contact-error-messages'
import {
  ISendMessageFormState,
  sendMessage,
} from '@/home-sections/Contact/actions/send-message.action'

/** Hoisted so the `vi.mock` factories below can reference them despite hoisting. */
const { upsertMock, sendMailMock, getContactMailHtmlMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  sendMailMock: vi.fn(),
  getContactMailHtmlMock: vi.fn(),
}))

/** The real package throws on import outside a React Server Component. */
vi.mock('server-only', () => ({}))

vi.mock('@/lib/prisma', () => ({
  default: { user: { upsert: upsertMock } },
}))

vi.mock('@/lib/mail', () => ({
  sendMail: sendMailMock,
  getContactMailHtml: getContactMailHtmlMock,
}))

/** Idle state the form starts from, mirroring the `useActionState` initial value. */
const initialState: ISendMessageFormState = { success: false }

/** Builds a submission body, letting a case override one field to drive a failure path. */
const buildFormData = (overrides: Record<string, string> = {}): FormData => {
  const formData = new FormData()

  const fields: Record<string, string> = {
    name: 'Peter Parker',
    email: 'peter@example.com',
    company: 'Daily Bugle',
    profession: 'Photographer',
    message: 'Hello there',
    ...overrides,
  }

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value)
  }

  return formData
}

describe('sendMessage', () => {
  beforeEach(() => {
    upsertMock.mockResolvedValue({ id: 'user-1' })
    sendMailMock.mockResolvedValue({ messageId: 'mail-1' })
    getContactMailHtmlMock.mockResolvedValue('<html lang="en"></html>')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('persists the sender with the message and reports success', async () => {
    const result = await sendMessage(initialState, buildFormData(), CONTACT_ERROR_MESSAGES)

    expect(result).toEqual({ success: true })
    expect(upsertMock).toHaveBeenCalledTimes(1)

    const [upsertArgs] = upsertMock.mock.calls[0]

    expect(upsertArgs.where).toEqual({ email: 'peter@example.com' })
    expect(upsertArgs.create.messages.create).toEqual({ content: 'Hello there' })
    expect(upsertArgs.update.messages.create).toEqual({ content: 'Hello there' })
  })

  it('sends the confirmation mail to the address that was submitted', async () => {
    await sendMessage(initialState, buildFormData(), CONTACT_ERROR_MESSAGES)

    expect(getContactMailHtmlMock).toHaveBeenCalledWith('Hello there')
    expect(sendMailMock).toHaveBeenCalledTimes(1)
    expect(sendMailMock.mock.calls[0][0]).toMatchObject({ sendTo: 'peter@example.com' })
  })

  it('rejects an invalid payload without touching the database or the mailer', async () => {
    const result = await sendMessage(
      initialState,
      buildFormData({ email: 'nope' }),
      CONTACT_ERROR_MESSAGES,
    )

    expect(result.success).toBe(false)
    expect(result.errors?.email).toContain(CONTACT_ERROR_MESSAGES.email.incorrectEmail)
    expect(upsertMock).not.toHaveBeenCalled()
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it('echoes the submitted values back so the form can be repopulated after a failure', async () => {
    const result = await sendMessage(
      initialState,
      buildFormData({ message: 'Hi' }),
      CONTACT_ERROR_MESSAGES,
    )

    expect(result.success).toBe(false)
    expect(result.fields).toEqual({
      name: 'Peter Parker',
      email: 'peter@example.com',
      company: 'Daily Bugle',
      profession: 'Photographer',
      message: 'Hi',
    })
  })

  it('surfaces a database failure instead of reporting a false success', async () => {
    upsertMock.mockRejectedValueOnce(new Error('connection refused'))

    const result = await sendMessage(initialState, buildFormData(), CONTACT_ERROR_MESSAGES)

    expect(result.success).toBe(false)
    expect(result.errors?.globalError?.[0]).toContain('connection refused')
    expect(result.fields?.email).toBe('peter@example.com')
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it('still reports success when the message is stored but the mail cannot be sent', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('smtp unreachable'))

    const result = await sendMessage(initialState, buildFormData(), CONTACT_ERROR_MESSAGES)

    expect(result).toEqual({ success: true })
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a body that is not form data', async () => {
    const malformedPayload = { name: 'Peter Parker' } as unknown as FormData

    const result = await sendMessage(initialState, malformedPayload, CONTACT_ERROR_MESSAGES)

    expect(result).toEqual({ success: false, errors: { error: ['Invalid Form Data'] } })
    expect(upsertMock).not.toHaveBeenCalled()
  })
})

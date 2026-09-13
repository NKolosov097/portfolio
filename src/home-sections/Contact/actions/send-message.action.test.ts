import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { createSendMessage } from '@/home-sections/Contact/services/send-message'
import { EContactField } from '@/home-sections/Contact/types/contact.type'

const submissionId = 'aa1d1085-6b07-4c18-99fe-dc1ee32179dc'
const formData = (overrides: Record<string, FormDataEntryValue> = {}) => {
  const data = new FormData()
  const fields: Record<string, FormDataEntryValue> = {
    [EContactField.name]: 'Peter Parker',
    [EContactField.email]: 'Peter@Example.com',
    [EContactField.company]: '',
    [EContactField.profession]: '',
    [EContactField.message]: 'Hello!',
    submissionId,
    website: '',
    ...overrides,
  }
  Object.entries(fields).forEach(([key, value]) => data.set(key, value))
  return data
}

describe('sendMessage', () => {
  const accept = vi.fn()
  const notify = vi.fn()
  const getIdentity = vi.fn()
  const sendMessage = createSendMessage({ accept, notify, getIdentity })

  beforeEach(() => {
    getIdentity.mockResolvedValue('127.0.0.1')
    accept.mockResolvedValue({ kind: 'accepted', messageId: 42 })
    notify.mockResolvedValue(undefined)
  })

  it('persists normalized input and acknowledges its public submission ID', async () => {
    await expect(sendMessage({ status: 'idle' }, formData())).resolves.toEqual({
      status: 'success',
      submissionId,
    })
    expect(accept).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'peter@example.com', submissionId }),
      '127.0.0.1',
    )
    expect(notify).toHaveBeenCalledWith(42)
  })

  it('returns stable validation codes without persistence for malformed fields', async () => {
    const result = await sendMessage(
      { status: 'idle' },
      formData({ email: 'bad', message: new Blob(['file']) as FormDataEntryValue }),
    )
    expect(result).toEqual({
      status: 'validation-error',
      fieldErrors: { email: ['invalid_email'], message: ['invalid_type'] },
    })
    expect(accept).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('rejects non-FormData input with a stable form error', async () => {
    const malformed = { email: 'peter@example.com' } as unknown as FormData
    expect(await sendMessage({ status: 'idle' }, malformed)).toEqual({
      status: 'validation-error',
      fieldErrors: { form: ['invalid_type'] },
    })
    expect(accept).not.toHaveBeenCalled()
  })

  it('normalizes omitted optional fields to empty strings', async () => {
    const data = formData()
    data.delete(EContactField.company)
    data.delete(EContactField.profession)
    await sendMessage({ status: 'idle' }, data)
    expect(accept).toHaveBeenCalledWith(
      expect.objectContaining({ company: '', profession: '' }),
      '127.0.0.1',
    )
  })

  it('rejects unknown and duplicate fields', async () => {
    const unknown = formData({ unexpected: 'value' })
    expect(await sendMessage({ status: 'idle' }, unknown)).toEqual({
      status: 'validation-error',
      fieldErrors: { form: ['invalid_type'] },
    })

    const duplicate = formData()
    duplicate.append(EContactField.name, 'Miles Morales')
    expect(await sendMessage({ status: 'idle' }, duplicate)).toEqual({
      status: 'validation-error',
      fieldErrors: { name: ['invalid_type'] },
    })
  })

  it('does not consume policy or mail for a filled honeypot', async () => {
    expect(await sendMessage({ status: 'idle' }, formData({ website: 'bot.example' }))).toEqual({
      status: 'validation-error',
      fieldErrors: { form: ['invalid_type'] },
    })
    expect(accept).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('returns the original success for a replay without another mail claim', async () => {
    accept.mockResolvedValue({ kind: 'replay', messageId: 42 })
    expect(await sendMessage({ status: 'idle' }, formData())).toEqual({
      status: 'success',
      submissionId,
    })
    expect(notify).not.toHaveBeenCalled()
  })

  it('rejects payload changes on an accepted submission ID', async () => {
    accept.mockResolvedValue({ kind: 'mismatch' })
    expect(await sendMessage({ status: 'idle' }, formData())).toEqual({
      status: 'validation-error',
      fieldErrors: { submissionId: ['submission_id_reused'] },
    })
  })

  it('fails closed with sanitized unavailable state for identity or database outages', async () => {
    getIdentity.mockResolvedValueOnce(null)
    expect(await sendMessage({ status: 'idle' }, formData())).toEqual({
      status: 'unavailable',
      code: 'service_unavailable',
    })

    accept.mockRejectedValueOnce(new Error('connection refused password=secret'))
    const result = await sendMessage({ status: 'idle' }, formData())
    expect(result).toEqual({ status: 'unavailable', code: 'service_unavailable' })
    expect(JSON.stringify(result)).not.toContain('connection refused')
    expect(notify).not.toHaveBeenCalled()
  })

  it('reports rate limiting and keeps SMTP failure from changing stored success', async () => {
    accept.mockResolvedValueOnce({ kind: 'rate-limited' })
    expect(await sendMessage({ status: 'idle' }, formData())).toEqual({
      status: 'rate-limited',
      code: 'rate_limited',
    })

    accept.mockResolvedValueOnce({ kind: 'accepted', messageId: 43 })
    notify.mockRejectedValueOnce(new Error('smtp down'))
    expect(await sendMessage({ status: 'idle' }, formData())).toEqual({
      status: 'success',
      submissionId,
    })
  })
})

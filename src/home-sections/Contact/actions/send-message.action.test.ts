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
    attachments: '[]',
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

  it.each([
    ['malformed JSON', '{'],
    ['an object', '{}'],
    ['a raw file', new File(['%PDF-test'], 'brief.pdf', { type: 'application/pdf' })],
  ])('rejects %s in the attachment manifest', async (_case, attachments) => {
    expect(await sendMessage({ status: 'idle' }, formData({ attachments }))).toEqual({
      status: 'validation-error',
      fieldErrors: { attachments: ['attachment_invalid'] },
    })
    expect(accept).not.toHaveBeenCalled()
  })

  it('rejects a fourth attachment and a duplicate manifest field', async () => {
    const item = {
      url: 'https://store.private.blob.vercel-storage.com/contact/file.pdf',
      pathname: 'contact/submission/file.pdf',
      name: 'file.pdf',
    }
    expect(
      await sendMessage(
        { status: 'idle' },
        formData({ attachments: JSON.stringify([item, item, item, item]) }),
      ),
    ).toEqual({
      status: 'validation-error',
      fieldErrors: { attachments: ['too_many_files'] },
    })

    const duplicate = formData()
    duplicate.append('attachments', '[]')
    expect(await sendMessage({ status: 'idle' }, duplicate)).toEqual({
      status: 'validation-error',
      fieldErrors: { attachments: ['attachment_invalid'] },
    })
  })

  it('passes one decoded attachment reference to persistence', async () => {
    const item = {
      url: 'https://store.private.blob.vercel-storage.com/contact/file.pdf',
      pathname: 'contact/submission/file.pdf',
      name: 'file.pdf',
    }
    await sendMessage({ status: 'idle' }, formData({ attachments: JSON.stringify([item]) }))

    expect(accept).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: [item] }),
      '127.0.0.1',
    )
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

  it('maps authoritative attachment rejection to the attachment field', async () => {
    accept.mockResolvedValue({ kind: 'invalid-attachments' })
    expect(await sendMessage({ status: 'idle' }, formData())).toEqual({
      status: 'validation-error',
      fieldErrors: { attachments: ['attachment_invalid'] },
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

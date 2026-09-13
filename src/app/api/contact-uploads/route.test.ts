import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  consumeContactUploadLimit: vi.fn(),
  handleUpload: vi.fn(),
  resolveTrustedIdentity: vi.fn(),
}))

vi.mock('@vercel/blob/client', () => ({ handleUpload: mocks.handleUpload }))
vi.mock('@/home-sections/Contact/services/submission-policy', () => ({
  consumeContactUploadLimit: mocks.consumeContactUploadLimit,
  resolveTrustedIdentity: mocks.resolveTrustedIdentity,
}))

import { POST } from '@/app/api/contact-uploads/route'

const pathname = 'contact/fe95927d-ddf7-4e84-a564-6e6e2e37af81/brief.pdf'
const tokenRequest = (requestedPathname = pathname) =>
  new Request('http://localhost/api/contact-uploads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: { pathname: requestedPathname, multipart: false, clientPayload: null },
    }),
  })

describe('contact upload route', () => {
  beforeEach(() => {
    mocks.resolveTrustedIdentity.mockReturnValue('192.0.2.12')
    mocks.consumeContactUploadLimit.mockResolvedValue(true)
    mocks.handleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => ({
      type: 'blob.generate-client-token',
      clientToken: 'private-token',
      policy: await onBeforeGenerateToken(pathname, null, false),
    }))
  })

  it('authorizes a short-lived private upload with the contact attachment limits', async () => {
    const before = Date.now()
    const response = await POST(tokenRequest())
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.policy).toMatchObject({
      allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maximumSizeInBytes: 5_242_880,
      addRandomSuffix: true,
    })
    expect(result.policy.validUntil).toBeGreaterThanOrEqual(before + 9 * 60_000)
    expect(result.policy.validUntil).toBeLessThanOrEqual(Date.now() + 10 * 60_000)
    expect(mocks.handleUpload).toHaveBeenCalledWith(
      expect.objectContaining({ onUploadCompleted: expect.any(Function) }),
    )
  })

  it('rejects paths outside one contact submission directory', async () => {
    const response = await POST(tokenRequest('public/brief.pdf'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ ok: false, code: 'upload_rejected' })
    expect(mocks.consumeContactUploadLimit).not.toHaveBeenCalled()
    expect(mocks.handleUpload).not.toHaveBeenCalled()
  })

  it('fails closed without a trusted identity or remaining quota', async () => {
    mocks.resolveTrustedIdentity.mockReturnValueOnce(null)
    const unauthorized = await POST(tokenRequest())
    mocks.consumeContactUploadLimit.mockResolvedValueOnce(false)
    const limited = await POST(tokenRequest())

    expect(unauthorized.status).toBe(401)
    await expect(unauthorized.json()).resolves.toEqual({ ok: false, code: 'unauthorized' })
    expect(limited.status).toBe(429)
    await expect(limited.json()).resolves.toEqual({ ok: false, code: 'rate_limited' })
  })

  it('passes verified upload completion callbacks to the Blob SDK without visitor quota', async () => {
    mocks.handleUpload.mockResolvedValueOnce({ type: 'blob.upload-completed', response: 'ok' })
    const request = new Request('http://localhost/api/contact-uploads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'blob.upload-completed',
        payload: {
          blob: {
            url: 'https://example.private.blob.vercel-storage.com/contact/file.pdf',
            downloadUrl:
              'https://example.private.blob.vercel-storage.com/contact/file.pdf?download=1',
            pathname,
            contentType: 'application/pdf',
            contentDisposition: 'attachment',
          },
          tokenPayload: null,
        },
      }),
    })

    expect((await POST(request)).status).toBe(200)
    expect(mocks.resolveTrustedIdentity).not.toHaveBeenCalled()
    expect(mocks.consumeContactUploadLimit).not.toHaveBeenCalled()
  })
})

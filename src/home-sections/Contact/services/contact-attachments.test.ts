import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn(), head: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@vercel/blob', () => mocks)

import {
  InvalidContactAttachmentError,
  verifyContactAttachments,
} from '@/home-sections/Contact/services/contact-attachments'

const submissionId = 'fe95927d-ddf7-4e84-a564-6e6e2e37af81'
const pathname = `contact/${submissionId}/brief.pdf`
const privateUrl = `https://store.private.blob.vercel-storage.com/${pathname}`
const manifest = [{ url: privateUrl, pathname, name: '../brief.pdf' }]
const details = {
  url: privateUrl,
  downloadUrl: `${privateUrl}?download=1`,
  pathname,
  contentType: 'application/pdf',
  contentDisposition: 'attachment',
  cacheControl: 'public, max-age=0',
  uploadedAt: new Date(),
  size: 1_024,
  etag: 'etag-1',
}

const blob = (bytes: number[]) => ({
  statusCode: 200,
  stream: new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(Uint8Array.from(bytes))
      controller.close()
    },
  }),
  headers: new Headers(),
  blob: details,
})

describe('verifyContactAttachments', () => {
  beforeEach(() => {
    mocks.head.mockResolvedValue(details)
    mocks.get.mockImplementation(async () => blob([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]))
  })

  it('returns authoritative metadata and sanitizes the display name', async () => {
    await expect(verifyContactAttachments(submissionId, manifest)).resolves.toEqual([
      {
        url: privateUrl,
        pathname,
        name: 'brief.pdf',
        contentType: 'application/pdf',
        size: 1_024,
        etag: 'etag-1',
      },
    ])
    expect(mocks.get).toHaveBeenCalledWith(
      pathname,
      expect.objectContaining({ access: 'private', abortSignal: expect.any(AbortSignal) }),
    )
  })

  it.each([
    ['wrong prefix', [{ ...manifest[0], pathname: 'contact/another/brief.pdf' }]],
    ['public URL', [{ ...manifest[0], url: privateUrl.replace('.private.', '.public.') }]],
    ['fourth file', [...manifest, ...manifest, ...manifest, ...manifest]],
  ])('rejects %s', async (_case, input) => {
    await expect(verifyContactAttachments(submissionId, input)).rejects.toBeInstanceOf(
      InvalidContactAttachmentError,
    )
  })

  it.each([
    ['returned URL', { ...details, url: `${privateUrl}-other` }],
    ['returned pathname', { ...details, pathname: `${pathname}-other` }],
    ['oversized object', { ...details, size: 5_242_881 }],
  ])('rejects mismatched %s metadata', async (_case, returnedDetails) => {
    mocks.head.mockResolvedValueOnce(returnedDetails)
    await expect(verifyContactAttachments(submissionId, manifest)).rejects.toBeInstanceOf(
      InvalidContactAttachmentError,
    )
  })

  it('rejects a total larger than ten MiB', async () => {
    const files = [0, 1, 2].map((index) => ({
      url: `${privateUrl}-${index}`,
      pathname: `${pathname}-${index}`,
      name: `brief-${index}.pdf`,
    }))
    mocks.head.mockImplementation(async (url: string) => ({
      ...details,
      url,
      pathname: files.find((file) => file.url === url)!.pathname,
      size: 4 * 1024 * 1024,
    }))

    await expect(verifyContactAttachments(submissionId, files)).rejects.toBeInstanceOf(
      InvalidContactAttachmentError,
    )
  })

  it('rejects content whose signature does not match its MIME metadata', async () => {
    mocks.get.mockResolvedValueOnce(blob([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    await expect(verifyContactAttachments(submissionId, manifest)).rejects.toBeInstanceOf(
      InvalidContactAttachmentError,
    )
  })

  it.each([new Error('secret timeout detail'), null])(
    'sanitizes Blob timeout and not-found failures',
    async (failure) => {
      if (failure) mocks.head.mockRejectedValueOnce(failure)
      else mocks.get.mockResolvedValueOnce(null)

      await expect(verifyContactAttachments(submissionId, manifest)).rejects.toThrow(
        'contact attachment unavailable',
      )
    },
  )
})

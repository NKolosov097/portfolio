import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  head: vi.fn(),
  list: vi.fn(),
  query: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@vercel/blob', () => mocks)
vi.mock('@/db/client', () => ({ getContactPool: () => ({ query: mocks.query }) }))

import {
  cleanupContactAttachments,
  deleteDeliveredContactAttachments,
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
    vi.clearAllMocks()
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

describe('contact attachment cleanup', () => {
  const attachment = {
    ...manifest[0]!,
    name: 'brief.pdf',
    contentType: 'application/pdf' as const,
    size: 1_024,
    etag: 'etag-1',
  }

  beforeEach(() => vi.clearAllMocks())

  it('marks delivered rows deleted only after one successful Blob batch', async () => {
    mocks.del.mockResolvedValue(undefined)
    mocks.query.mockResolvedValue({ rowCount: 1, rows: [] })

    await deleteDeliveredContactAttachments(42, [attachment])

    expect(mocks.del).toHaveBeenCalledWith([privateUrl])
    expect(mocks.del.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.query.mock.invocationCallOrder[0]!,
    )
  })

  it('leaves deleted_at null when Blob deletion fails', async () => {
    mocks.del.mockRejectedValue(new Error('blob down'))
    await expect(deleteDeliveredContactAttachments(42, [attachment])).rejects.toThrow('blob down')
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('retries sent rows and deletes at most 25 stale unbound blobs', async () => {
    const now = new Date('2026-09-13T12:00:00.000Z')
    const deliveredUrl = `${privateUrl}-delivered`
    const boundUrl = `${privateUrl}-bound`
    const youngUrl = `${privateUrl}-young`
    const orphanUrls = Array.from({ length: 30 }, (_, index) => `${privateUrl}-orphan-${index}`)
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('JOIN messages'))
        return {
          rows: [
            {
              messageId: 42,
              url: deliveredUrl,
              pathname,
              name: 'delivered.pdf',
              contentType: 'application/pdf',
              size: 100,
              etag: 'delivered-etag',
            },
          ],
          rowCount: 1,
        }
      if (statement.includes('SELECT blob_url')) return { rows: [{ url: boundUrl }], rowCount: 1 }
      return { rows: [], rowCount: 1 }
    })
    mocks.list.mockResolvedValue({
      blobs: [
        { url: youngUrl, uploadedAt: new Date(now.getTime() - 60_000) },
        { url: boundUrl, uploadedAt: new Date(now.getTime() - 25 * 60 * 60_000) },
        ...orphanUrls.map((url) => ({
          url,
          uploadedAt: new Date(now.getTime() - 25 * 60 * 60_000),
        })),
      ],
      hasMore: false,
    })
    mocks.del.mockResolvedValue(undefined)

    await expect(cleanupContactAttachments({ query } as never, now)).resolves.toEqual({
      delivered: 1,
      orphaned: 25,
    })
    expect(mocks.del.mock.calls[0]?.[0]).toEqual([deliveredUrl])
    expect(mocks.del.mock.calls[1]?.[0]).toEqual(orphanUrls.slice(0, 25))
    expect(mocks.list).toHaveBeenCalledWith({ prefix: 'contact/', limit: 1_000 })
  })
})

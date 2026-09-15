import { Readable } from 'node:stream'

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  buildOwnerNotification,
  deliverClaimedNotification,
} from '@/home-sections/Contact/services/notify-owner'
import type { VerifiedContactAttachment } from '@/home-sections/Contact/attachments'
import { EContactNotificationDeliveryStatus } from '@/home-sections/Contact/types/contact.type'

const message = {
  id: 42,
  submissionId: 'aa1d1085-6b07-4c18-99fe-dc1ee32179dc',
  name: '<b>Peter</b>',
  email: 'peter@example.com',
  company: 'A&B',
  profession: `Dev"'`,
  content: `<b>hello</b>&"'\nsecond line`,
  notificationAttempts: 1,
  notificationClaimToken: '54e03dda-a41e-434a-9f66-93bb8c1ea6a5',
  attachments: [],
}
const attachments: VerifiedContactAttachment[] = [
  {
    url: 'https://store.private.blob.vercel-storage.com/contact/id/brief.pdf',
    pathname: 'contact/id/brief.pdf',
    name: 'brief.pdf',
    contentType: 'application/pdf',
    size: 100,
    etag: 'etag-1',
  },
  {
    url: 'https://store.private.blob.vercel-storage.com/contact/id/image.png',
    pathname: 'contact/id/image.png',
    name: 'image.png',
    contentType: 'image/png',
    size: 200,
    etag: 'etag-2',
  },
]

describe('owner notifications', () => {
  it('renders literal dynamic values in escaped HTML and complete plain text', () => {
    const notification = buildOwnerNotification(message, 'owner@example.test')

    expect(notification.replyTo).toBe('peter@example.com')
    expect(notification.text).toContain(`<b>hello</b>&"'`)
    expect(notification.html).toContain('&lt;b&gt;hello&lt;/b&gt;&amp;&quot;&#39;<br>second line')
    expect(notification.html).toContain('&lt;b&gt;Peter&lt;/b&gt;')
    expect(notification.html).not.toContain('<b>hello</b>')
    expect(notification).not.toHaveProperty('attachments')
  })

  it('marks a claimed notification sent after transport accepts it', async () => {
    const markSent = vi.fn().mockResolvedValue(true)
    const markFailed = vi.fn()
    await expect(
      deliverClaimedNotification(message, {
        ownerEmail: 'owner@example.test',
        send: vi.fn().mockResolvedValue({ ok: true, transportId: 'mail-1' }),
        markSent,
        markFailed,
        openAttachment: vi.fn(),
        deleteDeliveredAttachments: vi.fn().mockResolvedValue(undefined),
      }),
    ).resolves.toEqual({ status: EContactNotificationDeliveryStatus.sent })
    expect(markSent).toHaveBeenCalledWith(42, message.notificationClaimToken)
    expect(markFailed).not.toHaveBeenCalled()
  })

  it('opens and sends ordered private attachment streams before best-effort deletion', async () => {
    const streams = [Readable.from('%PDF-test'), Readable.from('png-test')]
    const openAttachment = vi
      .fn()
      .mockResolvedValueOnce(streams[0])
      .mockResolvedValueOnce(streams[1])
    const send = vi.fn().mockResolvedValue({ ok: true, transportId: 'mail-1' })
    const markSent = vi.fn().mockResolvedValue(true)
    const deleteDeliveredAttachments = vi.fn().mockRejectedValue(new Error('cleanup down'))

    await expect(
      deliverClaimedNotification(
        { ...message, attachments },
        {
          ownerEmail: 'owner@example.test',
          send,
          markSent,
          markFailed: vi.fn(),
          openAttachment,
          deleteDeliveredAttachments,
        },
      ),
    ).resolves.toEqual({ status: EContactNotificationDeliveryStatus.sent })
    expect(openAttachment.mock.calls.map(([value]) => value)).toEqual(
      attachments.map(({ pathname }) => pathname),
    )
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          { filename: 'brief.pdf', content: streams[0], contentType: 'application/pdf' },
          { filename: 'image.png', content: streams[1], contentType: 'image/png' },
        ],
      }),
    )
    expect(markSent.mock.invocationCallOrder[0]).toBeLessThan(
      deleteDeliveredAttachments.mock.invocationCallOrder[0]!,
    )
  })

  it('requeues an attachment open failure without calling SMTP', async () => {
    const send = vi.fn()
    const markFailed = vi.fn().mockResolvedValue(true)
    await expect(
      deliverClaimedNotification(
        { ...message, attachments },
        {
          ownerEmail: 'owner@example.test',
          send,
          markSent: vi.fn(),
          markFailed,
          openAttachment: vi.fn().mockRejectedValue(new Error('blob unavailable')),
          deleteDeliveredAttachments: vi.fn(),
        },
      ),
    ).resolves.toEqual({
      status: EContactNotificationDeliveryStatus.requeued,
      code: 'attachment_unavailable',
    })
    expect(send).not.toHaveBeenCalled()
    expect(markFailed).toHaveBeenCalledWith(
      42,
      message.notificationClaimToken,
      'attachment_unavailable',
      1,
    )
  })

  it('does not delete attachments after transport failure', async () => {
    const deleteDeliveredAttachments = vi.fn()
    await deliverClaimedNotification(
      { ...message, attachments: [attachments[0]!] },
      {
        ownerEmail: 'owner@example.test',
        send: vi.fn().mockResolvedValue({ ok: false, code: 'transport_failed' }),
        markSent: vi.fn(),
        markFailed: vi.fn().mockResolvedValue(true),
        openAttachment: vi.fn().mockResolvedValue(Readable.from('%PDF-test')),
        deleteDeliveredAttachments,
      },
    )
    expect(deleteDeliveredAttachments).not.toHaveBeenCalled()
  })

  it('records only an allow-listed failure code for retry', async () => {
    const markFailed = vi.fn().mockResolvedValue(true)
    await expect(
      deliverClaimedNotification(message, {
        ownerEmail: 'owner@example.test',
        send: vi.fn().mockResolvedValue({ ok: false, code: 'transport_failed' }),
        markSent: vi.fn(),
        markFailed,
        openAttachment: vi.fn(),
        deleteDeliveredAttachments: vi.fn(),
      }),
    ).resolves.toEqual({
      status: EContactNotificationDeliveryStatus.requeued,
      code: 'transport_failed',
    })
    expect(markFailed).toHaveBeenCalledWith(
      42,
      message.notificationClaimToken,
      'transport_failed',
      1,
    )
  })

  it('reports a lost lease instead of claiming a delivery was recorded', async () => {
    await expect(
      deliverClaimedNotification(message, {
        ownerEmail: 'owner@example.test',
        send: vi.fn().mockResolvedValue({ ok: true, transportId: 'mail-1' }),
        markSent: vi.fn().mockResolvedValue(false),
        markFailed: vi.fn(),
        openAttachment: vi.fn(),
        deleteDeliveredAttachments: vi.fn(),
      }),
    ).resolves.toEqual({ status: EContactNotificationDeliveryStatus.lostLease })

    await expect(
      deliverClaimedNotification(message, {
        ownerEmail: 'owner@example.test',
        send: vi.fn().mockResolvedValue({ ok: false, code: 'timeout' }),
        markSent: vi.fn(),
        markFailed: vi.fn().mockResolvedValue(false),
        openAttachment: vi.fn(),
        deleteDeliveredAttachments: vi.fn(),
      }),
    ).resolves.toEqual({ status: EContactNotificationDeliveryStatus.lostLease })
  })
})

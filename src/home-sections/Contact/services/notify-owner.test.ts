import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  buildOwnerNotification,
  deliverClaimedNotification,
} from '@/home-sections/Contact/services/notify-owner'

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
}

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
      }),
    ).resolves.toEqual({ status: 'sent' })
    expect(markSent).toHaveBeenCalledWith(42, message.notificationClaimToken)
    expect(markFailed).not.toHaveBeenCalled()
  })

  it('records only an allow-listed failure code for retry', async () => {
    const markFailed = vi.fn().mockResolvedValue(true)
    await expect(
      deliverClaimedNotification(message, {
        ownerEmail: 'owner@example.test',
        send: vi.fn().mockResolvedValue({ ok: false, code: 'transport_failed' }),
        markSent: vi.fn(),
        markFailed,
      }),
    ).resolves.toEqual({ status: 'requeued', code: 'transport_failed' })
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
      }),
    ).resolves.toEqual({ status: 'lost-lease' })

    await expect(
      deliverClaimedNotification(message, {
        ownerEmail: 'owner@example.test',
        send: vi.fn().mockResolvedValue({ ok: false, code: 'timeout' }),
        markSent: vi.fn(),
        markFailed: vi.fn().mockResolvedValue(false),
      }),
    ).resolves.toEqual({ status: 'lost-lease' })
  })
})

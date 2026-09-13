import { EventEmitter } from 'node:events'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { closeTransport, createConnection, createTransport, destroySocket, sendMailTransport } =
  vi.hoisted(() => ({
    closeTransport: vi.fn(),
    createConnection: vi.fn(),
    createTransport: vi.fn(),
    destroySocket: vi.fn(),
    sendMailTransport: vi.fn(),
  }))

vi.mock('server-only', () => ({}))
vi.mock('nodemailer', () => ({ default: { createTransport } }))
vi.mock('node:net', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:net')>()),
  createConnection,
}))

describe('sendMail', () => {
  beforeEach(() => {
    vi.resetModules()
    createTransport.mockReturnValue({ close: closeTransport, sendMail: sendMailTransport })
    const socket = new EventEmitter()
    Object.assign(socket, { destroy: destroySocket })
    createConnection.mockImplementation(() => {
      queueMicrotask(() => socket.emit('connect'))
      return socket
    })
    vi.stubEnv('SMTP_SERVER_HOST', '127.0.0.1')
    vi.stubEnv('SMTP_SERVER_PORT', '11025')
    vi.stubEnv('SMTP_SERVER_SECURE', 'false')
    vi.stubEnv('SMTP_FROM', 'portfolio@example.test')
  })

  it('uses bounded SMTP settings and reports accepted mail', async () => {
    sendMailTransport.mockResolvedValue({ messageId: 'mail-1' })
    const { sendMail } = await import('@/lib/mail')

    await expect(
      sendMail({
        to: 'owner@example.test',
        replyTo: 'sender@example.test',
        subject: 'Portfolio contact',
        text: 'Hello',
        html: '<p>Hello</p>',
      }),
    ).resolves.toEqual({ ok: true, transportId: 'mail-1' })
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: '127.0.0.1',
        port: 11025,
        secure: false,
        connectionTimeout: 5_000,
        socketTimeout: 10_000,
      }),
    )
  })

  it('returns a stable failure without exposing an SMTP exception', async () => {
    sendMailTransport.mockRejectedValue(new Error('smtp://secret:password@example.test'))
    const { sendMail } = await import('@/lib/mail')
    const result = await sendMail({
      to: 'owner@example.test',
      subject: 'Portfolio contact',
      text: 'secret body',
      html: '<p>secret body</p>',
    })

    expect(result).toEqual({ ok: false, code: 'transport_failed' })
    expect(JSON.stringify(result)).not.toContain('secret')
  })

  it('hands a secure SMTP transport a raw socket for one Nodemailer-owned TLS handshake', async () => {
    vi.stubEnv('SMTP_SERVER_SECURE', 'true')
    vi.stubEnv('SMTP_SERVER_PORT', '465')
    sendMailTransport.mockResolvedValue({ messageId: 'mail-secure' })
    const { sendMail } = await import('@/lib/mail')
    await sendMail({ to: 'owner@example.test', subject: 'subject', text: 'body' })

    const transport = createTransport.mock.calls.at(-1)?.[0] as {
      getSocket: (
        options: unknown,
        callback: (error: Error | null, socket?: { secured: boolean }) => void,
      ) => void
    }
    const socketOptions = await new Promise<{ secured: boolean }>((resolve, reject) => {
      transport.getSocket({}, (error, options) => {
        if (error || !options) reject(error ?? new Error('socket missing'))
        else resolve(options)
      })
    })

    expect(createConnection).toHaveBeenCalledWith({ host: '127.0.0.1', port: 465 })
    expect(socketOptions.secured).toBe(false)
  })

  it('fails closed when transport configuration is invalid', async () => {
    vi.stubEnv('SMTP_SERVER_PORT', 'invalid')
    const { sendMail } = await import('@/lib/mail')

    await expect(
      sendMail({ to: 'owner@example.test', subject: 'subject', text: 'body' }),
    ).resolves.toEqual({ ok: false, code: 'configuration' })
    expect(sendMailTransport).not.toHaveBeenCalled()
  })

  it('enforces a total delivery deadline and closes the transport', async () => {
    vi.useFakeTimers()
    createTransport.mockImplementationOnce(
      (options: {
        getSocket: (value: unknown, callback: (error: Error | null) => void) => void
      }) => ({
        close: closeTransport,
        sendMail: async () => {
          await new Promise<void>((resolve, reject) => {
            options.getSocket({}, (error) => (error ? reject(error) : resolve()))
          })
          return new Promise(() => undefined)
        },
      }),
    )
    const { sendMail } = await import('@/lib/mail')
    const delivery = sendMail({ to: 'owner@example.test', subject: 'subject', text: 'body' })

    await vi.advanceTimersByTimeAsync(15_001)
    await expect(delivery).resolves.toEqual({ ok: false, code: 'timeout' })
    expect(destroySocket).toHaveBeenCalledOnce()
    expect(closeTransport).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })
})

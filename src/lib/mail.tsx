import 'server-only'

import { createConnection, type Socket } from 'node:net'

import nodemailer from 'nodemailer'
import { z } from 'zod'

export type MailFailureCode = 'configuration' | 'rejected' | 'timeout' | 'transport_failed'
export type MailResult = { ok: true; transportId?: string } | { ok: false; code: MailFailureCode }

export interface MailInput {
  to: string
  replyTo?: string
  subject: string
  text: string
  html?: string
}

const getTransportConfig = () => {
  const port = Number(process.env.SMTP_SERVER_PORT ?? '465')
  const secureValue = process.env.SMTP_SERVER_SECURE ?? 'true'
  const host = process.env.SMTP_SERVER_HOST
  const from = process.env.SMTP_FROM ?? process.env.SMTP_SERVER_USERNAME
  if (
    !host ||
    !from ||
    !z.email().safeParse(from).success ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    !['true', 'false'].includes(secureValue)
  )
    return null

  const username = process.env.SMTP_SERVER_USERNAME
  const password = process.env.SMTP_SERVER_PASSWORD
  if ((username && !password) || (!username && password)) return null

  return {
    from,
    transport: {
      host,
      port,
      secure: secureValue === 'true',
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
      ...(username && password ? { auth: { user: username, pass: password } } : {}),
    },
  }
}

const classifyError = (error: unknown): MailFailureCode => {
  if (error instanceof DeliveryTimeoutError) return 'timeout'
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error ? String(error.code) : ''
    if (['ETIMEDOUT', 'ESOCKET', 'ECONNECTION'].includes(code)) return 'timeout'
    if (code.startsWith('EENVELOPE') || code.startsWith('EMESSAGE')) return 'rejected'
  }
  return 'transport_failed'
}

class DeliveryTimeoutError extends Error {}

export const sendMail = async (input: MailInput): Promise<MailResult> => {
  const config = getTransportConfig()
  if (
    !config ||
    !z.email().safeParse(input.to).success ||
    (input.replyTo && !z.email().safeParse(input.replyTo).success)
  ) {
    return { ok: false, code: 'configuration' }
  }

  const sockets = new Set<Socket>()
  const getSocket = (
    _options: unknown,
    callback: (error: Error | null, options?: { connection: Socket; secured: false }) => void,
  ) => {
    const socket = createConnection({ host: config.transport.host, port: config.transport.port })
    sockets.add(socket)
    socket.once('close', () => sockets.delete(socket))
    let pending = true
    const onError = (error: Error) => {
      if (!pending) return
      pending = false
      callback(error)
    }
    socket.once('error', onError)
    socket.once('connect', () => {
      if (!pending) return
      pending = false
      socket.off('error', onError)
      // Nodemailer performs the TLS handshake and owns the wrapper; the tracked raw socket remains abortable.
      callback(null, { connection: socket, secured: false })
    })
  }
  const transporter = nodemailer.createTransport({ ...config.transport, getSocket })
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const info = await Promise.race([
      transporter.sendMail({
        from: config.from,
        to: input.to,
        replyTo: input.replyTo,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          for (const socket of sockets) socket.destroy()
          reject(new DeliveryTimeoutError())
        }, 15_000)
      }),
    ])
    return { ok: true, ...(info.messageId ? { transportId: info.messageId } : {}) }
  } catch (error) {
    return { ok: false, code: classifyError(error) }
  } finally {
    if (timeout) clearTimeout(timeout)
    transporter.close()
  }
}

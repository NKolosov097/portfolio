import 'server-only'

import type { Readable } from 'node:stream'

import { z } from 'zod'

import type { MailFailureCode, MailInput, MailResult } from '@/lib/mail'
import { sendMail } from '@/lib/mail'
import { getContactPool } from '@/db/client'
import type { VerifiedContactAttachment } from '@/home-sections/Contact/attachments'
import {
  deleteDeliveredContactAttachments,
  openContactAttachment,
} from '@/home-sections/Contact/services/contact-attachments'
import {
  claimContactNotification,
  markNotificationFailed,
  markNotificationSent,
} from '@/home-sections/Contact/services/notification-store'

export interface ClaimedContactNotification {
  id: number
  submissionId: string
  name: string
  email: string
  company: string
  profession: string
  content: string
  notificationAttempts: number
  notificationClaimToken: string
  attachments: VerifiedContactAttachment[]
}

export type ContactNotificationFailureCode = MailFailureCode | 'attachment_unavailable'

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const htmlLines = (value: string) => escapeHtml(value).replaceAll(/\r?\n/g, '<br>')

export const buildOwnerNotification = (
  message: ClaimedContactNotification,
  ownerEmail: string,
): MailInput => ({
  to: ownerEmail,
  replyTo: message.email,
  subject: `Portfolio contact from ${message.name}`,
  text: [
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    `Company: ${message.company || '(not provided)'}`,
    `Profession: ${message.profession || '(not provided)'}`,
    `Submission: ${message.submissionId}`,
    '',
    message.content,
  ].join('\n'),
  html: `<dl><dt>Name</dt><dd>${htmlLines(message.name)}</dd><dt>Email</dt><dd>${htmlLines(message.email)}</dd><dt>Company</dt><dd>${htmlLines(message.company || '(not provided)')}</dd><dt>Profession</dt><dd>${htmlLines(message.profession || '(not provided)')}</dd><dt>Submission</dt><dd>${htmlLines(message.submissionId)}</dd></dl><p>${htmlLines(message.content)}</p>`,
})

export interface NotificationDeliveryDependencies {
  ownerEmail: string
  send(input: MailInput): Promise<MailResult>
  markSent(messageId: number, token: string): Promise<boolean>
  markFailed(
    messageId: number,
    token: string,
    code: ContactNotificationFailureCode,
    attempts: number,
  ): Promise<boolean>
  openAttachment(pathname: string): Promise<Readable>
  deleteDeliveredAttachments(
    messageId: number,
    attachments: VerifiedContactAttachment[],
  ): Promise<void>
}

export const deliverClaimedNotification = async (
  message: ClaimedContactNotification,
  dependencies: NotificationDeliveryDependencies,
): Promise<
  | { status: 'sent' }
  | { status: 'requeued'; code: ContactNotificationFailureCode }
  | { status: 'lost-lease' }
> => {
  const mail = buildOwnerNotification(message, dependencies.ownerEmail)
  if (message.attachments.length) {
    mail.attachments = []
    try {
      for (const attachment of message.attachments)
        mail.attachments.push({
          filename: attachment.name,
          content: await dependencies.openAttachment(attachment.pathname),
          contentType: attachment.contentType,
        })
    } catch {
      const isRecorded = await dependencies.markFailed(
        message.id,
        message.notificationClaimToken,
        'attachment_unavailable',
        message.notificationAttempts,
      )
      return isRecorded
        ? { status: 'requeued', code: 'attachment_unavailable' }
        : { status: 'lost-lease' }
    }
  }

  const outcome = await dependencies.send(mail)
  if (outcome.ok) {
    const isRecorded = await dependencies.markSent(message.id, message.notificationClaimToken)
    if (!isRecorded) return { status: 'lost-lease' }
    await dependencies
      .deleteDeliveredAttachments(message.id, message.attachments)
      .catch(() => undefined)
    return { status: 'sent' }
  }
  const isRecorded = await dependencies.markFailed(
    message.id,
    message.notificationClaimToken,
    outcome.code,
    message.notificationAttempts,
  )
  return isRecorded ? { status: 'requeued', code: outcome.code } : { status: 'lost-lease' }
}

export const notifyPersistedContactMessage = async (messageId: number) => {
  const pool = getContactPool()
  const claim = await claimContactNotification(pool, messageId)
  if (!claim) return
  const owner = z.email().safeParse(process.env.SITE_MAIL_RECIEVER)
  if (!owner.success) {
    await markNotificationFailed(
      pool,
      claim.id,
      claim.notificationClaimToken,
      'configuration',
      claim.notificationAttempts,
    )
    return
  }
  await deliverClaimedNotification(claim, {
    ownerEmail: owner.data,
    send: sendMail,
    markSent: (id, token) => markNotificationSent(pool, id, token),
    markFailed: (id, token, code, attempts) =>
      markNotificationFailed(pool, id, token, code, attempts),
    openAttachment: openContactAttachment,
    deleteDeliveredAttachments: deleteDeliveredContactAttachments,
  })
}

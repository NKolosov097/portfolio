'use server'

import 'server-only'

import { headers } from 'next/headers'

import { notifyPersistedContactMessage } from '@/home-sections/Contact/services/notify-owner'
import { createSendMessage } from '@/home-sections/Contact/services/send-message'
import {
  acceptContactSubmission,
  resolveTrustedIdentity,
} from '@/home-sections/Contact/services/submission-policy'
import type { ContactSubmissionState } from '@/home-sections/Contact/types/submission.type'

export type ISendMessageFormState = ContactSubmissionState

const runSendMessage = createSendMessage({
  accept: acceptContactSubmission,
  notify: notifyPersistedContactMessage,
  getIdentity: async () => resolveTrustedIdentity(await headers()),
})

export async function sendMessage(previousState: ContactSubmissionState, payload: FormData) {
  return runSendMessage(previousState, payload)
}

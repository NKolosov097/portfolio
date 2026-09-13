import 'server-only'

import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { NodePgTransaction } from 'drizzle-orm/node-postgres'

import * as schema from '@/db/schema'
import { contactSubmissionKeys, messages, users } from '@/db/schema'
import { getContactDb } from '@/db/client'
import type { ValidatedContactSubmission } from '@/home-sections/Contact/types/submission.type'

export type ContactTransaction = NodePgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

export const saveContactMessageInTransaction = async (
  transaction: ContactTransaction,
  input: ValidatedContactSubmission,
): Promise<number> => {
  const [user] = await transaction
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      company: input.company,
      profession: input.profession,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: input.name,
        company: input.company,
        profession: input.profession,
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id })
  if (!user) throw new Error('contact persistence unavailable')

  const [message] = await transaction
    .insert(messages)
    .values({
      submissionId: input.submissionId,
      authorId: user.id,
      name: input.name,
      email: input.email,
      company: input.company,
      profession: input.profession,
      content: input.message,
    })
    .returning({ id: messages.id })
  if (!message) throw new Error('contact persistence unavailable')
  return message.id
}

export const saveContactMessage = async (input: ValidatedContactSubmission) =>
  getContactDb().transaction(async (transaction) => {
    await transaction.insert(contactSubmissionKeys).values({ submissionId: input.submissionId })
    return saveContactMessageInTransaction(transaction, input)
  })

import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import './load-env'

import * as schema from '../src/db/schema'
import { contactSubmissionKeys, messages, users } from '../src/db/schema'

const submissionId = '00000000-0000-4000-8000-000000000001'
const email = 'feedback-seed@example.test'

export const seedFeedback = async (providedUrl?: string) => {
  const connectionString = providedUrl ?? process.env.DATABASE_URL?.trim()
  if (!connectionString || connectionString.startsWith('prisma://'))
    throw new Error('DATABASE_URL must be PostgreSQL')
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 2_000 })
  const database = drizzle(pool, { schema })
  try {
    await database.transaction(async (transaction) => {
      const [key] = await transaction
        .insert(contactSubmissionKeys)
        .values({ submissionId })
        .onConflictDoNothing()
        .returning()
      if (!key) return
      const [user] = await transaction
        .insert(users)
        .values({
          name: 'Feedback Seed',
          email,
          company: 'Example',
          profession: 'Synthetic record',
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            name: 'Feedback Seed',
            company: 'Example',
            profession: 'Synthetic record',
            updatedAt: new Date(),
          },
        })
        .returning({ id: users.id })
      if (!user) throw new Error('Seed failed')
      await transaction.insert(messages).values({
        submissionId,
        authorId: user.id,
        name: 'Feedback Seed',
        email,
        company: 'Example',
        profession: 'Synthetic record',
        content: 'Synthetic feedback seed message.',
        notificationState: 'sent',
        notificationSentAt: new Date(),
      })
    })
  } finally {
    await pool.end()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void seedFeedback().catch(() => {
    console.error('Feedback seed failed')
    process.exitCode = 1
  })
}

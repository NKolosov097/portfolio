import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const notificationState = pgEnum('contact_notification_state', [
  'pending',
  'sending',
  'sent',
  'failed',
])

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    company: varchar('company', { length: 150 }).notNull().default(''),
    profession: varchar('profession', { length: 150 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
)

export const contactSubmissionKeys = pgTable('contact_submission_keys', {
  submissionId: uuid('submission_id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => contactSubmissionKeys.submissionId),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    company: varchar('company', { length: 150 }).notNull().default(''),
    profession: varchar('profession', { length: 150 }).notNull().default(''),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    notificationState: notificationState('notification_state').notNull().default('pending'),
    notificationAttempts: integer('notification_attempts').notNull().default(0),
    notificationNextAttemptAt: timestamp('notification_next_attempt_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    notificationLeaseUntil: timestamp('notification_lease_until', { withTimezone: true }),
    notificationClaimToken: uuid('notification_claim_token'),
    notificationSentAt: timestamp('notification_sent_at', { withTimezone: true }),
    notificationErrorCode: varchar('notification_error_code', { length: 32 }),
  },
  (table) => [
    uniqueIndex('messages_submission_id_unique').on(table.submissionId),
    index('messages_notification_due_idx').on(
      table.notificationState,
      table.notificationNextAttemptAt,
    ),
    check('messages_content_length_check', sql`char_length(${table.content}) between 6 and 5000`),
    check('messages_name_length_check', sql`char_length(${table.name}) between 1 and 100`),
    check(
      'messages_notification_attempts_check',
      sql`${table.notificationAttempts} between 0 and 5`,
    ),
    check(
      'messages_notification_error_code_check',
      sql`${table.notificationErrorCode} is null or ${table.notificationErrorCode} in ('configuration', 'rejected', 'timeout', 'transport_failed', 'attachment_unavailable')`,
    ),
  ],
)

export const contactAttachments = pgTable(
  'contact_attachments',
  {
    id: serial('id').primaryKey(),
    messageId: integer('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    blobUrl: text('blob_url').notNull(),
    pathname: text('pathname').notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    contentType: varchar('content_type', { length: 32 }).notNull(),
    byteSize: integer('byte_size').notNull(),
    etag: varchar('etag', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('contact_attachments_message_position_unique').on(table.messageId, table.position),
    uniqueIndex('contact_attachments_blob_url_unique').on(table.blobUrl),
    check('contact_attachments_position_check', sql`${table.position} between 0 and 2`),
    check(
      'contact_attachments_content_type_check',
      sql`${table.contentType} in ('application/pdf', 'image/jpeg', 'image/png')`,
    ),
    check('contact_attachments_byte_size_check', sql`${table.byteSize} between 1 and 5242880`),
  ],
)

export const contactRateLimits = pgTable(
  'contact_rate_limits',
  {
    scope: varchar('scope', { length: 16 }).notNull(),
    valueHash: varchar('value_hash', { length: 64 }).notNull(),
    count: integer('count').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.valueHash] }),
    index('contact_rate_limits_expires_idx').on(table.expiresAt),
    check('contact_rate_limits_count_check', sql`${table.count} > 0`),
  ],
)

export const contactNotificationJobs = pgTable('contact_notification_jobs', {
  jobName: varchar('job_name', { length: 64 }).primaryKey(),
  leaseToken: uuid('lease_token'),
  leaseUntil: timestamp('lease_until', { withTimezone: true }),
  lastStartedAt: timestamp('last_started_at', { withTimezone: true }),
  lastCompletedAt: timestamp('last_completed_at', { withTimezone: true }),
  lastStatus: varchar('last_status', { length: 32 }),
  lastClaimed: integer('last_claimed').notNull().default(0),
  lastSent: integer('last_sent').notNull().default(0),
  lastRequeued: integer('last_requeued').notNull().default(0),
  lastLostLease: integer('last_lost_lease').notNull().default(0),
})

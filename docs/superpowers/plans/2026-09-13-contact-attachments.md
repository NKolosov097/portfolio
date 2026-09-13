# Contact Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an anonymous Contact visitor upload as many as three private PDF/JPEG/PNG files and preserve them through durable SMTP retries.

**Architecture:** The browser uploads files directly to a private Vercel Blob store, then submits a small manifest through the existing Server Action. The server verifies immutable Blob metadata and file signatures, persists ordered attachment metadata with the message, and opens authenticated streams when Nodemailer sends or retries the owner notification.

**Tech Stack:** Next.js 16 App Router and Server Actions, React 19, React Hook Form, Zod 4, Vercel Blob, Drizzle ORM, PostgreSQL, Nodemailer, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-13-contact-attachments-design.md`

## Global Constraints

- Accept zero to three files; each file is at most 5,242,880 bytes and the total is at most 10,485,760 bytes.
- Accept only `application/pdf`, `image/jpeg`, and `image/png`, confirmed by server-side file signatures.
- Use native file input behavior; do not add drag-and-drop, previews, archive/office formats, CAPTCHA, or malware-scanning dependencies.
- Keep blobs private and immutable under `contact/<submissionId>/`; never expose the Blob credential to the browser.
- Preserve the existing persistence-before-SMTP, idempotent replay, five-attempt retry, and sanitized public-error contracts.
- Rate-limit token creation to 20 uploads per trusted IP per 10-minute window.
- Keep all new migrations additive and make tests use mocks or the isolated local PostgreSQL/Mailpit services, never production services.
- Use the project formatter only on exact touched files; do not run the repository-wide `pnpm format` command.

## File Structure

- `src/home-sections/Contact/attachments.ts`: shared fixed limits, manifest schemas, filename normalization, browser selection validation, and signature detection.
- `src/home-sections/Contact/services/contact-attachments.ts`: private Blob verification, authenticated stream opening, deletion, and bounded cleanup.
- `src/app/api/contact-uploads/route.ts`: Vercel Blob client-token exchange guarded by trusted identity and upload quota.
- `src/db/schema.ts` plus one generated Drizzle migration: durable ordered attachment metadata.
- Existing Contact submission, persistence, notification, cron, form, mail, locale, and test files change only where their current flow needs attachment data.

---

### Task 1: Define the Shared Attachment Contract

**Files:**

- Create: `src/home-sections/Contact/attachments.ts`
- Create: `src/home-sections/Contact/attachments.test.ts`
- Modify: `src/home-sections/Contact/types/submission.type.ts`
- Modify: `src/home-sections/Contact/schemas/send-message.schema.ts`
- Modify: `src/home-sections/Contact/schemas/send-message.schema.test.ts`

**Interfaces:**

- Produces: `CONTACT_ATTACHMENT_TYPES`, `MAX_CONTACT_ATTACHMENTS`, `MAX_CONTACT_ATTACHMENT_BYTES`, `MAX_CONTACT_ATTACHMENT_TOTAL_BYTES`.
- Produces: `AttachmentManifestItem`, `VerifiedContactAttachment`, `AttachmentErrorCode`.
- Produces: `attachmentManifestSchema`, `validateAttachmentFiles(files)`, `sanitizeAttachmentName(name)`, and `detectAttachmentContentType(bytes)`.
- `contactSubmissionSchema` consumes an already decoded `attachments` array; JSON decoding remains at the FormData boundary in Task 5.

- [ ] **Step 1: Write failing policy and schema tests**

Add focused cases that pin exact bytes, types, normalized names, magic bytes, and manifest shape:

```ts
it('enforces count, per-file, total, and MIME limits', () => {
  expect(validateAttachmentFiles([])).toBeNull()
  expect(validateAttachmentFiles([file('a.pdf', 5_242_881, 'application/pdf')])).toBe(
    'file_too_large',
  )
  expect(
    validateAttachmentFiles([
      file('a.pdf', 5_242_880, 'application/pdf'),
      file('b.pdf', 5_242_880, 'application/pdf'),
      file('c.pdf', 1, 'application/pdf'),
    ]),
  ).toBe('files_too_large')
  expect(validateAttachmentFiles([file('a.exe', 10, 'application/octet-stream')])).toBe(
    'unsupported_file_type',
  )
})

it.each([
  [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), 'application/pdf'],
  [new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg'],
  [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
  [new Uint8Array([0x4d, 0x5a]), null],
] as const)('detects a file signature', (bytes, expected) => {
  expect(detectAttachmentContentType(bytes)).toBe(expected)
})

it('accepts a strict ordered manifest', () => {
  expect(
    attachmentManifestSchema.parse([
      {
        url: 'https://store.private.blob.vercel-storage.com/contact/id/file.pdf',
        pathname: 'contact/aa1d1085-6b07-4c18-99fe-dc1ee32179dc/file.pdf',
        name: 'brief.pdf',
      },
    ]),
  ).toHaveLength(1)
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `pnpm.cmd vitest run src/home-sections/Contact/attachments.test.ts src/home-sections/Contact/schemas/send-message.schema.test.ts`

Expected: FAIL because `attachments.ts` and the new submission field do not exist.

- [ ] **Step 3: Add the minimum shared contract**

Implement these exact public shapes in `attachments.ts`:

```ts
import { z } from 'zod'

export const MAX_CONTACT_ATTACHMENTS = 3
export const MAX_CONTACT_ATTACHMENT_BYTES = 5 * 1024 * 1024
export const MAX_CONTACT_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024
export const CONTACT_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

export type ContactAttachmentType = (typeof CONTACT_ATTACHMENT_TYPES)[number]
export type AttachmentErrorCode =
  | 'too_many_files'
  | 'unsupported_file_type'
  | 'file_too_large'
  | 'files_too_large'
  | 'upload_failed'
  | 'attachment_invalid'

export const attachmentManifestItemSchema = z.strictObject({
  url: z.url(),
  pathname: z.string().min(1).max(768),
  name: z.string().min(1).max(255),
})
export const attachmentManifestSchema = z
  .array(attachmentManifestItemSchema)
  .max(MAX_CONTACT_ATTACHMENTS, 'too_many_files')

export type AttachmentManifestItem = z.infer<typeof attachmentManifestItemSchema>
export type VerifiedContactAttachment = AttachmentManifestItem & {
  contentType: ContactAttachmentType
  size: number
  etag: string
}
```

Implement `validateAttachmentFiles` with one loop that returns the first stable code and checks total bytes after each accepted file. Implement `sanitizeAttachmentName` with `split(/[\\/]/).at(-1)`, removal of C0/DEL control characters, `trim()`, and a 255-character slice; fall back to `attachment`. Implement signature detection with the four byte sequences pinned by the tests.

Extend `ValidatedContactSubmission` with `attachments: AttachmentManifestItem[]`, add `'attachments'` to `ContactField`, add all six attachment codes to `ContactFieldErrorCode`, and add `attachments: attachmentManifestSchema.default([])` to `contactSubmissionSchema`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `pnpm.cmd vitest run src/home-sections/Contact/attachments.test.ts src/home-sections/Contact/schemas/send-message.schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the shared contract**

```powershell
git add src/home-sections/Contact/attachments.ts src/home-sections/Contact/attachments.test.ts src/home-sections/Contact/types/submission.type.ts src/home-sections/Contact/schemas/send-message.schema.ts src/home-sections/Contact/schemas/send-message.schema.test.ts
git commit -m "feat: define contact attachment policy"
```

### Task 2: Add Durable Attachment Metadata

**Files:**

- Modify: `src/db/schema.ts`
- Modify: `tests/integration/contact-persistence.test.ts`
- Create: `drizzle/0004_contact_attachments.sql` (generated name suffix may differ)
- Create: `drizzle/meta/0004_snapshot.json`
- Modify: `drizzle/meta/_journal.json`

**Interfaces:**

- Produces: Drizzle table `contactAttachments` and PostgreSQL table `contact_attachments`.
- `contactAttachments.$inferInsert` is consumed by Task 4 persistence.

- [ ] **Step 1: Extend the fresh-schema integration assertion**

Change the expected table list to include `contact_attachments` and expect six tables. Add a database-boundary case that rejects a fourth position and a file larger than 5,242,880 bytes.

```ts
expect(tables.rows[0].count).toBe(6)

await expect(
  pool.query(
    `INSERT INTO contact_attachments
    (message_id, position, blob_url, pathname, original_name, content_type, byte_size, etag)
    VALUES ($1, 3, $2, $3, 'bad.pdf', 'application/pdf', 5242881, 'etag')`,
    [
      acceptedMessageId,
      `https://store.private.blob.vercel-storage.com/contact/${run}/bad.pdf`,
      `contact/${run}/bad.pdf`,
    ],
  ),
).rejects.toThrow()
```

- [ ] **Step 2: Run the isolated integration test and verify RED**

Run: `pnpm.cmd test:integration -- tests/integration/contact-persistence.test.ts`

Expected: FAIL because `contact_attachments` is absent.

- [ ] **Step 3: Add the Drizzle table**

Add this schema shape and corresponding imports:

```ts
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
```

In the same schema edit, widen `messages_notification_error_code_check` to
include `'attachment_unavailable'`. This is the only existing constraint the
migration may replace; its accepted set only grows.

- [ ] **Step 4: Generate and inspect the additive migration**

Run: `pnpm.cmd db:generate`

Expected: one new `0004_*` SQL migration, one snapshot, and one journal entry.
Read the SQL and confirm it creates `contact_attachments` and widens only
`messages_notification_error_code_check`; it must not drop or rewrite an
existing table or remove an accepted error code.

- [ ] **Step 5: Run the integration test and verify GREEN**

Run: `pnpm.cmd test:integration -- tests/integration/contact-persistence.test.ts`

Expected: PASS, including two consecutive migrations against a fresh schema.

- [ ] **Step 6: Commit the migration**

```powershell
git add src/db/schema.ts tests/integration/contact-persistence.test.ts drizzle
git commit -m "feat: persist contact attachment metadata"
```

### Task 3: Authorize Direct Private-Blob Uploads

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/home-sections/Contact/services/submission-policy.ts`
- Modify: `src/home-sections/Contact/services/submission-policy.test.ts`
- Create: `src/app/api/contact-uploads/route.ts`
- Create: `src/app/api/contact-uploads/route.test.ts`

**Interfaces:**

- Produces: `consumeContactUploadLimit(identity, dependencies?) => Promise<boolean>`.
- Produces: `POST(request)` at `/api/contact-uploads` using `handleUpload`.
- Consumes: Task 1 limits/types and the existing `resolveTrustedIdentity`/`contact_rate_limits` boundary.

- [ ] **Step 1: Install the one storage dependency**

Run: `pnpm.cmd add @vercel/blob`

Expected: `@vercel/blob` is pinned in `package.json` and `pnpm-lock.yaml`; no other direct dependency is added.

- [ ] **Step 2: Write failing upload-quota and route tests**

The policy test must prove a missing secret fails closed. The route test mocks `handleUpload`, invokes `onBeforeGenerateToken`, and pins the private upload policy:

```ts
expect(handleUpload).toHaveBeenCalledWith(
  expect.objectContaining({
    request,
    onBeforeGenerateToken: expect.any(Function),
    onUploadCompleted: expect.any(Function),
  }),
)
expect(await onBeforeGenerateToken(pathname)).toMatchObject({
  allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maximumSizeInBytes: 5_242_880,
  addRandomSuffix: true,
})
```

Also assert 401 for a missing trusted IP, 429 when `consumeContactUploadLimit` returns false, and 400 for a pathname outside `contact/<uuid>/` or containing another slash.

- [ ] **Step 3: Run the focused tests and verify RED**

Run: `pnpm.cmd vitest run src/home-sections/Contact/services/submission-policy.test.ts src/app/api/contact-uploads/route.test.ts`

Expected: FAIL because the quota function and route do not exist.

- [ ] **Step 4: Reuse the existing database rate limiter**

Export a narrow function without creating a second limiter:

```ts
const CONTACT_UPLOAD_LIMIT = 20

export const consumeContactUploadLimit = async (
  trustedIdentity: string,
  dependencies: { pool?: Pool; rateLimitSecret?: string } = {},
) => {
  const secret = dependencies.rateLimitSecret ?? process.env.CONTACT_RATE_LIMIT_SECRET
  if (!secret) throw new Error('contact persistence unavailable')
  const database = drizzle(dependencies.pool ?? getContactPool(), { schema })
  return database.transaction((transaction) =>
    consumeRateLimit(
      transaction,
      'upload',
      hashRateIdentity(secret, 'upload', trustedIdentity),
      CONTACT_UPLOAD_LIMIT,
    ),
  )
}
```

Extend the private `consumeRateLimit` scope union to `'identity' | 'email' | 'upload'`; the database column already fits the value.

- [ ] **Step 5: Implement the token route**

Export `runtime = 'nodejs'`. Parse `HandleUploadBody` with the SDK and call `handleUpload`. Inside `onBeforeGenerateToken`, validate the pathname against the current request's UUID prefix, resolve the trusted IP from `request.headers`, consume one upload token, and return:

```ts
return {
  allowedContentTypes: [...CONTACT_ATTACHMENT_TYPES],
  maximumSizeInBytes: MAX_CONTACT_ATTACHMENT_BYTES,
  addRandomSuffix: true,
  validUntil: Date.now() + 10 * 60 * 1000,
}
```

`onUploadCompleted` returns without database work. Return stable JSON `{ ok: false, code: 'unauthorized' }` with 401, `{ ok: false, code: 'rate_limited' }` with 429, or `{ ok: false, code: 'upload_rejected' }` with 400. Do not serialize exception messages.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `pnpm.cmd vitest run src/home-sections/Contact/services/submission-policy.test.ts src/app/api/contact-uploads/route.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit direct-upload authorization**

```powershell
git add package.json pnpm-lock.yaml src/home-sections/Contact/services/submission-policy.ts src/home-sections/Contact/services/submission-policy.test.ts src/app/api/contact-uploads
git commit -m "feat: authorize private contact uploads"
```

### Task 4: Verify Blobs and Persist Them Idempotently

**Files:**

- Create: `src/home-sections/Contact/services/contact-attachments.ts`
- Create: `src/home-sections/Contact/services/contact-attachments.test.ts`
- Modify: `src/home-sections/Contact/services/save-message.ts`
- Modify: `src/home-sections/Contact/services/submission-policy.ts`
- Modify: `tests/integration/contact-persistence.test.ts`

**Interfaces:**

- Produces: `verifyContactAttachments(submissionId, manifest) => Promise<VerifiedContactAttachment[]>`.
- Produces: `openContactAttachment(pathname) => Promise<Readable>` for Task 6.
- Produces: exported `InvalidContactAttachmentError` for the acceptance boundary.
- `saveContactMessageInTransaction(transaction, input, attachments)` atomically inserts ordered metadata.
- `acceptContactSubmission` gains injectable `verifyAttachments` for deterministic tests and uses the real verifier by default.

- [ ] **Step 1: Write failing Blob-verification tests**

Mock `@vercel/blob` `head` and `get`. Cover a valid PDF, wrong submission prefix, public-store URL, mismatched returned pathname/URL, a fourth file, a 5,242,881-byte object, a total over 10,485,760 bytes, mismatched signature/MIME, and timeout/not-found sanitization.

```ts
await expect(
  verifyContactAttachments(submissionId, [{ url: privateUrl, pathname, name: '../brief.pdf' }]),
).resolves.toEqual([
  {
    url: privateUrl,
    pathname,
    name: 'brief.pdf',
    contentType: 'application/pdf',
    size: 1024,
    etag: 'etag-1',
  },
])
```

Define `privateUrl` as
`https://store.private.blob.vercel-storage.com/${pathname}` and `pathname` as
`contact/${submissionId}/brief.pdf` in the test setup. Obtain
`acceptedMessageId` by accepting a valid no-attachment submission in the
database-boundary test before the direct SQL insert.

- [ ] **Step 2: Write failing persistence replay tests**

Extend the integration helper so a submission accepts `attachments`. Inject a verifier that returns one fixed verified PDF. Assert:

- one message and one position-zero row commit together;
- 20 parallel identical IDs produce one attachment row;
- exact replay does not invoke the verifier again;
- changing the Blob URL, pathname, name, or order returns `mismatch`;
- a forced attachment insert failure rolls back the user, message, key, and attachment rows.

- [ ] **Step 3: Run focused unit and integration tests and verify RED**

Run: `pnpm.cmd vitest run src/home-sections/Contact/services/contact-attachments.test.ts`

Run: `pnpm.cmd test:integration -- tests/integration/contact-persistence.test.ts`

Expected: FAIL because verification and attachment persistence do not exist.

- [ ] **Step 4: Implement authoritative Blob verification**

In `contact-attachments.ts`, call `head(item.url, { abortSignal: AbortSignal.timeout(5_000) })` and require:

```ts
details.url === item.url
details.pathname === item.pathname
item.url.includes('.private.blob.vercel-storage.com/')
item.pathname.startsWith(`contact/${submissionId}/`)
CONTACT_ATTACHMENT_TYPES.includes(details.contentType as ContactAttachmentType)
details.size > 0 && details.size <= MAX_CONTACT_ATTACHMENT_BYTES
```

Accumulate total bytes, reject totals over `MAX_CONTACT_ATTACHMENT_TOTAL_BYTES`, then call `get(item.pathname, { access: 'private', abortSignal: AbortSignal.timeout(5_000) })`. Read at most the first eight bytes, cancel the reader, and require `detectAttachmentContentType(bytes) === details.contentType`. Return sanitized, verified metadata in input order. Throw an exported `InvalidContactAttachmentError` for policy violations and allow infrastructure failures to remain internal.

Implement `openContactAttachment` with `get(pathname, { access: 'private', abortSignal: AbortSignal.timeout(5_000) })`, require status 200, and return `Readable.fromWeb(result.stream)`.

- [ ] **Step 5: Insert metadata in the existing transaction**

After the message insert, add one Drizzle insert when attachments are non-empty:

```ts
await transaction.insert(contactAttachments).values(
  attachments.map((attachment, position) => ({
    messageId: message.id,
    position,
    blobUrl: attachment.url,
    pathname: attachment.pathname,
    originalName: attachment.name,
    contentType: attachment.contentType,
    byteSize: attachment.size,
    etag: attachment.etag,
  })),
)
```

Return `message.id` exactly as before.

- [ ] **Step 6: Preserve replay without re-reading deleted blobs**

Before calling the verifier, query for an existing message by `submissionId` with its ordered attachment rows. If found, compare the text snapshot plus each manifest item's URL, pathname, and sanitized name, then return `replay` or `mismatch`. If absent, verify the blobs and enter the existing transaction. Keep the existing conflict branch inside the transaction for concurrent first submissions and perform the same stored comparison there.

Only a newly claimed submission consumes message/email quotas and calls `saveContactMessageInTransaction(transaction, input, verifiedAttachments)`. The dependency shape becomes:

```ts
dependencies: {
  pool?: Pool
  rateLimitSecret?: string
  emailLimit?: number
  verifyAttachments?: typeof verifyContactAttachments
} = {}
```

Catch only `InvalidContactAttachmentError` and return
`{ kind: 'invalid-attachments' }`; add that member to `SubmissionAcceptance`.
Let Blob/network/configuration exceptions propagate to the existing sanitized
unavailable path. Replay comparison loads all attachment metadata, including
rows whose Blob has since been deleted.

- [ ] **Step 7: Run unit and integration tests and verify GREEN**

Run: `pnpm.cmd vitest run src/home-sections/Contact/services/contact-attachments.test.ts`

Run: `pnpm.cmd test:integration -- tests/integration/contact-persistence.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit verified persistence**

```powershell
git add src/home-sections/Contact/services/contact-attachments.ts src/home-sections/Contact/services/contact-attachments.test.ts src/home-sections/Contact/services/save-message.ts src/home-sections/Contact/services/submission-policy.ts tests/integration/contact-persistence.test.ts
git commit -m "feat: verify and persist contact attachments"
```

### Task 5: Accept the Attachment Manifest at the Server Action Boundary

**Files:**

- Modify: `src/home-sections/Contact/services/send-message.ts`
- Modify: `src/home-sections/Contact/actions/send-message.action.test.ts`

**Interfaces:**

- Consumes: Task 1 `attachmentManifestSchema` and Task 4 acceptance flow.
- Produces: one strict FormData field named `attachments`, always decoded to an array before Zod submission validation.

- [ ] **Step 1: Write failing boundary tests**

Make the valid FormData helper include `attachments: '[]'`. Add cases for malformed JSON, an object instead of an array, a fourth manifest entry, a duplicate `attachments` field, a raw `File`, and one valid private reference. Pin the public field error:

```ts
expect(await sendMessage({ status: 'idle' }, formData({ attachments: '{' }))).toEqual({
  status: 'validation-error',
  fieldErrors: { attachments: ['attachment_invalid'] },
})
```

Assert valid input reaches `accept` with `attachments` as an array, never as the original JSON string.

- [ ] **Step 2: Run the action test and verify RED**

Run: `pnpm.cmd vitest run src/home-sections/Contact/actions/send-message.action.test.ts`

Expected: FAIL because `attachments` is currently unknown.

- [ ] **Step 3: Decode JSON once at the FormData boundary**

Add `'attachments'` to `knownFields` and map it to the `attachments` public field. After duplicate/unknown checks, require its value to be a string (default `'[]'` only when omitted for backward-compatible no-file submissions), `JSON.parse` it inside `try/catch`, and parse with `attachmentManifestSchema`. Return `{ errorField: 'attachments' }` on any failure. Pass the decoded array to `contactSubmissionSchema`.

Map `too_many_files` and `attachment_invalid` through `validationState`. Map
the Task 4 `invalid-attachments` acceptance result to
`fieldErrors: { attachments: ['attachment_invalid'] }`, while Blob transport
failures retain `service_unavailable`.

- [ ] **Step 4: Run the action test and verify GREEN**

Run: `pnpm.cmd vitest run src/home-sections/Contact/actions/send-message.action.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the strict action boundary**

```powershell
git add src/home-sections/Contact/services/send-message.ts src/home-sections/Contact/actions/send-message.action.test.ts
git commit -m "feat: accept contact attachment manifests"
```

### Task 6: Deliver Attachments Through the Existing Retry Queue

**Files:**

- Modify: `src/lib/mail.tsx`
- Modify: `src/lib/mail.test.ts`
- Modify: `src/home-sections/Contact/services/notification-store.ts`
- Modify: `src/home-sections/Contact/services/notify-owner.ts`
- Modify: `src/home-sections/Contact/services/notify-owner.test.ts`
- Modify: `src/home-sections/Contact/services/run-contact-retry.ts`
- Modify: `tests/integration/contact-persistence.test.ts`

**Interfaces:**

- Produces: `MailAttachment = { filename: string; content: Readable; contentType: string }` and optional `MailInput.attachments`.
- Produces: `ContactNotificationFailureCode = MailFailureCode | 'attachment_unavailable'`.
- `ClaimedContactNotification` includes ordered attachment metadata.
- `deliverClaimedNotification` consumes `openAttachment` and `deleteDeliveredAttachments` dependencies.

- [ ] **Step 1: Write failing mail and notification tests**

Pin that `sendMail` forwards attachment streams unchanged:

```ts
const attachment = {
  filename: 'brief.pdf',
  content: Readable.from(Buffer.from('%PDF-test')),
  contentType: 'application/pdf',
}
await sendMail({
  to: 'owner@example.test',
  subject: 'subject',
  text: 'body',
  attachments: [attachment],
})
expect(sendMailTransport).toHaveBeenCalledWith(
  expect.objectContaining({ attachments: [attachment] }),
)
```

Extend owner notification tests with two ordered metadata rows. Assert both streams reach `send`, an open failure records `attachment_unavailable`, transport failure leaves blobs untouched, and successful `markSent` invokes best-effort deletion only after the lease-protected update succeeds.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm.cmd vitest run src/lib/mail.test.ts src/home-sections/Contact/services/notify-owner.test.ts`

Expected: FAIL because mail and claimed notifications have no attachment contract.

- [ ] **Step 3: Extend mail without changing transport behavior**

Add:

```ts
export interface MailAttachment {
  filename: string
  content: Readable
  contentType: string
}

export interface MailInput {
  // existing fields stay unchanged
  attachments?: MailAttachment[]
}
```

Pass `attachments: input.attachments` to `transporter.sendMail`. Keep the existing socket ownership, timeout, error sanitization, and recipient validation unchanged.

- [ ] **Step 4: Load ordered attachment metadata with each claim**

After the lease-protected `UPDATE ... RETURNING`, query:

```sql
SELECT blob_url AS "url", pathname, original_name AS "name",
  content_type AS "contentType", byte_size AS "size", etag
FROM contact_attachments
WHERE message_id = $1 AND deleted_at IS NULL
ORDER BY position
```

Attach those rows to `ClaimedContactNotification`. A zero-row result preserves current behavior.

- [ ] **Step 5: Make attachment opening retryable**

Build the text/HTML mail first, then open each metadata row through `openContactAttachment`. On any open error, call `markFailed` with `attachment_unavailable` and the current attempt count without calling SMTP. Otherwise pass ordered `MailAttachment[]` to `send`.

After SMTP succeeds, call `markSent`. Only when it returns true, call `deleteDeliveredAttachments(message.id, message.attachments)` inside a caught best-effort promise and return `sent`. A cleanup error must not change the public outcome or the recorded notification state.

Change `markNotificationFailed` to accept `ContactNotificationFailureCode`.
The database check already accepts `attachment_unavailable` from Task 2.

- [ ] **Step 6: Wire production dependencies**

Both the immediate `notifyPersistedContactMessage` path and `runContactNotificationRetry` pass:

```ts
openAttachment: openContactAttachment,
deleteDeliveredAttachments: deleteDeliveredContactAttachments,
```

Keep dependency injection in `deliverClaimedNotification` so tests never reach a real Blob store.

- [ ] **Step 7: Upgrade the Mailpit integration assertion**

Persist one PDF attachment, provide its bytes through the delivery dependency, and change the Mailpit expectation from zero attachments to one decoded attachment named `brief.pdf`. Keep the assertion that replay creates only one message and one email.

- [ ] **Step 8: Run focused and integration tests and verify GREEN**

Run: `pnpm.cmd vitest run src/lib/mail.test.ts src/home-sections/Contact/services/notify-owner.test.ts`

Run: `pnpm.cmd test:integration -- tests/integration/contact-persistence.test.ts`

Expected: PASS, including Mailpit receiving one attachment when the local service is enabled.

- [ ] **Step 9: Commit durable mail delivery**

```powershell
git add src/lib/mail.tsx src/lib/mail.test.ts src/home-sections/Contact/services/notification-store.ts src/home-sections/Contact/services/notify-owner.ts src/home-sections/Contact/services/notify-owner.test.ts src/home-sections/Contact/services/run-contact-retry.ts tests/integration/contact-persistence.test.ts
git commit -m "feat: deliver durable contact attachments"
```

### Task 7: Add the Accessible Multi-File Form UI

**Files:**

- Modify: `src/home-sections/Contact/components/Form/Form.tsx`
- Modify: `src/home-sections/Contact/components/Form/Form.module.css`
- Modify: `src/home-sections/Contact/components/Form/Form.dom.test.ts`
- Modify: `public/locales/en.json`
- Modify: `public/locales/ru.json`

**Interfaces:**

- Consumes: `upload` from `@vercel/blob/client`, Task 1 selection policy, and Task 5 `attachments` FormData field.
- Produces: native `#contact-attachments` input, `contact-attachment-error`, selected-file remove buttons, progress status, and attachment-aware submission fingerprints.

- [ ] **Step 1: Write failing DOM tests**

Mock `@vercel/blob/client`. Use `Object.defineProperty(input, 'files', { value: fileList })` and dispatch `change`. Cover:

- accessible multiple input and accepted types;
- selected filename/size and removal;
- client rejection for four files, unsupported MIME, >5 MiB item, and >10 MiB total without calling `upload` or `sendMessage`;
- successful ordered uploads followed by one action containing an ordered JSON manifest;
- progress/busy state disabling input and submit;
- one upload rejection preserving text and selected files;
- unchanged retry reusing prior upload results;
- changed selection allocating a new submission ID;
- success resetting text, selection, and the native input value;
- Russian retranslation of an existing attachment error.

The successful assertion is:

```ts
expect(JSON.parse(String(submittedPayload(0).get('attachments')))).toEqual([
  { url: pdfUrl, pathname: pdfPath, name: 'brief.pdf' },
  { url: imageUrl, pathname: imagePath, name: 'screen.png' },
])
expect(upload).toHaveBeenCalledTimes(2)
```

- [ ] **Step 2: Run the form test and verify RED**

Run: `pnpm.cmd vitest run src/home-sections/Contact/components/Form/Form.dom.test.ts`

Expected: FAIL because the attachment UI does not exist.

- [ ] **Step 3: Add exact English and Russian copy**

Add these keys to both `contact` objects:

```json
{
  "attachments": "Attachments",
  "attachmentHint": "Up to 3 PDF, JPG or PNG files; 5 MB each, 10 MB total.",
  "removeAttachment": "Remove {{name}}",
  "uploadingAttachments": "Uploading files: {{progress}}%",
  "tooManyFiles": "Attach no more than 3 files.",
  "unsupportedFileType": "Only PDF, JPG and PNG files are supported.",
  "fileTooLarge": "Each file must be 5 MB or smaller.",
  "filesTooLarge": "Attachments must be 10 MB or smaller in total.",
  "uploadFailed": "The files could not be uploaded. Try again.",
  "attachmentInvalid": "One of the uploaded files is invalid. Select it again."
}
```

Use natural Russian equivalents: `Вложения`, `До 3 файлов PDF, JPG или PNG; не более 5 МБ каждый и 10 МБ суммарно.`, `Удалить {{name}}`, `Загрузка файлов: {{progress}}%`, `Прикрепите не более 3 файлов.`, `Поддерживаются только файлы PDF, JPG и PNG.`, `Размер каждого файла не должен превышать 5 МБ.`, `Общий размер файлов не должен превышать 10 МБ.`, `Не удалось загрузить файлы. Попробуйте ещё раз.`, and `Один из загруженных файлов недействителен. Выберите его заново.`

- [ ] **Step 4: Add native selection and compact list UI**

Add `selectedFiles`, `attachmentError`, `uploadProgress`, and `isUploading` state plus a native input ref. The input has no `name`, so raw files never enter Server Action FormData:

```tsx
<input
  ref={fileInputRef}
  id="contact-attachments"
  type="file"
  multiple
  accept={CONTACT_ATTACHMENT_TYPES.join(',')}
  disabled={!isHydrated || isBusy}
  aria-describedby={`contact-attachments-hint${attachmentError ? ' contact-attachment-error' : ''}`}
  aria-invalid={Boolean(attachmentError)}
  onChange={(event) => selectFiles([...(event.currentTarget.files ?? [])])}
/>
```

Render one `<li>` per file with a `type="button"` remove control whose accessible name uses `removeAttachment`. Add only the CSS needed to place attachments below the message grid, wrap long filenames, align remove buttons, and avoid horizontal overflow at 320 px.

- [ ] **Step 5: Upload only after text validation**

Inside the successful `handleSubmit` callback, calculate a fingerprint from `CONTACT_FIELDS` plus `[name, size, type, lastModified]` for every selected file. Reuse a ref-cached manifest only when its fingerprint and submission ID match. Otherwise run:

```ts
const uploaded = await Promise.all(
  selectedFiles.map(async (file) => {
    const name = sanitizeAttachmentName(file.name)
    const pathname = `contact/${submissionId}/${globalThis.crypto.randomUUID()}-${name}`
    const blob = await upload(pathname, file, {
      access: 'private',
      handleUploadUrl: '/api/contact-uploads',
      onUploadProgress: updateAggregateProgress,
    })
    return { url: blob.url, pathname: blob.pathname, name }
  }),
)
payload.set('attachments', JSON.stringify(uploaded))
```

Track aggregate progress from each file's loaded/total values. On upload failure, set `upload_failed`, clear `dispatchingRef`, preserve the draft and files, and do not call `formAction`. Use `isBusy = isUploading || isPending` everywhere the current code uses only `isPending` for disabling/`aria-busy`.

- [ ] **Step 6: Integrate server attachment errors and reset**

Map every Task 1 attachment code to the new locale key. Focus `#contact-attachments` when the server returns an attachment error. Editing the selection clears that server error. On success set selected files to `[]`, clear the upload cache/progress/error, and set `fileInputRef.current.value = ''` alongside the existing RHF reset.

- [ ] **Step 7: Run form and locale tests and verify GREEN**

Run: `pnpm.cmd vitest run src/home-sections/Contact/components/Form/Form.dom.test.ts src/configs/i18n/locales.test.ts`

Expected: PASS.

- [ ] **Step 8: Run style lint on the touched module**

Run: `pnpm.cmd stylelint src/home-sections/Contact/components/Form/Form.module.css`

Expected: PASS.

- [ ] **Step 9: Commit the form UI**

```powershell
git add src/home-sections/Contact/components/Form/Form.tsx src/home-sections/Contact/components/Form/Form.module.css src/home-sections/Contact/components/Form/Form.dom.test.ts public/locales/en.json public/locales/ru.json
git commit -m "feat: add contact attachment picker"
```

### Task 8: Clean Up Delivered and Orphaned Blobs

**Files:**

- Modify: `src/home-sections/Contact/services/contact-attachments.ts`
- Modify: `src/home-sections/Contact/services/contact-attachments.test.ts`
- Modify: `src/home-sections/Contact/services/run-contact-retry.ts`
- Modify: `src/home-sections/Contact/services/cron-handler.ts`
- Modify: `src/home-sections/Contact/services/cron-handler.test.ts`

**Interfaces:**

- Produces: `deleteDeliveredContactAttachments(messageId, attachments) => Promise<void>`.
- Produces: `cleanupContactAttachments(pool, now?) => Promise<{ delivered: number; orphaned: number }>`.
- Extends `ContactCronRunResult` with `attachmentsDeleted` and `orphansDeleted` aggregate counts.

- [ ] **Step 1: Write failing cleanup tests**

Mock Blob `del`/`list` and a Pool. Pin these behaviors:

- delivered URLs are deleted as one batch and only then receive `deleted_at`;
- failed deletion leaves `deleted_at` null;
- sent rows with null `deleted_at` are retried;
- bound pending/failed URLs are not deleted;
- unbound `contact/` blobs younger than 24 hours are not deleted;
- at most 25 stale orphan URLs are deleted per run;
- the cron response reports aggregate counts only and never URLs/names.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm.cmd vitest run src/home-sections/Contact/services/contact-attachments.test.ts src/home-sections/Contact/services/cron-handler.test.ts`

Expected: FAIL because cleanup functions and counts do not exist.

- [ ] **Step 3: Implement delivered cleanup**

Call `del(urls)` for non-empty attachment lists, then update only those rows for the matching message ID:

```sql
UPDATE contact_attachments SET deleted_at = clock_timestamp()
WHERE message_id = $1 AND blob_url = ANY($2::text[]) AND deleted_at IS NULL
```

Deletion is idempotent, so a crash between Blob deletion and the database update is safe to retry.

- [ ] **Step 4: Implement one bounded maintenance pass**

Query at most 25 sent rows needing deletion and process them first. Then call `list({ prefix: 'contact/', limit: 1000 })`, filter objects with `uploadedAt <= now - 24 hours`, query which candidate URLs exist in `contact_attachments`, and delete at most 25 unbound URLs. Return counts only.

Add this documented ceiling above the list call:

```ts
// ponytail: scan the first 1,000 portfolio blobs; add persisted upload reservations if volume makes pagination necessary.
```

- [ ] **Step 5: Run cleanup after retry without risking delivered mail**

After notification draining and job completion, invoke cleanup in a caught block. A cleanup outage logs only the event name and leaves the successful retry result intact. Add the two cleanup counts to the protected response; use zero when cleanup fails or a retry job is already running.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `pnpm.cmd vitest run src/home-sections/Contact/services/contact-attachments.test.ts src/home-sections/Contact/services/cron-handler.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit lifecycle cleanup**

```powershell
git add src/home-sections/Contact/services/contact-attachments.ts src/home-sections/Contact/services/contact-attachments.test.ts src/home-sections/Contact/services/run-contact-retry.ts src/home-sections/Contact/services/cron-handler.ts src/home-sections/Contact/services/cron-handler.test.ts
git commit -m "feat: clean up contact attachment blobs"
```

### Task 9: Complete Browser, Operations, and Release Coverage

**Files:**

- Modify: `e2e/contact.spec.ts`
- Modify: `e2e/contact-submission.spec.ts`
- Modify: `tests/infrastructure/e2e-server.test.ts`
- Modify: `.env.example`
- Modify: `docs/contact-production.md`

**Interfaces:**

- Consumes: all prior tasks.
- Produces: release documentation and end-to-end assertions for selection policy, durable metadata, and real preview Blob/Gmail verification.

- [ ] **Step 1: Add browser-facing policy coverage**

Use Playwright `setInputFiles` with in-memory fixtures to prove the input accepts multiple files, exposes both names, removes one accessibly, rejects a fourth file before any upload request, and remains within the viewport at 320 px:

```ts
await page.locator('#contact-attachments').setInputFiles([
  { name: 'brief.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') },
  {
    name: 'screen.png',
    mimeType: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
])
await expect(page.getByText('brief.pdf')).toBeVisible()
await page.getByRole('button', { name: 'Remove brief.pdf' }).click()
await expect(page.getByText('brief.pdf')).toBeHidden()
```

Keep successful upload protocol mocking in the DOM suite, where `@vercel/blob/client` is a stable module boundary. Do not reproduce Vercel's private token protocol in Playwright.

- [ ] **Step 2: Extend the service-backed browser test**

Keep the existing no-file submission scenario unchanged and assert that it stores zero `contact_attachments` rows. This proves backward compatibility without requiring a real Blob store in local CI. The real multi-file path remains in unit/integration tests plus preview verification.

- [ ] **Step 3: Add environment and runbook instructions**

Add to `.env.example`:

```dotenv
# Private Vercel Blob credential; use separate stores for preview and production.
BLOB_READ_WRITE_TOKEN=
```

Extend `docs/contact-production.md` with:

- create and connect separate private Blob stores for preview/production;
- require `@vercel/blob` private access and the existing trusted IP header;
- state 3 files / 5 MiB each / 10 MiB total / PDF-JPEG-PNG;
- verify attachment rows, Gmail filenames/content, SMTP retry, sent deletion, and stale-orphan cleanup;
- inspect `attachment_unavailable` before using the existing requeue command;
- never put the production Blob token in preview or local test fixtures.

- [ ] **Step 4: Run browser and infrastructure tests**

Run: `pnpm.cmd vitest run tests/infrastructure/e2e-server.test.ts`

Run: `pnpm.cmd test:e2e -- e2e/contact.spec.ts e2e/contact-submission.spec.ts`

Expected: PASS; the service-backed case may skip only when its existing isolated PostgreSQL/Mailpit prerequisites are absent.

- [ ] **Step 5: Run the complete verification suite**

Run in order:

```powershell
pnpm.cmd check-format
pnpm.cmd check-lint
pnpm.cmd check-styles
pnpm.cmd check-types
pnpm.cmd test
pnpm.cmd test:integration
pnpm.cmd vitest run --config vitest.infrastructure.config.mts
pnpm.cmd test:e2e
git diff --check
git status --short
```

Expected: all configured checks pass. If an integration environment is not running, start only the documented isolated services from `docs/feedback-testing.md` and rerun; never substitute production resources.

- [ ] **Step 6: Perform preview verification with real services**

In the preview deployment, submit one PDF and one PNG with a unique message. Verify exactly one message row, two ordered attachment rows, one Gmail message with both usable files, and deleted Blob objects after sent status. Then disable SMTP, submit another file, restore SMTP, invoke the protected retry route, and verify the retried email still includes the file. Upload an object without submitting and confirm the protected cleanup removes it only after the 24-hour threshold (move its test timestamp only in the disposable preview setup).

- [ ] **Step 7: Commit tests and operations documentation**

```powershell
git add e2e/contact.spec.ts e2e/contact-submission.spec.ts tests/infrastructure/e2e-server.test.ts .env.example docs/contact-production.md
git commit -m "docs: cover contact attachment operations"
```

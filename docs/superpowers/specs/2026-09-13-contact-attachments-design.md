# Contact attachments design

**Date:** 2026-09-13

## Goal

Allow an anonymous visitor to attach up to three PDF, JPEG, or PNG files to a
Contact submission. Each file may be at most 5 MB and all files together may
be at most 10 MB. The owner receives the files as normal email attachments,
and the existing durable notification retry behavior continues to work.

## Constraints from the current system

- The application runs on Vercel. A Vercel Function request or response cannot
  exceed 4.5 MB, so the files cannot travel through the existing Server Action.
- A Contact submission is persisted before SMTP delivery is attempted. SMTP
  failure is acknowledged to the visitor because the persisted notification is
  retried later.
- `submissionId` currently provides idempotency. Replaying the same submission
  must not create another message or another set of attachments.
- The Contact form is anonymous. Upload authorization therefore relies on the
  same trusted-IP boundary and database-backed rate limiting as message
  submission, not on a user account.

## Chosen architecture

Use a private Vercel Blob store and `@vercel/blob` client uploads. The browser
uploads each file directly to Blob, then sends a small, ordered attachment
manifest through the existing Server Action. PostgreSQL stores verified Blob
metadata next to the message. The notification worker reads the private blobs
and streams them into Nodemailer when it delivers or retries the email.

This keeps binary data out of PostgreSQL, avoids the Vercel Function body
limit, keeps files private, and preserves the current persistence-before-SMTP
contract. The Blob integration is direct rather than wrapped in a generic
storage abstraction; no second provider is planned.

## Upload policy

The first version has one fixed policy:

- zero to three attachments;
- 5 MB maximum per file;
- 10 MB maximum across the submission;
- `application/pdf`, `image/jpeg`, and `image/png` only;
- original filename limited to 255 characters after removing path components
  and control characters;
- immutable Blob paths under `contact/<submissionId>/`, with random suffixes;
- upload tokens are short-lived and allow only the listed content types and
  per-file size.

Client checks exist for immediate feedback, but they are not a security
boundary. Before accepting a submission, the server loads authoritative Blob
metadata, verifies the expected private-store object and submission path,
checks count and sizes again, and checks the file signature for PDF, JPEG, or
PNG. A filename extension or client-provided MIME value alone is insufficient.

Archives and office documents are deliberately excluded. They would require
more parsing and introduce archive-bomb and active-content concerns. Malware
scanning is also excluded from the first version; add it before broadening the
accepted file types or if upload abuse appears.

## Browser flow

The form uses a native `<input type="file" multiple>` with an accessible label
and the accepted MIME list. Selected files are shown in order with name, size,
and a remove button. Drag-and-drop and previews are not included.

Submission proceeds as follows:

1. React Hook Form validates the text fields and the browser validates the
   attachment policy.
2. The form obtains or reuses its current `submissionId`.
3. The browser uploads the selected files directly to private Blob, with at
   most three uploads in flight.
4. Upload results are cached in the form for the current submission fingerprint
   (text values plus file name, size, MIME, and `lastModified`).
5. The existing Server Action receives the form fields, `submissionId`, and a
   JSON attachment manifest containing only Blob references and display names.
6. On success the form and native file input reset. On a transient submission
   failure the form retains the upload results so retrying the unchanged draft
   does not upload the files again.

Changing either text or selected files after a completed attempt causes the
existing submission-ID reuse protection to allocate a new ID. Upload progress
is exposed as text and through `aria-live`; selection, submission, and removal
are disabled while uploads or the Server Action are pending. If one upload
fails, no message is submitted and the draft remains available.

## Upload authorization and abuse control

A new App Router endpoint uses Vercel Blob's `handleUpload` token exchange. It
rejects an invalid submission UUID or pathname, resolves the trusted IP using
the existing Contact header policy, and consumes an `upload` rate-limit bucket
in the existing `contact_rate_limits` table before granting a token. The fixed
limit is 20 upload tokens per trusted IP in 10 minutes: enough for five
three-file submissions and several retries while bounding anonymous storage
writes.

The endpoint returns only a narrowly scoped token with the fixed MIME and size
policy. It never exposes the store credential. Possession of an arbitrary Blob
URL is not enough to attach it: submission acceptance verifies the private
object and the `contact/<submissionId>/` prefix with server credentials.

Bot challenges are not added. The current honeypot, trusted-IP limit, upload
token limit, and cleanup cover the initial portfolio traffic; add a challenge
only if production abuse demonstrates the need.

## Persistence and idempotency

Add a `contact_attachments` table with:

- numeric primary key;
- `message_id` foreign key to `messages`;
- zero-based `position` unique within a message;
- unique Blob URL/pathname;
- sanitized original filename;
- verified content type and byte size;
- Blob ETag;
- creation timestamp;
- nullable deletion timestamp.

The message and its verified attachment rows are inserted in the existing
database transaction. Blob upload cannot be part of that transaction, so an
uploaded object remains unbound until the message commit succeeds.

Idempotent replay compares both the existing text snapshot and the ordered,
verified attachment manifest. An exact match returns the existing message ID;
any text or attachment mismatch returns `submission_id_reused`. A lost response
therefore remains safe to retry without duplicating either database rows or
Blob objects.

The strict FormData reader gains exactly one known `attachments` string field.
It continues to reject duplicate and unknown fields and continues to reject a
raw `File` in any text field.

## Notification delivery

Claiming a notification also loads its ordered attachment metadata. For each
attachment, the Blob service opens an authenticated, timeout-bounded readable
stream. Nodemailer receives those streams through its native `attachments`
option, preserving filenames and verified MIME types without buffering every
file at once.

The 10 MB raw total leaves room for MIME/base64 expansion and the text message.
An unavailable or changed Blob is a retryable `attachment_unavailable`
notification failure. It follows the existing five-attempt terminal policy and
can be requeued with the existing operations command after the storage problem
is repaired.

The visitor sees success once the message and attachment metadata are durable,
even if the first SMTP attempt fails. This matches the current Contact
semantics.

## Cleanup

After SMTP delivery is recorded as sent, Blob deletion is best-effort. The
attachment metadata remains for audit and its `deleted_at` value records
successful cleanup. A failure to delete does not turn an already delivered
notification back into a failure.

The existing protected Contact cron also performs a bounded cleanup pass:

- retry deletion for sent attachment rows without `deleted_at`;
- list only the `contact/` prefix and delete unbound objects older than 24
  hours;
- cap work per run so notification retries keep their current time budget.

Objects attached to pending or terminal failed notifications are retained so
the existing requeue operation remains useful. The deliberately simple orphan
scan is appropriate for portfolio volume; replace it with explicit upload
reservations only if listing cost or object volume becomes measurable.

## Error contract and copy

Attachment failures are distinct from text-field failures. The client needs
localized English and Russian messages for:

- too many files;
- unsupported type;
- file too large;
- total too large;
- upload failed;
- attachment verification failed.

An upload failure is recoverable and preserves the draft. A verification
failure is a server validation error associated with the attachment control.
Database, Blob, or other unexpected failures use the existing service
unavailable result. Rate limiting uses the existing public rate-limited result.

## Expected code changes

- `Form.tsx`, its CSS module, and DOM tests: selection UI, validation, upload,
  progress, retry cache, focus, reset, and attachment-aware fingerprint.
- Contact schemas and submission types: manifest and attachment error codes.
- A Contact upload route plus a small Blob-specific service/policy module.
- `submission-policy.ts` and `save-message.ts`: authoritative verification,
  transactional metadata persistence, and replay comparison.
- Drizzle schema and one additive migration for `contact_attachments` and the
  new notification error code.
- Notification store, owner notification, and mail wrapper: ordered attachment
  streams and retry classification.
- Existing cron handler: bounded sent-file and orphan cleanup.
- English/Russian locale files, `.env.example`, and the Contact production
  runbook.
- Focused unit, DOM, integration, infrastructure, and E2E coverage using mocked
  Blob operations; CI does not require a live Blob store.

## Verification

The smallest meaningful coverage includes:

- schema/policy tests for count, individual size, total size, MIME, signature,
  pathname ownership, and malformed manifests;
- form DOM tests for accessible selection, removal, progress, reset, partial
  upload failure, and reuse of uploads on retry;
- persistence integration tests proving atomic attachment rows, exact replay,
  and mismatch rejection;
- notification tests proving ordered streams reach Nodemailer and remain
  retryable when Blob is unavailable;
- cleanup tests proving pending/failed files are retained while sent and stale
  unbound files are deleted;
- DOM coverage for a successful multi-file submission with the Blob client
  mocked, plus Playwright coverage for the real selection UI and visible
  client-side limit errors;
- repository format, lint, type, unit, integration, infrastructure, and E2E
  commands already defined in `package.json`.

Manual preview verification must include a real private Blob store: submit
multiple files, verify one message and ordered attachment rows, confirm Gmail
receives usable attachments, disable SMTP and confirm a later retry still
includes them, then confirm sent blobs are removed.

## Operational changes

Create separate private Blob stores for preview and production and connect them
to the corresponding Vercel environments. The production runbook records the
required Blob credential/OIDC setup, upload limits, cleanup behavior, and a
manual check for terminal attachment failures. Database migrations remain
additive and are applied before the application deployment as they are today.

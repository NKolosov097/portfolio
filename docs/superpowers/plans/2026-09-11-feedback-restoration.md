# Feedback Restoration Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user authorized local implementation. Deployment and real-recipient mail remain outside this execution. See the linked verification record for results.

**Goal:** Restore the existing Contact section with reliable persistence, safe notifications, accessible feedback, and reproducible validation across environments.

**Architecture:** Retain the existing UI and Server Action boundary. Isolate persistence and notifications behind focused Contact services; establish migrations and disposable PostgreSQL/SMTP test services before reconnecting the page. Following the user's clarification that there is no working database, Drizzle was selected for a fresh PostgreSQL database.

**Tech Stack:** Next.js 16, React 19, TypeScript, Gravity UI, React Hook Form, Zod, PostgreSQL, Nodemailer, Vitest, Playwright; Drizzle ORM 0.45.2 / Drizzle Kit 0.31.10.

**Execution record:** [Verification and remaining release checks](../verification/2026-09-12-feedback-restoration.md). No commits were made because this checkout also contains unrelated owner changes.

**Spec:** `docs/superpowers/specs/2026-09-11-feedback-restoration-audit.md` (audit, proposed behavior, ORM decision, and acceptance criteria).

## Global constraints

- Node.js 24; existing Next.js 16 / React 19 / strict TypeScript; no weakening lint or type checks.
- Reuse Gravity UI, current en/ru catalogs, and existing responsive shell; do not add another form or UI framework.
- Preserve existing user data and unrelated working-tree edits.
- Keep schema history in version control and use reviewed migrations for deployment.
- Windows local and Linux CI are required; browser emulation does not substitute for physical iOS/Android checks.
- Full flow must prove durable storage, owner notification capture, retry behavior, safe errors, and one persisted message for a retried request.
- Production release is gated on migration and service verification; audit completion is not a claim that the feature is restored.

## Execution order and decisions

Tasks 1-2 establish the environment and database facts. Select Prisma or Drizzle at Task 2; do not implement both. Tasks 3-5 repair the submission flow. Task 6 reconnects the UI. Task 7 validates release candidates. Existing services need not be reachable to implement unit/DOM tests, but are required for migration and delivery validation.

Confirmed by the user: no working database exists. The required path creates a disposable database and proves clean migrations. Existing-data backup, introspection, and baselining steps below apply only if that fact changes; they are not current blockers. Drizzle selection was approved through the subsequent implementation request. Local PostgreSQL/Mailpit services are available; the production provider remains a release decision.

The scope is Contact restoration, not public reviews, a new admin UI, or a general job platform. Do not apply production migrations during development. Product proposals (field limits, rate policy, visitor acknowledgements disabled by default) are recorded explicitly in the spec for review before implementation.

## Task 1: Make the validation environment reproducible

**Files:** modify `.gitignore`, `.prettierignore`, `eslint.config.mjs`, `package.json`, `e2e/helpers/server.ts`, `e2e/global-setup.ts`, `e2e/global-teardown.ts`, `.github/workflows/ci.yml`, `.env.example`, `README.md`; create `compose.feedback-test.yml` and `e2e/helpers/server.test.ts` only if routed through a dedicated test command (the default Vitest include excludes e2e).

- [x] Preserve a `git status --short` baseline; avoid overwriting the existing loading/navigation edits.
- [x] Exclude `.claude/worktrees/`, `.pnpm-store/`, and generated output from broad format/lint scans. Keep application code included; format the reported mail source when changing it in Task 4.
- [x] Parameterize E2E origin/port with a validated numeric `E2E_PORT`; default remains 3000. Ensure startup, baseURL, and teardown use the same value. Track only the spawned server; a port collision must never terminate another process.
- [x] Add tests for invalid port, occupied port, startup failure, and teardown ownership. Run a smoke test on a free port while another listener occupies 3000.
- [x] Define isolated PostgreSQL and SMTP sink services, health checks, test-only credentials, no outbound relay, and cleanup scoped to their containers/volumes. Pin service versions during implementation and record them.
- [x] Make SMTP host, port, secure mode, and optional auth configurable; production configuration is validated separately from the local sink. Avoid the hardcoded Gmail service preset overriding sink settings.
- [x] Add a Linux CI integration job with real services and a Windows unit/build job. Add `test:integration` with its own config so it is never accidentally included in ordinary mocked tests.

Validation commands after port support exists:

```powershell
$env:E2E_PORT = '3100'
pnpm.cmd check-types
pnpm.cmd check-lint
pnpm.cmd check-styles
pnpm.cmd check-format
pnpm.cmd test
pnpm.cmd build
pnpm.cmd exec playwright test e2e/smoke.spec.ts
```

Expected: clean checks except explicitly tracked pre-existing MobileAside warnings; smoke runs on 3100 without touching the listener on 3000. Commit this infrastructure change independently after review.

## Task 2: Establish a database baseline and settle the ORM

**Existing files:** `.gitignore`, `prisma/schema.prisma`, `prisma.config.ts`, `prisma/seed.ts`, `src/lib/prisma.ts`, `package.json`, `.env.example`, `README.md`.

**Prisma branch:** track `prisma/migrations/`; create reviewed baseline SQL and migration lock. Correct seed to use configured Prisma 7 connectivity and idempotent synthetic records. Confirm how CLI environment is loaded; Next's env loading does not prove Prisma CLI configuration.

**Drizzle branch:** create `src/db/schema.ts`, `src/db/client.ts`, `drizzle.config.ts`, `drizzle/`, and replace seed with `scripts/seed-feedback.ts`. Modify the Contact action/test import, install pinned `drizzle-orm` and `drizzle-kit`, reuse `pg`, and update build/postinstall/migration scripts. Remove Prisma dependencies and generated-client references only after parity tests pass.

- [x] Choose the new PostgreSQL provider and pooled application/direct migration connection strategy. The current no-database clarification removes existing-message migration from scope. If an existing DB is later discovered, inspect metadata read-only without printing records or credentials.
- [x] Existing-data restore and introspection are not applicable because the owner confirmed there is no working database.
- [x] For the empty database, apply initial SQL from scratch and verify the second migration run is a no-op.
- [x] Create `src/home-sections/Contact/services/save-message.ts` and `tests/integration/contact-persistence.test.ts`. Define `saveContactMessage(input)` around validated contact fields and submission ID, returning the message ID. Keep ORM-specific types inside this service.
- [x] With Drizzle, upsert the user on email and insert the message inside one transaction. Prove rollback when message insertion fails, before deleting the nested Prisma write.
- [x] Test two different submissions from the same email: one user, two messages. Test parallel submissions, a failed second write, connection exhaustion/timeouts, and seed repeatability.

Expected: fresh and existing-schema test databases converge without losing records; production still untouched. Commit the chosen ORM/baseline independently from new notification state.

## Task 3: Repair server validation, duplicate handling, and error contracts

**Files:** modify `schemas/send-message.schema.ts`, its test, `actions/send-message.action.ts`, its test, `types/contact.type.ts`, and en/ru locale catalogs under existing paths. Create `types/submission.type.ts`, `services/submission-policy.ts`, its test, and extend the chosen schema/migrations.

- [x] Define a discriminated result with `status` (`idle`, `success`, `validation-error`, `unavailable`, `rate-limited`), stable field error codes, and acknowledged submission ID. UI translates codes; do not serialize exception text.
- [x] Add failing cases for empty/malformed/File payloads, omitted optional fields, whitespace, each length boundary, long email/message, unknown fields, and invalid submission IDs.
- [x] Add failing cases for sanitized database errors, no mail on failed persistence, repeated submission ID, and concurrent duplicate submissions.
- [x] Implement schema limits from the spec; whitelist fields. Add a unique, non-null submission identifier to messages; there are no legacy rows to migrate.
- [x] Add timestamp and notification outcome fields; new rows start pending and synthetic seed rows are never queued for mail.
- [x] Implement atomic shared rate-limit counters with expiry and a honeypot, before persistence/email. Test window reset, concurrency, trusted identity extraction, and storage outage. Return a recoverable unavailable result if enforcement cannot run.
- [x] Ensure an accepted duplicate request returns the stored result and does not emit another notification. Distinguish a replay from a different payload reusing an ID; reject mismatches.
- [x] Run the schema/action suites and the real PostgreSQL integration suite; review the migration before commit.

Example contract assertion to adapt to the new result type:

```typescript
expect(result.status).toBe('unavailable')
expect(JSON.stringify(result)).not.toContain('connection refused')
expect(sendMailMock).not.toHaveBeenCalled()
```

## Task 4: Make notifications safe and observable

**Files:** modify `src/lib/mail.tsx`, create `src/lib/mail.test.ts`, `src/home-sections/Contact/services/notify-owner.ts` and its test, `scripts/retry-contact-notifications.ts`; update env docs and package scripts.

- [x] Test the actual mail wrapper with a mocked Nodemailer transport, not only a mock of `sendMail`. Verification/rejection/timeout must yield a failed outcome, never a returned Error masquerading as success.
- [x] Replace raw HTML insertion with escaped interpolation for every dynamic field. Add regression input `<b>hello</b>&"'` and assert it remains literal message content in the rendered email.
- [x] Build owner notification with sender name/email/company/profession, plain text and HTML bodies, and validated Reply-To. Keep visitor acknowledgement a separate purpose and disabled by default per the proposed design.
- [x] Remove per-request `verify`; use bounded connection/socket timeouts and explicit success/failure results. Validate required runtime configuration and redact credentials and message contents from logs.
- [x] Persist notification outcome after attempt. A saved message remains successful when SMTP is down; copy promises saved receipt, not inbox delivery.
- [x] Implement a controlled retry command for failed/pending notifications using an atomic claim and bounded attempts. Preserve the same message ID; document SMTP's duplicate-delivery crash window.
- [x] Against the sink, assert owner recipient, Reply-To, metadata, escaped body, attachment absence, and acknowledgement default. Verify transport failure and retry recovery without another DB message.

Expected: tests distinguish storage success from delivery outcome; failures are recoverable and no real recipient receives a test message. Commit after focused tests and formatting pass.

## Task 5: Repair the form state and accessibility

**Files:** modify `src/home-sections/Contact/components/Form/Form.tsx`, `Contact.module.css`, en/ru catalogs; create `components/Form/Form.module.css` and `components/Form/Form.dom.test.ts` following existing jsdom test patterns.

- [x] Add deferred-action tests: pending lasts through the server response, rapid clicks produce one action, server field/global errors render, and failure preserves all input.
- [x] Add regression tests for second successful submission, retry after network failure, input entered after success, language changes while errors show, and unmount during pending/reset.
- [x] Consume action `isPending`; guard dispatch, snapshot FormData before disabling fields, and retain submission UUID across uncertain retries.
- [x] Remove the 3.5-second reset; reset only when that submission is acknowledged and do not erase a newer draft. Keep success independent from RHF callback completion.
- [x] Add stable field IDs, explicit accessible names, email type/autocomplete, inline error association, first-error focus, pending `aria-busy`, and a localized result announcement.
- [x] Move form-owned CSS to its component file, preserve existing grid breakpoints, and ensure long messages/errors wrap without horizontal page overflow.

Run: `pnpm.cmd exec vitest run src/home-sections/Contact`. Expected: schema/action/form tests pass with real Gravity UI controls and controlled action promises.

## Task 6: Reconnect the section and add browser coverage

**Files:** modify `src/app/page.tsx`, `src/layout/Header/components/HeaderTabs/HeaderTabs.tsx`, its DOM test, `e2e/smoke.spec.ts`, `README.md`; create `e2e/contact.spec.ts` and integration fixtures using the isolated services.

- [x] First write a failing browser assertion that `section#contact` and the localized Contact tab exist.
- [x] Append Contact after Writing and add the tab using existing readiness logic. Update header test fixtures to include Contact so missing-section tests remain meaningful.
- [x] Test tab click, direct `/#contact`, scroll spy, loading transitions, article-to-home navigation, and narrow-header overflow. Do not force artificial route loading during message submission.
- [x] Exercise actual Server Action submission to the test DB and mail sink; assert message ID/count and recipient capture. Browser interception of an HTTP response is not a substitute for this test.
- [x] Cover validation, success, pending, DB failure, SMTP failure, double-click, repeated request ID, offline/retry, keyboard-only use, and en/ru switching without data loss. Failure injection must exist only in the test environment, not as a public production endpoint.
- [x] Give every parallel test isolated emails/submission IDs. Remove only records identified by that test run; never truncate a shared or production database.
- [x] Correct README architecture/contact/testing descriptions; close the restoration item only after Task 7 acceptance.

## Task 7: Validate across environments and prepare release

| Environment                          | Coverage                                                                                           | Pass evidence                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Windows, Node 24, development server | Form interaction, hydration, port ownership, hot reload                                            | No lost drafts, duplicate dispatch, or orphan server                                 |
| Windows production build             | Six existing Playwright projects: Chromium, Firefox, WebKit and their mobile configurations        | Contact suite passes; Firefox narrow viewport is not claimed as Android Firefox      |
| Linux CI, Node 24                    | Frozen install, type/lint/format/styles, unit/DOM, fresh migrations, real PostgreSQL and SMTP sink | Clean run without developer-local services or secrets                                |
| Desktop browser matrix               | en/ru, keyboard, 200% zoom, reduced motion, slow/offline requests                                  | Usable controls, readable errors, stable focus, no hydration/runtime errors          |
| Responsive boundaries                | 320, 393, 499/500/501, 768, 899/900/901, 1023/1024/1025, 1440 px; folded/unfolded and landscape    | No page overflow, reachable tabs and submit, correct one/two-column layout           |
| Physical iOS Safari / Android Chrome | Autofill, virtual keyboard, rotation, background/resume, touch                                     | Fields and result stay visible; typed values survive interruption                    |
| Preview deployment                   | Separate DB and mail sink, TLS/pooling, cold start, real Server Action POST                        | Saved row, captured owner mail, bounded failure latency, no live-data changes        |
| VPS deployment if still supported    | Node process + reverse proxy, trusted forwarding, body limits and SMTP connectivity                | Same flow as preview; skip explicitly if Vercel is the only target                   |
| Production release                   | Verified schema baseline, configuration, backup and rollback rehearsal                             | Release checklist approved; real test mail requires explicit recipient authorization |

- [x] Run full quality gates and all E2E after focused suites pass. Keep the existing weekly repeated CI run enabled for ongoing flake detection.
- [x] Exercise clean migrations and a second no-op migration run. Existing-data migration remains not applicable unless a database is subsequently introduced.
- [x] Verify SMTP outage/recovery and notification retries; verify failed requests never create partial records.
- [x] Record unexecuted physical-device/provider checks explicitly, with owner/environment needed to complete them.
- [ ] Rehearse application rollback with backward-compatible schema. Do not drop new columns or saved messages to roll back a UI release.
- [x] Prepare a reviewable diff and validation report; update README and close the TODO only when the agreed restoration acceptance is satisfied.

## Remaining external facts

The user confirmed that no working database exists. Remaining external requirements are the new PostgreSQL provider, disposable DB/SMTP sink availability, deployment configuration, and physical-device access. They block corresponding integration/release checks, not planning or local implementation. No credentials need to be pasted into chat. Select pooling and trusted client identity handling for the actual deployment before release; do not introduce existing-data migration work unless the stated situation changes.

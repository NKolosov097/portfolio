# Feedback restoration: audit and proposed design

Date: 2026-09-11. Scope: audit the current working tree and propose restoration; application changes are not implemented by this document.

User clarification: there is no working database yet. The recommendation is now a fresh PostgreSQL database with Drizzle; this is a recommendation, not a claim that the user has selected the ORM. Existing-data migration is outside the required path unless a database is discovered later.

## Scope and existing work

Feedback is interpreted as the existing Contact message form, not a public testimonials feature. Restore it as the last home section, following Writing, with its existing `contact` anchor and localized header tab. Keep name, email, company, profession, and message; company and profession remain optional to fill in.

The section was removed from the page and header by commit `9a2afd5` on 2026-05-11. That commit does not document a business or operational reason. Earlier commits include `0bc05b4` (form and validation), `8a729d3` (database persistence), `cf2fba3` (mail), `e7b86f4` (reset), and `5c91721` (tests).

Reusable files:

- `src/home-sections/Contact/Contact.tsx` and `Contact.module.css`: section and responsive form layout.
- `src/home-sections/Contact/components/Form/Form.tsx`: Gravity UI, React Hook Form, Zod, and React action state.
- `src/home-sections/Contact/actions/send-message.action.ts` and its test: nested User upsert and Message creation, then email.
- `src/home-sections/Contact/schemas/send-message.schema.ts` and its test: trimming, email and minimum message validation.
- `src/constants/contact.constants.ts`, `src/constants/header.constants.ts`, `public/locales/{en,ru}.json`: values, anchor, and translations.
- `src/lib/prisma.ts`, `src/lib/mail.tsx`, `prisma/schema.prisma`: infrastructure and two related models.

The working tree already contains unrelated loading, navigation, mail logging, and documentation changes. Preserve them and integrate against the current tree. README currently describes a contact form embedded in AboutMe, but neither AboutMe nor the home page renders it.

## Validation actually performed

Environment: Windows PowerShell, Node 24.19.0, pnpm 11.21.0. Use `pnpm.cmd` on this machine because PowerShell blocks the `pnpm.ps1` shim.

| Check                                                  | Result                                                   | Limits                                                                                                |
| ------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm.cmd check-types`                                 | Passed                                                   | Includes hidden Contact source but does not exercise it                                               |
| `pnpm.cmd test`                                        | 23 files, 194 tests passed                               | Contact DB and mail are mocked; no Contact component test                                             |
| `pnpm.cmd build`                                       | Passed                                                   | Hidden Contact runtime and actual services are not exercised                                          |
| `pnpm.cmd check-styles`                                | Passed                                                   | Non-mutating alternative to `lint:styles --fix`                                                       |
| ESLint with `.claude/**` and `.pnpm-store/**` excluded | Zero errors, two hook dependency warnings in MobileAside | Original broad scan was interrupted; this is a scoped result                                          |
| `pnpm.cmd check-format`                                | Failed, 70 files reported                                | Includes nested `.claude/worktrees` and generated files; `src/lib/mail.tsx` is also reported          |
| Focused Prettier on Contact and mail                   | Contact passed; mail reported                            | An earlier command included Prisma schema, which Prettier cannot parse; that invocation was corrected |
| Six-project Playwright smoke command                   | Blocked before tests                                     | Port 3000 already occupied; global setup refuses to reuse it                                          |
| Live DB / SMTP / deployment                            | Not tested                                               | No local env files except `.env.example`; all five DB/SMTP/recipient process variables unset          |

Neither `docker` nor `psql` was found on PATH. This does not establish whether other installations exist. The user confirmed that there is no working database. The future provider and deployment variables still need configuration. No real email was sent and no database was changed.

## Findings and priorities

Additional working-tree check: `git diff --check` reports trailing whitespace/CRLF on pre-existing HeaderTabs edits. This audit did not normalize or overwrite that file. Include line-ending cleanup when integrating the header restoration.

| Priority | Finding and evidence                                                                                                 | Consequence / correction                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | `mail.tsx:370` interpolates raw `${message}` into HTML                                                               | User input can alter email markup. Escape text or use a template renderer that escapes it; test all dynamic fields                                        |
| P0       | `send-message.action.ts:78-85` returns stringified DB errors to the client                                           | Internal details may be exposed. Return stable error codes and sanitize operational logs                                                                  |
| P0       | Action has no server-side rate control, field maxima, or request idempotency                                         | Public submissions can cause unbounded writes, repeated messages, and mail abuse; enforce limits before writes and delivery                               |
| P0       | `.gitignore:46` excludes `prisma/migrations`; no migration files exist locally or in tracked files                   | A fresh deploy has no reproducible User/Message DDL. Establish migration baseline before adding tables or columns                                         |
| P1       | `Form.tsx:49-59` ignores action pending state and uses RHF `isLoading` with synchronous defaults                     | Loading and duplicate-submit protection do not track the server request                                                                                   |
| P1       | Form renders RHF errors but never action `errors` or returned `fields`                                               | DB/server validation failures have no useful UI recovery                                                                                                  |
| P1       | Reset is scheduled 3.5 seconds after success                                                                         | New input may be erased; success state is shared across submissions. Reset only the acknowledged submission and remove the timer                          |
| P1       | Mail transport swallows failures, calls `verify` per submission, sends the same acknowledgement to visitor and owner | Delivery failures are not observable as outcomes; owner lacks sender metadata and Reply-To. Separate message purposes, add timeouts and explicit outcomes |
| P1       | Message records have no timestamp or delivery state                                                                  | Stored-but-undelivered messages cannot be reliably audited or retried without an operational recovery path                                                |
| P1       | CI has a placeholder DB URL and no DB or SMTP services                                                               | Existing E2E cannot verify persistence or delivery after the section is restored                                                                          |
| P1       | Global setup fixes port 3000; teardown kills listeners by port                                                       | Local collisions block runs. Parameterize port and track the server owned by the test run                                                                 |
| P2       | TextArea uses a note/placeholder, fields lack explicit stable IDs and email/autocomplete semantics                   | Validate accessible names against actual Gravity UI DOM; add labels, error association, status announcement, and email input semantics                    |
| P2       | Mail is English-only; server messages include hardcoded strings                                                      | Use stable codes translated by current UI locale and localized acknowledgement copy if retained                                                           |
| P2       | `prisma/seed.ts` constructs a client without the adapter used by the application and uses non-idempotent create      | Review seed configuration for Prisma 7, run only against isolated DB, make repeat runs deterministic                                                      |
| P2       | Formatting/lint traversal includes local worktrees and generated output                                              | Fix ignore boundaries without formatting other worktrees; retain real source checks                                                                       |

These are source-level findings unless the validation table identifies an executed check. Accessibility and responsive behavior of the restored section still require browser verification. There is no evidence that ORM performance is currently a bottleneck.

## Proposed behavior

Keep Next.js Server Actions, React Hook Form, Zod, Gravity UI, PostgreSQL, and en/ru localization. A successful submission means its message was durably stored; it must not claim email delivery when only storage succeeded. Persist owner notification state and provide a controlled retry command for failed notifications. Retry operates on the stored message and never creates another message. Exactly-once SMTP delivery is not promised: a crash after SMTP acceptance but before recording delivery can lead to a duplicate notification.

Use the third `useActionState` return value for request pending, guard rapid re-entry, show field/global errors, focus the first invalid field, and announce the result. Keep entered values after failure. Clear the acknowledged submission once on success; do not run delayed resets. Re-translate displayed errors when language changes without losing input.

Proposed server limits: name 1-100, email at most 254, company/profession at most 150 each, message 6-5000 characters after trimming. Treat omitted optional fields as empty strings. Accept only known string fields; reject files and malformed payloads. Return error codes rather than accepting client-authored validation messages as the server contract.

Use a client-generated submission UUID held across network retries and enforced by a database unique constraint. Generate a new ID after confirmed success. Combine an atomic shared limiter (initial policy: 5 submissions per 10 minutes per trusted client identity, with expiring counters) with a honeypot. Do not rely on per-process memory on serverless hosts. Resolve trusted proxy/IP handling for the actual deployment; do not trust arbitrary forwarded headers. Avoid permanent IP storage. Evaluate an email-based secondary limit without enabling trivial permanent denial of service against an address.

Owner notification contains sender details, message text, and validated Reply-To. A visitor acknowledgement is optional and disabled by default in the proposed restoration until mail-abuse controls and the desired product behavior are verified. Database failure sends no mail. SMTP failure leaves a saved message and recorded failure for retry. Test environments always use a local mail sink with outbound relay disabled.

## ORM decision: Prisma versus Drizzle

Both fit this feature. The current runtime has one Prisma caller (the Contact action) and two models; migration surface is small, but service and database state still need inspection.

1. **Restore with Prisma (lowest code-change alternative):** retain the tested nested write and existing connection setup; establish migration history and repair form state, mail, and coverage.
2. **Switch persistence to Drizzle as a separate preparatory change (recommended after the no-database clarification):** use TypeScript schema and explicit SQL for the new PostgreSQL database. `pg` is already installed. Use `drizzle-orm/node-postgres`, schema in `src/db/schema.ts`, connection in `src/db/client.ts`, and reviewed migrations in `drizzle/`.
3. **Replace the form with an external service:** less local persistence code but introduces a provider and changes ownership/operations; not recommended for restoring existing work.

Drizzle supports PostgreSQL, upserts, transactions, introspection, and generated SQL migrations. Replace the Prisma nested write with a transaction: upsert user on unique email, return its ID, insert message, commit. Failure inserting the message must roll back the user change. Preserve the current quoted table/column names, keys, constraints, existing IDs, and sequence state during a schema-preserving ORM switch. Avoid renames in that change.

Drizzle does not replace Prisma Accelerate by changing an import. If deployment uses `prisma://`, obtain and validate the underlying PostgreSQL connection/pooling strategy first. Do not discard that path based on the absence of local env variables. No speed or cost improvement is claimed without measurements.

For existing data, inspect schema and migration history read-only, back up and restore to a disposable database, and prove a baseline there. For an empty database, prove clean migrations. ORM replacement must pass the same transaction, idempotency, and failure tests before removing Prisma dependencies, generator scripts, seed imports, and deployment commands.

Recommendation: choose Drizzle for this new database if the proposed stack is accepted. The user confirmed there is no working DB, so data transfer and existing migration reconciliation are not required. The justification is simpler TypeScript/SQL tooling for a small persistence surface, not a fix for the form/mail bugs or a measured performance gain. Keep the ORM change separate from those fixes. Existing-data and Accelerate notes above are conditional safeguards, not current blockers.

## Constraints and acceptance

- Node.js 24; existing Next.js 16 / React 19 / strict TypeScript; no weakening lint or type checks.
- Reuse Gravity UI, current en/ru catalogs, and existing responsive shell; do not add another form or UI framework.
- Preserve existing user data and unrelated working-tree edits.
- Keep schema history in version control and use reviewed migrations for deployment.
- Windows local and Linux CI are required; browser emulation does not substitute for physical iOS/Android checks.
- Full flow must prove durable storage, owner notification capture, retry behavior, safe errors, and one persisted message for a retried request.
- Production release is gated on migration and service verification; audit completion is not a claim that the feature is restored.

## Primary references checked

- [React useActionState](https://react.dev/reference/react/useActionState): pending state belongs to the action. RHF loading behavior was also checked in the installed `react-hook-form/dist/index.esm.mjs`.
- [Prisma baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining): introducing migration history for an existing database.
- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql), [upsert](https://orm.drizzle.team/docs/guides/upsert), [transactions](https://orm.drizzle.team/docs/transactions), and [migrations](https://orm.drizzle.team/docs/migrations).

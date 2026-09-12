# Feedback restoration verification

## Scope and decisions

The existing Contact section and navigation are restored using Drizzle/PostgreSQL. The owner confirmed that no working database exists, so this change establishes a fresh schema; it does not migrate legacy messages. Prisma runtime dependencies, generated-client use, and old schema/seed files were removed.

Work is in `feat/feedback-production`, created from current `origin/main`. The older dirty checkout was preserved untouched. Vercel is linked under `nkolosov097`; non-database production/preview configuration has been applied, but no production deployment has been made.

## Behavior

- Stable localized field/global errors; strict server validation and a hidden spam field.
- Transactional user upsert plus immutable message snapshot; replaying a UUID stores one message and does not resend mail.
- Shared temporary HMAC rate limits, trusted-proxy identity configuration, and bounded PostgreSQL waits.
- Owner-only escaped HTML/plain-text notifications with Reply-To, retry state, atomic leased claims, and a hard SMTP deadline.
- Form pending guards, retry UUID retention, draft preservation, acknowledged-only reset, explicit labels, and error focus.
- Contact tab and direct anchors, including navigation back from article pages.

## Verification record

The authoritative local services were PostgreSQL 18.3 and Mailpit 1.31.1, pinned by digest in `compose.feedback-test.yml`. Mailpit had no outbound relay. Tests used synthetic addresses and cleaned only their own database records.

| Check                                                              | Result                                                      |
| ------------------------------------------------------------------ | ----------------------------------------------------------- |
| Windows Node 24 type/lint/style/format gates                       | Passed; two pre-existing `MobileAside` hook warnings remain |
| Linux Node 24 frozen dependency installation and quality gates     | Passed                                                      |
| Windows unit/DOM suite on the current branch                       | 241 passed                                                  |
| Earlier Linux unit/DOM suite before the production-ops additions   | 227 passed                                                  |
| Windows/Linux process and port-ownership suite                     | 12 passed per environment                                   |
| PostgreSQL/Mailpit integration on Windows and Linux                | 11 passed per environment                                   |
| Clean schema migration, second no-op migration, seed repeatability | Passed                                                      |
| Final production builds on Windows and Linux                       | Passed                                                      |
| Current Contact UI matrix                                          | 60 passed across all 12 browser/viewport projects           |
| Full browser suite                                                 | 290 passed, 28 intentional project/mode skips               |
| Database outage matrix                                             | 6 passed; 6 SMTP-only cases skipped                         |
| SMTP outage matrix                                                 | 6 passed; 6 database-only cases skipped                     |

The PostgreSQL suite exercises actual rollback after the user upsert, same-email concurrency, 20 concurrent identical submissions, quota atomicity and expiry, notification claims and lease recovery, pool exhaustion, and failed notification recovery through Mailpit.

The first full Windows browser run produced 271 passes, 16 intentional skips, and 13 failures. Six failures came from an incorrect Russian-language test setup (the app uses a cookie, not a query parameter); six exposed real pre-hydration draft loss in WebKit. One unrelated mobile Firefox sparkle case was confirmed as transient in an isolated rerun. The form now renders disabled controls until hydration, and an SSR regression test plus the final six-browser matrix prove that browsers cannot enter a draft that React will erase.

The final full browser run used the stable production build and two workers while a foreign listener remained on port 3000. The suite ran its owned server on port 3100, exited cleanly, and left the foreign listener reachable. Failure-mode suites then restarted the same build with a deliberately closed loopback database or SMTP port.

Independent code reviews identified and resolved idle PostgreSQL connection error handling, SMTP cancellation/TLS ownership, portable test-service ports, timeout headroom, terminal-notification recovery, exact-revision migrations, migration serialization, and backlog/run-health monitoring. Review acceptance does not substitute for the executable checks above.

## Remaining release checks

Accept the Neon Marketplace terms in Vercel, provision the production/preview PostgreSQL resource, and validate its pooled/direct URLs. GitHub device authorization must finish before pushing the branch and installing matching workflow secrets. Validate the existing Gmail App Password, hosted preview deliverability, cold starts, and backup/application rollback before release.

Physical iOS/Android keyboards, autofill, rotation, background/resume, desktop browser zoom, hosted preview, and VPS/proxy behavior have not been exercised here. Playwright mobile profiles are emulation; the Firefox mobile project is a narrow desktop Firefox viewport.

SMTP and PostgreSQL cannot jointly guarantee exactly-once mail delivery. A crash after SMTP acceptance but before recording `sent` can cause a duplicate notification on retry; it must not create a duplicate saved message. Application rollback should hide/revert the form without dropping saved data or migration history.

Reproduction commands and isolated service setup: [Feedback development and validation](../../feedback-testing.md).

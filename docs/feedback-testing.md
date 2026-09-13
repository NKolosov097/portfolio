# Feedback development and validation

The Contact form uses PostgreSQL and sends owner notifications over SMTP. Local tests must use the disposable database and capture-only Mailpit service. No visitor acknowledgement is sent.

## Start the isolated services

```powershell
docker compose -f compose.feedback-test.yml up -d --wait

$env:DATABASE_URL = 'postgresql://feedback_test:feedback_test@127.0.0.1:15432/feedback_test'
$env:TEST_DATABASE_URL = $env:DATABASE_URL
$env:SMTP_SERVER_HOST = '127.0.0.1'
$env:SMTP_SERVER_PORT = '11025'
$env:SMTP_SERVER_SECURE = 'false'
$env:SMTP_FROM = 'portfolio@example.test'
$env:SITE_MAIL_RECIEVER = 'owner@example.test'
$env:MAILPIT_API_URL = 'http://127.0.0.1:18025'
$env:CONTACT_RATE_LIMIT_SECRET = 'local-test-only-feedback-rate-limit-secret'
$env:CONTACT_TRUSTED_IP_HEADER = 'x-feedback-test-ip'
$env:E2E_PORT = '3100'
Remove-Item Env:SMTP_SERVER_USERNAME -ErrorAction SilentlyContinue
Remove-Item Env:SMTP_SERVER_PASSWORD -ErrorAction SilentlyContinue

pnpm.cmd db:migrate
pnpm.cmd test:integration
pnpm.cmd test:e2e
```

On Linux use the same variable names with `export`, and use `pnpm` instead of `pnpm.cmd`. CI creates its own PostgreSQL and Mailpit services on ports 5432/1025/8025. Both paths use committed SQL migrations. `TEST_DATABASE_URL` is deliberately restricted to a local database named `feedback_test`.

The custom IP header above is only for isolated tests, where each browser case supplies a separate identity. For manual development without a proxy, unset `CONTACT_TRUSTED_IP_HEADER` and run `pnpm dev`; development can use loopback identity. In production configure a header your trusted proxy overwrites, not one a visitor can control. Missing production identity/configuration yields a recoverable unavailable response.

Mailpit's local inbox is at <http://127.0.0.1:18025>. It has no outbound relay configuration. The Compose database is disposable; stop and remove only this test project with:

```powershell
docker compose -f compose.feedback-test.yml down
```

## Checks and failure scenarios

```powershell
pnpm.cmd check-types
pnpm.cmd check-lint
pnpm.cmd check-styles
pnpm.cmd check-format
pnpm.cmd test
pnpm.cmd exec vitest run --config vitest.infrastructure.config.mts
pnpm.cmd build
```

`pnpm lint` also runs Stylelint with auto-fix; the explicit commands above inspect code without rewriting it. The browser lifecycle refuses occupied ports and stops only its own Node/Next child.

- Unit/DOM: field boundaries, stable safe errors, HTML escaping, pending/retry behavior, draft retention, locale changes, keyboard focus, and acknowledgement reset.
- PostgreSQL integration: fresh/no-op migrations, transaction rollback, concurrent sender updates, duplicate requests, rate-window expiry, atomic notification claims, and retry outcomes.
- Browser integration: actual Server Action POST, one saved message despite rapid clicks and replay, owner recipient/Reply-To, escaped message HTML, and no attachments or visitor acknowledgement.
- Browser UI: direct contact anchor, navigation, invalid draft retention, responsive layout, and en/ru copy. Existing projects cover Chromium/Firefox/WebKit and their mobile configurations.

Tests use unique submission identifiers and synthetic sender addresses. Database cleanup must target only records created by that test run. Do not truncate shared tables or release Mailpit messages to a real relay.

After the normal E2E run has built the app, exercise real connection failures with the same test environment:

```powershell
$env:E2E_CONTACT_FAILURE = 'database'
$env:DATABASE_URL = 'postgresql://feedback_test:feedback_test@127.0.0.1:1/feedback_test'
pnpm.cmd exec playwright test e2e/contact-failures.spec.ts
$env:DATABASE_URL = $env:TEST_DATABASE_URL
$env:E2E_CONTACT_FAILURE = 'smtp'
$env:SMTP_SERVER_PORT = '1'
pnpm.cmd exec playwright test e2e/contact-failures.spec.ts
$env:SMTP_SERVER_PORT = '11025'
Remove-Item Env:E2E_CONTACT_FAILURE
```

Port 1 is intentionally closed. These tests change process configuration only; they add no fault-injection endpoint to the app. The database case retains an unsaved draft; the SMTP case confirms storage and a pending retry despite failed delivery.

## Before a production release

Provision a separate PostgreSQL database, apply the committed migrations, configure pooled application and direct migration connections as required by the provider, set SMTP and trusted-proxy variables, and generate a real rate-limit secret. Rehearse notifications and failure recovery in preview before exposing the form publicly.

A saved message is successful even if email is temporarily unavailable. Use `pnpm contact:retry` to process due owner notifications; attempts are bounded. Exactly-once SMTP delivery is not guaranteed if a process crashes after SMTP accepts a message and before recording its delivery status. Retrying notifications must never create another saved message.

The identity limit is five submissions per ten minutes. `CONTACT_EMAIL_RATE_LIMIT` optionally sets the looser email limit (default 20, allowed 6-1000 in the same window). Configure a scheduler for `pnpm contact:retry`; this command does not schedule itself. `CONTACT_RETRY_LIMIT` bounds each run to at most 100 claims (default 25).

Real iOS Safari/Android keyboard and autofill behavior, hosted preview networking/pooling, and production deliverability require those actual environments. Browser emulation and a local SMTP sink do not establish those results.

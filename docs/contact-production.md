# Contact production runbook

## Target architecture

- Vercel runs the Next.js application.
- Neon PostgreSQL supplies a pooled runtime URL and a direct migration URL.
- Gmail n.kolosov097@gmail.com sends owner notifications to the same address using an App Password.
- Every valid submission is committed before SMTP is attempted. A database failure remains visible to the visitor; an SMTP failure is acknowledged because the message is durable and queued.
- GitHub Actions invokes the protected retry endpoint every 15 minutes. Vercel Cron invokes it daily as a Hobby-compatible fallback.

## Required Vercel variables

Configure Production and a separate Preview database:

    DATABASE_URL
    DIRECT_DATABASE_URL
    CONTACT_DB_DATABASE_URL
    CONTACT_DB_DATABASE_URL_UNPOOLED
    NEXT_PUBLIC_LOCALHOST_API
    SMTP_SERVER_HOST=smtp.gmail.com
    SMTP_SERVER_PORT=465
    SMTP_SERVER_SECURE=true
    SMTP_SERVER_USERNAME=n.kolosov097@gmail.com
    SMTP_SERVER_PASSWORD=<Gmail App Password>
    SMTP_FROM=n.kolosov097@gmail.com
    SITE_MAIL_RECIEVER=n.kolosov097@gmail.com
    CONTACT_RATE_LIMIT_SECRET
    CONTACT_EMAIL_RATE_LIMIT=20
    CONTACT_TRUSTED_IP_HEADER=x-vercel-forwarded-for
    CRON_SECRET
    OPERATIONS_SECRET
    CONTACT_RETRY_LIMIT=25

The application prefers the `CONTACT_DB_` Neon variables, allowing a stale legacy `DATABASE_URL` to remain untouched during rollout. The Gmail account must have two-step verification before Google offers App Passwords. Do not use the normal Google password.

## GitHub environments

Create preview and production environments. Store:

- CONTACT_DIRECT_DATABASE_URL for the migration workflow;
- CONTACT_DATABASE_URL for the targeted terminal-notification requeue workflow;
- CONTACT_CRON_SECRET matching Vercel CRON_SECRET;
- CONTACT_OPERATIONS_SECRET matching Vercel OPERATIONS_SECRET.

Protect the production environment with required review if the repository plan supports it.

## Preview release

1. Apply migrations with Contact database migration -> preview against the preview database and enter the exact 40-character reviewed commit SHA.
2. Deploy the PR preview with preview-only variables.
3. Submit a unique synthetic message and verify one database row and one Gmail owner notification.
4. Disable SMTP temporarily. Confirm the visitor still sees success, the row is queued, and an authenticated retry sends it after SMTP is restored.
5. Use a closed database port in the isolated test suite. Confirm the draft remains and the visitor sees a recoverable failure.
6. Check English/Russian copy, keyboard focus, responsive layout, and the Chromium/Firefox/WebKit matrix.

Vercel Cron invokes production only. Exercise preview by calling the protected route manually with the preview CRON_SECRET.

## Production release

1. Verify CI and preview.
2. Take or confirm a database restore point.
3. Dispatch Contact database migration -> production for the exact 40-character release SHA. The workflow rejects commits outside `main`.
4. Deploy production. `vercel-build` also applies committed migrations under a PostgreSQL advisory lock before compiling the application, so automatic deployments cannot start the new code before its schema exists.
5. Submit one uniquely identifiable synthetic message.
6. Verify one stored row, Gmail delivery, and Reply-To pointing to the submitted sender.
7. Invoke /api/cron/contact-notifications with its bearer secret and confirm an aggregate successful response.
8. Invoke /api/internal/contact-status with its separate bearer secret. Require database ok and zero terminal notifications.

## Operations and incidents

- /api/health is public liveness and intentionally does not test PostgreSQL.
- /api/internal/contact-status is private readiness for the contact pipeline. It exposes counts and the last run only.
- Each retry run has a database lease and a 45-second processing budget. It stops claiming work unless at least 22 seconds remain. Individual SMTP connections have a 15-second timeout.
- A failed GitHub Actions Contact operations run means the endpoint, database, retry worker, or terminal queue needs inspection.
- If a notification reaches five failed attempts, fix the delivery cause and dispatch Requeue contact notification with its submission UUID. The command only resets one terminal row and fails if that row is absent or no longer terminal.
- A Gmail App Password is revoked when the Google account password changes; replace the Vercel secret after such a change.
- SMTP cannot guarantee exactly-once delivery if a process crashes after Gmail accepts mail but before PostgreSQL records success. The stored submission remains idempotent.

For rollback, revert the application deployment. Keep applied migrations in place; they are additive. Restore the database only for confirmed data corruption.

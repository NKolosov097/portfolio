import { randomUUID } from 'node:crypto'

import { expect, test } from '@playwright/test'
import { Pool } from 'pg'

import en from '@public/locales/en.json'

/** Failure runs use ordinary runtime configuration pointed at a closed local port. */
const FAILURE_MODE = process.env.E2E_CONTACT_FAILURE

test('preserves the draft when the database is unreachable', async ({ page }) => {
  test.skip(FAILURE_MODE !== 'database', 'Run with the isolated database-outage configuration')
  const unavailableDatabase = new URL(process.env.DATABASE_URL ?? '')
  if (unavailableDatabase.hostname !== '127.0.0.1' || unavailableDatabase.port !== '1') {
    throw new Error('Database outage run must target closed loopback port 1')
  }
  await page.setExtraHTTPHeaders({ 'x-feedback-test-ip': '10.0.0.1' })
  await page.goto('/#contact')
  await page.locator('#contact-name').fill('Database Outage Test')
  await page.locator('#contact-email').fill('database-outage@example.test')
  await page.locator('#contact-message').fill('Please preserve this unsaved message')
  await page.getByRole('button', { name: en.contact.sendMessage, exact: true }).click()
  await expect(page.getByTestId('contact-result')).toHaveText(en.contact.serviceUnavailable)
  await expect(page.locator('#contact-message')).toHaveValue('Please preserve this unsaved message')
  await expect(page.locator('#contact-email')).toHaveValue('database-outage@example.test')
  await expect(page.getByTestId('contact-form')).toHaveAttribute('aria-busy', 'false')
})

test('acknowledges durable storage and records a retry when SMTP is unreachable', async ({
  page,
}) => {
  test.skip(FAILURE_MODE !== 'smtp', 'Run with the isolated SMTP-outage configuration')
  if (process.env.SMTP_SERVER_HOST !== '127.0.0.1' || process.env.SMTP_SERVER_PORT !== '1') {
    throw new Error('SMTP outage run must target closed loopback port 1')
  }
  const databaseUrl = process.env.TEST_DATABASE_URL
  if (
    !databaseUrl ||
    new URL(databaseUrl).hostname !== '127.0.0.1' ||
    new URL(databaseUrl).pathname !== '/feedback_test'
  ) {
    throw new Error('SMTP outage tests require the isolated local feedback_test database')
  }
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 2_000 })
  const token = randomUUID()
  const email = `smtp-outage-${token}@example.test`
  const identity = `10.${[...Buffer.from(token.replaceAll('-', ''), 'hex').subarray(0, 3)].join('.')}`
  try {
    await page.setExtraHTTPHeaders({ 'x-feedback-test-ip': identity })
    await page.goto('/#contact')
    await page.locator('#contact-name').fill('SMTP Outage Test')
    await page.locator('#contact-email').fill(email)
    await page
      .locator('#contact-message')
      .fill('Store this even while the local mail sink is unavailable')
    await page.getByRole('button', { name: en.contact.sendMessage, exact: true }).click()
    await expect(page.getByTestId('contact-result')).toHaveText(en.contact.successfulSubmitTitle)
    await expect(page.locator('#contact-message')).toHaveValue('')
    const result = await pool.query<{ notification_state: string; notification_attempts: number }>(
      'SELECT notification_state, notification_attempts FROM messages WHERE email = $1',
      [email],
    )
    expect(result.rows).toEqual([{ notification_state: 'failed', notification_attempts: 1 }])
  } finally {
    const deleted = await pool.query<{ submission_id: string }>(
      'DELETE FROM messages WHERE email = $1 RETURNING submission_id',
      [email],
    )
    await pool.query('DELETE FROM users WHERE email = $1', [email])
    await pool.query('DELETE FROM contact_submission_keys WHERE submission_id = ANY($1::uuid[])', [
      deleted.rows.map(({ submission_id }) => submission_id),
    ])
    await pool.end()
  }
})

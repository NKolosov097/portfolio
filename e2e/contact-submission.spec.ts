import { randomBytes, randomUUID } from 'node:crypto'

import { expect, test } from '@playwright/test'
import { Pool } from 'pg'
import { z } from 'zod'

import en from '@public/locales/en.json'

/** Explicit opt-in to the disposable database; ordinary UI smoke needs no services. */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
/** A local capture-only sink; never use a production SMTP account in this suite. */
const MAILPIT_API_URL = process.env.MAILPIT_API_URL
/** Validate the external sink's response instead of relying on untyped JSON. */
const MAIL_SEARCH_SCHEMA = z.object({ messages: z.array(z.object({ ID: z.string() })) })
/** Mailpit exposes decoded text/HTML and address lists for actual transport verification. */
const MAIL_SCHEMA = z.object({
  To: z.array(z.object({ Address: z.string() })),
  ReplyTo: z.array(z.object({ Address: z.string() })),
  Text: z.string(),
  HTML: z.string(),
  Attachments: z.array(z.unknown()),
})

test('retains a failed draft, then saves and notifies once after pending, rapid clicks and replay', async ({
  page,
  request,
}) => {
  test.skip(!TEST_DATABASE_URL || !MAILPIT_API_URL, 'Requires isolated PostgreSQL and Mailpit')
  if (!TEST_DATABASE_URL || !MAILPIT_API_URL) return

  const databaseUrl = new URL(TEST_DATABASE_URL)
  const sinkUrl = new URL(MAILPIT_API_URL)
  if (
    databaseUrl.hostname !== '127.0.0.1' ||
    databaseUrl.pathname !== '/feedback_test' ||
    sinkUrl.hostname !== '127.0.0.1'
  ) {
    throw new Error(
      'Contact browser tests require the isolated local feedback_test database and sink',
    )
  }

  const pool = new Pool({ connectionString: TEST_DATABASE_URL, connectionTimeoutMillis: 2_000 })
  const token = randomUUID()
  const email = `browser-${token}@example.test`
  const message = `Browser submission ${token}: <b>literal text</b> & "quotes"`
  const identity = `10.${[...randomBytes(3)].join('.')}`

  try {
    await page.setExtraHTTPHeaders({ 'x-feedback-test-ip': identity })
    await page.goto('/?lang=en#contact')
    await page.locator('#contact-name').fill('Browser Sender')
    await page.locator('#contact-email').fill(email)
    await page.locator('#contact-company').fill('Example Company')
    await page.locator('#contact-profession').fill('Engineer')
    await page.locator('#contact-message').fill(message)

    // Fail the browser's actual transport before persistence, without mocking an action response.
    await page.route('**/*', async (route) => {
      if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
        await route.abort('internetdisconnected')
      } else {
        await route.continue()
      }
    })
    await page.getByRole('button', { name: en.contact.sendMessage, exact: true }).click()
    await expect(page.getByTestId('contact-result')).toHaveText(en.contact.serviceUnavailable)
    await expect(page.locator('#contact-message')).toHaveValue(message)
    await expect(page.locator('#contact-email')).toHaveValue(email)
    await page.unrouteAll({ behavior: 'wait' })

    let releaseRequest = () => {}
    const heldRequest = new Promise<void>((resolve) => {
      releaseRequest = resolve
    })
    await page.route('**/*', async (route) => {
      if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
        await heldRequest
      }
      await route.continue()
    })

    const actionRequestPromise = page.waitForRequest(
      (candidate) => candidate.method() === 'POST' && Boolean(candidate.headers()['next-action']),
    )
    await page
      .getByRole('button', { name: en.contact.sendMessage, exact: true })
      .evaluate((button) => {
        if (!(button instanceof HTMLButtonElement)) throw new Error('Expected a submit button')
        button.click()
        button.click()
      })
    const actionRequest = await actionRequestPromise
    try {
      await expect(page.getByTestId('contact-form')).toHaveAttribute('aria-busy', 'true')
      await expect(page.locator('#contact-message')).toBeDisabled()
      await expect(page.locator('#contact-message')).toHaveValue(message)
    } finally {
      releaseRequest()
    }
    await expect(page.getByTestId('contact-result')).toBeVisible()
    await expect(page.locator('#contact-message')).toHaveValue('')

    const countMessages = async () => {
      const result = await pool.query<{ count: number }>(
        'SELECT count(*)::integer AS count FROM messages WHERE email = $1',
        [email],
      )
      return result.rows[0]?.count
    }
    await expect.poll(countMessages).toBe(1)

    const payload = actionRequest.postDataBuffer()
    if (!payload) throw new Error('Expected the real Server Action request body')
    const actionHeaders = actionRequest.headers()
    const replay = await request.post(actionRequest.url(), {
      headers: {
        'content-type': actionHeaders['content-type'],
        'next-action': actionHeaders['next-action'],
        origin: new URL(actionRequest.url()).origin,
        'x-feedback-test-ip': identity,
      },
      data: payload,
    })
    expect(replay.ok()).toBe(true)
    expect(await countMessages()).toBe(1)

    const searchMail = async () => {
      const response = await request.get(`${MAILPIT_API_URL}/api/v1/search`, {
        params: { query: token },
      })
      expect(response.ok()).toBe(true)
      return MAIL_SEARCH_SCHEMA.parse(await response.json()).messages
    }
    await expect.poll(async () => (await searchMail()).length).toBe(1)
    const [captured] = await searchMail()
    const mailResponse = await request.get(`${MAILPIT_API_URL}/api/v1/message/${captured.ID}`)
    const mail = MAIL_SCHEMA.parse(await mailResponse.json())
    expect(mail.To.map(({ Address }) => Address)).toEqual(['owner@example.test'])
    expect(mail.ReplyTo.map(({ Address }) => Address)).toEqual([email])
    expect(mail.Text).toContain(message)
    expect(mail.HTML).toContain('&lt;b&gt;literal text&lt;/b&gt;')
    expect(mail.HTML).not.toContain('<b>literal text</b>')
    expect(mail.Attachments).toHaveLength(0)
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

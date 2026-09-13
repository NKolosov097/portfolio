import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { handleContactNotificationCron, handleContactOperationsStatus } from './cron-handler'

const request = (authorization?: string) =>
  new Request('https://portfolio.example/api/cron/contact-notifications', {
    headers: authorization ? { authorization } : undefined,
  })

describe('contact notification cron handler', () => {
  it.each([undefined, '', 'wrong'])(
    'fails closed for a missing or invalid secret (%s)',
    async (secret) => {
      const run = vi.fn()
      const response = await handleContactNotificationCron(request('Bearer expected'), {
        secret,
        run,
      })

      expect(response.status).toBe(401)
      expect(response.headers.get('cache-control')).toBe('private, no-store')
      expect(run).not.toHaveBeenCalled()
    },
  )

  it('rejects malformed authorization without running database work', async () => {
    const run = vi.fn()
    const response = await handleContactNotificationCron(request('expected'), {
      secret: 'expected',
      run,
    })

    expect(response.status).toBe(401)
    expect(run).not.toHaveBeenCalled()
  })

  it('returns aggregate run results for a valid bearer secret', async () => {
    const run = vi.fn().mockResolvedValue({
      status: 'completed',
      claimed: 2,
      sent: 1,
      requeued: 1,
      lostLease: 0,
      stoppedByDeadline: false,
    })
    const response = await handleContactNotificationCron(request('Bearer expected'), {
      secret: 'expected',
      run,
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      status: 'completed',
      claimed: 2,
      sent: 1,
      requeued: 1,
      lostLease: 0,
      stoppedByDeadline: false,
    })
  })

  it('returns a stable error without leaking the database failure', async () => {
    const run = vi.fn().mockRejectedValue(new Error('password=secret private@example.com'))
    const response = await handleContactNotificationCron(request('Bearer expected'), {
      secret: 'expected',
      run,
    })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ ok: false, code: 'retry_unavailable' })
  })
})

describe('contact operational status handler', () => {
  it('requires the operations secret and returns aggregate status', async () => {
    const load = vi.fn().mockResolvedValue({
      database: 'ok',
      notifications: { due: 1, delayed: 2, sendingActive: 0, terminal: 0 },
      lastRun: null,
    })

    expect(
      (await handleContactOperationsStatus(request('Bearer cron'), { secret: 'ops', load })).status,
    ).toBe(401)
    const response = await handleContactOperationsStatus(request('Bearer ops'), {
      secret: 'ops',
      load,
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      database: 'ok',
      notifications: { due: 1, delayed: 2, sendingActive: 0, terminal: 0 },
      lastRun: null,
    })
  })

  it('returns a stable unavailable status without exception details', async () => {
    const response = await handleContactOperationsStatus(request('Bearer ops'), {
      secret: 'ops',
      load: vi.fn().mockRejectedValue(new Error('postgres://private@example.com')),
    })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ ok: false, database: 'unavailable' })
  })
})

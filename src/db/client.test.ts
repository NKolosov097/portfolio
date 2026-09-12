import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { createContactPool } from '@/db/client'

describe('createContactPool', () => {
  it('handles idle client errors without logging connection details', async () => {
    const pool = createContactPool(
      'postgres://feedback_test:feedback_test@127.0.0.1:15432/feedback_test',
      1,
    )
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(pool.listenerCount('error')).toBe(1)
    pool.emit('error', new Error('password=secret'))
    expect(error).toHaveBeenCalledWith('Contact database pool lost an idle connection')
    expect(JSON.stringify(error.mock.calls)).not.toContain('secret')
    await pool.end()
  })
})

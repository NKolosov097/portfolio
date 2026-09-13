import { describe, expect, it } from 'vitest'

import { GET, HEAD } from './route'

describe('public health route', () => {
  it('returns minimal non-cacheable liveness without environment details', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('supports a bodyless liveness probe', async () => {
    const response = await HEAD()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.text()).toBe('')
  })
})

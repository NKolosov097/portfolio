import { afterEach, describe, expect, it, vi } from 'vitest'

import { cancelIdle, requestIdle } from '@/helpers/idleCallback'

afterEach(() => {
  vi.useRealTimers()
})

describe('requestIdle', () => {
  it('falls back to a timer where the browser has no idle callback', () => {
    vi.useFakeTimers()

    const callback = vi.fn()

    requestIdle(callback)

    expect(callback).not.toHaveBeenCalled()

    vi.runAllTimers()

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does not fire a cancelled callback', () => {
    vi.useFakeTimers()

    const callback = vi.fn()

    cancelIdle(requestIdle(callback))
    vi.runAllTimers()

    expect(callback).not.toHaveBeenCalled()
  })

  it('prefers the native idle callback where the browser provides one', () => {
    const native = vi.fn().mockReturnValue(42)

    vi.stubGlobal('requestIdleCallback', native)

    const callback = vi.fn()
    const handle = requestIdle(callback)

    expect(native).toHaveBeenCalledTimes(1)
    expect(handle).toBe(42)

    vi.unstubAllGlobals()
  })
})

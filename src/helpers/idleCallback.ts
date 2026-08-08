/** Delay in milliseconds used where `requestIdleCallback` is unavailable, long enough to clear hydration. */
const IDLE_FALLBACK_DELAY_MS = 200

/** Narrows the optional `requestIdleCallback` global without assuming it exists. */
const readRequestIdleCallback = (): typeof requestIdleCallback | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const candidate = Reflect.get(window, 'requestIdleCallback')

  return typeof candidate === 'function' ? candidate.bind(window) : null
}

/** Narrows the optional `cancelIdleCallback` global without assuming it exists. */
const readCancelIdleCallback = (): typeof cancelIdleCallback | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const candidate = Reflect.get(window, 'cancelIdleCallback')

  return typeof candidate === 'function' ? candidate.bind(window) : null
}

/**
 * Defers work until the browser is idle, falling back to a short timer in
 * engines that never shipped `requestIdleCallback`. Returns a handle whose
 * meaning depends on which path was taken, so it must only be passed to
 * `cancelIdle`.
 */
export const requestIdle = (callback: () => void): number => {
  const native = readRequestIdleCallback()

  if (native) {
    return native(() => callback())
  }

  return window.setTimeout(callback, IDLE_FALLBACK_DELAY_MS)
}

/** Cancels a deferral created by `requestIdle`, whichever path it took. */
export const cancelIdle = (handle: number): void => {
  const native = readCancelIdleCallback()

  if (native) {
    native(handle)

    return
  }

  if (typeof window !== 'undefined') {
    window.clearTimeout(handle)
  }
}

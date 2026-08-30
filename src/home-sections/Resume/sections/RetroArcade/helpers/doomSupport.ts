/** Detects touch-primary input so on-screen controls only render where a keyboard isn't the norm. */
export const isCoarsePointerDevice = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches

/** Detects Fullscreen API support — notably absent for arbitrary elements on iOS Safari. */
export const supportsFullscreen = (): boolean =>
  typeof document !== 'undefined' &&
  typeof document.documentElement.requestFullscreen === 'function'

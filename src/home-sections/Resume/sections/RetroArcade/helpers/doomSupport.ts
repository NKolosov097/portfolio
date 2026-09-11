/** Detects touch-primary input so on-screen controls only render where a keyboard isn't the norm. */
export const isCoarsePointerDevice = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches

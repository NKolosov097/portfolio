/**
 * Detects whether the user has requested reduced motion through the
 * `prefers-reduced-motion` OS/browser setting. Returns `false` during SSR,
 * where `matchMedia` is unavailable, so animations stay opt-out only.
 *
 * @returns `true` when the user prefers reduced motion.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

import { describe, expect, it } from 'vitest'

import {
  canUseSparkleWorker,
  isSparkleWorkerMessage,
} from '@/home-sections/Home/helpers/sparkleTransport'
import { ESparkleTier } from '@/home-sections/Home/types/home.type'

describe('canUseSparkleWorker', () => {
  it('accepts a browser with both capabilities and no motion preference', () => {
    expect(
      canUseSparkleWorker({ hasWorker: true, hasOffscreenCanvas: true, isReducedMotion: false }),
    ).toBe(true)
  })

  it('declines where workers are unavailable', () => {
    expect(
      canUseSparkleWorker({ hasWorker: false, hasOffscreenCanvas: true, isReducedMotion: false }),
    ).toBe(false)
  })

  it('declines where the canvas cannot be transferred', () => {
    expect(
      canUseSparkleWorker({ hasWorker: true, hasOffscreenCanvas: false, isReducedMotion: false }),
    ).toBe(false)
  })

  it('declines for a visitor who prefers reduced motion, since one still frame needs no worker', () => {
    expect(
      canUseSparkleWorker({ hasWorker: true, hasOffscreenCanvas: true, isReducedMotion: true }),
    ).toBe(false)
  })
})

describe('isSparkleWorkerMessage', () => {
  it('accepts the ready handshake', () => {
    expect(isSparkleWorkerMessage({ type: 'ready' })).toBe(true)
  })

  it('accepts a tier report', () => {
    expect(isSparkleWorkerMessage({ type: 'tier', tier: ESparkleTier.low })).toBe(true)
  })

  it('rejects a tier report carrying an unknown tier', () => {
    expect(isSparkleWorkerMessage({ type: 'tier', tier: 'turbo' })).toBe(false)
  })

  it('rejects anything that is not a tagged object', () => {
    expect(isSparkleWorkerMessage(null)).toBe(false)
    expect(isSparkleWorkerMessage('ready')).toBe(false)
    expect(isSparkleWorkerMessage({ kind: 'ready' })).toBe(false)
    expect(isSparkleWorkerMessage({ type: 'exploded' })).toBe(false)
  })
})

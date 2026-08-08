import { describe, expect, it } from 'vitest'

import {
  SPARKLE_FIELD_CONFIG,
  SPARKLE_GLYPH_PATH,
  SPARKLE_GOVERNOR_THRESHOLDS,
  SPARKLE_SPRITE_BUCKETS,
  SPARKLE_SPRITE_PADDING,
  SPARKLE_TIERS,
} from '@/constants/home.constants'
import { ESparkleTier } from '@/home-sections/Home/types/home.type'

/** Tier order from most to least expensive; every budget must be non-increasing along it. */
const TIER_ORDER = [
  ESparkleTier.high,
  ESparkleTier.medium,
  ESparkleTier.low,
  ESparkleTier.static,
] as const

describe('sparkle constants', () => {
  it('describes a closed SVG path in the shared glyph', () => {
    expect(SPARKLE_GLYPH_PATH.startsWith('M')).toBe(true)
    expect(SPARKLE_GLYPH_PATH.endsWith('Z')).toBe(true)
  })

  it('never raises a budget as the tier degrades', () => {
    for (let index = 1; index < TIER_ORDER.length; index += 1) {
      const richer = SPARKLE_TIERS[TIER_ORDER[index - 1]]
      const poorer = SPARKLE_TIERS[TIER_ORDER[index]]

      expect(poorer.maxParticleCount).toBeLessThanOrEqual(richer.maxParticleCount)
      expect(poorer.maxDevicePixelRatio).toBeLessThanOrEqual(richer.maxDevicePixelRatio)
      expect(Number(poorer.hasGlow)).toBeLessThanOrEqual(Number(richer.hasGlow))
    }
  })

  it('animates every tier except the terminal one', () => {
    expect(SPARKLE_TIERS[ESparkleTier.high].isAnimated).toBe(true)
    expect(SPARKLE_TIERS[ESparkleTier.low].isAnimated).toBe(true)
    expect(SPARKLE_TIERS[ESparkleTier.static].isAnimated).toBe(false)
  })

  it('leaves a gap between the healthy and degraded frame budgets so tiers cannot oscillate', () => {
    expect(SPARKLE_GOVERNOR_THRESHOLDS.healthyFrameMs).toBeLessThan(
      SPARKLE_GOVERNOR_THRESHOLDS.degradedFrameMs,
    )
    expect(SPARKLE_GOVERNOR_THRESHOLDS.degradedFrameMs).toBeLessThan(
      SPARKLE_GOVERNOR_THRESHOLDS.criticalFrameMs,
    )
  })

  it('covers the whole particle size range with ascending sprite buckets', () => {
    expect(SPARKLE_SPRITE_BUCKETS[0]).toBeLessThanOrEqual(SPARKLE_FIELD_CONFIG.minSize)
    expect(SPARKLE_SPRITE_BUCKETS.at(-1)).toBeGreaterThanOrEqual(SPARKLE_FIELD_CONFIG.maxSize)

    for (let index = 1; index < SPARKLE_SPRITE_BUCKETS.length; index += 1) {
      expect(SPARKLE_SPRITE_BUCKETS[index]).toBeGreaterThan(SPARKLE_SPRITE_BUCKETS[index - 1])
    }
  })

  it('pads sprite boxes enough that a rotated glyph is never clipped', () => {
    expect(SPARKLE_SPRITE_PADDING).toBeGreaterThanOrEqual(Math.SQRT2)
  })

  it('keeps opacity and size ranges ordered and inside sane bounds', () => {
    expect(SPARKLE_FIELD_CONFIG.minSize).toBeLessThan(SPARKLE_FIELD_CONFIG.maxSize)
    expect(SPARKLE_FIELD_CONFIG.minOpacity).toBeGreaterThan(0)
    expect(SPARKLE_FIELD_CONFIG.maxOpacity).toBeLessThanOrEqual(1)
    expect(SPARKLE_FIELD_CONFIG.minOpacity).toBeLessThan(SPARKLE_FIELD_CONFIG.maxOpacity)
  })
})

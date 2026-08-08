import { describe, expect, it } from 'vitest'

import { SPARKLE_ROTATION_STEPS, SPARKLE_SPRITE_BUCKETS } from '@/constants/home.constants'
import {
  resolveRotationIndex,
  resolveSpriteBucketIndex,
} from '@/home-sections/Home/helpers/sparkleSprites'

describe('resolveSpriteBucketIndex', () => {
  it('picks the smallest bucket for a tiny glyph', () => {
    expect(resolveSpriteBucketIndex(1, SPARKLE_SPRITE_BUCKETS)).toBe(0)
  })

  it('picks the largest bucket for an oversized glyph', () => {
    expect(resolveSpriteBucketIndex(999, SPARKLE_SPRITE_BUCKETS)).toBe(
      SPARKLE_SPRITE_BUCKETS.length - 1,
    )
  })

  it('picks the nearest bucket for a size between two of them', () => {
    expect(resolveSpriteBucketIndex(4.4, [4, 7, 11, 16])).toBe(0)
    expect(resolveSpriteBucketIndex(6.4, [4, 7, 11, 16])).toBe(1)
    expect(resolveSpriteBucketIndex(13, [4, 7, 11, 16])).toBe(2)
  })

  it('falls back to the first index when there are no buckets', () => {
    expect(resolveSpriteBucketIndex(8, [])).toBe(0)
  })
})

describe('resolveRotationIndex', () => {
  it('maps a fresh glyph to the first frame', () => {
    expect(resolveRotationIndex(0, SPARKLE_ROTATION_STEPS)).toBe(0)
  })

  it('cycles back to the first frame after a quarter turn', () => {
    expect(resolveRotationIndex(Math.PI / 2, SPARKLE_ROTATION_STEPS)).toBe(0)
  })

  it('stays inside the frame range for a long-lived glyph', () => {
    for (let rotation = 0; rotation < 100; rotation += 0.37) {
      const index = resolveRotationIndex(rotation, SPARKLE_ROTATION_STEPS)

      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(SPARKLE_ROTATION_STEPS)
    }
  })

  it('stays inside the frame range for a negative rotation', () => {
    expect(resolveRotationIndex(-0.4, SPARKLE_ROTATION_STEPS)).toBeGreaterThanOrEqual(0)
    expect(resolveRotationIndex(-0.4, SPARKLE_ROTATION_STEPS)).toBeLessThan(SPARKLE_ROTATION_STEPS)
  })

  it('falls back to the first frame when there are no steps', () => {
    expect(resolveRotationIndex(1.2, 0)).toBe(0)
  })
})

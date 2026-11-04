import { describe, expect, it } from 'vitest'

import { SPARKLE_SPRITE_BUCKETS } from '@/constants/home.constants'
import { resolveSpriteBucketIndex } from '@/home-sections/Home/helpers/sparkleSprites'

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

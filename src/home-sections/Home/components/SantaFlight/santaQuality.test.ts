import { describe, expect, it } from 'vitest'

import { createSantaQuality } from './santaQuality'

/** Feed one complete measurement window without depending on wall clocks or browser callbacks. */
function createSamples(quality: ReturnType<typeof createSantaQuality>) {
  let timestamp = 0
  return {
    /** Advance continuous rendered timestamps until one two-second window has been collected. */
    window(frameCost: number, frameGap = quality.frameInterval): number {
      const count = Math.max(30, Math.ceil(2_000 / frameGap) + 2)
      let changes = 0
      for (let index = 0; index < count; index += 1) {
        timestamp += frameGap
        if (quality.sample(timestamp, frameCost, frameGap)) changes += 1
      }
      return changes
    },
  }
}

describe('Santa quality governor', () => {
  it('uses all three resolution tiers before reducing cadence and clamps to device DPR', () => {
    const quality = createSantaQuality()
    const samples = createSamples(quality)
    expect(quality.frameInterval).toBeCloseTo(1_000 / 60)
    expect(quality.pixelRatio(601, 3)).toBe(1.5)
    expect(quality.pixelRatio(600, 3)).toBe(1)
    expect(quality.pixelRatio(1_440, 0.5)).toBe(0.5)
    expect(quality.pixelRatio(390, 0.25)).toBe(0.25)
    expect(samples.window(13)).toBe(1)
    expect(quality.pixelRatio(601, 3)).toBe(1)
    expect(quality.pixelRatio(600, 3)).toBe(0.75)
    expect(quality.frameInterval).toBeCloseTo(1_000 / 60)
    expect(samples.window(13)).toBe(1)
    expect(quality.pixelRatio(601, 3)).toBe(0.75)
    expect(quality.pixelRatio(600, 3)).toBe(0.75)
    expect(quality.frameInterval).toBeCloseTo(1_000 / 30)
    expect(samples.window(13)).toBe(0)
    for (const deviceRatio of [NaN, Infinity, 0, -1]) {
      expect(quality.pixelRatio(1_440, deviceRatio)).toBe(0.75)
    }
    expect(quality.pixelRatio(390, 0.5)).toBe(0.5)
  })

  it('degrades for sustained gaps and recovers one tier after four healthy windows', () => {
    const quality = createSantaQuality()
    const samples = createSamples(quality)
    expect(samples.window(1, 25)).toBe(1)
    expect(samples.window(1, 25)).toBe(1)
    for (let window = 0; window < 3; window += 1) {
      expect(samples.window(8)).toBe(0)
    }
    expect(quality.frameInterval).toBeCloseTo(1_000 / 30)
    expect(samples.window(8)).toBe(1)
    expect(quality.frameInterval).toBeCloseTo(1_000 / 60)
    expect(quality.pixelRatio(1_440, 3)).toBe(1)
    for (let window = 0; window < 3; window += 1) {
      expect(samples.window(8)).toBe(0)
    }
    expect(samples.window(8)).toBe(1)
    expect(quality.pixelRatio(1_440, 3)).toBe(1.5)
    expect(samples.window(8)).toBe(0)
  })

  it('resets the healthy streak for intermediate CPU or gap windows', () => {
    const quality = createSantaQuality()
    const samples = createSamples(quality)
    samples.window(13)
    for (const [frameCost, frameGap] of [
      [9, 1_000 / 60],
      [1, 20],
    ]) {
      expect(samples.window(1)).toBe(0)
      expect(samples.window(1)).toBe(0)
      expect(samples.window(1)).toBe(0)
      expect(samples.window(frameCost, frameGap)).toBe(0)
    }
    for (let window = 0; window < 3; window += 1) {
      expect(samples.window(1)).toBe(0)
    }
    expect(samples.window(1)).toBe(1)
  })

  it('requires both two seconds and thirty rendered samples before changing tiers', () => {
    const quality = createSantaQuality()
    for (let index = 0; index < 29; index += 1) {
      expect(quality.sample(index * 100, 13, 100)).toBe(false)
    }
    expect(quality.sample(2_900, 13, 100)).toBe(true)
    quality.reset()
    for (let index = 0; index < 120; index += 1) {
      expect(quality.sample(3_000 + index * 10, 13, 10)).toBe(false)
    }
    expect(quality.pixelRatio(1_440, 3)).toBe(1)
    expect(quality.sample(4_200, 13, 10)).toBe(false)
  })

  it('clears measurement history and recovery streak without restoring the selected tier', () => {
    const quality = createSantaQuality()
    const samples = createSamples(quality)
    samples.window(13)
    samples.window(1)
    samples.window(1)
    samples.window(1)
    quality.reset()
    expect(quality.pixelRatio(1_440, 3)).toBe(1)
    for (let window = 0; window < 3; window += 1) {
      expect(samples.window(1)).toBe(0)
    }
    expect(samples.window(1)).toBe(1)
  })

  it('ignores invalid samples without contaminating a valid window', () => {
    const quality = createSantaQuality()
    for (let index = 0; index < 20; index += 1) {
      expect(quality.sample(index * 100, 13, 100)).toBe(false)
    }
    for (const [timestamp, frameCost, frameGap] of [
      [NaN, 13, 100],
      [Infinity, 13, 100],
      [2_000, NaN, 100],
      [2_000, Infinity, 100],
      [2_000, -1, 100],
      [2_000, 13, NaN],
      [2_000, 13, Infinity],
      [2_000, 13, 0],
      [2_000, 13, -1],
    ]) {
      expect(quality.sample(timestamp, frameCost, frameGap)).toBe(false)
    }
    for (let index = 20; index < 29; index += 1) {
      expect(quality.sample(index * 100, 13, 100)).toBe(false)
    }
    expect(quality.sample(2_900, 13, 100)).toBe(true)
  })

  it('discards windows across timestamp reversal, timestamp gaps, or reported long gaps', () => {
    for (const [timestamp, frameGap] of [
      [-100, 100],
      [3_000, 100],
      [2_000, 251],
    ]) {
      const quality = createSantaQuality()
      for (let index = 0; index < 20; index += 1) {
        expect(quality.sample(index * 100, 13, 100)).toBe(false)
      }
      expect(quality.sample(timestamp, 13, frameGap)).toBe(false)
      for (let index = 1; index <= 29; index += 1) {
        expect(quality.sample(timestamp + index * 100, 13, 100)).toBe(false)
      }
      expect(quality.sample(timestamp + 3_000, 13, 100)).toBe(true)
    }
  })
})

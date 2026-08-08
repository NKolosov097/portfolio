import { describe, expect, it } from 'vitest'

import { SPARKLE_GOVERNOR_THRESHOLDS } from '@/constants/home.constants'
import {
  createSparkleGovernorState,
  recordSparkleFrame,
  resolveInitialSparkleTier,
} from '@/home-sections/Home/helpers/sparkleGovernor'
import { ESparkleTier, ISparkleGovernorState } from '@/home-sections/Home/types/home.type'

/** Feeds a whole sampling window of identical frames and returns the last tier decision. */
const feedWindow = (
  state: ISparkleGovernorState,
  durationMs: number,
  frames: number = SPARKLE_GOVERNOR_THRESHOLDS.windowSize,
): ESparkleTier | null => {
  let decision: ESparkleTier | null = null

  for (let frame = 0; frame < frames; frame += 1) {
    const result = recordSparkleFrame(state, durationMs, SPARKLE_GOVERNOR_THRESHOLDS)

    if (result) {
      decision = result
    }
  }

  return decision
}

describe('resolveInitialSparkleTier', () => {
  it('starts a capable desktop at the richest tier', () => {
    expect(
      resolveInitialSparkleTier({
        hardwareConcurrency: 12,
        deviceMemory: 16,
        devicePixelRatio: 2,
        isCoarsePointer: false,
      }),
    ).toBe(ESparkleTier.high)
  })

  it('starts a two-core machine at the lowest animated tier', () => {
    expect(
      resolveInitialSparkleTier({
        hardwareConcurrency: 2,
        deviceMemory: 8,
        devicePixelRatio: 1,
        isCoarsePointer: false,
      }),
    ).toBe(ESparkleTier.low)
  })

  it('starts a memory-starved machine at the lowest animated tier', () => {
    expect(
      resolveInitialSparkleTier({
        hardwareConcurrency: 8,
        deviceMemory: 2,
        devicePixelRatio: 1,
        isCoarsePointer: false,
      }),
    ).toBe(ESparkleTier.low)
  })

  it('starts a touch device at the middle tier', () => {
    expect(
      resolveInitialSparkleTier({
        hardwareConcurrency: 8,
        deviceMemory: 8,
        devicePixelRatio: 2,
        isCoarsePointer: true,
      }),
    ).toBe(ESparkleTier.medium)
  })

  it('starts a very dense display at the middle tier', () => {
    expect(
      resolveInitialSparkleTier({
        hardwareConcurrency: 8,
        deviceMemory: 8,
        devicePixelRatio: 3,
        isCoarsePointer: false,
      }),
    ).toBe(ESparkleTier.medium)
  })

  it('ignores signals the browser withholds rather than assuming the worst', () => {
    expect(resolveInitialSparkleTier({ devicePixelRatio: 1, isCoarsePointer: false })).toBe(
      ESparkleTier.high,
    )
  })
})

describe('recordSparkleFrame', () => {
  it('holds its tier while frames stay healthy', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)

    expect(feedWindow(state, 8)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.high)
  })

  it('withholds any decision until a full window has been sampled', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)

    expect(feedWindow(state, 40, SPARKLE_GOVERNOR_THRESHOLDS.windowSize - 1)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.high)
  })

  it('steps down once a window comes in over the degraded budget', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)

    expect(feedWindow(state, 30)).toBe(ESparkleTier.medium)
    expect(state.tier).toBe(ESparkleTier.medium)
  })

  it('steps down again on a second bad window', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)

    feedWindow(state, 22)
    expect(feedWindow(state, 22)).toBe(ESparkleTier.low)
    expect(state.tier).toBe(ESparkleTier.low)
  })

  it('keeps the lowest animated tier while frames are merely degraded', () => {
    const state = createSparkleGovernorState(ESparkleTier.low)

    expect(feedWindow(state, 22)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.low)
  })

  it('gives up on animation when the lowest tier still overruns critically', () => {
    const state = createSparkleGovernorState(ESparkleTier.low)

    expect(feedWindow(state, 40)).toBe(ESparkleTier.static)
    expect(state.tier).toBe(ESparkleTier.static)
  })

  it('treats the still frame as terminal', () => {
    const state = createSparkleGovernorState(ESparkleTier.static)

    expect(feedWindow(state, 4)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.static)
    expect(state.frameDurations).toHaveLength(0)
  })

  it('refuses to upgrade before the settling period has elapsed', () => {
    const state = createSparkleGovernorState(ESparkleTier.medium)

    expect(feedWindow(state, 5)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.medium)
  })

  it('upgrades once healthy frames are sustained', () => {
    const state = createSparkleGovernorState(ESparkleTier.medium)

    expect(feedWindow(state, 5, SPARKLE_GOVERNOR_THRESHOLDS.upgradeAfterFrames)).toBe(
      ESparkleTier.high,
    )
    expect(state.tier).toBe(ESparkleTier.high)
  })

  it('never upgrades twice, however good the frames get', () => {
    const state = createSparkleGovernorState(ESparkleTier.low)

    expect(feedWindow(state, 5, SPARKLE_GOVERNOR_THRESHOLDS.upgradeAfterFrames)).toBe(
      ESparkleTier.medium,
    )
    expect(feedWindow(state, 5, SPARKLE_GOVERNOR_THRESHOLDS.upgradeAfterFrames * 2)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.medium)
  })

  it('settles instead of oscillating when frame times alternate', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)
    const observed: ESparkleTier[] = []

    for (let round = 0; round < 8; round += 1) {
      const degraded = feedWindow(state, 30)

      if (degraded) {
        observed.push(degraded)
      }

      const healthy = feedWindow(state, 5, SPARKLE_GOVERNOR_THRESHOLDS.upgradeAfterFrames)

      if (healthy) {
        observed.push(healthy)
      }
    }

    expect(observed.filter((tier) => tier === ESparkleTier.high)).toHaveLength(1)
    expect(state.tier).toBe(ESparkleTier.static)
  })

  it('ignores frames that carry no usable duration', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)

    recordSparkleFrame(state, 0, SPARKLE_GOVERNOR_THRESHOLDS)
    recordSparkleFrame(state, -5, SPARKLE_GOVERNOR_THRESHOLDS)
    recordSparkleFrame(state, Number.NaN, SPARKLE_GOVERNOR_THRESHOLDS)

    expect(state.frameDurations).toHaveLength(0)
  })

  it('never lets the sampling window grow past its bound', () => {
    const state = createSparkleGovernorState(ESparkleTier.low)

    feedWindow(state, 12, SPARKLE_GOVERNOR_THRESHOLDS.windowSize * 3)

    expect(state.frameDurations.length).toBeLessThanOrEqual(SPARKLE_GOVERNOR_THRESHOLDS.windowSize)
  })

  it('starts a fresh window after every evaluation, not only after a tier change', () => {
    const state = createSparkleGovernorState(ESparkleTier.medium)

    expect(feedWindow(state, 5)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.medium)
    expect(state.frameDurations).toHaveLength(0)
  })

  it('refuses to judge a new regime on leftovers from the previous window', () => {
    const state = createSparkleGovernorState(ESparkleTier.medium)

    feedWindow(state, 5)

    for (let frame = 0; frame < 10; frame += 1) {
      expect(recordSparkleFrame(state, 30, SPARKLE_GOVERNOR_THRESHOLDS)).toBeNull()
    }

    expect(state.tier).toBe(ESparkleTier.medium)
  })
})

import {
  SPARKLE_LOW_TIER_CORES,
  SPARKLE_LOW_TIER_MEMORY_GB,
  SPARKLE_MEDIUM_TIER_CORES,
  SPARKLE_MEDIUM_TIER_DPR,
  SPARKLE_MEDIUM_TIER_MEMORY_GB,
} from '@/constants/home.constants'
import {
  ESparkleTier,
  ISparkleDeviceSignals,
  ISparkleGovernorState,
  ISparkleGovernorThresholds,
} from '@/home-sections/Home/types/home.type'

/** Tier reached when the current one proves too expensive; the still frame has nowhere further to fall. */
const CHEAPER_TIER: Partial<Record<ESparkleTier, ESparkleTier>> = {
  [ESparkleTier.high]: ESparkleTier.medium,
  [ESparkleTier.medium]: ESparkleTier.low,
}

/** Tier reached when headroom is proven; the richest tier has nowhere further to climb. */
const RICHER_TIER: Partial<Record<ESparkleTier, ESparkleTier>> = {
  [ESparkleTier.low]: ESparkleTier.medium,
  [ESparkleTier.medium]: ESparkleTier.high,
}

/** Percentile of the sampled window, used instead of a mean so a few stalls are not averaged away. */
const readPercentile = (values: number[], ratio: number): number => {
  const sorted = [...values].sort((first, second) => first - second)
  const index = Math.min(sorted.length - 1, Math.floor(ratio * sorted.length))

  return sorted[index]
}

/** Commits a tier change and restarts sampling, so the new tier is graded on its own frames. */
const applyTier = (state: ISparkleGovernorState, tier: ESparkleTier): ESparkleTier => {
  state.tier = tier
  state.frameDurations.length = 0
  state.framesSinceChange = 0

  return tier
}

/**
 * Picks the tier the field starts on from what the device is willing to reveal.
 * Seeding is deliberately conservative, since the governor grants at most one
 * upgrade but will step down as often as needed. A withheld signal is skipped
 * rather than read as a low value.
 */
export const resolveInitialSparkleTier = (signals: ISparkleDeviceSignals): ESparkleTier => {
  const { hardwareConcurrency, deviceMemory, devicePixelRatio, isCoarsePointer } = signals

  if (
    (hardwareConcurrency !== undefined && hardwareConcurrency <= SPARKLE_LOW_TIER_CORES) ||
    (deviceMemory !== undefined && deviceMemory <= SPARKLE_LOW_TIER_MEMORY_GB)
  ) {
    return ESparkleTier.low
  }

  if (
    (hardwareConcurrency !== undefined && hardwareConcurrency <= SPARKLE_MEDIUM_TIER_CORES) ||
    (deviceMemory !== undefined && deviceMemory <= SPARKLE_MEDIUM_TIER_MEMORY_GB) ||
    isCoarsePointer ||
    devicePixelRatio > SPARKLE_MEDIUM_TIER_DPR
  ) {
    return ESparkleTier.medium
  }

  return ESparkleTier.high
}

/** Starts a governor on a seeded tier with an empty sampling window. */
export const createSparkleGovernorState = (tier: ESparkleTier): ISparkleGovernorState => ({
  tier,
  frameDurations: [],
  framesSinceChange: 0,
  hasUpgraded: false,
})

/**
 * Grades one frame and returns a new tier on the frame a change is warranted.
 * Sorting only happens once a window is full — roughly once per second — so the
 * cost never lands inside the per-frame budget it is protecting.
 */
export const recordSparkleFrame = (
  state: ISparkleGovernorState,
  durationMs: number,
  thresholds: ISparkleGovernorThresholds,
): ESparkleTier | null => {
  if (state.tier === ESparkleTier.static) {
    return null
  }

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return null
  }

  state.frameDurations.push(durationMs)
  state.framesSinceChange += 1

  if (state.frameDurations.length > thresholds.windowSize) {
    state.frameDurations.shift()
  }

  if (state.frameDurations.length < thresholds.windowSize) {
    return null
  }

  const worstTypicalFrame = readPercentile(state.frameDurations, 0.9)

  if (state.tier === ESparkleTier.low && worstTypicalFrame > thresholds.criticalFrameMs) {
    return applyTier(state, ESparkleTier.static)
  }

  if (worstTypicalFrame > thresholds.degradedFrameMs) {
    const cheaper = CHEAPER_TIER[state.tier]

    return cheaper ? applyTier(state, cheaper) : null
  }

  if (
    !state.hasUpgraded &&
    worstTypicalFrame < thresholds.healthyFrameMs &&
    state.framesSinceChange >= thresholds.upgradeAfterFrames
  ) {
    const richer = RICHER_TIER[state.tier]

    if (richer) {
      state.hasUpgraded = true

      return applyTier(state, richer)
    }
  }

  return null
}

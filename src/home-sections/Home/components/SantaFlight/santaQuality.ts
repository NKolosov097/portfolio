const TIERS = [
  { desktop: 1.5, mobile: 1, fps: 60 },
  { desktop: 1, mobile: 0.75, fps: 60 },
  { desktop: 0.75, mobile: 0.75, fps: 30 },
] as const

/** Adapt drawing cost from sustained rendered samples without owning clocks or scheduling. */
export function createSantaQuality(): {
  readonly frameInterval: number
  pixelRatio: (width: number, devicePixelRatio: number) => number
  sample: (timestamp: number, frameCost: number, frameGap: number) => boolean
  reset: VoidFunction
} {
  let tier = 0
  let windowStart: number | undefined
  let previousTimestamp: number | undefined
  let samples = 0
  let cost = 0
  let gap = 0
  let healthyWindows = 0

  /** Clear suspended or superseded measurements without changing the selected quality tier. */
  function reset(): void {
    windowStart = undefined
    previousTimestamp = undefined
    samples = 0
    cost = 0
    gap = 0
    healthyWindows = 0
  }

  return {
    /** Expose the selected cadence while animation time remains controlled by the caller. */
    get frameInterval() {
      return 1_000 / TIERS[tier].fps
    },
    /** Respect the viewport cap and every positive finite device ratio, including sub-unit DPR. */
    pixelRatio(width, devicePixelRatio) {
      const deviceRatio =
        Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1
      return Math.min(deviceRatio, TIERS[tier][width <= 600 ? 'mobile' : 'desktop'])
    },
    /** Grade complete windows and require four consecutive healthy windows before recovery. */
    sample(timestamp, frameCost, frameGap) {
      if (
        !Number.isFinite(timestamp) ||
        !Number.isFinite(frameCost) ||
        !Number.isFinite(frameGap) ||
        frameCost < 0 ||
        frameGap <= 0
      ) {
        return false
      }
      if (
        frameGap > 250 ||
        (previousTimestamp !== undefined &&
          (timestamp < previousTimestamp || timestamp - previousTimestamp > 250))
      ) {
        reset()
        return false
      }
      previousTimestamp = timestamp
      windowStart ??= timestamp
      samples += 1
      cost += frameCost
      gap += frameGap
      if (timestamp - windowStart < 2_000 || samples < 30) return false

      const meanCost = cost / samples
      const meanGap = gap / samples
      const frameInterval = 1_000 / TIERS[tier].fps
      const bad = meanGap > frameInterval * 1.35 || meanCost > 12
      const healthy = meanGap <= frameInterval * 1.15 && meanCost <= 8
      healthyWindows = healthy ? healthyWindows + 1 : 0
      const nextTier = bad
        ? Math.min(TIERS.length - 1, tier + 1)
        : healthyWindows >= 4
          ? Math.max(0, tier - 1)
          : tier
      windowStart = undefined
      samples = 0
      cost = 0
      gap = 0
      if (nextTier === tier) return false
      tier = nextTier
      reset()
      return true
    },
    reset,
  }
}

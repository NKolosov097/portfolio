import { describe, expect, it, vi } from 'vitest'

import { SPARKLE_GOVERNOR_THRESHOLDS, SPARKLE_TIERS } from '@/constants/home.constants'
import { createSparkleController } from '@/home-sections/Home/helpers/sparkleController'
import {
  ESparkleTier,
  ISparkleDrawContext,
  ISparkleSpriteAtlas,
  ISparkleTierConfig,
} from '@/home-sections/Home/types/home.type'

/**
 * Hand-driven frame scheduler. Each callback re-registers itself, so the pending
 * set is drained into a snapshot before it is invoked - iterating the live list
 * would never terminate.
 */
const createManualScheduler = () => {
  const pending = new Map<number, (timestamp: number) => void>()
  let nextHandle = 1

  return {
    requestFrame: (callback: (timestamp: number) => void): number => {
      const handle = nextHandle
      nextHandle += 1
      pending.set(handle, callback)

      return handle
    },
    cancelFrame: (handle: number): void => {
      pending.delete(handle)
    },
    step: (timestamp: number): void => {
      const entries = [...pending.values()]
      pending.clear()

      for (const callback of entries) {
        callback(timestamp)
      }
    },
  }
}

const createHarness = (initialTier: ESparkleTier = ESparkleTier.high) => {
  const scheduler = createManualScheduler()
  const resizes: Array<{ width: number; height: number }> = []
  const atlasRequests: Array<{ tier: ISparkleTierConfig; devicePixelRatio: number }> = []
  const onTierChange = vi.fn()

  let drawCount = 0

  const context: ISparkleDrawContext<string> = {
    globalAlpha: 1,
    clearRect: () => {},
    drawImage: () => {
      drawCount += 1
    },
  }

  const buildAtlas = (
    tier: ISparkleTierConfig,
    devicePixelRatio: number,
  ): ISparkleSpriteAtlas<string> | null => {
    atlasRequests.push({ tier, devicePixelRatio })

    return { frames: [['frame-0', 'frame-1']], bucketSizes: [8], paddingFactor: 1.5 }
  }

  const controller = createSparkleController<string>({
    context,
    buildAtlas,
    resizeSurface: (width, height) => {
      resizes.push({ width, height })
    },
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    initialTier,
    onTierChange,
  })

  return {
    controller,
    resizes,
    atlasRequests,
    onTierChange,
    scheduler,
    get drawCount(): number {
      return drawCount
    },
  }
}

describe('createSparkleController', () => {
  it('sizes the backing store by the tier-capped pixel ratio', () => {
    const harness = createHarness(ESparkleTier.low)

    harness.controller.setViewport(600, 400, 3)

    expect(harness.resizes.at(-1)).toEqual({
      width: 600 * SPARKLE_TIERS[ESparkleTier.low].maxDevicePixelRatio,
      height: 400 * SPARKLE_TIERS[ESparkleTier.low].maxDevicePixelRatio,
    })
  })

  it('honours a device pixel ratio below the tier cap', () => {
    const harness = createHarness(ESparkleTier.high)

    harness.controller.setViewport(600, 400, 1)

    expect(harness.resizes.at(-1)).toEqual({ width: 600, height: 400 })
  })

  it('paints once as soon as it has a viewport', () => {
    const harness = createHarness()

    harness.controller.setViewport(600, 400, 1)

    expect(harness.drawCount).toBeGreaterThan(0)
  })

  it('does nothing at all for a collapsed container', () => {
    const harness = createHarness()

    harness.controller.setViewport(0, 0, 1)
    harness.controller.start()

    expect(harness.resizes).toHaveLength(0)
    expect(harness.controller.isRunning).toBe(false)
  })

  it('rebuilds the atlas only when the pixel ratio actually changes', () => {
    const harness = createHarness()

    harness.controller.setViewport(600, 400, 2)
    const afterFirst = harness.atlasRequests.length

    harness.controller.setViewport(800, 500, 2)

    expect(harness.atlasRequests).toHaveLength(afterFirst)

    harness.controller.setViewport(800, 500, 1)

    expect(harness.atlasRequests.length).toBeGreaterThan(afterFirst)
  })

  it('runs a loop on an animated tier', () => {
    const harness = createHarness(ESparkleTier.high)

    harness.controller.setViewport(600, 400, 1)
    harness.controller.start()

    expect(harness.controller.isRunning).toBe(true)
  })

  it('paints a still frame instead of looping on the terminal tier', () => {
    const harness = createHarness(ESparkleTier.static)

    harness.controller.setViewport(600, 400, 1)
    harness.controller.start()

    expect(harness.controller.isRunning).toBe(false)
    expect(harness.drawCount).toBeGreaterThan(0)
  })

  it('drops a tier and tells its host once frames are consistently slow', () => {
    const harness = createHarness(ESparkleTier.high)

    harness.controller.setViewport(600, 400, 2)
    harness.controller.start()

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.windowSize + 1; frame += 1) {
      harness.scheduler.step(frame * 30)
    }

    expect(harness.controller.tier).toBe(ESparkleTier.medium)
    expect(harness.onTierChange).toHaveBeenCalledWith(ESparkleTier.medium)
  })

  it('recaps the pixel ratio when a tier change tightens the cap', () => {
    const harness = createHarness(ESparkleTier.high)

    harness.controller.setViewport(600, 400, 3)

    expect(harness.resizes.at(-1)).toEqual({ width: 1200, height: 800 })

    harness.controller.start()

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.windowSize + 1; frame += 1) {
      harness.scheduler.step(frame * 30)
    }

    expect(harness.resizes.at(-1)).toEqual({ width: 900, height: 600 })
  })

  it('restores the physical pixel ratio when the tier recovers', () => {
    const harness = createHarness(ESparkleTier.low)

    harness.controller.setViewport(600, 400, 2)

    expect(harness.resizes.at(-1)).toEqual({ width: 600, height: 400 })

    harness.controller.start()

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.upgradeAfterFrames + 1; frame += 1) {
      harness.scheduler.step(frame * 5)
    }

    expect(harness.controller.tier).toBe(ESparkleTier.medium)
    expect(harness.resizes.at(-1)).toEqual({ width: 900, height: 600 })
  })

  it('stops cleanly and stays stopped after destroy', () => {
    const harness = createHarness()

    harness.controller.setViewport(600, 400, 1)
    harness.controller.start()
    harness.controller.destroy()

    expect(harness.controller.isRunning).toBe(false)

    harness.controller.start()

    expect(harness.controller.isRunning).toBe(false)
  })

  it('ignores a viewport update after destroy', () => {
    const harness = createHarness()

    harness.controller.setViewport(600, 400, 1)
    harness.controller.destroy()

    const afterDestroy = harness.resizes.length

    harness.controller.setViewport(900, 700, 1)

    expect(harness.resizes).toHaveLength(afterDestroy)
  })

  it('tolerates a pointer update before the first viewport arrives', () => {
    const harness = createHarness()

    expect(() => harness.controller.setPointerTarget({ x: 10, y: 10 })).not.toThrow()
  })
})

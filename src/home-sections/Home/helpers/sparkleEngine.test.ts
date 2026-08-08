import { describe, expect, it, vi } from 'vitest'

import { SPARKLE_FIELD_CONFIG, SPARKLE_GOVERNOR_THRESHOLDS } from '@/constants/home.constants'
import { createSparkleEngine, ISparkleEngine } from '@/home-sections/Home/helpers/sparkleEngine'
import { createSparkleParticles } from '@/home-sections/Home/helpers/sparkleField'
import { createSparkleGovernorState } from '@/home-sections/Home/helpers/sparkleGovernor'
import {
  ESparkleTier,
  ISparkleDrawContext,
  ISparkleSpriteAtlas,
} from '@/home-sections/Home/types/home.type'

/** Hand-driven frame scheduler, so the loop can be stepped deterministically. */
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
    get pendingCount(): number {
      return pending.size
    },
    step: (timestamp: number): void => {
      const entries = [...pending.entries()]
      pending.clear()

      for (const [, callback] of entries) {
        callback(timestamp)
      }
    },
  }
}

const createCountingContext = () => {
  let drawCount = 0
  let clearCount = 0

  const context: ISparkleDrawContext<string> = {
    globalAlpha: 1,
    clearRect: () => {
      clearCount += 1
    },
    drawImage: () => {
      drawCount += 1
    },
  }

  return {
    context,
    get drawCount(): number {
      return drawCount
    },
    get clearCount(): number {
      return clearCount
    },
  }
}

const createTestAtlas = (): ISparkleSpriteAtlas<string> => ({
  frames: [['a-0', 'a-1']],
  bucketSizes: [8],
  paddingFactor: 1.5,
})

const createEngineHarness = (tier: ESparkleTier = ESparkleTier.high) => {
  const scheduler = createManualScheduler()
  const painter = createCountingContext()
  const particles = createSparkleParticles(600, 400, 10, SPARKLE_FIELD_CONFIG)
  const onTierChange = vi.fn()
  const engine = createSparkleEngine({
    context: painter.context,
    atlas: createTestAtlas(),
    particles,
    view: { width: 600, height: 400, devicePixelRatio: 1 },
    config: SPARKLE_FIELD_CONFIG,
    governor: createSparkleGovernorState(tier),
    thresholds: SPARKLE_GOVERNOR_THRESHOLDS,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    onTierChange,
  })

  return { scheduler, painter, particles, engine, onTierChange }
}

describe('createSparkleEngine', () => {
  it('paints a frame once started', () => {
    const { scheduler, painter, engine } = createEngineHarness()

    engine.start()
    scheduler.step(0)
    scheduler.step(16)

    expect(painter.clearCount).toBeGreaterThan(0)
    expect(painter.drawCount).toBeGreaterThan(0)
  })

  it('moves particles between frames', () => {
    const { scheduler, particles, engine } = createEngineHarness()
    const before = particles[0].x

    engine.start()
    scheduler.step(0)
    scheduler.step(500)

    expect(particles[0].x).not.toBe(before)
  })

  it('reports itself as running only between start and stop', () => {
    const { engine } = createEngineHarness()

    expect(engine.isRunning).toBe(false)
    engine.start()
    expect(engine.isRunning).toBe(true)
    engine.stop()
    expect(engine.isRunning).toBe(false)
  })

  it('ignores a repeated start rather than scheduling two loops', () => {
    const { scheduler, engine } = createEngineHarness()

    engine.start()
    engine.start()
    engine.start()

    expect(scheduler.pendingCount).toBe(1)
  })

  it('schedules nothing further once stopped', () => {
    const { scheduler, engine } = createEngineHarness()

    engine.start()
    scheduler.step(0)
    engine.stop()

    expect(scheduler.pendingCount).toBe(0)
  })

  it('tolerates a stop before it ever started', () => {
    const { engine } = createEngineHarness()

    expect(() => engine.stop()).not.toThrow()
    expect(engine.isRunning).toBe(false)
  })

  it('paints a single frame on demand without starting the loop', () => {
    const { scheduler, painter, engine } = createEngineHarness()

    engine.renderOnce()

    expect(painter.clearCount).toBe(1)
    expect(scheduler.pendingCount).toBe(0)
    expect(engine.isRunning).toBe(false)
  })

  it('reports a tier change once frames are consistently slow', () => {
    const { scheduler, engine, onTierChange } = createEngineHarness()

    engine.start()

    let timestamp = 0

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.windowSize + 1; frame += 1) {
      scheduler.step(timestamp)
      timestamp += 30
    }

    expect(onTierChange).toHaveBeenCalledWith(ESparkleTier.medium)
  })

  it('does not blame a backgrounded tab for a slow frame', () => {
    const { scheduler, engine, onTierChange } = createEngineHarness()

    engine.start()

    let timestamp = 0

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.windowSize + 1; frame += 1) {
      scheduler.step(timestamp)
      timestamp += 5000
    }

    expect(onTierChange).not.toHaveBeenCalled()
  })

  it('accepts a replacement atlas after a tier change', () => {
    const { scheduler, painter, engine } = createEngineHarness()

    engine.setAtlas({ frames: [], bucketSizes: [], paddingFactor: 1.5 })
    engine.start()
    scheduler.step(0)
    scheduler.step(16)

    expect(painter.drawCount).toBe(0)
    expect(painter.clearCount).toBeGreaterThan(0)
  })

  it('does not stack a second loop when its tier-change handler restarts it mid-frame', () => {
    const scheduler = createManualScheduler()
    const painter = createCountingContext()

    let engine: ISparkleEngine<string> | null = null

    const created = createSparkleEngine<string>({
      context: painter.context,
      atlas: createTestAtlas(),
      particles: createSparkleParticles(600, 400, 4, SPARKLE_FIELD_CONFIG),
      view: { width: 600, height: 400, devicePixelRatio: 1 },
      config: SPARKLE_FIELD_CONFIG,
      governor: createSparkleGovernorState(ESparkleTier.high),
      thresholds: SPARKLE_GOVERNOR_THRESHOLDS,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame,
      onTierChange: () => {
        engine?.stop()
        engine?.start()
      },
    })

    engine = created
    created.start()

    let timestamp = 0

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.windowSize + 1; frame += 1) {
      scheduler.step(timestamp)
      timestamp += 30
    }

    expect(scheduler.pendingCount).toBe(1)
  })

  it('lets go of the pointer when it is cleared', () => {
    const { scheduler, engine } = createEngineHarness()

    engine.start()
    engine.setPointerTarget({ x: 100, y: 100 })
    scheduler.step(0)
    scheduler.step(16)
    engine.setPointerTarget(null)

    for (let frame = 0; frame < 120; frame += 1) {
      scheduler.step(32 + frame * 16)
    }

    expect(() => engine.stop()).not.toThrow()
  })
})

import {
  advanceSparkleParticle,
  advanceSparklePointer,
  advanceSparkleWind,
  clampSparkleFrameDelta,
  createSparkleInfluence,
  createSparklePointer,
  createSparkleWind,
} from '@/home-sections/Home/helpers/sparkleField'
import { recordSparkleFrame } from '@/home-sections/Home/helpers/sparkleGovernor'
import { renderSparkleField } from '@/home-sections/Home/helpers/sparkleRenderer'
import {
  ESparkleTier,
  IPointerPosition,
  ISparkleDrawContext,
  ISparkleFieldConfig,
  ISparkleGovernorState,
  ISparkleGovernorThresholds,
  ISparkleParticle,
  ISparkleSpriteAtlas,
  ISparkleViewport,
} from '@/home-sections/Home/types/home.type'

export interface ISparkleEngineOptions<TImage = CanvasImageSource> {
  /** Context the field is painted into. */
  context: ISparkleDrawContext<TImage>
  /** Sprite frames the renderer blits; replaced wholesale when the tier changes. */
  atlas: ISparkleSpriteAtlas<TImage>
  /** Live particle population, mutated in place by the loop. */
  particles: ISparkleParticle[]
  /** Field size and backing-store scale; mutated by the controller on resize. */
  view: ISparkleViewport
  /** Motion and interaction tuning. */
  config: ISparkleFieldConfig
  /** Governor state graded against every usable frame. */
  governor: ISparkleGovernorState
  /** Frame budgets the governor grades against. */
  thresholds: ISparkleGovernorThresholds
  /** Schedules the next frame; injected so the loop can be driven deterministically in tests. */
  requestFrame: (callback: (timestamp: number) => void) => number
  /** Cancels a scheduled frame. */
  cancelFrame: (handle: number) => void
  /** Announces a tier the governor decided on, so the host can rebuild the atlas and population. */
  onTierChange: (tier: ESparkleTier) => void
  /** Random source for wind and speed re-targeting; injected so the loop is deterministic in tests. */
  random?: () => number
  /** Monotonic clock in milliseconds, injected so the governor can be driven deterministically in tests. */
  now?: () => number
}

export interface ISparkleEngine<TImage = CanvasImageSource> {
  /** Whether a frame is currently scheduled. */
  readonly isRunning: boolean
  /** Begins the loop; repeated calls are ignored so a double start cannot double the frame rate. */
  start(): void
  /** Cancels any scheduled frame and resets the timing baseline. */
  stop(): void
  /** Paints exactly one frame without scheduling another; used for the still tier and first paint. */
  renderOnce(): void
  /** Points the field at a new raw pointer position, or `null` once the pointer leaves. */
  setPointerTarget(target: IPointerPosition | null): void
  /** Swaps in sprites rasterised for a new tier or device pixel ratio. */
  setAtlas(atlas: ISparkleSpriteAtlas<TImage>): void
  /** Stops wrapping particles back in, so the field runs out of frame instead of looping forever. */
  beginExit(): void
}

/**
 * Owns the frame loop: advance, paint, grade. A frame reschedules only on its own handle, because
 * `onTierChange` may re-arm the loop synchronously and leave a second, orphaned frame chain running.
 */
export const createSparkleEngine = <TImage = CanvasImageSource>(
  options: ISparkleEngineOptions<TImage>,
): ISparkleEngine<TImage> => {
  const pointer = createSparklePointer()
  const influence = createSparkleInfluence()
  const random = options.random ?? Math.random
  const now = options.now ?? ((): number => performance.now())
  const wind = createSparkleWind(options.config, random)

  let atlas = options.atlas
  let isExiting = false
  let exitElapsedMs = 0
  let pointerTarget: IPointerPosition | null = null
  let frameHandle: number | null = null
  let lastTimestamp: number | null = null

  const paint = (): void => {
    renderSparkleField(
      options.context,
      atlas,
      options.particles,
      pointer,
      options.view,
      options.config,
      influence,
    )
  }

  const onFrame = (timestamp: number): void => {
    const handleAtEntry = frameHandle

    if (handleAtEntry === null) {
      return
    }

    const rawDelta = lastTimestamp === null ? 0 : timestamp - lastTimestamp

    lastTimestamp = timestamp

    const delta = clampSparkleFrameDelta(rawDelta, options.config.maxFrameDelta)
    const workStartedAt = now()

    advanceSparklePointer(pointer, pointerTarget, options.config.pointerLerp)
    advanceSparkleWind(wind, delta, options.config, random)

    // Ramped rather than applied whole, so a departing field accelerates out of frame instead of
    // snapping to its exit speed on the first frame after the appearance changed.
    let exitSpeedScale: number | null = null

    if (isExiting) {
      exitElapsedMs += delta
      exitSpeedScale =
        1 +
        (options.config.exitSpeedBoost - 1) * Math.min(1, exitElapsedMs / options.config.exitRampMs)
    }

    for (const particle of options.particles) {
      advanceSparkleParticle(
        particle,
        delta,
        options.view.width,
        options.view.height,
        options.config,
        wind,
        random,
        exitSpeedScale,
      )
    }

    paint()

    const workDurationMs = now() - workStartedAt

    if (workDurationMs > 0) {
      const nextTier = recordSparkleFrame(options.governor, workDurationMs, options.thresholds)

      if (nextTier) {
        options.onTierChange(nextTier)
      }
    }

    if (frameHandle === handleAtEntry) {
      frameHandle = options.requestFrame(onFrame)
    }
  }

  return {
    get isRunning(): boolean {
      return frameHandle !== null
    },
    start: (): void => {
      if (frameHandle !== null) {
        return
      }

      lastTimestamp = null
      frameHandle = options.requestFrame(onFrame)
    },
    stop: (): void => {
      if (frameHandle === null) {
        return
      }

      options.cancelFrame(frameHandle)
      frameHandle = null
      lastTimestamp = null
    },
    renderOnce: paint,
    setPointerTarget: (target: IPointerPosition | null): void => {
      pointerTarget = target
    },
    setAtlas: (next: ISparkleSpriteAtlas<TImage>): void => {
      atlas = next
    },
    beginExit: (): void => {
      isExiting = true
    },
  }
}

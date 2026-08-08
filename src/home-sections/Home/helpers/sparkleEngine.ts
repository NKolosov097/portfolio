import {
  advanceSparkleParticle,
  advanceSparklePointer,
  clampSparkleFrameDelta,
  createSparkleInfluence,
  createSparklePointer,
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
}

/**
 * Owns the frame loop: advance, paint, and grade. Everything it needs is
 * injected, so the same engine runs on the main thread and inside the worker,
 * and can be stepped by hand under test.
 */
export const createSparkleEngine = <TImage = CanvasImageSource>(
  options: ISparkleEngineOptions<TImage>,
): ISparkleEngine<TImage> => {
  const pointer = createSparklePointer()
  const influence = createSparkleInfluence()

  let atlas = options.atlas
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
    const rawDelta = lastTimestamp === null ? 0 : timestamp - lastTimestamp

    lastTimestamp = timestamp

    const delta = clampSparkleFrameDelta(rawDelta, options.config.maxFrameDelta)

    advanceSparklePointer(pointer, pointerTarget, options.config.pointerLerp)

    for (const particle of options.particles) {
      advanceSparkleParticle(
        particle,
        delta,
        options.view.width,
        options.view.height,
        options.config,
      )
    }

    paint()

    if (rawDelta > 0 && rawDelta <= options.config.maxFrameDelta) {
      const nextTier = recordSparkleFrame(options.governor, rawDelta, options.thresholds)

      if (nextTier) {
        options.onTierChange(nextTier)
      }
    }

    if (frameHandle !== null) {
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
  }
}

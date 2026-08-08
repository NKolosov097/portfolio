import {
  SPARKLE_FIELD_CONFIG,
  SPARKLE_GOVERNOR_THRESHOLDS,
  SPARKLE_TIERS,
} from '@/constants/home.constants'
import { createSparkleEngine, ISparkleEngine } from '@/home-sections/Home/helpers/sparkleEngine'
import {
  createSparkleParticles,
  refitSparkleParticles,
  resolveSparkleParticleCount,
} from '@/home-sections/Home/helpers/sparkleField'
import { createSparkleGovernorState } from '@/home-sections/Home/helpers/sparkleGovernor'
import {
  ESparkleTier,
  IPointerPosition,
  ISparkleDrawContext,
  ISparkleParticle,
  ISparkleSpriteAtlas,
  ISparkleTierConfig,
  ISparkleViewport,
} from '@/home-sections/Home/types/home.type'

export interface ISparkleControllerOptions<TImage = CanvasImageSource> {
  /** Context the field is painted into. */
  context: ISparkleDrawContext<TImage>
  /** Rasterises an atlas for a tier and pixel ratio; platform-specific. */
  buildAtlas: (
    tier: ISparkleTierConfig,
    devicePixelRatio: number,
  ) => ISparkleSpriteAtlas<TImage> | null
  /** Resizes the backing store, in device pixels; platform-specific. */
  resizeSurface: (widthPx: number, heightPx: number) => void
  /** Schedules the next frame. */
  requestFrame: (callback: (timestamp: number) => void) => number
  /** Cancels a scheduled frame. */
  cancelFrame: (handle: number) => void
  /** Tier the field starts on, seeded from device signals. */
  initialTier: ESparkleTier
  /** Announces the active tier so the host can mirror it, for example in a DOM attribute. */
  onTierChange?: (tier: ESparkleTier) => void
  /** Random source for particle placement; injected so a field can be reproduced in tests. */
  random?: () => number
}

export interface ISparkleController {
  /** Tier currently in force. */
  readonly tier: ESparkleTier
  /** Whether an animation loop is currently scheduled. */
  readonly isRunning: boolean
  /** Adopts a new field size and pixel ratio, refitting the population and the backing store. */
  setViewport(width: number, height: number, devicePixelRatio: number): void
  /** Forwards the raw pointer position, or `null` once it leaves the field. */
  setPointerTarget(target: IPointerPosition | null): void
  /** Runs the loop, or paints one still frame when the tier is terminal. */
  start(): void
  /** Halts the loop but keeps the field ready to resume. */
  stop(): void
  /** Halts permanently and refuses all further work. */
  destroy(): void
}

/**
 * Owns everything around the frame loop that both transports need: viewport
 * changes, atlas rebuilds, particle refits, and the reaction to a tier decision.
 * The main thread and the worker instantiate this identically; only how they
 * receive their inputs differs.
 */
export const createSparkleController = <TImage = CanvasImageSource>(
  options: ISparkleControllerOptions<TImage>,
): ISparkleController => {
  /** Field size and tier-capped pixel ratio; mutated in place and shared with the engine. */
  const view: ISparkleViewport = { width: 0, height: 0, devicePixelRatio: 1 }
  /** Live particle population; mutated in place and shared with the engine. */
  const particles: ISparkleParticle[] = []
  /** Quality governor seeded on the tier the host resolved from device signals. */
  const governor = createSparkleGovernorState(options.initialTier)

  /** Frame loop for the current atlas and viewport, created once both are available. */
  let engine: ISparkleEngine<TImage> | null = null
  /** Most recently built sprite atlas, or `null` before the first successful build. */
  let atlas: ISparkleSpriteAtlas<TImage> | null = null
  /** Pixel ratio the current atlas was rasterised for, used to detect a real change. */
  let atlasPixelRatio = 0
  /** Tier the current atlas was rasterised for, used to detect a real change. */
  let atlasTier: ESparkleTier | null = null
  /** Whether `destroy()` has run; once true, every method becomes a no-op. */
  let isDestroyed = false
  /** Whether the host asked for the loop to run, so a later viewport can start it once ready. */
  let isStartRequested = false
  /** Device's uncapped pixel ratio, kept separately so a later tier can re-cap it instead of the already-capped value. */
  let physicalPixelRatio = 1

  const readTier = (): ISparkleTierConfig => SPARKLE_TIERS[governor.tier]

  const ensureAtlas = (): void => {
    const tier = readTier()

    if (atlas && atlasTier === governor.tier && atlasPixelRatio === view.devicePixelRatio) {
      return
    }

    atlas = options.buildAtlas(tier, view.devicePixelRatio)
    atlasTier = governor.tier
    atlasPixelRatio = view.devicePixelRatio

    if (atlas) {
      engine?.setAtlas(atlas)
    }
  }

  const applyTier = (tier: ESparkleTier): void => {
    if (isDestroyed) {
      return
    }

    governor.tier = tier
    view.devicePixelRatio = Math.min(physicalPixelRatio, readTier().maxDevicePixelRatio)

    options.resizeSurface(view.width * view.devicePixelRatio, view.height * view.devicePixelRatio)
    ensureAtlas()

    refitSparkleParticles(
      particles,
      { width: view.width, height: view.height },
      view.width,
      view.height,
      resolveSparkleParticleCount(view.width, view.height, readTier(), SPARKLE_FIELD_CONFIG),
      SPARKLE_FIELD_CONFIG,
      options.random,
    )

    options.onTierChange?.(tier)

    if (!readTier().isAnimated) {
      engine?.stop()
      engine?.renderOnce()
    }
  }

  const ensureEngine = (): void => {
    if (engine || !atlas) {
      return
    }

    engine = createSparkleEngine<TImage>({
      context: options.context,
      atlas,
      particles,
      view,
      config: SPARKLE_FIELD_CONFIG,
      governor,
      thresholds: SPARKLE_GOVERNOR_THRESHOLDS,
      requestFrame: options.requestFrame,
      cancelFrame: options.cancelFrame,
      onTierChange: applyTier,
    })
  }

  return {
    get tier(): ESparkleTier {
      return governor.tier
    },
    get isRunning(): boolean {
      return engine?.isRunning ?? false
    },
    setViewport: (width: number, height: number, devicePixelRatio: number): void => {
      if (isDestroyed || width <= 0 || height <= 0) {
        return
      }

      const previous = { width: view.width, height: view.height }

      physicalPixelRatio = devicePixelRatio

      const scale = Math.min(devicePixelRatio, readTier().maxDevicePixelRatio)

      view.width = width
      view.height = height
      view.devicePixelRatio = scale

      options.resizeSurface(width * scale, height * scale)
      ensureAtlas()

      const count = resolveSparkleParticleCount(width, height, readTier(), SPARKLE_FIELD_CONFIG)

      if (particles.length === 0) {
        particles.push(
          ...createSparkleParticles(width, height, count, SPARKLE_FIELD_CONFIG, options.random),
        )
      } else {
        refitSparkleParticles(
          particles,
          previous,
          width,
          height,
          count,
          SPARKLE_FIELD_CONFIG,
          options.random,
        )
      }

      ensureEngine()
      engine?.renderOnce()

      if (isStartRequested && readTier().isAnimated) {
        engine?.start()
      }
    },
    setPointerTarget: (target: IPointerPosition | null): void => {
      if (isDestroyed) {
        return
      }

      engine?.setPointerTarget(target)
    },
    start: (): void => {
      if (isDestroyed) {
        return
      }

      isStartRequested = true

      if (!engine) {
        return
      }

      if (readTier().isAnimated) {
        engine.start()

        return
      }

      engine.renderOnce()
    },
    stop: (): void => {
      isStartRequested = false
      engine?.stop()
    },
    destroy: (): void => {
      isDestroyed = true
      isStartRequested = false
      engine?.stop()
      engine = null
      atlas = null
      particles.length = 0
    },
  }
}

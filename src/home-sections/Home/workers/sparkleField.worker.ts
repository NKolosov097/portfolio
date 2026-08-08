import {
  createSparkleController,
  ISparkleController,
} from '@/home-sections/Home/helpers/sparkleController'
import { buildSparkleAtlas } from '@/home-sections/Home/helpers/sparkleSprites'
import {
  ESparkleWorkerInboundType,
  ESparkleWorkerOutboundType,
  ISparkleRasterContext,
  ISpriteSurface,
  TSparkleWorkerInbound,
} from '@/home-sections/Home/types/home.type'

/**
 * Gap between self-driven frames, matching a 60 Hz display. A dedicated worker has no
 * `requestAnimationFrame` — it is a `Window` method — so the loop is timer-driven instead.
 */
const WORKER_FRAME_INTERVAL_MS = 16

/**
 * Schedules the next worker frame on the same clock the main thread would use. Timers go through
 * `self` so they resolve to the DOM's numeric handles rather than Node's `Timeout` object.
 */
const requestWorkerFrame = (callback: (timestamp: number) => void): number =>
  self.setTimeout(() => callback(performance.now()), WORKER_FRAME_INTERVAL_MS)

/** Cancels a frame scheduled by {@link requestWorkerFrame}. */
const cancelWorkerFrame = (handle: number): void => self.clearTimeout(handle)

/** Allocates an offscreen surface to bake one sprite frame into. */
const createOffscreenSpriteSurface = (size: number): ISpriteSurface | null => {
  const canvas = new OffscreenCanvas(size, size)
  const context: ISparkleRasterContext | null = canvas.getContext('2d')

  return context ? { image: canvas, context } : null
}

/** Controller driving the transferred surface, created once the host hands it over. */
let controller: ISparkleController | null = null

/** Transferred surface, held so a resize can retarget its backing store. */
let surface: OffscreenCanvas | null = null

/** Adopts the transferred surface and stands the shared controller up around it. */
const onInit = (
  message: Extract<TSparkleWorkerInbound, { type: ESparkleWorkerInboundType.init }>,
): void => {
  surface = message.canvas

  const context = surface.getContext('2d', { alpha: true, desynchronized: true })

  if (!context) {
    return
  }

  const target = surface

  controller = createSparkleController({
    context,
    buildAtlas: (tier, devicePixelRatio) =>
      buildSparkleAtlas(createOffscreenSpriteSurface, {
        devicePixelRatio,
        color: message.color,
        hasGlow: tier.hasGlow,
      }),
    resizeSurface: (widthPx, heightPx) => {
      target.width = Math.max(1, Math.round(widthPx))
      target.height = Math.max(1, Math.round(heightPx))
    },
    requestFrame: requestWorkerFrame,
    cancelFrame: cancelWorkerFrame,
    initialTier: message.tier,
    onTierChange: (tier) => postMessage({ type: ESparkleWorkerOutboundType.tier, tier }),
  })

  controller.setViewport(message.width, message.height, message.devicePixelRatio)
}

addEventListener('message', (event: MessageEvent<TSparkleWorkerInbound>) => {
  const message = event.data

  switch (message.type) {
    case ESparkleWorkerInboundType.init:
      onInit(message)

      return
    case ESparkleWorkerInboundType.viewport:
      controller?.setViewport(message.width, message.height, message.devicePixelRatio)

      return
    case ESparkleWorkerInboundType.pointer:
      controller?.setPointerTarget(message.position)

      return
    case ESparkleWorkerInboundType.run:
      if (message.isRunning) {
        controller?.start()
      } else {
        controller?.stop()
      }

      return
    case ESparkleWorkerInboundType.destroy:
      controller?.destroy()
      controller = null
      surface = null
  }
})

postMessage({ type: ESparkleWorkerOutboundType.ready })

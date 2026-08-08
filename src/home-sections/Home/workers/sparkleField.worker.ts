import {
  createSparkleController,
  ISparkleController,
} from '@/home-sections/Home/helpers/sparkleController'
import { buildSparkleAtlas } from '@/home-sections/Home/helpers/sparkleSprites'
import {
  ISparkleRasterContext,
  ISpriteSurface,
  TSparkleWorkerInbound,
} from '@/home-sections/Home/types/home.type'

/**
 * Gap between frames the worker drives itself at, matching a 60 Hz display.
 * A dedicated worker has no `requestAnimationFrame` — it is a `Window` method —
 * so the loop is timer-driven, which the engine supports because it takes its
 * scheduler by injection and grades the wall-clock delta it actually observes.
 */
const WORKER_FRAME_INTERVAL_MS = 16

/**
 * Schedules the next worker frame, stamping it with the same clock the main
 * thread would. The timers are reached through `self` so they resolve to the
 * numeric-handle DOM signatures rather than Node's `Timeout` object.
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
const onInit = (message: Extract<TSparkleWorkerInbound, { type: 'init' }>): void => {
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
    onTierChange: (tier) => postMessage({ type: 'tier', tier }),
  })

  controller.setViewport(message.width, message.height, message.devicePixelRatio)
}

addEventListener('message', (event: MessageEvent<TSparkleWorkerInbound>) => {
  const message = event.data

  switch (message.type) {
    case 'init':
      onInit(message)

      return
    case 'viewport':
      controller?.setViewport(message.width, message.height, message.devicePixelRatio)

      return
    case 'pointer':
      controller?.setPointerTarget(message.position)

      return
    case 'run':
      if (message.isRunning) {
        controller?.start()
      } else {
        controller?.stop()
      }

      return
    case 'destroy':
      controller?.destroy()
      controller = null
      surface = null
  }
})

postMessage({ type: 'ready' })

'use client'

import styles from './SparkleField.module.css'

import { useCallback, useEffect, useRef, useState } from 'react'

import { SPARKLE_FIELD_PRESETS } from '@/constants/home.constants'
import { prefersReducedMotion } from '@/helpers/prefersReducedMotion'
import {
  createSparkleController,
  ISparkleController,
} from '@/home-sections/Home/helpers/sparkleController'
import { resolveInitialSparkleTier } from '@/home-sections/Home/helpers/sparkleGovernor'
import { buildSparkleAtlas } from '@/home-sections/Home/helpers/sparkleSprites'
import {
  canUseSparkleWorker,
  isSparkleWorkerMessage,
} from '@/home-sections/Home/helpers/sparkleTransport'
import {
  ESparkleFieldPreset,
  ESparkleTier,
  ESparkleWorkerInboundType,
  ESparkleWorkerOutboundType,
  IPointerPosition,
  ISparkleRasterContext,
  ISpriteSurface,
  TSparkleWorkerInbound,
} from '@/home-sections/Home/types/home.type'

/** Media query whose match means the visitor has a precise pointer worth reacting to. */
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

/** Media query used to keep the field in step with the OS reduced-motion setting. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Media query whose match means the primary input is coarse, which correlates with weaker GPUs. */
const COARSE_POINTER_QUERY = '(pointer: coarse)'

/**
 * How long the worker may take to announce itself. A worker that fails while loading its own module
 * graph rejects inside its scope instead of raising `error`, so silence has to trigger the fallback.
 */
const WORKER_HANDSHAKE_TIMEOUT_MS = 1500

/** Reads the optional `navigator.deviceMemory` signal without assuming the browser exposes it. */
const readDeviceMemory = (): number | undefined => {
  const candidate = Reflect.get(navigator, 'deviceMemory')

  return typeof candidate === 'number' ? candidate : undefined
}

/** Constructs the field worker, or returns `null` so the same pass falls through to the main thread. */
const createSparkleWorker = (): Worker | null => {
  try {
    return new Worker(new URL('../../workers/sparkleField.worker.ts', import.meta.url))
  } catch {
    return null
  }
}

/** Allocates a detached canvas to bake one sprite frame into, on the main thread. */
const createDomSpriteSurface = (size: number): ISpriteSurface | null => {
  const canvas = document.createElement('canvas')

  canvas.width = size
  canvas.height = size

  const context: ISparkleRasterContext | null = canvas.getContext('2d')

  return context ? { image: canvas, context } : null
}

interface ISparkleFieldSink {
  /** Adopts a new field size and the device's uncapped pixel ratio. */
  setViewport(width: number, height: number, devicePixelRatio: number): void
  /** Requests the loop to run or halt, and reports whether it is running afterwards. */
  setRunning(isRunning: boolean): boolean
  /** Forwards the pointer in field-local CSS pixels, or `null` once it leaves. */
  setPointerTarget(target: IPointerPosition | null): void
  /** Lets the field run out of frame instead of looping, once this preset is being replaced. */
  beginExit(): void
  /** Releases every resource the transport owns; called exactly once, on unmount. */
  dispose(): void
}

interface IObserveSparkleFieldOptions {
  /** Element whose box the field fills and whose parent the pointer is tracked over. */
  field: HTMLDivElement
  /** Transport the observers drive; the only thing that differs between the two paths. */
  sink: ISparkleFieldSink
  /** Whether pointer reactions are wanted at all, before the pointer type is even considered. */
  isPointerEnabled: boolean
  /** Returns the field's cached bounding box, or `null` once the element is gone. */
  readRect: () => DOMRect | null
  /** Invalidates the cached bounding box after anything that can have moved the field. */
  markRectStale: () => void
  /** Announces that the field has a size and may be faded in. */
  onReady: () => void
  /** Mirrors the loop's running state so the host can expose it in the DOM. */
  onRunningChange: (isRunning: boolean) => void
}

/**
 * Wires the DOM observers both transports need, leaving each transport to supply only what it does
 * with the resulting updates. Returns the teardown for everything it attached.
 */
const observeSparkleField = (options: IObserveSparkleFieldOptions): (() => void) => {
  const { field, sink } = options

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]

    if (!entry) {
      return
    }

    options.markRectStale()
    sink.setViewport(entry.contentRect.width, entry.contentRect.height, window.devicePixelRatio)
    options.onReady()
  })

  resizeObserver.observe(field)

  const intersectionObserver = new IntersectionObserver((entries) => {
    const entry = entries[0]

    if (!entry) {
      return
    }

    options.markRectStale()
    options.onRunningChange(sink.setRunning(entry.isIntersecting && !document.hidden))
  })

  intersectionObserver.observe(field)

  const onVisibilityChange = () => {
    options.onRunningChange(sink.setRunning(!document.hidden))
  }

  document.addEventListener('visibilitychange', onVisibilityChange)

  const onScroll = () => {
    options.markRectStale()
  }

  window.addEventListener('scroll', onScroll, { passive: true })

  const hasFinePointer = window.matchMedia(FINE_POINTER_QUERY).matches
  const section = field.parentElement

  const onPointerMove = (event: PointerEvent) => {
    const rect = options.readRect()

    if (!rect) {
      return
    }

    sink.setPointerTarget({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  }

  const onPointerLeave = () => sink.setPointerTarget(null)

  const isPointerTracked = hasFinePointer && Boolean(section) && options.isPointerEnabled

  if (isPointerTracked && section) {
    section.addEventListener('pointermove', onPointerMove, { passive: true })
    section.addEventListener('pointerleave', onPointerLeave, { passive: true })
  }

  return () => {
    resizeObserver.disconnect()
    intersectionObserver.disconnect()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('scroll', onScroll)

    if (isPointerTracked && section) {
      section.removeEventListener('pointermove', onPointerMove)
      section.removeEventListener('pointerleave', onPointerLeave)
    }

    sink.dispose()
  }
}

interface ISparkleLayerProps {
  /** Motion preset this layer is driven with; one layer never changes preset. */
  preset: ESparkleFieldPreset
  /** Whether this layer replaced another one, so its population arrives rather than simply existing. */
  isEntering: boolean
  /** Whether this layer is the outgoing one, dimming while its replacement arrives. */
  isLeaving: boolean
}

/** One field instance: its own canvas, transport and loop, mounted for as long as its preset is on screen. */
const SparkleLayer = ({ preset, isEntering, isLeaving }: ISparkleLayerProps) => {
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const sinkRef = useRef<ISparkleFieldSink | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const isRectStaleRef = useRef(true)

  const [isReducedMotion, setIsReducedMotion] = useState(prefersReducedMotion)
  const [isRunning, setIsRunning] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isWorkerEnabled, setIsWorkerEnabled] = useState(true)
  const [canvasKey, setCanvasKey] = useState(0)

  const readFieldRect = useCallback((): DOMRect | null => {
    const field = fieldRef.current

    if (!field) {
      return null
    }

    if (isRectStaleRef.current || !rectRef.current) {
      rectRef.current = field.getBoundingClientRect()
      isRectStaleRef.current = false
    }

    return rectRef.current
  }, [])

  const markRectStale = useCallback(() => {
    isRectStaleRef.current = true
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const onChange = () => setIsReducedMotion(query.matches)

    query.addEventListener('change', onChange)

    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const field = fieldRef.current
    const canvas = canvasRef.current

    if (!field || !canvas) {
      return
    }

    const config = SPARKLE_FIELD_PRESETS[preset]

    const initialTier = isReducedMotion
      ? ESparkleTier.static
      : resolveInitialSparkleTier({
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: readDeviceMemory(),
          devicePixelRatio: window.devicePixelRatio,
          isCoarsePointer: window.matchMedia(COARSE_POINTER_QUERY).matches,
        })

    const isWorkerViable =
      isWorkerEnabled &&
      canUseSparkleWorker({
        hasWorker: typeof Worker === 'function',
        hasOffscreenCanvas: typeof canvas.transferControlToOffscreen === 'function',
        isReducedMotion,
      })

    const worker = isWorkerViable ? createSparkleWorker() : null

    if (worker) {
      /** Whether the surface has been handed over; `transferControlToOffscreen` cannot be undone. */
      let isTransferred = false
      /** Latest run request, replayed straight after the hand-off so an early one is not lost. */
      let isRunRequested = false
      /** Pending pointer flush, so at most one pointer message is posted per frame. */
      let pointerFrame: number | null = null
      /** Newest pointer position awaiting that flush. */
      let latestPointer: IPointerPosition | null = null
      /** Deadline by which the worker must have announced itself, cleared once it does. */
      let handshakeTimer: number | null = null

      const postToWorker = (message: TSparkleWorkerInbound) => worker.postMessage(message)

      const clearHandshakeTimer = () => {
        if (handshakeTimer !== null) {
          window.clearTimeout(handshakeTimer)
          handshakeTimer = null
        }
      }

      const flushPointer = () => {
        pointerFrame = null
        postToWorker({ type: ESparkleWorkerInboundType.pointer, position: latestPointer })
      }

      const onWorkerMessage = (event: MessageEvent) => {
        if (!isSparkleWorkerMessage(event.data)) {
          return
        }

        if (event.data.type === ESparkleWorkerOutboundType.ready && !isTransferred) {
          isTransferred = true
          clearHandshakeTimer()

          const offscreen = canvas.transferControlToOffscreen()
          const rect = field.getBoundingClientRect()

          worker.postMessage(
            {
              type: ESparkleWorkerInboundType.init,
              canvas: offscreen,
              width: rect.width,
              height: rect.height,
              devicePixelRatio: window.devicePixelRatio,
              tier: initialTier,
              color: window.getComputedStyle(canvas).color,
              config,
              isEntering,
            } satisfies TSparkleWorkerInbound,
            [offscreen],
          )

          postToWorker({ type: ESparkleWorkerInboundType.run, isRunning: isRunRequested })
          setIsReady(true)
        }
      }

      const abandonWorker = () => {
        clearHandshakeTimer()
        worker.removeEventListener('message', onWorkerMessage)
        worker.removeEventListener('error', onWorkerError)
        worker.terminate()

        if (isTransferred) {
          setCanvasKey((current) => current + 1)
        }

        setIsWorkerEnabled(false)
      }

      const onWorkerError = (event: Event) => {
        event.preventDefault()
        abandonWorker()
      }

      worker.addEventListener('message', onWorkerMessage)
      worker.addEventListener('error', onWorkerError)

      handshakeTimer = window.setTimeout(() => {
        handshakeTimer = null

        if (!isTransferred) {
          abandonWorker()
        }
      }, WORKER_HANDSHAKE_TIMEOUT_MS)

      const sink: ISparkleFieldSink = {
        setViewport: (width, height, devicePixelRatio) => {
          if (!isTransferred) {
            return
          }

          postToWorker({
            type: ESparkleWorkerInboundType.viewport,
            width,
            height,
            devicePixelRatio,
          })
        },
        setRunning: (isFieldRunning) => {
          isRunRequested = isFieldRunning

          if (isTransferred) {
            postToWorker({ type: ESparkleWorkerInboundType.run, isRunning: isFieldRunning })
          }

          return isFieldRunning
        },
        setPointerTarget: (target) => {
          if (!isTransferred) {
            return
          }

          latestPointer = target

          if (pointerFrame === null) {
            pointerFrame = window.requestAnimationFrame(flushPointer)
          }
        },
        beginExit: () => {
          if (isTransferred) {
            postToWorker({ type: ESparkleWorkerInboundType.exit })
          }
        },
        dispose: () => {
          clearHandshakeTimer()

          if (pointerFrame !== null) {
            window.cancelAnimationFrame(pointerFrame)
            pointerFrame = null
          }

          worker.removeEventListener('message', onWorkerMessage)
          worker.removeEventListener('error', onWorkerError)
          postToWorker({ type: ESparkleWorkerInboundType.destroy })
          worker.terminate()
        },
      }

      sinkRef.current = sink

      return observeSparkleField({
        field,
        sink,
        isPointerEnabled: !isReducedMotion,
        readRect: readFieldRect,
        markRectStale,
        onReady: () => undefined,
        onRunningChange: setIsRunning,
      })
    }

    const context = canvas.getContext('2d', { alpha: true, desynchronized: true })

    if (!context) {
      return
    }

    const controller: ISparkleController = createSparkleController({
      context,
      buildAtlas: (tier, devicePixelRatio) =>
        buildSparkleAtlas(createDomSpriteSurface, {
          devicePixelRatio,
          color: window.getComputedStyle(canvas).color,
          hasGlow: tier.hasGlow,
          glyphPaths: config.glyphPaths,
          glyphStrokeWidth: config.glyphStrokeWidth,
          glyphGlowRatio: config.glyphGlowRatio,
        }),
      resizeSurface: (widthPx, heightPx) => {
        canvas.width = Math.max(1, Math.round(widthPx))
        canvas.height = Math.max(1, Math.round(heightPx))
      },
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (handle) => window.cancelAnimationFrame(handle),
      initialTier,
      config,
      isEntering,
    })

    const sink: ISparkleFieldSink = {
      setViewport: (width, height, devicePixelRatio) =>
        controller.setViewport(width, height, devicePixelRatio),
      setRunning: (isFieldRunning) => {
        if (isFieldRunning) {
          controller.start()
        } else {
          controller.stop()
        }

        return controller.isRunning
      },
      setPointerTarget: (target) => controller.setPointerTarget(target),
      beginExit: () => controller.beginExit(),
      dispose: () => controller.destroy(),
    }

    sinkRef.current = sink

    return observeSparkleField({
      field,
      sink,
      isPointerEnabled: !isReducedMotion,
      readRect: readFieldRect,
      markRectStale,
      onReady: () => setIsReady(true),
      onRunningChange: setIsRunning,
    })
  }, [preset, isEntering, isReducedMotion, isWorkerEnabled, markRectStale, readFieldRect])

  // Told once, the moment the appearance moved on: the loop stops wrapping particles back into the
  // frame, so a snowfall runs out through the bottom instead of seeding new flakes over the top.
  useEffect(() => {
    if (isLeaving) {
      sinkRef.current?.beginExit()
    }
  }, [isLeaving])

  return (
    <div
      ref={fieldRef}
      className={styles.field}
      aria-hidden="true"
      data-motion={isReducedMotion ? 'static' : 'animated'}
      data-running={isRunning ? 'true' : 'false'}
      data-ready={isReady ? 'true' : 'false'}
      data-preset={preset}
      data-leaving={isLeaving ? 'true' : undefined}
    >
      {/* Only the live layer carries the selector, so a crossfade never exposes two fields to QA. */}
      <canvas
        key={canvasKey}
        ref={canvasRef}
        className={styles.canvas}
        data-testid={isLeaving ? undefined : 'home-sparkle-field'}
      />
    </div>
  )
}

interface ISparkleFieldProps {
  /** Motion preset to drive the field with; the appearance picks sparkles or snow. */
  preset?: ESparkleFieldPreset
}

/** How long the outgoing preset stays mounted, which has to outlast the longest departure. */
const PRESET_CROSSFADE_MS = 4400

interface ISparkleLayerState {
  /** Preset the layer draws. */
  preset: ESparkleFieldPreset
  /** Whether the field arrives rather than simply exists, fixed at creation; true for the first one too. */
  isEntering: boolean
}

/** Crossfades between presets: the previous field dims while the new one is revealed from the top. */
export const SparkleField = ({ preset = ESparkleFieldPreset.sparkles }: ISparkleFieldProps) => {
  const [layers, setLayers] = useState<ISparkleLayerState[]>([{ preset, isEntering: true }])

  // Adjusted during render so the incoming preset joins the list in the same commit the switch
  // happens in, leaving the outgoing layer painting underneath instead of being torn out at once.
  // `isEntering` is settled here and never revised, since the layer reads it as it seeds itself.
  if (layers.at(-1)?.preset !== preset) {
    setLayers([...layers.filter((layer) => layer.preset !== preset), { preset, isEntering: true }])
  }

  // Drops the stale layer once it has finished dimming; re-armed on every switch, so toggling
  // mid-crossfade extends the overlap rather than cutting the previous one short.
  useEffect(() => {
    const handle = window.setTimeout(
      () =>
        setLayers((current) =>
          current.length > 1 ? current.filter((layer) => layer.preset === preset) : current,
        ),
      PRESET_CROSSFADE_MS,
    )

    return () => window.clearTimeout(handle)
  }, [preset])

  return (
    <>
      {layers.map((layer) => (
        <SparkleLayer
          key={layer.preset}
          preset={layer.preset}
          isEntering={layer.isEntering}
          isLeaving={layer.preset !== preset}
        />
      ))}
    </>
  )
}

export default SparkleField

'use client'

import styles from './SparkleField.module.css'

import { useCallback, useEffect, useRef, useState } from 'react'

import { prefersReducedMotion } from '@/helpers/prefersReducedMotion'
import {
  createSparkleController,
  ISparkleController,
} from '@/home-sections/Home/helpers/sparkleController'
import { resolveInitialSparkleTier } from '@/home-sections/Home/helpers/sparkleGovernor'
import { buildSparkleAtlas } from '@/home-sections/Home/helpers/sparkleSprites'
import {
  ESparkleTier,
  ISparkleRasterContext,
  ISpriteSurface,
} from '@/home-sections/Home/types/home.type'

/** Media query whose match means the visitor has a precise pointer worth reacting to. */
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

/** Media query used to keep the field in step with the OS reduced-motion setting. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Media query whose match means the primary input is coarse, which correlates with weaker GPUs. */
const COARSE_POINTER_QUERY = '(pointer: coarse)'

/** Reads the optional `navigator.deviceMemory` signal without assuming the browser exposes it. */
const readDeviceMemory = (): number | undefined => {
  const candidate = Reflect.get(navigator, 'deviceMemory')

  return typeof candidate === 'number' ? candidate : undefined
}

/** Allocates a detached canvas to bake one sprite frame into, on the main thread. */
const createDomSpriteSurface = (size: number): ISpriteSurface | null => {
  const canvas = document.createElement('canvas')

  canvas.width = size
  canvas.height = size

  const context: ISparkleRasterContext | null = canvas.getContext('2d')

  return context ? { image: canvas, context } : null
}

export const SparkleField = () => {
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controllerRef = useRef<ISparkleController | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const isRectStaleRef = useRef(true)

  const [isReducedMotion, setIsReducedMotion] = useState(prefersReducedMotion)
  const [isRunning, setIsRunning] = useState(false)
  const [isReady, setIsReady] = useState(false)

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

    const context = canvas.getContext('2d', { alpha: true, desynchronized: true })

    if (!context) {
      return
    }

    const initialTier = isReducedMotion
      ? ESparkleTier.static
      : resolveInitialSparkleTier({
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: readDeviceMemory(),
          devicePixelRatio: window.devicePixelRatio,
          isCoarsePointer: window.matchMedia(COARSE_POINTER_QUERY).matches,
        })

    const controller = createSparkleController({
      context,
      buildAtlas: (tier, devicePixelRatio) =>
        buildSparkleAtlas(createDomSpriteSurface, {
          devicePixelRatio,
          color: window.getComputedStyle(canvas).color,
          hasGlow: tier.hasGlow,
        }),
      resizeSurface: (widthPx, heightPx) => {
        canvas.width = Math.max(1, Math.round(widthPx))
        canvas.height = Math.max(1, Math.round(heightPx))
      },
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (handle) => window.cancelAnimationFrame(handle),
      initialTier,
    })

    controllerRef.current = controller

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (!entry) {
        return
      }

      isRectStaleRef.current = true
      controller.setViewport(
        entry.contentRect.width,
        entry.contentRect.height,
        window.devicePixelRatio,
      )
      setIsReady(true)
    })

    resizeObserver.observe(field)

    const intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0]

      if (!entry) {
        return
      }

      isRectStaleRef.current = true

      if (entry.isIntersecting && !document.hidden) {
        controller.start()
      } else {
        controller.stop()
      }

      setIsRunning(controller.isRunning)
    })

    intersectionObserver.observe(field)

    const onVisibilityChange = () => {
      if (document.hidden) {
        controller.stop()
      } else {
        controller.start()
      }

      setIsRunning(controller.isRunning)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    const onScroll = () => {
      isRectStaleRef.current = true
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    const hasFinePointer = window.matchMedia(FINE_POINTER_QUERY).matches
    const section = field.parentElement

    const onPointerMove = (event: PointerEvent) => {
      const rect = readFieldRect()

      if (!rect) {
        return
      }

      controller.setPointerTarget({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    }

    const onPointerLeave = () => controller.setPointerTarget(null)

    if (hasFinePointer && section && !isReducedMotion) {
      section.addEventListener('pointermove', onPointerMove, { passive: true })
      section.addEventListener('pointerleave', onPointerLeave, { passive: true })
    }

    return () => {
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('scroll', onScroll)

      if (hasFinePointer && section && !isReducedMotion) {
        section.removeEventListener('pointermove', onPointerMove)
        section.removeEventListener('pointerleave', onPointerLeave)
      }

      controller.destroy()
      controllerRef.current = null
    }
  }, [isReducedMotion, readFieldRect])

  return (
    <div
      ref={fieldRef}
      className={styles.field}
      aria-hidden="true"
      data-motion={isReducedMotion ? 'static' : 'animated'}
      data-running={isRunning ? 'true' : 'false'}
      data-ready={isReady ? 'true' : 'false'}
    >
      <canvas ref={canvasRef} className={styles.canvas} data-testid="home-sparkle-field" />
    </div>
  )
}

export default SparkleField

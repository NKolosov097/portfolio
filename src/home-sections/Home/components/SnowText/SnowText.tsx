'use client'

// @refresh reset
// Re-prepare sampled geometry when its helper changes during development.

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { cancelIdle, requestIdle } from '@/helpers/idleCallback'
import {
  createRasterContext,
  prepareSnowGlyph,
  prepareSnowContact,
  type SnowMaskKeyframe,
  type SnowGlyph,
  type SnowPart,
} from './snowGeometry'
import styles from './SnowText.module.css'

/** Live translated word and its appearance/position context. */
type SnowTextProps = {
  /** Original selectable translated text. */
  text: string
  /** Position selects only the approved word-specific details. */
  part: SnowPart
  /** Decoration is prepared only in winter appearance. */
  isWinter: boolean
}

/** Stable definitions belong to the sole home heading's intro fragment. */
function SnowMaterials() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient
          id="home-snow-inner-fill"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f1f7fb" />
          <stop offset="82%" stopColor="#ddeaf4" />
          <stop offset="100%" stopColor="#c1d5e5" />
        </linearGradient>
        <filter
          id="home-snow-inner-contact"
          x="-150%"
          y="-100%"
          width="400%"
          height="350%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".7"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feComponentTransfer in="noise" result="grain">
            <feFuncR type="linear" slope=".04" intercept=".96" />
            <feFuncG type="linear" slope=".04" intercept=".96" />
            <feFuncB type="linear" slope=".04" intercept=".96" />
          </feComponentTransfer>
          <feComposite in="grain" in2="SourceGraphic" operator="in" result="clippedGrain" />
          <feBlend in="SourceGraphic" in2="clippedGrain" mode="multiply" result="textured" />
          <feComposite in="textured" in2="SourceAlpha" operator="in" result="snow" />
          {/* Varies the powder rim only vertically within the overlap to retain stroke contact. */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".075"
            numOctaves="2"
            seed="13"
            result="edgeNoise"
          />
          <feColorMatrix
            in="edgeNoise"
            type="matrix"
            values="0 0 0 0 .5 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"
            result="edgeMap"
          />
          <feDisplacementMap
            in="snow"
            in2="edgeMap"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
            result="powderEdge"
          />
          <feGaussianBlur in="powderEdge" stdDeviation=".35" result="softSnow" />
          <feDropShadow
            in="softSnow"
            dx="0"
            dy="9"
            stdDeviation="9"
            floodColor="#06111d"
            floodOpacity=".25"
          />
        </filter>
        {/* Broad source-space shadows fall below the lips instead of outlining their edges. */}
        <linearGradient
          id="home-snow-hanging-fill"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f1f7fb" />
          <stop offset="82%" stopColor="#ddeaf4" />
          <stop offset="100%" stopColor="#c1d5e5" />
        </linearGradient>
        <filter
          id="home-snow-hanging-contact"
          x="-150%"
          y="-100%"
          width="400%"
          height="350%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="9" stdDeviation="9" floodColor="#06111d" floodOpacity=".25" />
        </filter>
      </defs>
    </svg>
  )
}

/** Owns only the prepared fragment's native effects and entry timer. */
type SnowMotion = {
  /** Exact effects available to the fragment owner. */
  animations: Animation[]
  /** Retargets without changing the displayed phase. */
  setTarget: (winter: boolean, reduced: boolean, armed: boolean) => void
  /** Replaces profiles on the same targets without disturbing their clocks or pending entry. */
  updateKeyframes: (frames: readonly (readonly SnowMaskKeyframe[])[]) => void
  /** Releases every owned effect and pending entry. */
  dispose: () => void
}

/** Keeps body and lip profiles on one reversible native clock without frame callbacks. */
function createSnowMotion(
  bindings: readonly {
    /** Existing mounted SVG mask rectangle. */
    element: SVGRectElement
    /** Prepared body or lip states in binding order. */
    keyframes: readonly SnowMaskKeyframe[]
  }[],
): SnowMotion {
  const duration = 2_000
  const animations = bindings.map(({ element, keyframes }) => {
    const animation = element.animate([...keyframes], { duration, fill: 'both', easing: 'linear' })
    animation.pause()
    animation.currentTime = 0
    return animation
  })
  let timer: number | undefined
  let generation = 0
  let isDisposed = false
  let isWinterTarget = false

  /** Read one authoritative phase, ignoring unresolved or nonnumeric native time values. */
  function currentPhase() {
    const time = animations[0]?.currentTime
    return typeof time === 'number' && Number.isFinite(time)
      ? Math.max(0, Math.min(duration, time))
      : 0
  }

  /** Invalidate even a queued callback before stopping the timer itself. */
  function cancelStart() {
    generation++
    if (timer !== undefined) window.clearTimeout(timer)
    timer = undefined
  }

  /** Preserve the current body/lip phase through delays, reversals and preference changes. */
  function setTarget(winter: boolean, reduced: boolean, armed: boolean) {
    if (isDisposed) return
    cancelStart()
    isWinterTarget = winter
    const phase = currentPhase()
    for (const animation of animations) {
      animation.pause()
      animation.currentTime = phase
    }
    if (reduced) {
      for (const animation of animations) animation.currentTime = winter ? duration : 0
      return
    }
    if (winter && !armed) return
    const target = winter ? duration : 0
    if (phase === target) return
    const request = generation

    /** Align every effect to the same document-timeline instant after the color wait. */
    function resume() {
      if (isDisposed || generation !== request || isWinterTarget !== winter) return
      timer = undefined
      const rate = winter ? 1 : -1
      for (const animation of animations) {
        animation.playbackRate = rate
        animation.currentTime = phase
        animation.play()
      }
      const timeline = document.timeline.currentTime
      if (typeof timeline === 'number') {
        const startTime = timeline - phase / rate
        for (const animation of animations) animation.startTime = startTime
      }
    }

    if (winter) timer = window.setTimeout(resume, 300)
    else resume()
  }

  /** Updating a contact profile must not re-arm, seek, change direction or restart a pending wait. */
  function updateKeyframes(frames: readonly (readonly SnowMaskKeyframe[])[]) {
    if (isDisposed) return
    if (frames.length !== animations.length)
      throw new Error('Snow profile updates require the same targets.')
    for (let index = 0; index < animations.length; index++) {
      const effect = animations[index].effect
      if (!(effect instanceof KeyframeEffect))
        throw new Error('Expected an owned snow keyframe effect.')
      effect.setKeyframes([...frames[index]])
    }
  }

  /** Stop stale starts and remove only this fragment's effects. */
  function dispose() {
    if (isDisposed) return
    isDisposed = true
    cancelStart()
    for (const animation of animations) animation.cancel()
  }

  return { animations, setTarget, updateKeyframes, dispose }
}

/** Keeps text visible while preparing cancellable, fixed-font snow decoration off the render path. */
export function SnowText({ text, part, isWinter }: SnowTextProps) {
  const maskId = useId()
  const [armedGlyphs, setArmedGlyphs] = useState<SnowGlyph[] | null>(null)
  const [prepared, setPrepared] = useState<{
    text: string
    part: SnowPart
    glyphs: SnowGlyph[]
  } | null>(null)

  // A stale font promise or idle callback must never apply geometry to a different locale or theme.
  useEffect(() => {
    if (!isWinter || (prepared?.text === text && prepared.part === part)) return
    let isCancelled = false
    let idleHandle: number | undefined
    /** Schedules raster work only after the exact Inter weight is available. */
    async function prepare() {
      try {
        if (!document.fonts) return
        await document.fonts.load('700 200px Inter')
        if (isCancelled || !document.fonts.check('700 200px Inter')) return
        idleHandle = requestIdle(() => {
          if (isCancelled) return
          try {
            const ctx = createRasterContext()
            if (!ctx) return
            const glyphs = Array.from(text, (ch, index) => prepareSnowGlyph(ctx, ch, part, index))
            if (!isCancelled) setPrepared({ text, part, glyphs })
          } catch {
            /* Unavailable rasterization leaves the live text intact. */
          }
        })
      } catch {
        /* A failed font load leaves the live text intact. */
      }
    }
    void prepare()
    return () => {
      isCancelled = true
      if (idleHandle !== undefined) cancelIdle(idleHandle)
    }
  }, [isWinter, text, part, prepared])

  const wordRef = useRef<HTMLSpanElement>(null)
  const motionRef = useRef<SnowMotion | null>(null)
  const targetRef = useRef({ winter: isWinter, armed: false })

  // Theme requests preserve the current native clock and reuse each prepared fragment.
  useLayoutEffect(() => {
    const armed =
      prepared?.text === text && prepared.part === part && armedGlyphs === prepared.glyphs
    targetRef.current = { winter: isWinter, armed }
    motionRef.current?.setTarget(
      isWinter,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      armed,
    )
  }, [isWinter, armedGlyphs, prepared, text, part])

  // Calibrate mounted occurrences once per real layout, retaining native effects through recalibration.
  useLayoutEffect(() => {
    const word = wordRef.current
    if (!word || !prepared || prepared.text !== text || prepared.part !== part) return
    const source = prepared.glyphs
    const characters = Array.from(text)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let resolution: MediaQueryList | undefined
    let context: CanvasRenderingContext2D | null = null
    let motion: SnowMotion | null = null
    let disposed = false
    let measureFrame: number | undefined
    let firstArmFrame: number | undefined
    let secondArmFrame: number | undefined
    let latest: { signature: string; glyph: SnowGlyph }[] = []

    /** Synchronize only a real appearance or preference change with the owned clock. */
    function preferenceChanged() {
      const target = targetRef.current
      motion?.setTarget(target.winter, reduced.matches, target.armed)
    }

    /** Measure the actual text baseline without changing its line box or selection. */
    function measureBaseline(element: HTMLElement): number {
      const marker = document.createElement('span')
      marker.style.cssText =
        'display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline'
      element.append(marker)
      try {
        return marker.getBoundingClientRect().top
      } finally {
        marker.remove()
      }
    }

    /** Stage the whole fragment before replacing profiles so a failed sample retains its last valid state. */
    function measure() {
      measureFrame = undefined
      if (disposed || !word) return
      try {
        const elements = Array.from(word.querySelectorAll<HTMLSpanElement>('[data-snow-glyph]'))
        const next = [...latest]
        const bindings: { element: SVGRectElement; keyframes: readonly SnowMaskKeyframe[] }[] = []
        let changed = !motion
        for (let index = 0; index < source.length; index++) {
          const glyph = source[index]
          if (!glyph.paths.length) continue
          const element = elements[index]
          const svg = element?.querySelector<SVGSVGElement>('svg')
          if (!element || !svg) throw new Error('Snow occurrence is not mounted.')
          const rect = element.getBoundingClientRect()
          const bounds = svg.getBoundingClientRect()
          const fontSize = Number.parseFloat(getComputedStyle(element).fontSize)
          const pixelRatio = window.devicePixelRatio
          const baseline = measureBaseline(element)
          const scale = fontSize / 200
          const signature = JSON.stringify([
            fontSize,
            pixelRatio,
            (rect.left - bounds.left) / scale,
            (baseline - bounds.top) / scale,
            bounds.left * pixelRatio - Math.floor(bounds.left * pixelRatio),
            bounds.top * pixelRatio - Math.floor(bounds.top * pixelRatio),
          ])
          if (next[index]?.signature !== signature) {
            context ??= createRasterContext()
            if (!context) throw new Error('Snow contact raster is unavailable.')
            next[index] = {
              signature,
              glyph: prepareSnowContact(context, glyph, characters[index], {
                fontSize,
                pixelRatio,
                glyphLeft: rect.left,
                baseline,
                svgLeft: bounds.left,
                svgTop: bounds.top,
              }),
            }
            changed = true
          }
          const calibrated = next[index].glyph
          const targets = Array.from(svg.querySelectorAll<SVGRectElement>('[data-snow-support]'))
          let targetIndex = 0
          for (const path of calibrated.paths) {
            bindings.push({ element: targets[targetIndex++], keyframes: path.bodyKeyframes })
            if (path.lip)
              bindings.push({ element: targets[targetIndex++], keyframes: path.lip.keyframes })
          }
          if (targetIndex !== targets.length || bindings.some((binding) => !binding.element))
            throw new Error('Snow profile targets do not match.')
        }
        if (!changed) return
        if (motion) motion.updateKeyframes(bindings.map((binding) => binding.keyframes))
        else {
          for (const binding of bindings)
            binding.element.style.clipPath = binding.keyframes[0].clipPath
          motion = createSnowMotion(bindings)
          motionRef.current = motion
          preferenceChanged()
          firstArmFrame = requestAnimationFrame(() => {
            secondArmFrame = requestAnimationFrame(() => {
              if (!disposed) setArmedGlyphs(source)
            })
          })
        }
        latest = next
      } catch {
        /* Hidden initial masks and last valid live profiles survive unavailable rasterization. */
      }
    }

    /** Coalesce real layout bursts without introducing a continuous measurement loop. */
    function scheduleMeasure() {
      if (!disposed && measureFrame === undefined) measureFrame = requestAnimationFrame(measure)
    }

    /** Re-arm the DPR listener after moving the window between pixel densities. */
    function resolutionChanged() {
      resolution?.removeEventListener('change', resolutionChanged)
      resolution = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      resolution.addEventListener('change', resolutionChanged)
      scheduleMeasure()
    }

    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(word)
    for (const element of word.querySelectorAll('[data-snow-glyph]')) observer.observe(element)
    window.addEventListener('resize', scheduleMeasure)
    reduced.addEventListener('change', preferenceChanged)
    resolutionChanged()
    measure()
    return () => {
      disposed = true
      observer.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      reduced.removeEventListener('change', preferenceChanged)
      resolution?.removeEventListener('change', resolutionChanged)
      if (measureFrame !== undefined) cancelAnimationFrame(measureFrame)
      if (firstArmFrame !== undefined) cancelAnimationFrame(firstArmFrame)
      if (secondArmFrame !== undefined) cancelAnimationFrame(secondArmFrame)
      motion?.dispose()
      if (motionRef.current === motion) motionRef.current = null
    }
  }, [prepared, text, part])

  const glyphs = prepared?.text === text && prepared.part === part ? prepared.glyphs : []
  return (
    <span
      ref={wordRef}
      className={styles.word}
      aria-hidden="true"
      data-snow-word={part}
      data-snow-active={isWinter && armedGlyphs === glyphs}
      data-snow-winter={isWinter}
    >
      {part === 'intro' && <SnowMaterials />}
      {Array.from(text, (ch, index) => {
        const glyph = glyphs[index]
        return (
          <span className={styles.glyph} key={`${index}-${ch}`} data-snow-glyph={ch}>
            {ch}
            {glyph && glyph.paths.length > 0 && (
              <svg
                className={styles.snow}
                aria-hidden="true"
                focusable="false"
                data-testid="home-heading-snow"
                viewBox={`0 0 ${glyph.cw} ${glyph.chPx}`}
                style={{ width: `${glyph.cw / 200}em`, height: `${glyph.chPx / 200}em` }}
              >
                <defs>
                  {glyph.paths.map((path, pathIndex) => (
                    <mask
                      key={pathIndex}
                      id={`${maskId}-${index}-${pathIndex}`}
                      maskUnits="userSpaceOnUse"
                      maskContentUnits="userSpaceOnUse"
                      x={-glyph.padding}
                      y={-glyph.padding}
                      width={glyph.cw + 2 * glyph.padding}
                      height={glyph.chPx + 2 * glyph.padding}
                    >
                      {path.lip && (
                        <defs>
                          <clipPath
                            id={`${maskId}-${index}-${pathIndex}-body`}
                            clipPathUnits="userSpaceOnUse"
                          >
                            <path d={path.lip.bodyD} />
                          </clipPath>
                        </defs>
                      )}
                      <g
                        clipPath={
                          path.lip ? `url(#${maskId}-${index}-${pathIndex}-body)` : undefined
                        }
                      >
                        <rect
                          x="0"
                          y="0"
                          width={glyph.cw}
                          height={glyph.chPx}
                          fill="white"
                          style={{ clipPath: path.bodyKeyframes[0].clipPath }}
                          data-snow-support="true"
                          data-snow-motion={path.motion}
                        />
                      </g>
                      {path.lip && (
                        <rect
                          x="0"
                          y="0"
                          width={glyph.cw}
                          height={glyph.chPx}
                          fill="white"
                          style={{ clipPath: path.lip.keyframes[0].clipPath }}
                          data-snow-support="true"
                          data-snow-lip-support="true"
                        />
                      )}
                    </mask>
                  ))}
                </defs>
                {glyph.paths.map((path, pathIndex) => (
                  <g key={pathIndex} className={styles.patch}>
                    <path
                      d={path.d}
                      mask={`url(#${maskId}-${index}-${pathIndex})`}
                      fill="#ffffff"
                      opacity={0.96}
                      data-snow-pocket={path.pocket}
                      data-snow-corner={path.corner}
                      data-snow-inner-lip={path.material === 'interior' ? ch : undefined}
                      data-snow-hanging={path.material === 'hanging' ? ch : undefined}
                      data-snow-extra-lip={path.hasExtraLip ? ch : undefined}
                    />
                  </g>
                ))}
              </svg>
            )}
          </span>
        )
      })}
    </span>
  )
}

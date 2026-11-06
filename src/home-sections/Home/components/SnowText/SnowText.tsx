'use client'

import { useEffect, useState } from 'react'
import { cancelIdle, requestIdle } from '@/helpers/idleCallback'
import {
  createRasterContext,
  prepareSnowGlyph,
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

/** Keeps text visible while preparing cancellable, fixed-font snow decoration off the render path. */
export function SnowText({ text, part, isWinter }: SnowTextProps) {
  const [prepared, setPrepared] = useState<{
    text: string
    part: SnowPart
    glyphs: SnowGlyph[]
  } | null>(null)

  // A stale font promise or idle callback must never apply geometry to a different locale or theme.
  useEffect(() => {
    if (!isWinter) return
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
  }, [isWinter, text, part])

  if (!isWinter) return <>{text}</>
  const glyphs = prepared?.text === text && prepared.part === part ? prepared.glyphs : []
  return (
    <span className={styles.word} aria-hidden="true" data-snow-word={part}>
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
                {glyph.paths.map((path, pathIndex) => (
                  <path
                    key={pathIndex}
                    d={path.d}
                    fill="#ffffff"
                    opacity={0.96}
                    data-snow-pocket={path.pocket}
                    data-snow-corner={path.corner}
                    data-snow-inner-lip={path.material === 'interior' ? ch : undefined}
                    data-snow-hanging={path.material === 'hanging' ? ch : undefined}
                    data-snow-extra-lip={path.hasExtraLip ? ch : undefined}
                  />
                ))}
              </svg>
            )}
          </span>
        )
      })}
    </span>
  )
}

import styles from './AnimatedGhost.module.css'

import { useCallback, useContext, useEffect, useId, useRef, useState } from 'react'

import {
  type IGhostTickleRun,
  startGhostTickle,
} from '@/layout/Aside/components/AnimatedGhost/ghostTickle'

import { EAppearance } from '@/constants/theme.constants'
import { AppearanceContext } from '@/contexts/appearance'

interface IAnimatedGhostProps {
  /** Rendered width of the ghost in pixels; mirrors the Gravity icon sizing API. */
  width?: number
  /** Rendered height of the ghost in pixels; mirrors the Gravity icon sizing API. */
  height?: number
}

/** Aside mascot that plays a tickle animation on click. */
export const AnimatedGhost = ({ width = 50, height = 50 }: IAnimatedGhostProps) => {
  // Keep lantern sprite and clip references distinct when multiple mascots are mounted.
  const lanternId = useId()
  const { appearance } = useContext(AppearanceContext)
  const [isLanternReady, setIsLanternReady] = useState(false)
  const inertiaRef = useRef<SVGGElement>(null)
  const travelRef = useRef<SVGGElement>(null)
  const depthRef = useRef<SVGGElement>(null)
  const gestureTravelRef = useRef<Animation | null>(null)
  const gestureDepthRef = useRef<Animation | null>(null)
  const hasPresentedRef = useRef(false)
  const isPresent = isLanternReady && appearance === EAppearance.halloween
  const [lanternSource, setLanternSource] = useState('/assets/img/halloween/lantern.avif')
  const [isTickling, setIsTickling] = useState(false)
  const bodyRef = useRef<SVGGElement>(null)
  const eyesRef = useRef<SVGGElement>(null)
  const activeRunRef = useRef<IGhostTickleRun | null>(null)
  const runIdRef = useRef(0)

  // Probe after hydration because an SVG image can fail before React attaches event handlers.
  useEffect(() => {
    let isActive = true
    const image = new Image()
    image.src = '/assets/img/halloween/lantern.avif'
    image
      .decode()
      .catch(async () => {
        if (!isActive) return
        setLanternSource('/assets/img/halloween/lantern.webp')
        const fallback = new Image()
        fallback.src = '/assets/img/halloween/lantern.webp'
        await fallback.decode().catch(() => undefined)
      })
      .then(() => {
        if (isActive) setIsLanternReady(true)
      })
    return () => {
      isActive = false
    }
  }, [])

  // A shared reversible timeline carries the lantern around the body before the rear return.
  useEffect(() => {
    const travel = travelRef.current
    const depth = depthRef.current
    if (!travel || !depth) return
    const movement = travel.animate(
      [
        { transform: 'translate(0, 0)', offset: 0, easing: 'ease-in-out' },
        { transform: 'translate(4px, -1.2px)', offset: 0.25, easing: 'ease-in-out' },
        { transform: 'translate(7px, -2px)', offset: 0.42, easing: 'ease-in-out' },
        { transform: 'translate(7px, -2.6px)', offset: 0.55, easing: 'ease-in-out' },
        { transform: 'translate(2px, -3px)', offset: 0.72, easing: 'ease-in-out' },
        { transform: 'translate(-5px, -4.2px)', offset: 1 },
      ],
      { duration: 1200, easing: 'linear', fill: 'both' },
    )
    const occlusion = depth.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: 0.42 },
        { opacity: 1, offset: 0.46 },
        { opacity: 1, offset: 1 },
      ],
      { duration: 1200, easing: 'linear', fill: 'both' },
    )
    movement.id = 'lantern-gesture-travel'
    occlusion.id = 'lantern-gesture-depth'
    for (const animation of [movement, occlusion]) {
      animation.pause()
      animation.currentTime = 1200
    }
    gestureTravelRef.current = movement
    gestureDepthRef.current = occlusion
    return () => {
      movement.cancel()
      occlusion.cancel()
      gestureTravelRef.current = null
      gestureDepthRef.current = null
    }
  }, [])

  // Reverse both owned tracks at their shared progress, or settle immediately for reduced motion.
  useEffect(() => {
    const movement = gestureTravelRef.current
    const depth = gestureDepthRef.current
    if (!movement || !depth) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const endpoint = isPresent ? 0 : 1200
    // A live preference change settles without replaying the gesture when motion returns.
    const settleReducedMotion = () => {
      if (!preference.matches) return
      for (const animation of [movement, depth]) {
        animation.pause()
        animation.currentTime = endpoint
      }
    }
    if (preference.matches) {
      settleReducedMotion()
    } else if (Number(movement.currentTime) !== endpoint) {
      const sharedTime = movement.currentTime
      for (const animation of [movement, depth]) {
        animation.currentTime = sharedTime
        animation.playbackRate = isPresent ? -1 : 1
        animation.play()
      }
    } else {
      for (const animation of [movement, depth]) {
        animation.pause()
        animation.currentTime = endpoint
      }
    }
    preference.addEventListener('change', settleReducedMotion)
    return () => preference.removeEventListener('change', settleReducedMotion)
  }, [isPresent])

  // Keep settling inertia independent of travel and preserve its pose on rapid reversals.
  useEffect(() => {
    const node = inertiaRef.current
    if (!node) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animation: Animation | undefined
    if (isPresent || hasPresentedRef.current) {
      hasPresentedRef.current ||= isPresent
      if (!preference.matches) {
        const angles = isPresent ? [-18, 11, -6, 2, 0] : [12, -17, 7, -2, 0]
        const offsets = isPresent ? [0.22, 0.47, 0.68, 0.85, 1] : [0.2, 0.45, 0.68, 0.85, 1]
        animation = node.animate(
          [
            { transform: getComputedStyle(node).transform, offset: 0 },
            ...angles.map((angle, index) => ({
              transform: `rotate(${angle}deg)`,
              offset: offsets[index],
            })),
          ],
          {
            duration: isPresent ? 1500 : 650,
            easing: isPresent ? 'linear' : 'ease-out',
            fill: 'none',
          },
        )
        animation.id = isPresent ? 'lantern-enter' : 'lantern-exit'
        animation.onfinish = () => {
          node.style.transform = ''
        }
      } else {
        node.style.transform = ''
      }
    }
    // A live motion preference change settles the current pose immediately.
    const handleMotionChange = () => {
      if (preference.matches) {
        if (animation) animation.onfinish = null
        animation?.cancel()
        node.style.transform = ''
      }
    }
    preference.addEventListener('change', handleMotionChange)
    return () => {
      node.style.transform = getComputedStyle(node).transform
      if (animation) animation.onfinish = null
      animation?.cancel()
      preference.removeEventListener('change', handleMotionChange)
    }
  }, [isPresent])

  // Restart the interaction while preventing an old completion from ending the new run.
  const handleTickle = useCallback(() => {
    const body = bodyRef.current
    const eyes = eyesRef.current

    if (!body || !eyes) {
      return
    }

    activeRunRef.current?.cancel()
    const runId = ++runIdRef.current

    setIsTickling(true)
    activeRunRef.current = startGhostTickle(
      { body, eyes },
      {
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        onFinish: () => {
          if (runIdRef.current === runId) {
            activeRunRef.current = null
            setIsTickling(false)
          }
        },
      },
    )
  }, [])

  // Cancel the active interaction when this mascot leaves the page.
  useEffect(
    () => () => {
      runIdRef.current += 1
      activeRunRef.current?.cancel()
    },
    [],
  )

  return (
    <button
      type="button"
      className={styles.trigger}
      aria-label="Пощекотать привидение"
      data-testid="aside-ghost-trigger"
      data-tickling={isTickling}
      onClick={handleTickle}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        data-testid="aside-ghost"
        className={styles.ghost}
      >
        <defs>
          <image
            key={lanternSource}
            id={`${lanternId}-image`}
            href={lanternSource}
            width="1122"
            height="1402"
            preserveAspectRatio="xMidYMid meet"
          />
          <mask
            id={`${lanternId}-occlusion`}
            className={styles.lanternMask}
            maskUnits="userSpaceOnUse"
            x="-12"
            y="-12"
            width="48"
            height="48"
          >
            <rect x="-12" y="-12" width="48" height="48" fill="white" />
            <g ref={depthRef} data-testid="aside-ghost-lantern-depth" opacity="1">
              <g className={styles.sway}>
                <g className={styles.breathe}>
                  <path
                    fill="black"
                    d="M10.225 14.407l.686-.859h.001l.144-.18.618-.772a.255.255 0 0 1 .402.006l.593.79.139.185v.001l.392.522a1 1 0 0 0 1.8-.6V8A7 7 0 1 0 1 8v5.399a1.101 1.101 0 0 0 1.806.846l2.61-2.175a.3.3 0 0 1 .424.038l1.936 2.323a1.58 1.58 0 0 0 2.449-.024Z"
                  />
                </g>
              </g>
            </g>
          </mask>
          <clipPath id={`${lanternId}-glass`} clipPathUnits="userSpaceOnUse">
            <polygon points="370,610 445,575 560,560 690,578 778,610 778,1115 370,1115" />
          </clipPath>
          <radialGradient id={`${lanternId}-halo`}>
            <stop offset="0%" stopColor="#ffb94f" />
            <stop offset="100%" stopColor="#ffb94f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g ref={bodyRef} className={styles.tickleBody} data-testid="aside-ghost-body">
          <g className={styles.sway} data-idle-layer="sway">
            <g className={styles.breathe}>
              <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M13.277 11.702 13.5 12V8a5.5 5.5 0 1 0-11 0v4.547l1.956-1.63a1.8 1.8 0 0 1 2.537.231l1.935 2.323a.08.08 0 0 0 .125-.001l1.45-1.811a1.755 1.755 0 0 1 2.774.043m-3.052 2.705.686-.859h.001l.144-.18.618-.772a.255.255 0 0 1 .402.006l.593.79.139.185v.001l.392.522a1 1 0 0 0 1.8-.6V8A7 7 0 1 0 1 8v5.399a1.101 1.101 0 0 0 1.806.846l2.61-2.175a.3.3 0 0 1 .424.038l1.936 2.323a1.58 1.58 0 0 0 2.449-.024"
              />

              <g className={styles.eyeLook}>
                <g ref={eyesRef} className={styles.eyeBlink}>
                  <circle cx="7" cy="7" r="0.7" fill="currentColor" />
                  <circle cx="11" cy="7" r="0.7" fill="currentColor" />
                </g>
              </g>
            </g>
          </g>

          <g mask={`url(#${lanternId}-occlusion)`}>
            <g
              ref={travelRef}
              className={styles.lanternTravel}
              data-testid="aside-ghost-lantern-travel"
              data-present={isPresent}
            >
              {/* Swing inside the positioning group so the handle stays attached to the hand. */}
              <g
                className={styles.lantern}
                data-testid="aside-ghost-lantern"
                aria-hidden="true"
                transform="translate(1.2 1.1) scale(0.9)"
              >
                <g
                  ref={inertiaRef}
                  className={styles.lanternInertia}
                  data-testid="aside-ghost-lantern-inertia"
                >
                  <g className={styles.lanternSwing} data-testid="aside-ghost-lantern-swing">
                    <circle
                      className={styles.lanternHalo}
                      cx="12.15"
                      cy="12.4"
                      r="3.6"
                      fill={`url(#${lanternId}-halo)`}
                      opacity="0.24"
                    />
                    <g transform="translate(8.006 5.8784) scale(0.007387)">
                      <use href={`#${lanternId}-image`} filter="brightness(1.1)" />
                      <g
                        className={styles.lanternLight}
                        data-testid="aside-ghost-lantern-light"
                        clipPath={`url(#${lanternId}-glass)`}
                        pointerEvents="none"
                      >
                        <use href={`#${lanternId}-image`} filter="brightness(1.3)" />
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </button>
  )
}

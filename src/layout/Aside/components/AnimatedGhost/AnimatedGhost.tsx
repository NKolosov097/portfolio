import styles from './AnimatedGhost.module.css'

import { useCallback, useState } from 'react'

interface IAnimatedGhostProps {
  /** Rendered width of the ghost in pixels; mirrors the Gravity icon sizing API. */
  width?: number
  /** Rendered height of the ghost in pixels; mirrors the Gravity icon sizing API. */
  height?: number
}

export const AnimatedGhost = ({ width = 50, height = 50 }: IAnimatedGhostProps) => {
  const [tickleRun, setTickleRun] = useState<number | null>(null)

  const handleTickle = useCallback(() => {
    setTickleRun((currentRun) => (currentRun ?? 0) + 1)
  }, [])

  const handleTickleEnd = useCallback(() => {
    setTickleRun(null)
  }, [])

  return (
    <button
      type="button"
      className={styles.trigger}
      aria-label="Пощекотать привидение"
      data-testid="aside-ghost-trigger"
      data-tickling={tickleRun !== null}
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
        <g
          key={tickleRun ?? 'idle'}
          className={tickleRun !== null ? styles.tickleBody : undefined}
          onAnimationEnd={handleTickleEnd}
        >
          <g className={styles.sway}>
            <g className={styles.breathe}>
              <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M13.277 11.702 13.5 12V8a5.5 5.5 0 1 0-11 0v4.547l1.956-1.63a1.8 1.8 0 0 1 2.537.231l1.935 2.323a.08.08 0 0 0 .125-.001l1.45-1.811a1.755 1.755 0 0 1 2.774.043m-3.052 2.705.686-.859h.001l.144-.18.618-.772a.255.255 0 0 1 .402.006l.593.79.139.185v.001l.392.522a1 1 0 0 0 1.8-.6V8A7 7 0 1 0 1 8v5.399a1.101 1.101 0 0 0 1.806.846l2.61-2.175a.3.3 0 0 1 .424.038l1.936 2.323a1.58 1.58 0 0 0 2.449-.024"
              />

              <g className={styles.eyeLook}>
                <g
                  className={`${styles.eyeBlink} ${tickleRun !== null ? styles.eyeGiggle : ''}`}
                >
                  <circle cx="7" cy="7" r="0.7" fill="currentColor" />
                  <circle cx="11" cy="7" r="0.7" fill="currentColor" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </button>
  )
}

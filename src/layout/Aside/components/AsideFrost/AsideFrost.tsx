import styles from './AsideFrost.module.css'

import { useEffect, useId, useState } from 'react'

interface AsideFrostProps {
  isMobile?: boolean
}

/** Layers original shallow ice feathers over the real aside without intercepting interaction. */
export const AsideFrost = ({ isMobile = false }: AsideFrostProps) => {
  const id = useId()
  const [isReady, setIsReady] = useState(false)

  // Let the initial frost state paint before starting its entrance on each mount.
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setIsReady(true))
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <svg
      className={`${styles.frost} ${styles.inward}${isMobile ? ` ${styles.mobile}` : ''}${isReady ? ` ${styles.ready}` : ''}`}
      data-testid={isMobile ? 'aside-frost-mobile' : 'aside-frost-inward'}
      viewBox="0 0 270 700"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Give the decorative frost a softer contour than the Card beneath it. */}
        <clipPath id={`${id}-aside-frost-contour`}>
          <rect width="270" height="700" rx={isMobile ? 0 : 22} />
        </clipPath>
        {/* Grow inward with a perimeter stroke while the outer clip discards its outward half. */}
        <mask
          id={`${id}-aside-frost-growth-mask`}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="270"
          height="700"
        >
          <rect
            className={styles.growth}
            data-testid="aside-frost-growth"
            width="270"
            height="700"
            rx={isMobile ? 0 : 22}
            fill="none"
            stroke="white"
          />
        </mask>
        {/* Soften the perimeter mask without blurring the fine feather branches. */}
        <filter
          id={`${id}-aside-frost-edge-softness`}
          filterUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="270"
          height="700"
        >
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <mask
          id={`${id}-aside-frost-edge-fade`}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="270"
          height="700"
        >
          <rect
            x=".8"
            y=".8"
            width="268.4"
            height="698.4"
            rx={isMobile ? 0 : 21.2}
            fill="white"
            filter={`url(#${id}-aside-frost-edge-softness)`}
          />
        </mask>
        <linearGradient
          id={`${id}-aside-frost-feather-fade`}
          x1="0"
          x2="38"
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#eefaff" stopOpacity=".6" />
          <stop offset=".55" stopColor="#eefaff" stopOpacity=".46" />
          <stop offset=".83" stopColor="#bfe6f5" stopOpacity=".28" />
          <stop offset="1" stopColor="#bfe6f5" stopOpacity="0" />
        </linearGradient>
        <g
          id={`${id}-aside-frost-feather-a`}
          fill="none"
          stroke={`url(#${id}-aside-frost-feather-fade)`}
          strokeLinecap="round"
        >
          <path d="M0 0Q7 2 14 2.7" strokeWidth=".8" />
          <path d="M14 2.7Q22 3.8 28 3.4" strokeWidth=".55" />
          <path d="M28 3.4Q33 3.2 37 2.4" strokeWidth=".3" />
          <path
            d="M3 1Q6 4 10 7.8M5 1.5Q8-.7 12-3.8M7 1.9Q11 5 15 9M9 2.2Q12-.5 17-3M12 2.5Q15 5.7 19 9.4M14 2.7Q17 .2 22-2.8M17 3.1Q20 6 24 8.5M19 3.3Q22 1 26-1.8M22 3.5Q25 6.1 28 7.5M24 3.5Q27 1.2 30-.6M27 3.4Q29 5.2 32 6.3M29 3.3Q31 1.4 34 .1M31 3Q33 4.5 35 5M33 2.9Q35 1.5 36 .8M35 2.6Q36 3.4 37 3.8M36 2.5 38 1.5"
            strokeWidth=".45"
          />
          <path
            d="M6 4Q8 4.1 10 3.5M8 6Q8.1 7.7 9 9M8-.7 8-2.6M10-2.3 12-2.2M11 5Q13 5.4 15 4.8M13 7Q13.2 8.7 14 10M13-.4 14-2.5M15-1.6 17-1.2M16 6.2Q18 6.2 20 5.7M18 8.3 19 10M18 .2 19-1.8M20-1.1 22-1M21 6.2 24 5.8M23 7.8 24 9M23 .9 24-.8M26 5.7 28 5.2M28 1 29-.5M30 5.3 32 4.8"
            strokeWidth=".28"
          />
        </g>
        <g
          id={`${id}-aside-frost-feather-b`}
          fill="none"
          stroke={`url(#${id}-aside-frost-feather-fade)`}
          strokeLinecap="round"
        >
          <path d="M0 0Q5 .4 11 1.9" strokeWidth=".8" />
          <path d="M11 1.9Q18 4 24 4.2" strokeWidth=".55" />
          <path d="M24 4.2Q29 4.7 33 4" strokeWidth=".3" />
          <path
            d="M2 .3Q5 3.3 8 6.8M4 .7Q7-1 10-4.2M6 1.1Q9 4.7 12 8.3M8 1.4Q11-1 15-3.6M10 1.7Q14 5.9 17 9.3M12 2.2Q15 .1 19-2.2M15 2.9Q18 6.6 21 9M17 3.4Q21 1.8 24-.5M20 3.8Q23 6.6 26 8.4M22 4.1Q25 2.6 28 .6M25 4.3Q28 6.7 30 7.4M27 4.3Q30 2.8 32 1.8M30 4.2 33 5.9M31 4.1 34 2.8"
            strokeWidth=".4"
          />
          <path
            d="M4.5 3.1 7 3M6 4.8 6.5 7M7.5-1.5 8-3.3M9-3 11-2.8M9 4.7 11.7 4.6M10.5 6.5 11 9M11-.7 12-2.8M13-2.2 15-2M13.5 5.5 16 5.5M15.5 7.5 16 10M16 .1 17-1.5M18-1.3 20-1M18 6.6 20.6 6.3M20 8 21 10M21 1.5 23 1.6M23 6.6 25 6.4M26 2.3 27 .8M28 6 30 5.7"
            strokeWidth=".25"
          />
        </g>
        <g
          id={`${id}-aside-frost-feather-c`}
          fill="none"
          stroke={`url(#${id}-aside-frost-feather-fade)`}
          strokeLinecap="round"
        >
          <path d="M0 0Q6 2.4 12 3.3" strokeWidth=".8" />
          <path d="M12 3.3Q19 4.1 25 2.8" strokeWidth=".55" />
          <path d="M25 2.8Q29 2 32 1.1" strokeWidth=".3" />
          <path
            d="M2 .7Q5 4.1 8 7.1M4 1.4Q7-.7 10-3.5M6 2Q9 5.7 13 9M8 2.6Q12 .5 15-2.6M10 3Q14 6.7 17 9.5M12.5 3.4Q16 1 20-1.5M15 3.6Q18 6.2 22 8.6M17 3.6Q21 1.3 24-1M20 3.5Q23 5.7 26 7.1M22 3.3Q25 1.2 28-.7M25 2.8Q28 4.7 30 5.2M27 2.4 31 .2M29 1.9 32 3.5M30 1.6 33 .1"
            strokeWidth=".45"
          />
          <path
            d="M4.8 3.9 7.2 3.9M6.3 5.5 7 8M7-1 7.7-3M8.5-2.2 10.8-2M9 5.6 12 5.6M11 7.6 12 10M11.4 .3 12-1.6M13-1 15.5-.8M14 6.6 17 6.3M16 8.5 17 10M16.5 .8 17.3-1M18.5-.5 21-.3M18.5 6.1 21 5.7M21 1.2 22-.6M23 5.7 25.5 5M26 1 27-.9M28 4.5 30 4"
            strokeWidth=".3"
          />
        </g>
      </defs>
      <g mask={`url(#${id}-aside-frost-growth-mask)`}>
        <g clipPath={`url(#${id}-aside-frost-contour)`} mask={`url(#${id}-aside-frost-edge-fade)`}>
          <g opacity=".72">
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(9 0) rotate(3) scale(.9)"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(52 0) scale(-.75 .75)"
            />
            <use href={`#${id}-aside-frost-feather-b`} transform="translate(59 0) rotate(5)" />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(118 0) scale(-.92 .92)"
              opacity=".7"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(123 0) rotate(2) scale(.8)"
            />
            <use href={`#${id}-aside-frost-feather-b`} transform="translate(176 0) scale(-1 1)" />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(182 0) rotate(6) scale(.76)"
              opacity=".8"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(234 0) scale(-1.05 1.05)"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(238 0) rotate(4) scale(.8)"
            />
          </g>
          <g transform="translate(270 700) scale(-1 -1)" opacity=".68">
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(11 0) rotate(5) scale(.86)"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(58 0) scale(-.82 .82)"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(65 0) rotate(2) scale(.88)"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(116 0) scale(-.78 .78)"
              opacity=".8"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(121 0) rotate(4) scale(.93)"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(180 0) scale(-1.1 1.1)"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(184 0) rotate(6) scale(.83)"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(241 0) scale(-.9 .9)"
              opacity=".75"
            />
            <use href={`#${id}-aside-frost-feather-b`} transform="translate(245 0) scale(.7)" />
          </g>
          <g transform="rotate(90) scale(1 -1)" opacity=".7">
            <use href={`#${id}-aside-frost-feather-b`} transform="translate(15 0) rotate(3)" />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(72 0) scale(-.88 .88)"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(83 0) rotate(4) scale(1.05)"
            />
            <use href={`#${id}-aside-frost-feather-a`} transform="translate(140 0) scale(-.8 .8)" />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(153 0) rotate(2) scale(.9)"
              opacity=".75"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(212 0) scale(-.95 .95)"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(225 0) rotate(5) scale(.82)"
            />
            <use href={`#${id}-aside-frost-feather-b`} transform="translate(279 0) scale(-.8 .8)" />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(292 0) rotate(3) scale(.95)"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(351 0) scale(-.86 .86)"
              opacity=".75"
            />
            <use href={`#${id}-aside-frost-feather-b`} transform="translate(362 0) rotate(4)" />
            <use href={`#${id}-aside-frost-feather-c`} transform="translate(417 0) scale(-.8 .8)" />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(430 0) rotate(2) scale(.9)"
            />
            <use href={`#${id}-aside-frost-feather-b`} transform="translate(489 0) scale(-1 1)" />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(500 0) rotate(5) scale(.85)"
              opacity=".8"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(560 0) scale(-.95 .95)"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(572 0) rotate(3) scale(.88)"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(626 0) scale(-.85 .85)"
            />
            <use href={`#${id}-aside-frost-feather-a`} transform="translate(636 0) rotate(4)" />
            <use href={`#${id}-aside-frost-feather-b`} transform="translate(686 0) scale(-.9 .9)" />
          </g>
          <g transform="translate(270 700) rotate(-90) scale(1 -1)" opacity=".66">
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(12 0) rotate(4) scale(.95)"
            />
            <use href={`#${id}-aside-frost-feather-b`} transform="translate(67 0) scale(-.8 .8)" />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(77 0) rotate(2) scale(.9)"
            />
            <use href={`#${id}-aside-frost-feather-c`} transform="translate(135 0) scale(-1 1)" />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(147 0) rotate(5) scale(.85)"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(207 0) scale(-.9 .9)"
              opacity=".8"
            />
            <use href={`#${id}-aside-frost-feather-c`} transform="translate(219 0) rotate(3)" />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(275 0) scale(-.78 .78)"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(286 0) rotate(4) scale(.86)"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(345 0) scale(-1.05 1.05)"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(359 0) rotate(2) scale(.95)"
              opacity=".75"
            />
            <use href={`#${id}-aside-frost-feather-a`} transform="translate(416 0) scale(-.8 .8)" />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(428 0) rotate(5) scale(.87)"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(485 0) scale(-.92 .92)"
            />
            <use href={`#${id}-aside-frost-feather-a`} transform="translate(498 0) rotate(3)" />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(554 0) scale(-.84 .84)"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(566 0) rotate(4) scale(.9)"
              opacity=".8"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(625 0) scale(-.95 .95)"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(637 0) rotate(2) scale(1.05)"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(687 0) scale(-.84 .84)"
            />
          </g>
          <g opacity=".84">
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(2.4 2.4) rotate(7) scale(.95)"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(2.4 2.4) rotate(16) scale(.8)"
              opacity=".6"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(2.4 2.4) rotate(76) scale(1 -.9)"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(2.4 2.4) rotate(89) scale(.9 -1)"
            />
          </g>
          <g transform="translate(270 0) scale(-1 1)" opacity=".78">
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(2.4 2.4) rotate(4) scale(1.05)"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(2.4 2.4) rotate(17) scale(.85)"
              opacity=".65"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(2.4 2.4) rotate(80) scale(.92 -1)"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(2.4 2.4) rotate(90) scale(.85 -.85)"
            />
          </g>
          <g transform="translate(0 700) scale(1 -1)" opacity=".8">
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(2.4 2.4) rotate(3) scale(1.05)"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(2.4 2.4) rotate(16) scale(.9)"
              opacity=".6"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(2.4 2.4) rotate(77) scale(1 -.95)"
            />
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(2.4 2.4) rotate(90) scale(.85 -.9)"
            />
          </g>
          <g transform="translate(270 700) scale(-1 -1)" opacity=".82">
            <use
              href={`#${id}-aside-frost-feather-a`}
              transform="translate(2.4 2.4) rotate(5) scale(1.03)"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(2.4 2.4) rotate(18) scale(.8)"
              opacity=".65"
            />
            <use
              href={`#${id}-aside-frost-feather-b`}
              transform="translate(2.4 2.4) rotate(74) scale(.95 -.95)"
            />
            <use
              href={`#${id}-aside-frost-feather-c`}
              transform="translate(2.4 2.4) rotate(89) scale(.95 -.9)"
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

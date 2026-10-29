import styles from './HalloweenArt.module.css'

import { useEffect, useId, useState, type CSSProperties } from 'react'

const ASSET_BASE = '/assets/img/halloween/'

/** Photographic assets share the scene's guarded decode and reveal lifecycle. */
const ASSET_FILES = {
  ground: 'layer-ground.webp',
  groundGlow: 'layer-ground-glow.webp',
  pumpkin: 'layer-pumpkin.avif',
  watchingHead: 'watching-eyes.avif',
} as const

type AssetKey = keyof typeof ASSET_FILES

/** Fixed independent emissions give immediate coverage without per-frame state. */
const SPARKS = [
  [820, 690, -24, 10, -2],
  [855, 715, -35, 12, -7],
  [890, 670, -22, 9, -5],
  [930, 700, -30, 13, -10],
  [970, 720, -18, 11, -4],
  [1015, 685, -12, 8, -6],
  [1060, 710, 10, 12, -9],
  [1100, 695, 18, 10, -6],
  [1140, 720, 22, 14, -11],
  [1180, 675, 28, 9, -3],
  [1220, 705, 35, 11, -8],
  [1260, 690, 25, 13, -5],
  [1290, 715, 32, 10, -8],
  [1330, 675, 18, 12, -4],
  [840, 700, -28, 11, -6],
  [950, 690, -20, 12, -9],
  [1160, 705, 24, 10, -4],
  [1310, 695, 30, 13, -8],
] as const

const SCENE_WIDTH = 1536
const SCENE_HEIGHT = 1024

/** Photoreal Halloween scenery with candlelight and a quiet watcher emerging from the dark. */
export const HalloweenArt = () => {
  const uid = useId()
  const [isReady, setIsReady] = useState(false)
  const [fallbackSources, setFallbackSources] = useState<Partial<Record<AssetKey, string>>>({})

  // Scopes each sprite's shared <defs> id to this component instance.
  const imageId = (key: AssetKey) => `${uid}-${key}`

  // Wait for every decode attempt so a failed sprite cannot block the staged reveal.
  useEffect(() => {
    let isActive = true
    Promise.all(
      (Object.entries(ASSET_FILES) as [AssetKey, string][]).map(([key, file]) => {
        const image = new window.Image()
        image.src = `${ASSET_BASE}${file}`
        return image.decode().catch(async () => {
          if (!file.endsWith('.avif')) return
          const fallbackSource = `${ASSET_BASE}${file.replace(/\.avif$/, '.webp')}`
          const fallback = new window.Image()
          fallback.src = fallbackSource
          await fallback.decode().catch(() => undefined)
          if (isActive) setFallbackSources((sources) => ({ ...sources, [key]: fallbackSource }))
        })
      }),
    ).then(() => {
      if (isActive) setIsReady(true)
    })
    return () => {
      isActive = false
    }
  }, [])

  return (
    <svg
      className={styles.scene}
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      data-testid="halloween-scene"
      data-ready={isReady ? 'true' : 'false'}
    >
      <defs>
        {(Object.entries(ASSET_FILES) as [AssetKey, string][]).map(([key, file]) => (
          <image
            key={fallbackSources[key] ?? key}
            id={imageId(key)}
            data-asset={key}
            href={fallbackSources[key] ?? `${ASSET_BASE}${file}`}
            x={0}
            y={0}
            width={key === 'watchingHead' ? 340 : key === 'pumpkin' ? 1254 : SCENE_WIDTH}
            height={key === 'watchingHead' ? 170 : key === 'pumpkin' ? 1254 : SCENE_HEIGHT}
          />
        ))}
        <radialGradient id={`${uid}-head-shadow`} cx="50%" cy="34%" r="48%">
          <stop offset="0%" stopColor="white" />
          <stop offset="35%" stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask
          id={`${uid}-head-mask`}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={340}
          height={170}
        >
          <rect width={340} height={170} fill={`url(#${uid}-head-shadow)`} />
        </mask>
        <clipPath id={`${uid}-openings`} clipPathUnits="userSpaceOnUse">
          <polygon points="351,597 486,718 368,735 336,725 323,705 319,675 323,640 334,613" />
          <polygon points="666,726 868,609 879,643 880,678 865,714 844,736 816,746 747,742" />
          <polygon points="541,817 568,763 601,820" />
          <polygon points="260,820 284,828 310,870 330,890 347,887 370,864 418,878 444,914 466,940 488,937 513,900 553,902 615,900 643,937 655,949 668,944 712,891 750,886 776,877 796,909 817,907 854,865 913,840 947,819 925,866 897,901 866,927 816,951 802,968 782,981 754,959 708,980 695,1001 656,1010 609,1014 566,1011 529,1005 493,992 464,978 418,952 389,960 371,978 339,951 306,925 281,893" />
        </clipPath>
      </defs>

      {/* 1. Ground, revealed first. */}
      <g className={styles.ground} data-testid="halloween-ground">
        <use href={`#${imageId('ground')}`} />
      </g>

      <g transform="translate(400 300)">
        <g mask={`url(#${uid}-head-mask)`} data-testid="halloween-watching-shadow">
          <g className={styles.watchingHead} data-testid="halloween-watching-head">
            <use href={`#${imageId('watchingHead')}`} />
          </g>
        </g>
      </g>

      {/* 1b. Steady ground glow lighting up alongside ignition; no pulsing. */}
      <g className={styles.groundLight} data-testid="halloween-ground-light">
        <g transform="translate(410 266) scale(0.7)">
          <use href={`#${imageId('groundGlow')}`} />
        </g>
      </g>

      {/* Rising sparks sit behind the steady pumpkin and reveal alongside ignition. */}
      <g className={styles.sparks} data-testid="halloween-sparks">
        {SPARKS.map(([x, y, drift, duration, delay], index) => {
          const sparkStyle: CSSProperties & { '--spark-drift': string } = {
            '--spark-drift': `${drift}px`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }
          return (
            <g key={x} className={styles.spark} data-testid="halloween-spark" style={sparkStyle}>
              <ellipse
                cx={x}
                cy={y}
                rx={(index + 1) % 3 === 0 ? 1.7 : 1.3}
                ry={(index + 1) % 3 === 0 ? 4 : 3}
                fill={index % 2 === 0 ? '#ffd184' : '#ff9b35'}
              />
            </g>
          )
        })}
      </g>

      {/* 2. Steady pumpkin shell, revealed second. */}
      <g className={styles.pumpkinUnlit} data-testid="halloween-pumpkin">
        <g transform="translate(250 110) scale(0.76)">
          <g transform="translate(710 179.63) scale(0.51)">
            <use href={`#${imageId('pumpkin')}`} filter="brightness(0.72)" />
          </g>
        </g>
      </g>

      {/* 3. Only the carved openings flicker over the steady shell. */}
      <g className={styles.ignition} data-testid="halloween-ignition">
        <g transform="translate(250 110) scale(0.76)">
          <g transform="translate(710 179.63) scale(0.51)">
            <g clipPath={`url(#${uid}-openings)`}>
              <g className={styles.candleLight} data-testid="halloween-candle-light">
                <use href={`#${imageId('pumpkin')}`} filter="brightness(1.12)" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}

export default HalloweenArt

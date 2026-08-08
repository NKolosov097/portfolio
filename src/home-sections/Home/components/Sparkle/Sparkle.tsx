import styles from './Sparkle.module.css'

import { SPARKLE_GLYPH_PATH, SPARKLE_GLYPH_VIEWBOX } from '@/constants/home.constants'

export const Sparkle = () => {
  return (
    <svg
      viewBox={`0 0 ${SPARKLE_GLYPH_VIEWBOX} ${SPARKLE_GLYPH_VIEWBOX}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-testid="home-sparkle"
      className={styles.sparkle}
    >
      <path fill="currentColor" d={SPARKLE_GLYPH_PATH} />
    </svg>
  )
}

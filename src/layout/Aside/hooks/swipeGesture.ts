/** Minimum total finger movement, in px, before a swipe's axis is decided. */
export const SWIPE_AXIS_LOCK_THRESHOLD_PX = 8

/** Fraction of the panel's width a leftward swipe must cross to count as a close. */
export const SWIPE_CLOSE_DISTANCE_RATIO = 0.25

/** Minimum leftward speed, in px/ms, that closes the panel even under the distance ratio. */
export const SWIPE_CLOSE_VELOCITY_PX_PER_MS = 0.5

/** Which axis a swipe has locked onto, once movement is large enough to tell. */
export type TSwipeAxis = 'horizontal' | 'vertical'

export interface ISwipeDelta {
  /** Horizontal movement since the gesture started, in px (negative = left). */
  dx: number
  /** Vertical movement since the gesture started, in px (negative = up). */
  dy: number
}

/**
 * Decides which axis a swipe belongs to from the movement seen so far.
 * Returns `null` while the movement is still too small to tell (axis stays unlocked).
 */
export const resolveSwipeAxis = ({ dx, dy }: ISwipeDelta): TSwipeAxis | null => {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_AXIS_LOCK_THRESHOLD_PX) {
    return null
  }

  return Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
}

export interface IShouldCloseOnSwipeEndParams {
  /** Horizontal movement over the whole gesture, in px (negative = left). */
  dx: number
  /** Wall-clock duration of the gesture, in ms. */
  durationMs: number
  /** Width of the dragged panel, in px — the distance threshold scales off this. */
  panelWidthPx: number
}

/** Decides whether a finished horizontal swipe should close the panel. Rightward drags never close it. */
export const shouldCloseOnSwipeEnd = ({
  dx,
  durationMs,
  panelWidthPx,
}: IShouldCloseOnSwipeEndParams): boolean => {
  const leftwardDistance = Math.max(0, -dx)
  const velocity = durationMs > 0 ? leftwardDistance / durationMs : 0

  return (
    leftwardDistance > panelWidthPx * SWIPE_CLOSE_DISTANCE_RATIO ||
    velocity > SWIPE_CLOSE_VELOCITY_PX_PER_MS
  )
}

/** Clamps a drag offset so the panel can't be dragged past its resting position. */
export const clampSwipeTranslateX = (dx: number): number => Math.min(0, dx)

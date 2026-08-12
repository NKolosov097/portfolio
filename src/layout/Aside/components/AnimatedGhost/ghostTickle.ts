export interface IGhostTickleElements {
  body: SVGGElement
  eyes: SVGGElement
  leftCreases: SVGGElement
  rightCreases: SVGGElement
}

export interface IStartGhostTickleOptions {
  prefersReducedMotion: boolean
  onFinish: () => void
}

export interface IGhostTickleRun {
  body: Animation | null
  cancel: () => void
}

const TICKLE_DURATION_MS = 1_800

const TICKLE_TIMING: KeyframeAnimationOptions = {
  duration: TICKLE_DURATION_MS,
  easing: 'cubic-bezier(.22,.75,.28,1)',
  fill: 'none',
}

const BODY_KEYFRAMES: Keyframe[] = [
  { offset: 0, transform: 'scaleX(1) scaleY(1)' },
  { offset: 0.16, transform: 'scaleX(0.84) scaleY(1.035)' },
  { offset: 0.3, transform: 'scaleX(1.015) scaleY(0.995)' },
  { offset: 0.45, transform: 'scaleX(0.9) scaleY(1.022)' },
  { offset: 0.58, transform: 'scaleX(1.008) scaleY(0.998)' },
  { offset: 0.72, transform: 'scaleX(0.95) scaleY(1.012)' },
  { offset: 0.84, transform: 'scaleX(1.004) scaleY(0.999)' },
  { offset: 1, transform: 'scaleX(1) scaleY(1)' },
]

const EYE_KEYFRAMES: Keyframe[] = [
  { offset: 0, transform: 'scaleY(1)' },
  { offset: 0.15, transform: 'scaleY(0.2)' },
  { offset: 0.28, transform: 'scaleY(1)' },
  { offset: 0.44, transform: 'scaleY(0.2)' },
  { offset: 0.57, transform: 'scaleY(1)' },
  { offset: 0.71, transform: 'scaleY(0.2)' },
  { offset: 0.84, transform: 'scaleY(1)' },
  { offset: 1, transform: 'scaleY(1)' },
]

const createCreaseKeyframes = (direction: -1 | 1): Keyframe[] => [
  { offset: 0, opacity: 0, transform: 'translateX(0) scaleX(1)' },
  { offset: 0.16, opacity: 0.9, transform: `translateX(${direction * 0.45}px) scaleX(1)` },
  { offset: 0.3, opacity: 0.65, transform: 'translateX(0) scaleX(0.8)' },
  { offset: 0.45, opacity: 0.68, transform: `translateX(${direction * 0.28}px) scaleX(0.92)` },
  { offset: 0.58, opacity: 0.38, transform: 'translateX(0) scaleX(0.68)' },
  { offset: 0.72, opacity: 0.42, transform: `translateX(${direction * 0.14}px) scaleX(0.76)` },
  { offset: 0.84, opacity: 0.18, transform: 'translateX(0) scaleX(0.45)' },
  { offset: 1, opacity: 0, transform: 'translateX(0) scaleX(0.2)' },
]

const nameAnimation = (animation: Animation, id: string): Animation => {
  animation.id = id
  return animation
}

export const startGhostTickle = (
  elements: IGhostTickleElements,
  { prefersReducedMotion, onFinish }: IStartGhostTickleOptions,
): IGhostTickleRun => {
  if (prefersReducedMotion) {
    const eyeAnimation = nameAnimation(
      elements.eyes.animate(
        [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.25)' }, { transform: 'scaleY(1)' }],
        { duration: 180, easing: 'ease-out', fill: 'none' },
      ),
      'ghost-reduced-giggle',
    )

    eyeAnimation.onfinish = onFinish

    return { body: null, cancel: () => eyeAnimation.cancel() }
  }

  const body = nameAnimation(
    elements.body.animate(BODY_KEYFRAMES, TICKLE_TIMING),
    'ghost-tickle-body',
  )
  const eyes = nameAnimation(
    elements.eyes.animate(EYE_KEYFRAMES, TICKLE_TIMING),
    'ghost-giggle-eyes',
  )
  const leftCreases = nameAnimation(
    elements.leftCreases.animate(createCreaseKeyframes(1), TICKLE_TIMING),
    'ghost-tickle-left-creases',
  )
  const rightCreases = nameAnimation(
    elements.rightCreases.animate(createCreaseKeyframes(-1), TICKLE_TIMING),
    'ghost-tickle-right-creases',
  )
  const animations = [body, eyes, leftCreases, rightCreases]

  body.onfinish = onFinish

  return {
    body,
    cancel: () => animations.forEach((animation) => animation.cancel()),
  }
}

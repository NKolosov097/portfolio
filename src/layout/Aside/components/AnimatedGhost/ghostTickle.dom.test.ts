import { expect, test, vi } from 'vitest'

import { startGhostTickle } from './ghostTickle'

const createAnimatedGroup = () => {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const cancel = vi.fn()
  const animation = { cancel, id: '', onfinish: null } as unknown as Animation
  const animate = vi.fn(() => animation)
  group.animate = animate

  return { group, animation, animate, cancel }
}

test('compresses the stable body three times and settles at its exact neutral transform', () => {
  const body = createAnimatedGroup()
  const eyes = createAnimatedGroup()
  const leftCreases = createAnimatedGroup()
  const rightCreases = createAnimatedGroup()

  startGhostTickle(
    {
      body: body.group,
      eyes: eyes.group,
      leftCreases: leftCreases.group,
      rightCreases: rightCreases.group,
    },
    { prefersReducedMotion: false, onFinish: vi.fn() },
  )

  const bodyFrames = body.animate.mock.calls[0][0] as Keyframe[]
  const horizontalScales = bodyFrames.map(({ transform }) => String(transform))

  expect(horizontalScales).toContain('scaleX(0.84) scaleY(1.035)')
  expect(horizontalScales.at(-1)).toBe('scaleX(1) scaleY(1)')
  expect(body.animate.mock.calls[0][1]).toMatchObject({ duration: 1_800, fill: 'none' })
})

test('reveals both crease groups during compression and hides them before completion', () => {
  const body = createAnimatedGroup()
  const eyes = createAnimatedGroup()
  const leftCreases = createAnimatedGroup()
  const rightCreases = createAnimatedGroup()

  startGhostTickle(
    {
      body: body.group,
      eyes: eyes.group,
      leftCreases: leftCreases.group,
      rightCreases: rightCreases.group,
    },
    { prefersReducedMotion: false, onFinish: vi.fn() },
  )

  for (const crease of [leftCreases, rightCreases]) {
    const frames = crease.animate.mock.calls[0][0] as Keyframe[]
    expect(frames.some(({ opacity }) => Number(opacity) >= 0.8)).toBe(true)
    expect(frames.at(-1)?.opacity).toBe(0)
  }
})

test('uses only the eye animation for reduced motion', () => {
  const body = createAnimatedGroup()
  const eyes = createAnimatedGroup()
  const leftCreases = createAnimatedGroup()
  const rightCreases = createAnimatedGroup()

  startGhostTickle(
    {
      body: body.group,
      eyes: eyes.group,
      leftCreases: leftCreases.group,
      rightCreases: rightCreases.group,
    },
    { prefersReducedMotion: true, onFinish: vi.fn() },
  )

  expect(body.animate).not.toHaveBeenCalled()
  expect(leftCreases.animate).not.toHaveBeenCalled()
  expect(rightCreases.animate).not.toHaveBeenCalled()
  expect(eyes.animate).toHaveBeenCalledOnce()
})

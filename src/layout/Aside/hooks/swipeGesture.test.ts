import { describe, expect, it } from 'vitest'

import {
  clampSwipeTranslateX,
  resolveSwipeAxis,
  resolveVeilOpacity,
  shouldCloseOnSwipeEnd,
} from '@/layout/Aside/hooks/swipeGesture'

describe('resolveSwipeAxis', () => {
  it('stays undecided below the lock threshold', () => {
    expect(resolveSwipeAxis({ dx: 3, dy: 2 })).toBeNull()
  })

  it('locks horizontal once dx dominates past the threshold', () => {
    expect(resolveSwipeAxis({ dx: -30, dy: 4 })).toBe('horizontal')
  })

  it('locks vertical once dy dominates past the threshold', () => {
    expect(resolveSwipeAxis({ dx: 4, dy: 30 })).toBe('vertical')
  })

  it('treats an equal-magnitude diagonal as vertical', () => {
    expect(resolveSwipeAxis({ dx: -20, dy: 20 })).toBe('vertical')
  })
})

describe('shouldCloseOnSwipeEnd', () => {
  it('closes once the leftward distance passes the ratio of the panel width', () => {
    expect(shouldCloseOnSwipeEnd({ dx: -100, durationMs: 400, panelWidthPx: 390 })).toBe(true)
  })

  it('does not close on a short, slow leftward drag', () => {
    expect(shouldCloseOnSwipeEnd({ dx: -40, durationMs: 400, panelWidthPx: 390 })).toBe(false)
  })

  it('closes on a short but fast flick', () => {
    expect(shouldCloseOnSwipeEnd({ dx: -40, durationMs: 50, panelWidthPx: 390 })).toBe(true)
  })

  it('never closes on a rightward drag', () => {
    expect(shouldCloseOnSwipeEnd({ dx: 250, durationMs: 10, panelWidthPx: 390 })).toBe(false)
  })

  it('falls back to the distance check when duration is zero', () => {
    expect(shouldCloseOnSwipeEnd({ dx: -10, durationMs: 0, panelWidthPx: 390 })).toBe(false)
    expect(shouldCloseOnSwipeEnd({ dx: -200, durationMs: 0, panelWidthPx: 390 })).toBe(true)
  })
})

describe('clampSwipeTranslateX', () => {
  it('passes a leftward delta through unchanged', () => {
    expect(clampSwipeTranslateX(-120)).toBe(-120)
  })

  it('clamps a rightward delta to zero', () => {
    expect(clampSwipeTranslateX(45)).toBe(0)
  })

  it('leaves zero at zero', () => {
    expect(clampSwipeTranslateX(0)).toBe(0)
  })
})

describe('resolveVeilOpacity', () => {
  it('stays fully opaque at rest', () => {
    expect(resolveVeilOpacity({ clampedDx: 0, panelWidthPx: 400 })).toBe(1)
  })

  it('barely dims a short drag, thanks to the ease-in curve', () => {
    expect(resolveVeilOpacity({ clampedDx: -50, panelWidthPx: 400 })).toBeCloseTo(0.984, 3)
  })

  it('reaches zero at a full-width drag', () => {
    expect(resolveVeilOpacity({ clampedDx: -400, panelWidthPx: 400 })).toBe(0)
  })

  it('clamps drags past the panel width to zero rather than going negative', () => {
    expect(resolveVeilOpacity({ clampedDx: -600, panelWidthPx: 400 })).toBe(0)
  })
})

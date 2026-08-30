import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { animateScroll } from './animateScroll'

/** Queues rAF callbacks so a test can advance the animation one frame at a time. */
const stubAnimationFrame = () => {
  let queued: FrameRequestCallback | null = null
  let nextId = 1
  const cancelled = new Set<number>()

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queued = callback
    return nextId++
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    cancelled.add(id)
  })

  return {
    /** Runs the currently queued frame at the given timestamp, if one was scheduled. */
    runFrame: (timestamp: number) => {
      const callback = queued
      queued = null
      callback?.(timestamp)
    },
    isCancelled: (id: number) => cancelled.has(id),
  }
}

const setOffsetTop = (element: HTMLElement, value: number) =>
  Object.defineProperty(element, 'offsetTop', { value, configurable: true })

const setScrollBounds = (scrollHeight: number, clientHeight: number) => {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  })
  Object.defineProperty(document.documentElement, 'clientHeight', {
    value: clientHeight,
    configurable: true,
  })
}

const stubMatchMedia = (matches: boolean) =>
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches } as MediaQueryList))

beforeEach(() => {
  setScrollBounds(5_000, 800)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  stubMatchMedia(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('re-measures the target every frame instead of freezing it at the start', () => {
  const { runFrame } = stubAnimationFrame()
  const section = document.createElement('section')
  setOffsetTop(section, 500)

  animateScroll({ element: section, initialPosition: 0, duration: 100 })

  // First frame starts the clock; nothing has shifted yet.
  runFrame(0)

  // A web-font swap (or similar) lengthens the content above the section mid-animation.
  setOffsetTop(section, 1_000)

  // Final frame: progress reaches 1, so the eased position lands exactly on the target.
  runFrame(100)

  const lastCall = vi.mocked(window.scrollTo).mock.calls.at(-1)
  expect(lastCall).toEqual([0, 1_000])
})

test('clamps the target to the document max scroll instead of overshooting', () => {
  const { runFrame } = stubAnimationFrame()
  const section = document.createElement('section')
  setOffsetTop(section, 10_000)
  setScrollBounds(4_200, 800)

  animateScroll({ element: section, initialPosition: 0, duration: 100 })

  runFrame(0)
  runFrame(100)

  const lastCall = vi.mocked(window.scrollTo).mock.calls.at(-1)
  expect(lastCall).toEqual([0, 3_400])
})

test('cancels a still-running animation before starting a new one', () => {
  const { isCancelled } = stubAnimationFrame()
  const first = document.createElement('section')
  const second = document.createElement('section')
  setOffsetTop(first, 500)
  setOffsetTop(second, 900)

  animateScroll({ element: first, initialPosition: 0, duration: 100 })
  animateScroll({ element: second, initialPosition: 0, duration: 100 })

  expect(isCancelled(1)).toBe(true)
})

test('jumps straight to the target under prefers-reduced-motion, without animating', () => {
  stubMatchMedia(true)
  const section = document.createElement('section')
  setOffsetTop(section, 640)

  animateScroll({ element: section, initialPosition: 0, duration: 750, paddingFromTop: 40 })

  expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith(0, 600)
})

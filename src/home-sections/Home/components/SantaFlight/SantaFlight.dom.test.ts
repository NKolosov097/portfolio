import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SantaFlight } from './SantaFlight'

const mocked = vi.hoisted(() => ({
  idle: null as VoidFunction | null,
  imported: vi.fn(),
  create: vi.fn(),
  seek: vi.fn(),
  run: vi.fn(),
  dispose: vi.fn(),
  prepare: vi.fn<() => Promise<void>>(),
}))

vi.mock('@/helpers/idleCallback', () => ({
  requestIdle: (callback: VoidFunction) => {
    mocked.idle = callback
    return 1
  },
  cancelIdle: vi.fn(),
}))

vi.mock('./santaRenderer', () => {
  mocked.imported()
  return {
    prepareSantaAssets: mocked.prepare,
    createSantaRenderer: mocked.create.mockImplementation(() => ({
      seek: mocked.seek,
      setRunning: mocked.run,
      dispose: mocked.dispose,
    })),
  }
})

let intersection: ((visible: boolean) => void) | null = null
let root: Root
let section: HTMLElement
let hidden = false
const motion = Object.assign(new EventTarget(), { matches: false })

/** Allow deterministic observer delivery without observing the portal itself. */
class Observer {
  /** Capture only the eligibility signal consumed by the host. */
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    intersection = (visible) => callback([{ isIntersecting: visible }])
  }
  /** Record the section selected for observation. */
  observe(target: Element): void {
    expect(target.tagName).toBe('SECTION')
  }
  /** Match the browser observer cleanup contract. */
  disconnect(): void {}
}

/** Flush lazy module resolution and React effects without advancing real animation frames. */
async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

beforeEach(async () => {
  mocked.prepare.mockResolvedValue(undefined)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('IntersectionObserver', Observer)
  vi.stubGlobal('matchMedia', () => motion)
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  hidden = false
  motion.matches = false
  section = document.createElement('section')
  document.body.append(section)
  root = createRoot(section)
  await act(async () => {
    root.render(createElement(SantaFlight))
  })
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  section.remove()
  vi.unstubAllGlobals()
})

describe('Santa lifecycle eligibility', () => {
  it('never imports early and cannot create a renderer from a pending import after unmount', async () => {
    intersection?.(true)
    expect(mocked.imported).not.toHaveBeenCalled()
    motion.matches = true
    mocked.idle?.()
    await flush()
    expect(mocked.imported).not.toHaveBeenCalled()
    motion.matches = false
    hidden = true
    motion.dispatchEvent(new Event('change'))
    await flush()
    expect(mocked.imported).not.toHaveBeenCalled()
    hidden = false
    intersection?.(false)
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(mocked.imported).not.toHaveBeenCalled()
    intersection?.(true)
    act(() => {
      root.unmount()
    })
    root = createRoot(section)
    await flush()
    expect(mocked.imported).toHaveBeenCalledOnce()
    expect(mocked.create).not.toHaveBeenCalled()
    expect(document.querySelector('[data-testid="santa-flight"]')).toBeNull()
  })

  it.each(['unmount', 'motion', 'offscreen'] as const)(
    'does not create a renderer when pending assets resolve after %s',
    async (loss) => {
      let finish: VoidFunction | undefined
      mocked.prepare.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve
          }),
      )
      intersection?.(true)
      mocked.idle?.()
      await flush()
      expect(mocked.prepare).toHaveBeenCalledOnce()
      expect(mocked.create).not.toHaveBeenCalled()
      if (loss === 'unmount') {
        act(() => root.unmount())
        root = createRoot(section)
      } else if (loss === 'motion') {
        motion.matches = true
        motion.dispatchEvent(new Event('change'))
      } else {
        intersection?.(false)
      }
      finish?.()
      await flush()
      expect(mocked.create).not.toHaveBeenCalled()
      if (loss === 'offscreen') {
        intersection?.(true)
        expect(mocked.create).toHaveBeenCalledOnce()
      }
    },
  )

  it('pauses and hides offscreen, seeks in place and disposes when motion is reduced', async () => {
    intersection?.(true)
    mocked.idle?.()
    await flush()
    expect(mocked.create).toHaveBeenCalledOnce()
    const host = document.querySelector<HTMLElement>('[data-testid="santa-flight"]')
    expect(host?.parentElement).toBe(document.body)
    expect(host?.style.visibility).toBe('visible')
    intersection?.(false)
    expect(mocked.run).toHaveBeenLastCalledWith(false)
    expect(host?.style.visibility).toBe('hidden')
    intersection?.(true)
    expect(mocked.run).toHaveBeenLastCalledWith(true)
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    expect(mocked.run).toHaveBeenLastCalledWith(false)
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    motion.matches = true
    motion.dispatchEvent(new Event('change'))
    expect(mocked.dispose).toHaveBeenCalledOnce()
    expect(host?.style.visibility).toBe('hidden')
  })

  it('keeps the host usable without a renderer when one optional asset fails', async () => {
    mocked.prepare.mockRejectedValueOnce(new Error('Natural Santa unavailable'))
    intersection?.(true)
    mocked.idle?.()
    await flush()
    expect(mocked.create).not.toHaveBeenCalled()
    expect(document.querySelector('[data-testid="santa-flight"] canvas')).toBeNull()
    intersection?.(false)
    motion.matches = true
    motion.dispatchEvent(new Event('change'))
    await flush()
    expect(mocked.dispose).not.toHaveBeenCalled()
  })

  it('seeks preview changes without remounting the renderer', async () => {
    await act(async () => {
      root.render(createElement(SantaFlight, { previewTime: -1 }))
    })
    intersection?.(true)
    mocked.idle?.()
    await flush()
    expect(mocked.create).toHaveBeenCalledOnce()
    expect(mocked.seek).toHaveBeenLastCalledWith(-1)
    const host = document.querySelector<HTMLElement>('[data-testid="santa-flight"]')
    expect(section.contains(host)).toBe(true)
    expect(host?.parentElement).not.toBe(document.body)
    await act(async () => {
      root.render(createElement(SantaFlight, { previewTime: 18 }))
    })
    expect(mocked.seek).toHaveBeenLastCalledWith(18)
    expect(host?.parentElement).toBe(document.body)
    expect(document.querySelector('[data-testid="santa-flight"]')).toBe(host)
    expect(mocked.create).toHaveBeenCalledOnce()
    await act(async () => {
      root.render(createElement(SantaFlight, { previewTime: -1 }))
    })
    expect(section.contains(host)).toBe(true)
    expect(mocked.seek).toHaveBeenLastCalledWith(-1)
    expect(mocked.create).toHaveBeenCalledOnce()
  })
})

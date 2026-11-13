import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Points, ShaderMaterial, type PerspectiveCamera, type Scene } from 'three'

import { createSantaRenderer, prepareSantaAssets } from './santaRenderer'
import type { SantaFormation } from './santaModel'
import { createSantaRoutes } from './santaTrajectory'

const mocked = vi.hoisted(() => ({
  animate: vi.fn<(seconds: number, formation?: SantaFormation) => void>(),
  modelDispose: vi.fn(),
  gpuDispose: vi.fn(),
  environmentDispose: vi.fn(),
  roomDispose: vi.fn(),
  pmremDispose: vi.fn(),
  render: vi.fn<(scene: Scene, camera: PerspectiveCamera) => void>(),
  failEnvironment: false,
  gpuCreated: vi.fn(),
  prepareDeer: vi.fn<() => Promise<void>>(),
  prepareSanta: vi.fn<() => Promise<void>>(),
  deerReady: true,
  santaReady: true,
}))

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>()
  return {
    ...actual,
    /** Replace only the GPU boundary so actual camera and scene transforms remain under test. */
    WebGLRenderer: class {
      /** Record context allocation separately from subsequent render calls. */
      constructor() {
        mocked.gpuCreated()
      }
      domElement = document.createElement('canvas')
      setClearColor = vi.fn()
      setPixelRatio = vi.fn()
      /** Keep particle point sizing deterministic at the mocked GPU boundary. */
      getPixelRatio = () => 1
      setSize = vi.fn()
      render = mocked.render
      dispose = mocked.gpuDispose
      forceContextLoss = vi.fn()
    },
    /** Make reflection allocation deterministic and exercise partial initialization failures. */
    PMREMGenerator: class {
      dispose = mocked.pmremDispose
      /** Return a disposable reflection target without a GPU. */
      fromScene() {
        if (mocked.failEnvironment) throw new Error('Context unavailable during reflection setup')
        return { texture: new actual.Texture(), dispose: mocked.environmentDispose }
      }
    },
  }
})

vi.mock('three/addons/environments/RoomEnvironment.js', async () => {
  const { Scene } = await import('three')
  return {
    /** Preserve the environment scene type while recording temporary resource ownership. */
    RoomEnvironment: class extends Scene {
      dispose = mocked.roomDispose
    },
  }
})

vi.mock('./santaModel', async () => {
  const { Group, Mesh, BoxGeometry, MeshBasicMaterial } = await import('three')
  return {
    /** Use bounded geometry so the renderer performs its real close-view camera fit. */
    createSantaTeam() {
      const group = new Group()
      group.add(new Mesh(new BoxGeometry(14, 5, 3), new MeshBasicMaterial()))
      return { group, spacing: 4, animate: mocked.animate, dispose: mocked.modelDispose }
    },
  }
})

vi.mock('./naturalDeerAsset', async () => {
  const { Group } = await import('three')
  return {
    /** Enforce the real ready-template boundary before context allocation. */
    getNaturalDeer: () => {
      if (!mocked.deerReady) throw new Error('Deer pending')
      return new Group()
    },
    prepareNaturalDeer: mocked.prepareDeer,
  }
})

vi.mock('./naturalSantaAsset', async () => {
  const { Group } = await import('three')
  return {
    /** Enforce the second ready-template boundary before context allocation. */
    getNaturalSanta: () => {
      if (!mocked.santaReady) throw new Error('Santa pending')
      return new Group()
    },
    prepareNaturalSanta: mocked.prepareSanta,
  }
})

let frames: Map<number, FrameRequestCallback>
let nextFrame = 0
let host: HTMLDivElement

/** Deliver one browser frame after advancing the monotonic test clock. */
function frameAfter(milliseconds: number): void {
  vi.advanceTimersByTime(milliseconds)
  const pending = [...frames.values()]
  frames.clear()
  for (const callback of pending) callback(performance.now())
}

beforeEach(() => {
  vi.useFakeTimers()
  frames = new Map()
  mocked.failEnvironment = false
  mocked.deerReady = true
  mocked.santaReady = true
  mocked.prepareDeer.mockResolvedValue(undefined)
  mocked.prepareSanta.mockResolvedValue(undefined)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++nextFrame
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id)
  })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(() => {
  host.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Santa renderer scheduling and resource ownership', () => {
  it('owns one world-space trail, populates static passes, and disposes it on teardown', () => {
    const renderer = createSantaRenderer(host)
    const scene = mocked.render.mock.lastCall?.[0]
    const trail = scene?.getObjectByName('santa-magic-trail')
    if (!(trail instanceof Points) || !(trail.material instanceof ShaderMaterial))
      throw new Error('Expected one shader trail in the actual scene')
    const geometryDispose = vi.spyOn(trail.geometry, 'dispose')
    const materialDispose = vi.spyOn(trail.material, 'dispose')
    expect(trail.parent).toBe(scene)
    for (const seconds of [6, 18]) {
      renderer.seek(seconds)
      expect(trail.visible).toBe(true)
      expect(trail.geometry.drawRange.count).toBe(192)
      expect(frames.size).toBe(0)
    }
    for (const seconds of [-1, 12, 23]) {
      renderer.seek(seconds)
      expect(trail.visible).toBe(false)
    }
    renderer.dispose()
    renderer.dispose()
    expect(geometryDispose).toHaveBeenCalledOnce()
    expect(materialDispose).toHaveBeenCalledOnce()
  })

  it('waits for both CPU assets and cannot allocate a context while either template is missing', async () => {
    let finishDeer: VoidFunction | undefined, finishSanta: VoidFunction | undefined
    mocked.deerReady = false
    mocked.santaReady = false
    mocked.prepareDeer.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishDeer = () => {
            mocked.deerReady = true
            resolve()
          }
        }),
    )
    mocked.prepareSanta.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishSanta = () => {
            mocked.santaReady = true
            resolve()
          }
        }),
    )
    const pending = prepareSantaAssets()
    expect(mocked.prepareDeer).toHaveBeenCalledOnce()
    expect(mocked.prepareSanta).toHaveBeenCalledOnce()
    expect(() => createSantaRenderer(host)).toThrow('Deer pending')
    finishDeer?.()
    await Promise.resolve()
    expect(() => createSantaRenderer(host)).toThrow('Santa pending')
    expect(mocked.gpuCreated).not.toHaveBeenCalled()
    finishSanta?.()
    await pending
    const renderer = createSantaRenderer(host)
    expect(mocked.gpuCreated).toHaveBeenCalledOnce()
    renderer.dispose()
  })

  it.each(['deer', 'Santa'] as const)(
    'propagates a failed %s asset without allocating a context',
    async (asset) => {
      mocked.deerReady = false
      mocked.santaReady = false
      ;(asset === 'deer' ? mocked.prepareDeer : mocked.prepareSanta).mockRejectedValueOnce(
        new Error('Asset unavailable'),
      )
      await expect(prepareSantaAssets()).rejects.toThrow('Asset unavailable')
      expect(mocked.gpuCreated).not.toHaveBeenCalled()
    },
  )

  it('retains authored screen timing while the followers use arc-distance spacing', () => {
    Object.defineProperties(host, {
      clientWidth: { value: 1440 },
      clientHeight: { value: 900 },
    })
    const renderer = createSantaRenderer(host)
    try {
      renderer.seek(18)
      const formation = mocked.animate.mock.lastCall?.[1]
      if (!formation) throw new Error('A visible pass must provide formation frames')
      const expected = createSantaRoutes(1440, 900).near.getPoint((18 - 14) / 9)
      expect(formation.frames[0].position.distanceTo(expected)).toBeLessThan(0.00001)
    } finally {
      renderer.dispose()
    }
  })

  it('sleeps during rest and resumes active time without advancing through a hidden tab', () => {
    const renderer = createSantaRenderer(host)
    renderer.setRunning(true)
    frameAfter(16)
    frameAfter(23_000)
    expect(host.dataset.phase).toBe('rest')
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(1)
    const restingRenders = mocked.render.mock.calls.length
    vi.advanceTimersByTime(5_000)
    expect(mocked.render).toHaveBeenCalledTimes(restingRenders)
    renderer.setRunning(false)
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(60_000)
    renderer.setRunning(true)
    expect(vi.getTimerCount()).toBe(1)
    frameAfter(20_002)
    expect(host.dataset.phase).toBe('distant')
    expect(mocked.animate.mock.lastCall?.[0]).toBeCloseTo(48.001, 2)
    renderer.setRunning(false)
    const before = mocked.animate.mock.lastCall?.[0]
    vi.advanceTimersByTime(60_000)
    renderer.setRunning(true)
    frameAfter(16)
    expect(mocked.animate.mock.lastCall?.[0]).toBe(before)
    renderer.dispose()
    renderer.dispose()
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(mocked.modelDispose).toHaveBeenCalledOnce()
    expect(mocked.environmentDispose).toHaveBeenCalledOnce()
    expect(mocked.gpuDispose).toHaveBeenCalledOnce()
    expect(mocked.roomDispose).toHaveBeenCalledOnce()
    expect(mocked.pmremDispose).toHaveBeenCalledOnce()
    expect(host.childElementCount).toBe(0)
  })

  it('holds preview poses without frames and handles context loss without restarting', () => {
    const renderer = createSantaRenderer(host)
    renderer.seek(-1)
    renderer.setRunning(true)
    expect(host.dataset.phase).toBe('model')
    expect(frames.size).toBe(0)
    renderer.seek(18)
    expect(host.dataset.phase).toBe('near')
    const flight = mocked.animate.mock.lastCall?.[1]
    expect(flight?.frames).toHaveLength(3)
    expect(flight?.scale).toBeGreaterThan(0)
    const retainedFrames = flight?.frames
    renderer.seek(19)
    expect(mocked.animate.mock.lastCall?.[1]?.frames).toBe(retainedFrames)
    renderer.seek(-1)
    expect(mocked.animate).toHaveBeenLastCalledWith(0.2)
    expect(frames.size).toBe(0)
    renderer.seek(null)
    expect(frames.size).toBe(1)
    host.querySelector('canvas')?.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    expect(host.dataset.status).toBe('unavailable')
    expect(frames.size).toBe(0)
    renderer.setRunning(true)
    renderer.seek(null)
    expect(frames.size).toBe(0)
    renderer.dispose()
  })

  it('releases temporary and final resources if construction fails after canvas attachment', () => {
    const trailDispose = vi.spyOn(ShaderMaterial.prototype, 'dispose')
    mocked.failEnvironment = true
    expect(() => createSantaRenderer(host)).toThrow('Context unavailable')
    expect(host.childElementCount).toBe(0)
    expect(mocked.modelDispose).toHaveBeenCalledOnce()
    expect(mocked.roomDispose).toHaveBeenCalledOnce()
    expect(mocked.pmremDispose).toHaveBeenCalledOnce()
    expect(mocked.gpuDispose).toHaveBeenCalledOnce()
    expect(trailDispose).toHaveBeenCalledOnce()
    trailDispose.mockRestore()
  })
})

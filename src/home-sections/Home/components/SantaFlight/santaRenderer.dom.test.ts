import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Points, ShaderMaterial, type PerspectiveCamera, type Scene } from 'three'

import { createSantaScene, prepareSantaAssets } from './santaRenderer'
import type { SantaFormation } from './santaModel'
import type { SantaScene, SantaSceneOptions } from './santaWorkerProtocol'
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
  compile: vi.fn<() => Promise<void>>(),
  setSize: vi.fn(),
  pixelRatio: vi.fn(),
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
      constructor(options: { canvas: HTMLCanvasElement }) {
        this.domElement = options.canvas
        mocked.gpuCreated()
      }
      domElement: HTMLCanvasElement
      setClearColor = vi.fn()
      ratio = 1
      /** Keep the mocked GPU backing ratio observable for quality and trail assertions. */
      setPixelRatio(value: number): void {
        this.ratio = value
        mocked.pixelRatio(value)
      }
      /** Keep particle point sizing deterministic at the mocked GPU boundary. */
      getPixelRatio = () => this.ratio
      setSize = mocked.setSize
      compileAsync = mocked.compile
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
  mocked.compile.mockResolvedValue(undefined)
  mocked.render.mockReset()
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

/** Supply the actual scene with a canvas and deterministic browser-independent clocks. */
async function createRenderer(
  previewTime: number | null = null,
  signal = new AbortController().signal,
): Promise<SantaScene> {
  const canvas = document.createElement('canvas')
  host.append(canvas)
  const options: SantaSceneOptions = {
    canvas,
    width: host.clientWidth || 1,
    height: host.clientHeight || 1,
    devicePixelRatio: 1,
    previewTime,
    signal,
    onState: (state) => Object.assign(host.dataset, state),
    scheduler: {
      requestFrame: (callback) => requestAnimationFrame(callback),
      cancelFrame: (id) => cancelAnimationFrame(id),
      setTimer: (callback, delay) => window.setTimeout(callback, delay),
      clearTimer: (id) => window.clearTimeout(id),
      now: () => performance.now(),
    },
  }
  return createSantaScene(options)
}

describe('Santa renderer scheduling and resource ownership', () => {
  it('owns one world-space trail, populates static passes, and disposes it on teardown', async () => {
    const renderer = await createRenderer()
    renderer.setRunning(true)
    const scene = mocked.render.mock.lastCall?.[0]
    const trail = scene?.getObjectByName('santa-magic-trail')
    if (!(trail instanceof Points) || !(trail.material instanceof ShaderMaterial))
      throw new Error('Expected one shader trail in the actual scene')
    const geometryDispose = vi.spyOn(trail.geometry, 'dispose')
    const materialDispose = vi.spyOn(trail.material, 'dispose')
    expect(trail.parent).toBe(scene)
    renderer.seek(6)
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
    await expect(createRenderer()).rejects.toThrow('Deer pending')
    finishDeer?.()
    await Promise.resolve()
    await expect(createRenderer()).rejects.toThrow('Santa pending')
    expect(mocked.gpuCreated).not.toHaveBeenCalled()
    finishSanta?.()
    await pending
    const renderer = await createRenderer()
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

  it('retains authored screen timing while the followers use arc-distance spacing', async () => {
    Object.defineProperties(host, {
      clientWidth: { value: 1440 },
      clientHeight: { value: 900 },
    })
    const renderer = await createRenderer()
    try {
      renderer.seek(18)
      renderer.setRunning(true)
      const formation = mocked.animate.mock.lastCall?.[1]
      if (!formation) throw new Error('A visible pass must provide formation frames')
      const expected = createSantaRoutes(1440, 900).near.getPoint((18 - 14) / 9)
      expect(formation.frames[0].position.distanceTo(expected)).toBeLessThan(0.00001)
    } finally {
      renderer.dispose()
    }
  })

  it('sleeps during rest and resumes active time without advancing through a hidden tab', async () => {
    const renderer = await createRenderer()
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
    expect(mocked.animate.mock.lastCall?.[0]).toBeCloseTo(48.018, 3)
    renderer.setRunning(false)
    const before = mocked.animate.mock.lastCall?.[0]
    vi.advanceTimersByTime(60_000)
    renderer.setRunning(true)
    expect(mocked.animate.mock.lastCall?.[0]).toBe(before)
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
  })

  it('holds preview poses without frames and handles context loss without restarting', async () => {
    const renderer = await createRenderer()
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

  it('releases temporary and final resources if construction fails after canvas attachment', async () => {
    const trailDispose = vi.spyOn(ShaderMaterial.prototype, 'dispose')
    mocked.failEnvironment = true
    await expect(createRenderer()).rejects.toThrow('Context unavailable')
    expect(mocked.modelDispose).toHaveBeenCalledOnce()
    expect(mocked.roomDispose).toHaveBeenCalledOnce()
    expect(mocked.pmremDispose).toHaveBeenCalledOnce()
    expect(mocked.gpuDispose).toHaveBeenCalledOnce()
    expect(trailDispose).toHaveBeenCalledOnce()
    trailDispose.mockRestore()
  })
  it('compiles without an initial draw and presents only the latest eligible preview', async () => {
    let finish: VoidFunction = vi.fn()
    mocked.compile.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const pending = createRenderer(-1)
    expect(mocked.render).not.toHaveBeenCalled()
    finish()
    const renderer = await pending
    renderer.seek(18)
    renderer.resize(400, 800, 2)
    expect(mocked.render).not.toHaveBeenCalled()
    renderer.setRunning(true)
    expect(mocked.render).toHaveBeenCalledOnce()
    expect(host.dataset.phase).toBe('near')
    expect(frames.size).toBe(0)
    renderer.setRunning(false)
    renderer.seek(-1)
    renderer.resize(1000, 800, 2)
    expect(mocked.render).toHaveBeenCalledOnce()
    renderer.setRunning(true)
    expect(host.dataset.phase).toBe('model')
    expect(mocked.pixelRatio).toHaveBeenLastCalledWith(1.5)
    renderer.dispose()
  })

  it.each(['dispose', 'context-loss'] as const)(
    'immediately releases resources after %s while shader warmup remains unresolved',
    async (loss) => {
      let finish: VoidFunction = vi.fn()
      const lifetime = new AbortController()
      const trailDispose = vi.spyOn(ShaderMaterial.prototype, 'dispose')
      const removeAbort = vi.spyOn(lifetime.signal, 'removeEventListener')
      mocked.compile.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve
          }),
      )
      const pending = createRenderer(-1, lifetime.signal)
      const rejected = expect(pending).rejects.toThrow('cancelled')
      const canvas = host.querySelector('canvas')
      const remove = canvas && vi.spyOn(canvas, 'removeEventListener')
      if (loss === 'dispose') lifetime.abort()
      else canvas?.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
      // Cleanup and rejection must happen before the deliberately unresolved compile can complete.
      expect(mocked.modelDispose).toHaveBeenCalledOnce()
      expect(mocked.gpuDispose).toHaveBeenCalledOnce()
      expect(mocked.environmentDispose).toHaveBeenCalledOnce()
      expect(trailDispose).toHaveBeenCalledOnce()
      expect(remove).toHaveBeenCalledWith('webglcontextlost', expect.any(Function))
      expect(removeAbort).toHaveBeenCalledWith('abort', expect.any(Function))
      await rejected
      expect(mocked.render).not.toHaveBeenCalled()
      expect(host.dataset.phase).toBeUndefined()
      finish()
      await Promise.resolve()
      await Promise.resolve()
      lifetime.abort()
      expect(mocked.modelDispose).toHaveBeenCalledOnce()
      expect(mocked.gpuDispose).toHaveBeenCalledOnce()
      expect(mocked.environmentDispose).toHaveBeenCalledOnce()
      expect(trailDispose).toHaveBeenCalledOnce()
      expect(mocked.render).not.toHaveBeenCalled()
      expect(frames.size).toBe(0)
    },
  )

  it('rejects an already-aborted lifetime before allocating a GPU context', async () => {
    const lifetime = new AbortController()
    lifetime.abort()
    await expect(createRenderer(-1, lifetime.signal)).rejects.toThrow('cancelled')
    expect(mocked.gpuCreated).not.toHaveBeenCalled()
    expect(mocked.compile).not.toHaveBeenCalled()
  })

  it.each(['abort-first', 'dispose-first'] as const)(
    'shares idempotent cleanup between normal disposal and lifetime abort: %s',
    async (order) => {
      const lifetime = new AbortController()
      const renderer = await createRenderer(-1, lifetime.signal)
      const removeAbort = vi.spyOn(lifetime.signal, 'removeEventListener')
      if (order === 'abort-first') lifetime.abort()
      renderer.dispose()
      lifetime.abort()
      renderer.dispose()
      expect(mocked.modelDispose).toHaveBeenCalledOnce()
      expect(mocked.gpuDispose).toHaveBeenCalledOnce()
      expect(removeAbort).toHaveBeenCalledOnce()
      expect(mocked.render).not.toHaveBeenCalled()
    },
  )

  it('uses the same cleanup when shader preparation rejects', async () => {
    mocked.compile.mockRejectedValueOnce(new Error('Shader unavailable'))
    const lifetime = new AbortController()
    await expect(createRenderer(-1, lifetime.signal)).rejects.toThrow('Shader unavailable')
    lifetime.abort()
    expect(mocked.modelDispose).toHaveBeenCalledOnce()
    expect(mocked.gpuDispose).toHaveBeenCalledOnce()
    expect(mocked.render).not.toHaveBeenCalled()
  })

  it.each([120, 144])(
    'caps a %i Hz clock at 60 draws while preserving elapsed time and clearing hidden phases once',
    async (refresh) => {
      const renderer = await createRenderer()
      renderer.setRunning(true)
      const first = mocked.render.mock.calls.length
      for (let i = 1; i <= refresh * 2; i += 1) {
        const pending = [...frames.values()]
        frames.clear()
        for (const callback of pending) callback((i * 1000) / refresh)
      }
      expect(mocked.render.mock.calls.length - first).toBeGreaterThanOrEqual(119)
      expect(mocked.render.mock.calls.length - first).toBeLessThanOrEqual(120)
      expect(mocked.animate.mock.lastCall?.[0]).toBeCloseTo(2, 8)
      const pending = [...frames.values()]
      frames.clear()
      for (const callback of pending) callback(12001)
      expect(host.dataset.phase).toBe('turnaround')
      expect(frames.size).toBe(0)
      expect(vi.getTimerCount()).toBe(1)
      const count = mocked.render.mock.calls.length
      vi.advanceTimersByTime(100)
      expect(mocked.render).toHaveBeenCalledTimes(count)
      renderer.dispose()
    },
  )

  it('applies adaptive backing changes before the next presentation and restores static preview resolution', async () => {
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    mocked.render.mockImplementation(() => {
      now += 15
    })
    const renderer = await createRenderer()
    renderer.resize(1200, 800, 2)
    renderer.setRunning(true)
    for (let i = 1; i <= 300; i += 1) {
      now = (i * 1000) / 60 + 15
      const pending = [...frames.values()]
      frames.clear()
      for (const callback of pending) callback(now)
      expect(mocked.setSize.mock.invocationCallOrder.at(-1)).toBeLessThan(
        mocked.render.mock.invocationCallOrder.at(-1) ?? 0,
      )
    }
    expect(mocked.pixelRatio).toHaveBeenCalledWith(1)
    renderer.seek(-1)
    expect(mocked.pixelRatio).toHaveBeenLastCalledWith(1.5)
    expect(frames.size).toBe(0)
    renderer.dispose()
  })
})

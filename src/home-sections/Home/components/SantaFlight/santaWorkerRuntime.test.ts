import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSantaWorkerRuntime } from './santaWorkerRuntime'
import {
  isSantaInbound,
  isSantaOutbound,
  type SantaInbound,
  type SantaOutbound,
  type SantaScene,
  type SantaSceneModule,
  type SantaScheduler,
} from './santaWorkerProtocol'

const scheduler: SantaScheduler = {
  requestFrame: () => 1,
  cancelFrame: vi.fn(),
  setTimer: () => 1,
  clearTimer: vi.fn(),
  now: () => 0,
}
let post: ReturnType<typeof vi.fn<(message: SantaOutbound) => void>>
let close: ReturnType<typeof vi.fn<VoidFunction>>
let prepare: ReturnType<typeof vi.fn<() => Promise<void>>>
let create: ReturnType<typeof vi.fn<SantaSceneModule['createSantaScene']>>
let load: ReturnType<typeof vi.fn<() => Promise<SantaSceneModule>>>
let scene: SantaScene

/** Flush preparation boundaries while keeping GPU construction fully controlled by each test. */
async function flush(): Promise<void> {
  for (let i = 0; i < 12; i += 1) await Promise.resolve()
}

/** Supply a fresh transferred-canvas-shaped init payload for each worker lifetime. */
function init(): SantaInbound {
  return {
    type: 'init',
    canvas: {} as OffscreenCanvas,
    width: 1000,
    height: 700,
    devicePixelRatio: 2,
    previewTime: -1,
    isRunning: true,
  }
}

/** Inject only transport, worker canvas validation and GPU boundaries. */
function runtime() {
  return createSantaWorkerRuntime({
    postMessage: post,
    close,
    scheduler,
    loadRenderer: load,
    isCanvas: (value) => typeof value === 'object',
  })
}

beforeEach(() => {
  post = vi.fn()
  close = vi.fn()
  scene = { resize: vi.fn(), seek: vi.fn(), setRunning: vi.fn(), dispose: vi.fn() }
  prepare = vi.fn().mockResolvedValue(undefined)
  create = vi.fn().mockResolvedValue(scene)
  load = vi.fn().mockResolvedValue({ prepareSantaAssets: prepare, createSantaScene: create })
})

describe('Santa worker initialization', () => {
  it('announces hello before loading renderer code and applies the latest prepared configuration', async () => {
    const worker = runtime()
    expect(post).toHaveBeenCalledWith({ type: 'hello' })
    expect(load).not.toHaveBeenCalled()
    let finish: VoidFunction = vi.fn()
    prepare.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    worker.receive(init())
    await flush()
    worker.receive({ type: 'seek', seconds: 18 })
    worker.receive({ type: 'resize', width: 400, height: 800, devicePixelRatio: 3 })
    worker.receive({ type: 'run', value: false })
    finish()
    await flush()
    expect(create).not.toHaveBeenCalled()
    worker.receive({ type: 'run', value: true })
    await flush()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ width: 400, height: 800, previewTime: 18 }),
    )
    expect(scene.seek).toHaveBeenLastCalledWith(18)
    expect(scene.setRunning).toHaveBeenLastCalledWith(true)
    expect(prepare).toHaveBeenCalledOnce()
    expect(post).toHaveBeenLastCalledWith({ type: 'ready' })
  })

  it.each(['pause', 'dispose'] as const)(
    'does not present a scene completed after %s during compilation',
    async (loss) => {
      const worker = runtime()
      let finish: (value: SantaScene) => void = vi.fn()
      create.mockImplementationOnce(
        () =>
          new Promise<SantaScene>((resolve) => {
            finish = resolve
          }),
      )
      worker.receive(init())
      await flush()
      worker.receive({ type: 'seek', seconds: 18 })
      const signal = create.mock.lastCall?.[0].signal
      if (!signal) throw new Error('Expected a local cancellation signal')
      expect(signal.aborted).toBe(false)
      worker.receive(loss === 'pause' ? { type: 'run', value: false } : { type: 'dispose' })
      expect(signal.aborted).toBe(loss === 'dispose')
      finish(scene)
      await flush()
      if (loss === 'dispose') {
        expect(scene.dispose).toHaveBeenCalledOnce()
        expect(post).not.toHaveBeenCalledWith({ type: 'ready' })
        expect(close).toHaveBeenCalledOnce()
        expect(scene.setRunning).not.toHaveBeenCalled()
      } else {
        expect(scene.seek).toHaveBeenLastCalledWith(18)
        expect(scene.setRunning).toHaveBeenLastCalledWith(false)
        worker.receive({ type: 'run', value: true })
        expect(scene.setRunning).toHaveBeenLastCalledWith(true)
        expect(create).toHaveBeenCalledOnce()
      }
    },
  )

  it('cannot allocate after disposal during loading and ignores subsequent controls', async () => {
    let finish: VoidFunction = vi.fn()
    prepare.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const worker = runtime()
    worker.receive(init())
    await flush()
    worker.receive({ type: 'dispose' })
    finish()
    worker.receive({ type: 'run', value: true })
    await flush()
    expect(create).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalledWith({ type: 'ready' })
  })

  it('reports failed preparation once and rejects malformed or duplicate initialization', async () => {
    prepare.mockRejectedValueOnce(new Error('Missing model'))
    const worker = runtime()
    worker.receive(init())
    await flush()
    expect(post).toHaveBeenLastCalledWith({ type: 'error' })
    worker.receive({ type: 'run', value: true })
    await flush()
    expect(prepare).toHaveBeenCalledOnce()
    worker.receive(init())
    worker.receive({ type: 'resize', width: NaN, height: 2, devicePixelRatio: 1 })
    expect(post.mock.calls.filter(([value]) => value.type === 'error')).toHaveLength(3)
  })

  it('validates input shape, dimensions, times and outbound state', () => {
    for (const value of [
      null,
      {},
      { type: 'run', value: 1 },
      { type: 'seek', seconds: Infinity },
      { type: 'resize', width: 0, height: 2, devicePixelRatio: 1 },
      { ...init(), canvas: null },
    ])
      expect(isSantaInbound(value)).toBe(false)
    expect(isSantaInbound(init())).toBe(true)
    expect(isSantaOutbound({ type: 'state', state: { phase: 'near', running: false } })).toBe(true)
    expect(isSantaOutbound({ type: 'state', state: { phase: 'unknown' } })).toBe(false)
    expect(isSantaOutbound({ type: 'garbage' })).toBe(false)
    const worker = createSantaWorkerRuntime({
      postMessage: post,
      close,
      scheduler,
      loadRenderer: load,
      isCanvas: () => false,
    })
    worker.receive(init())
    expect(post).toHaveBeenLastCalledWith({ type: 'error' })
    expect(load).not.toHaveBeenCalled()
  })
})

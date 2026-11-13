import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSantaController } from './santaController'
import type { SantaRenderer, SantaScene } from './santaWorkerProtocol'

const mocked = vi.hoisted(() => ({
  prepare: vi.fn<() => Promise<void>>(),
  create: vi.fn(),
  resize: vi.fn(),
  seek: vi.fn(),
  run: vi.fn(),
  dispose: vi.fn(),
}))
vi.mock('./santaRenderer', () => ({
  prepareSantaAssets: mocked.prepare,
  createSantaScene: mocked.create,
}))

let workers: FakeWorker[]
let host: HTMLDivElement
let controller: SantaRenderer | null
let failConstructor = false
let failPost = false
let failTransfer = false
let observerCallback: ResizeObserverCallback

/** Model transport events while retaining real controller preparation and timeout flow. */
class FakeWorker extends EventTarget {
  terminate = vi.fn()
  postMessage = vi.fn(() => {
    if (failPost) throw new Error('Post failed')
  })
  /** Record constructors separately so unsupported and failed startup can be distinguished. */
  constructor() {
    super()
    if (failConstructor) throw new Error('Worker unavailable')
    workers.push(this)
  }
  /** Deliver structured data through the browser event contract. */
  reply(data: unknown): void {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}

/** Flush module loading without ticking handshake or teardown deadlines. */
async function flush(): Promise<void> {
  await vi.dynamicImportSettled()
  for (let i = 0; i < 12; i += 1) await Promise.resolve()
}

/** Return the paused scene handle at the GPU boundary. */
function scene(): SantaScene {
  return {
    resize: mocked.resize,
    seek: mocked.seek,
    setRunning: mocked.run,
    dispose: mocked.dispose,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  workers = []
  controller = null
  failConstructor = failPost = failTransfer = false
  mocked.prepare.mockResolvedValue(undefined)
  mocked.create.mockResolvedValue(scene())
  vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      /** Capture CSS resize delivery without mocking controller state. */
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback
      }
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
  Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', {
    configurable: true,
    value: vi.fn(() => {
      if (failTransfer) throw new Error('Transfer failed')
      return {}
    }),
  })
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(() => {
  controller?.dispose()
  vi.runOnlyPendingTimers()
  host.remove()
  delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>).transferControlToOffscreen
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Santa controller backend lifecycle', () => {
  it('waits for hello, transfers once and keeps the canvas for seeks and resizes', () => {
    controller = createSantaController(host, -1)
    const canvas = host.firstElementChild
    expect(host.querySelector('canvas')?.style.width).toBe('1px')
    expect(host.querySelector('canvas')?.style.height).toBe('1px')
    controller.setRunning(true)
    controller.seek(18)
    expect(workers[0].postMessage).not.toHaveBeenCalled()
    workers[0].reply({ type: 'hello' })
    expect(workers[0].postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'init', previewTime: 18, isRunning: true }),
      [{}],
    )
    workers[0].reply({ type: 'ready' })
    workers[0].reply({ type: 'state', state: { phase: 'near' } })
    controller.seek(-1)
    Object.defineProperty(host, 'clientWidth', { value: 400 })
    observerCallback([], {} as ResizeObserver)
    expect(host.querySelector('canvas')?.style.width).toBe('400px')
    expect(host.querySelector('canvas')?.style.height).toBe('1px')
    expect(workers[0].postMessage).toHaveBeenLastCalledWith(
      { type: 'resize', width: 400, height: 1, devicePixelRatio: 1 },
      [],
    )
    expect(host.dataset).toMatchObject({ status: 'ready', phase: 'near', backend: 'worker' })
    expect(host.firstElementChild).toBe(canvas)
    expect(host.childElementCount).toBe(1)
    expect(mocked.prepare).not.toHaveBeenCalled()
  })

  it.each([
    'unsupported',
    'no-transfer',
    'constructor',
    'transfer',
    'post',
    'error',
    'messageerror',
    'invalid',
    'hello-timeout',
  ] as const)(
    'falls back once after %s and replaces only a transferred canvas',
    async (failure) => {
      if (failure === 'unsupported') vi.stubGlobal('Worker', undefined)
      if (failure === 'no-transfer')
        Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', {
          configurable: true,
          value: undefined,
        })
      if (failure === 'constructor') failConstructor = true
      if (failure === 'transfer') failTransfer = true
      controller = createSantaController(host, -1)
      const canvas = host.firstElementChild
      controller.setRunning(true)
      if (failure === 'post') failPost = true
      if (['transfer', 'post'].includes(failure)) workers[0].reply({ type: 'hello' })
      if (failure === 'error' || failure === 'messageerror')
        workers[0].dispatchEvent(new Event(failure))
      if (failure === 'invalid') workers[0].reply({ type: 'state', state: { running: 'yes' } })
      if (failure === 'hello-timeout') vi.advanceTimersByTime(3_000)
      await flush()
      expect(host.dataset.backend).toBe('main')
      expect(mocked.create).toHaveBeenCalledOnce()
      expect(mocked.seek).toHaveBeenLastCalledWith(-1)
      expect(host.childElementCount).toBe(1)
      expect(host.firstElementChild === canvas).toBe(failure !== 'post')
      workers[0]?.dispatchEvent(new Event('error'))
      controller.setRunning(false)
      controller.setRunning(true)
      await flush()
      expect(mocked.create).toHaveBeenCalledOnce()
    },
  )

  it('counts only active startup time toward the ready deadline', async () => {
    controller = createSantaController(host, null)
    controller.setRunning(true)
    workers[0].reply({ type: 'hello' })
    vi.advanceTimersByTime(8_000)
    controller.setRunning(false)
    vi.advanceTimersByTime(60_000)
    expect(host.dataset.backend).toBe('worker')
    controller.setRunning(true)
    vi.advanceTimersByTime(11_999)
    expect(host.dataset.backend).toBe('worker')
    vi.advanceTimersByTime(1)
    await flush()
    expect(host.dataset.backend).toBe('main')
  })

  it.each(['pause', 'dispose'] as const)(
    'does not allocate a main context after assets finish during %s',
    async (loss) => {
      vi.stubGlobal('Worker', undefined)
      let finish: VoidFunction = vi.fn()
      mocked.prepare.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve
          }),
      )
      controller = createSantaController(host, -1)
      controller.setRunning(true)
      await flush()
      if (loss === 'dispose') controller.dispose()
      else controller.setRunning(false)
      finish()
      await flush()
      expect(mocked.create).not.toHaveBeenCalled()
      if (loss === 'pause') {
        controller.seek(18)
        controller.setRunning(true)
        await flush()
        expect(mocked.create).toHaveBeenCalledWith(expect.objectContaining({ previewTime: 18 }))
        expect(mocked.prepare).toHaveBeenCalledOnce()
      }
    },
  )

  it('applies controls received during compile without drawing a hidden or stale pose', async () => {
    vi.stubGlobal('Worker', undefined)
    let finish: (value: SantaScene) => void = vi.fn()
    mocked.create.mockImplementationOnce(
      () =>
        new Promise<SantaScene>((resolve) => {
          finish = resolve
        }),
    )
    controller = createSantaController(host, -1)
    controller.setRunning(true)
    await flush()
    controller.seek(18)
    controller.setRunning(false)
    finish(scene())
    await flush()
    expect(mocked.seek).toHaveBeenLastCalledWith(18)
    expect(mocked.run).toHaveBeenLastCalledWith(false)
    controller.setRunning(true)
    expect(mocked.run).toHaveBeenLastCalledWith(true)
  })

  it('never retries a failed main backend', async () => {
    vi.stubGlobal('Worker', undefined)
    mocked.create.mockRejectedValueOnce(new Error('No WebGL'))
    controller = createSantaController(host, null)
    controller.setRunning(true)
    await flush()
    expect(host.dataset.status).toBe('unavailable')
    controller.setRunning(false)
    controller.setRunning(true)
    await flush()
    expect(mocked.create).toHaveBeenCalledOnce()
  })

  it('disposes a main scene completed after controller teardown without publishing ready', async () => {
    vi.stubGlobal('Worker', undefined)
    let finish: (value: SantaScene) => void = vi.fn()
    mocked.create.mockImplementationOnce(
      () =>
        new Promise<SantaScene>((resolve) => {
          finish = resolve
        }),
    )
    controller = createSantaController(host, -1)
    controller.setRunning(true)
    await flush()
    expect(mocked.create).toHaveBeenCalledOnce()
    const options = mocked.create.mock.lastCall?.[0]
    if (!(options?.signal instanceof AbortSignal))
      throw new Error('Expected a local cancellation signal')
    expect(options.signal.aborted).toBe(false)
    controller.dispose()
    expect(options.signal.aborted).toBe(true)
    finish(scene())
    await flush()
    expect(mocked.dispose).toHaveBeenCalledOnce()
    expect(mocked.run).not.toHaveBeenCalled()
    expect(host.dataset.status).toBe('loading')
  })

  it('terminates a ready worker before allocating fallback after a runtime transport error', async () => {
    controller = createSantaController(host, -1)
    controller.setRunning(true)
    workers[0].reply({ type: 'hello' })
    workers[0].reply({ type: 'ready' })
    const canvas = host.firstElementChild
    const error = new Event('error', { cancelable: true })
    workers[0].dispatchEvent(error)
    expect(error.defaultPrevented).toBe(true)
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    expect(host.firstElementChild).not.toBe(canvas)
    await flush()
    expect(mocked.create).toHaveBeenCalledOnce()
    expect(host.childElementCount).toBe(1)
  })

  it.each(['ack', 'timeout', 'post-failure'] as const)('bounds shutdown with %s', (ending) => {
    controller = createSantaController(host, null)
    const worker = workers[0]
    if (ending === 'post-failure') failPost = true
    controller.dispose()
    if (ending === 'ack') worker.reply({ type: 'disposed' })
    else vi.advanceTimersByTime(1_000)
    expect(worker.terminate).toHaveBeenCalledOnce()
    worker.reply({ type: 'hello' })
    expect(host.childElementCount).toBe(0)
    expect(mocked.create).not.toHaveBeenCalled()
  })
})

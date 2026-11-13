import {
  isSantaOutbound,
  validSantaTime,
  type SantaInbound,
  type SantaRenderer,
  type SantaScene,
  type SantaSceneModule,
  type SantaScheduler,
  type SantaState,
} from './santaWorkerProtocol'

export type { SantaRenderer } from './santaWorkerProtocol'

/** Keep browser clocks outside the scene so the same scheduler contract works in a worker. */
const scheduler: SantaScheduler = {
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
  setTimer: (callback, delay) => window.setTimeout(callback, delay),
  clearTimer: (handle) => window.clearTimeout(handle),
  now: () => performance.now(),
}

/** Own one displayed canvas, preferring the worker and falling back once to the same scene. */
export function createSantaController(
  container: HTMLDivElement,
  initialTime: number | null,
): SantaRenderer {
  const lifetime = new AbortController()
  let disposed = false
  let running = false
  let previewTime = validSantaTime(initialTime) ? initialTime : null
  let width = Math.max(1, container.clientWidth)
  let height = Math.max(1, container.clientHeight)
  let devicePixelRatio = window.devicePixelRatio || 1
  let canvas = makeCanvas()
  let worker: Worker | null = null
  let transferred = false
  let initialized = false
  let ready = false
  let fallback = false
  let unavailable = false
  let preparing = false
  let prepared: Promise<SantaSceneModule> | null = null
  let scene: SantaScene | null = null
  let helloTimer: number | null = null
  let startupTimer: number | null = null
  let startupStarted: number | null = null
  let remainingStartup = 20_000
  let teardownTimer: number | null = null

  /** Keep CSS sizing on the UI thread; transferred canvas attributes belong to its renderer. */
  function makeCanvas(): HTMLCanvasElement {
    const next = document.createElement('canvas')
    next.setAttribute('aria-hidden', 'true')
    // Match the integer render viewport so fractional host bounds cannot resample the image.
    next.style.width = `${width}px`
    next.style.height = `${height}px`
    next.style.display = 'block'
    container.append(next)
    return next
  }

  /** Write only changed lifecycle metadata, never frame-by-frame DOM state. */
  function state(value: SantaState): void {
    if (disposed) return
    for (const [key, next] of Object.entries(value)) {
      if (next !== undefined && container.dataset[key] !== String(next))
        container.dataset[key] = String(next)
    }
    if (value.status === 'unavailable') canvas.style.visibility = 'hidden'
  }

  /** Cancel startup deadlines while preserving the active-time budget. */
  function pauseDeadline(): void {
    if (startupTimer !== null) scheduler.clearTimer(startupTimer)
    if (startupStarted !== null)
      remainingStartup = Math.max(0, remainingStartup - (scheduler.now() - startupStarted))
    startupTimer = null
    startupStarted = null
  }

  /** Apply the ready deadline only while the page actually asks the worker to render. */
  function deadline(): void {
    pauseDeadline()
    if (!disposed && initialized && !ready && running && !fallback) {
      startupStarted = scheduler.now()
      startupTimer = scheduler.setTimer(startFallback, remainingStartup)
    }
  }

  /** Remove all worker listeners before termination so queued failures cannot start another backend. */
  function terminate(): void {
    if (teardownTimer !== null) scheduler.clearTimer(teardownTimer)
    teardownTimer = null
    if (!worker) return
    worker.removeEventListener('message', message)
    worker.removeEventListener('error', workerError)
    worker.removeEventListener('messageerror', workerError)
    worker.terminate()
    worker = null
  }

  /** Convert constructor, transfer and posting failures into the single main-thread attempt. */
  function post(value: SantaInbound, transfer: Transferable[] = []): void {
    try {
      worker?.postMessage(value, transfer)
    } catch {
      startFallback()
    }
  }

  /** Allocate the fallback only after prepared assets and a fresh eligibility check. */
  function prepareMain(): void {
    if (disposed || preparing || unavailable || scene) return
    preparing = true
    prepared ??= import('./santaRenderer').then(async (rendererModule) => {
      if (!disposed) await rendererModule.prepareSantaAssets()
      return rendererModule
    })
    void prepared
      .then((rendererModule) => {
        if (disposed || !running) return null
        return rendererModule.createSantaScene({
          canvas,
          width,
          height,
          devicePixelRatio,
          previewTime,
          scheduler,
          onState: state,
          signal: lifetime.signal,
        })
      })
      .then((created) => {
        if (!created) return
        if (disposed) {
          created.dispose()
          return
        }
        scene = created
        scene.resize(width, height, devicePixelRatio)
        scene.seek(previewTime)
        scene.setRunning(running)
        state({ status: 'ready', running })
      })
      .catch(() => {
        if (!disposed) {
          scene?.dispose()
          scene = null
          unavailable = true
          state({ status: 'unavailable', running: false })
        }
      })
      .finally(() => {
        preparing = false
      })
  }

  /** Replace a transferred canvas and attempt the shared main-thread scene exactly once. */
  function startFallback(): void {
    if (disposed || fallback) return
    fallback = true
    if (helloTimer !== null) scheduler.clearTimer(helloTimer)
    helloTimer = null
    pauseDeadline()
    terminate()
    if (transferred) {
      canvas.remove()
      canvas = makeCanvas()
    }
    container.dataset.backend = 'main'
    void prepareMain()
  }

  /** Treat worker transport failures as a rendering failure, leaving the rest of the page usable. */
  function workerError(event: Event): void {
    event.preventDefault()
    startFallback()
  }

  /** Transfer only after the entry point proves it can respond, before loading Three or models. */
  function message(event: MessageEvent<unknown>): void {
    if (disposed) {
      if (isSantaOutbound(event.data) && event.data.type === 'disposed') terminate()
      return
    }
    if (!isSantaOutbound(event.data)) {
      startFallback()
      return
    }
    const value = event.data
    if (value.type === 'hello') {
      if (initialized) {
        startFallback()
        return
      }
      if (helloTimer !== null) scheduler.clearTimer(helloTimer)
      helloTimer = null
      try {
        const offscreen = canvas.transferControlToOffscreen()
        transferred = true
        initialized = true
        post(
          {
            type: 'init',
            canvas: offscreen,
            width,
            height,
            devicePixelRatio,
            previewTime,
            isRunning: running,
          },
          [offscreen],
        )
        deadline()
      } catch {
        startFallback()
      }
    } else if (value.type === 'ready') {
      if (!initialized) {
        startFallback()
        return
      }
      ready = true
      pauseDeadline()
      state({ status: 'ready', running })
    } else if (value.type === 'state') {
      if (!initialized) {
        startFallback()
        return
      }
      if (value.state.status === 'unavailable') startFallback()
      else state({ ...value.state, running })
    } else {
      startFallback()
    }
  }

  /** Follow CSS viewport changes without reallocating the healthy canvas or restarting its timeline. */
  function resize(): void {
    if (disposed) return
    const nextWidth = Math.max(1, container.clientWidth)
    const nextHeight = Math.max(1, container.clientHeight)
    const nextRatio = window.devicePixelRatio || 1
    if (width === nextWidth && height === nextHeight && devicePixelRatio === nextRatio) return
    width = nextWidth
    height = nextHeight
    devicePixelRatio = nextRatio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    if (fallback) scene?.resize(width, height, devicePixelRatio)
    else if (initialized) post({ type: 'resize', width, height, devicePixelRatio })
  }

  const observer = new ResizeObserver(resize)
  observer.observe(container)
  state({ running: false })
  container.dataset.status = 'loading'
  if (typeof Worker !== 'undefined' && typeof canvas.transferControlToOffscreen === 'function') {
    try {
      worker = new Worker(new URL('./santa.worker.ts', import.meta.url), { type: 'module' })
      container.dataset.backend = 'worker'
      worker.addEventListener('message', message)
      worker.addEventListener('error', workerError)
      worker.addEventListener('messageerror', workerError)
      helloTimer = scheduler.setTimer(startFallback, 3_000)
    } catch {
      startFallback()
    }
  } else startFallback()

  return {
    /** Pause synchronously and preserve the latest eligibility through preparation and compilation. */
    setRunning(value) {
      if (disposed || running === value) return
      running = value
      state({ running: value })
      if (fallback) {
        scene?.setRunning(value)
        if (value) void prepareMain()
      } else {
        if (initialized) post({ type: 'run', value })
        deadline()
      }
    },
    /** Retain the newest preview pose while the backend is still starting. */
    seek(seconds) {
      if (disposed) return
      previewTime = validSantaTime(seconds) ? seconds : null
      if (fallback) scene?.seek(previewTime)
      else if (initialized) post({ type: 'seek', seconds: previewTime })
    },
    /** Release the main scene immediately and bound worker shutdown to one second. */
    dispose() {
      if (disposed) return
      disposed = true
      lifetime.abort()
      observer.disconnect()
      if (helloTimer !== null) scheduler.clearTimer(helloTimer)
      pauseDeadline()
      scene?.dispose()
      if (worker) {
        try {
          worker.postMessage({ type: 'dispose' } satisfies SantaInbound)
          teardownTimer = scheduler.setTimer(terminate, 1_000)
        } catch {
          terminate()
        }
      }
      canvas.remove()
    },
  }
}

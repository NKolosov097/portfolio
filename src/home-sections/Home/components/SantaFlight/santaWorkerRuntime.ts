import {
  isSantaInbound,
  type SantaInbound,
  type SantaOutbound,
  type SantaScene,
  type SantaSceneModule,
  type SantaScheduler,
} from './santaWorkerProtocol'

interface WorkerRuntimeOptions {
  postMessage: (message: SantaOutbound) => void
  close: VoidFunction
  scheduler: SantaScheduler
  loadRenderer: () => Promise<SantaSceneModule>
  isCanvas: (canvas: unknown) => boolean
}

/** Own worker initialization while retaining the latest controls across every asynchronous boundary. */
export function createSantaWorkerRuntime(options: WorkerRuntimeOptions): {
  receive: (message: unknown) => void
} {
  let init: Extract<SantaInbound, { type: 'init' }> | null = null
  const lifetime = new AbortController()
  let disposed = false
  let preparing = false
  let failed = false
  let prepared: Promise<SantaSceneModule> | null = null
  let scene: SantaScene | null = null

  /** Prepare CPU assets once, and allocate a context only while the host is eligible. */
  function reconcile(): void {
    if (!init || disposed || failed || preparing || scene) return
    preparing = true
    prepared ??= Promise.resolve()
      .then(options.loadRenderer)
      .then(async (rendererModule) => {
        if (!disposed) await rendererModule.prepareSantaAssets()
        return rendererModule
      })
    void prepared
      .then((rendererModule) => {
        if (disposed || !init?.isRunning) return null
        return rendererModule.createSantaScene({
          ...init,
          scheduler: options.scheduler,
          signal: lifetime.signal,
          // Late state notifications cannot resurrect a disposed worker.
          onState: (state) => {
            if (!disposed) options.postMessage({ type: 'state', state })
          },
        })
      })
      .then((created) => {
        if (!created) return
        if (disposed || !init) {
          created.dispose()
          return
        }
        scene = created
        scene.resize(init.width, init.height, init.devicePixelRatio)
        scene.seek(init.previewTime)
        scene.setRunning(init.isRunning)
        options.postMessage({ type: 'ready' })
      })
      .catch(() => {
        if (!disposed) {
          scene?.dispose()
          scene = null
          failed = true
          options.postMessage({ type: 'error' })
        }
      })
      .finally(() => {
        preparing = false
      })
  }

  options.postMessage({ type: 'hello' })
  return {
    /** Validate worker input and synchronously stop an existing scene before awaiting anything. */
    receive(message) {
      if (disposed) return
      if (!isSantaInbound(message)) {
        options.postMessage({ type: 'error' })
        return
      }
      if (message.type === 'dispose') {
        disposed = true
        lifetime.abort()
        scene?.dispose()
        options.postMessage({ type: 'disposed' })
        options.close()
        return
      }
      if (message.type === 'init') {
        if (init || !options.isCanvas(message.canvas)) {
          options.postMessage({ type: 'error' })
          return
        }
        init = message
      } else {
        if (!init) {
          options.postMessage({ type: 'error' })
          return
        }
        if (message.type === 'run') {
          init.isRunning = message.value
          scene?.setRunning(message.value)
        } else if (message.type === 'seek') {
          init.previewTime = message.seconds
          scene?.seek(message.seconds)
        } else {
          Object.assign(init, message, { type: 'init' })
          scene?.resize(message.width, message.height, message.devicePixelRatio)
        }
      }
      void reconcile()
    },
  }
}

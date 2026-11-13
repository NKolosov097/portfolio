import { createSantaWorkerRuntime } from './santaWorkerRuntime'
import type { SantaOutbound } from './santaWorkerProtocol'

// This worker-only entry uses a narrow scope assertion without mixing worker and DOM libraries.
const scope = self as {
  postMessage: (message: SantaOutbound) => void
  close: VoidFunction
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  requestAnimationFrame?: (callback: FrameRequestCallback) => number
  cancelAnimationFrame?: (handle: number) => void
  setTimeout: (callback: VoidFunction, delay: number) => number
  clearTimeout: (handle: number) => void
}
const requestFrame = scope.requestAnimationFrame?.bind(scope)
const cancelFrame = scope.cancelAnimationFrame?.bind(scope)
const runtime = createSantaWorkerRuntime({
  postMessage: (message) => scope.postMessage(message),
  close: () => scope.close(),
  isCanvas: (canvas) => typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas,
  loadRenderer: () => import('./santaRenderer'),
  scheduler: {
    requestFrame: (callback) =>
      requestFrame && cancelFrame
        ? requestFrame(callback)
        : scope.setTimeout(() => callback(performance.now()), 1_000 / 60),
    cancelFrame: (handle) => {
      if (requestFrame && cancelFrame) cancelFrame(handle)
      else scope.clearTimeout(handle)
    },
    setTimer: (callback, delay) => scope.setTimeout(callback, delay),
    clearTimer: (handle) => scope.clearTimeout(handle),
    now: () => performance.now(),
  },
})
scope.onmessage = (event) => runtime.receive(event.data)

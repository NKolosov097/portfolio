export interface SantaRenderer {
  setRunning: (running: boolean) => void
  seek: (seconds: number | null) => void
  dispose: VoidFunction
}

export interface SantaScene extends SantaRenderer {
  resize: (width: number, height: number, devicePixelRatio: number) => void
}

export interface SantaScheduler {
  requestFrame: (callback: (timestamp: number) => void) => number
  cancelFrame: (handle: number) => void
  setTimer: (callback: VoidFunction, delay: number) => number
  clearTimer: (handle: number) => void
  now: () => number
}

export interface SantaState {
  phase?: 'model' | 'distant' | 'turnaround' | 'near' | 'rest'
  running?: boolean
  status?: 'ready' | 'unavailable'
}

export interface SantaViewport {
  width: number
  height: number
  devicePixelRatio: number
}

export interface SantaSceneOptions extends SantaViewport {
  canvas: HTMLCanvasElement | OffscreenCanvas
  previewTime: number | null
  scheduler: SantaScheduler
  onState: (state: SantaState) => void
  signal: AbortSignal
}

export interface SantaSceneModule {
  prepareSantaAssets: () => Promise<void>
  createSantaScene: (options: SantaSceneOptions) => Promise<SantaScene>
}

export type SantaInbound =
  | ({
      type: 'init'
      canvas: OffscreenCanvas
      previewTime: number | null
      isRunning: boolean
    } & SantaViewport)
  | ({ type: 'resize' } & SantaViewport)
  | { type: 'run'; value: boolean }
  | { type: 'seek'; seconds: number | null }
  | { type: 'dispose' }

export type SantaOutbound =
  | { type: 'hello' | 'ready' | 'disposed' }
  | { type: 'state'; state: SantaState }
  | { type: 'error' }

/** Restrict cross-thread payloads to records before inspecting their discriminants. */
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Reject nonfinite or nonpositive dimensions and device ratios at the thread boundary. */
function viewport(value: Record<string, unknown>): boolean {
  return ['width', 'height', 'devicePixelRatio'].every(
    (key) => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] > 0,
  )
}

/** Keep deterministic model mode and finite route seeks while rejecting invalid time values. */
export function validSantaTime(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

/** Validate control messages without importing the rendering implementation. */
export function isSantaInbound(value: unknown): value is SantaInbound {
  if (!record(value)) return false
  switch (value.type) {
    case 'init':
      return (
        viewport(value) &&
        record(value.canvas) &&
        validSantaTime(value.previewTime) &&
        typeof value.isRunning === 'boolean'
      )
    case 'resize':
      return viewport(value)
    case 'run':
      return typeof value.value === 'boolean'
    case 'seek':
      return validSantaTime(value.seconds)
    case 'dispose':
      return true
    default:
      return false
  }
}

/** Accept only known state fields so malformed worker replies trigger the fallback. */
export function isSantaOutbound(value: unknown): value is SantaOutbound {
  if (!record(value)) return false
  if (['hello', 'ready', 'disposed', 'error'].includes(String(value.type))) return true
  if (value.type !== 'state' || !record(value.state)) return false
  const state = value.state
  return (
    (state.phase === undefined ||
      ['model', 'distant', 'turnaround', 'near', 'rest'].includes(String(state.phase))) &&
    (state.running === undefined || typeof state.running === 'boolean') &&
    (state.status === undefined || state.status === 'ready' || state.status === 'unavailable')
  )
}

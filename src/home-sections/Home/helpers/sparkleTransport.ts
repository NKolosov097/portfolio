import {
  ESparkleTier,
  ESparkleWorkerOutboundType,
  TSparkleWorkerOutbound,
} from '@/home-sections/Home/types/home.type'

/** Every tier the worker is allowed to report back, used to validate untrusted messages. */
const KNOWN_TIERS: string[] = [
  ESparkleTier.high,
  ESparkleTier.medium,
  ESparkleTier.low,
  ESparkleTier.static,
]

export interface ISparkleWorkerCapabilities {
  /** Whether the environment can construct a `Worker` at all. */
  hasWorker: boolean
  /** Whether the canvas can be detached with `transferControlToOffscreen`. */
  hasOffscreenCanvas: boolean
  /** Whether the visitor asked for reduced motion, which needs no loop and therefore no worker. */
  isReducedMotion: boolean
}

/** Decides whether the worker transport is worth attempting; `false` simply leaves the main thread in charge. */
export const canUseSparkleWorker = (capabilities: ISparkleWorkerCapabilities): boolean =>
  capabilities.hasWorker && capabilities.hasOffscreenCanvas && !capabilities.isReducedMotion

/**
 * Narrows a message that arrived over `postMessage`; a structured-clone payload
 * is untyped on arrival, so it is validated rather than trusted.
 */
export const isSparkleWorkerMessage = (value: unknown): value is TSparkleWorkerOutbound => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const type = Reflect.get(value, 'type')

  if (type === ESparkleWorkerOutboundType.ready) {
    return true
  }

  if (type !== ESparkleWorkerOutboundType.tier) {
    return false
  }

  const tier = Reflect.get(value, 'tier')

  return typeof tier === 'string' && KNOWN_TIERS.includes(tier)
}

export const enum ESparkleTier {
  high = 'high',
  medium = 'medium',
  low = 'low',
  static = 'static',
}

export interface IPointerPosition {
  /** Horizontal position in CSS pixels, relative to the field's top-left corner. */
  x: number
  /** Vertical position in CSS pixels, relative to the field's top-left corner. */
  y: number
}

export interface ISparklePointer {
  /** Eased horizontal position the particles actually react to; lags the raw pointer. */
  x: number
  /** Eased vertical position the particles actually react to; lags the raw pointer. */
  y: number
  /** 0–1 ramp of how strongly the pointer currently pulls on the field; eases to 0 once it leaves. */
  intensity: number
}

export interface ISparkleParticle {
  /** Horizontal position in CSS pixels within the field. */
  x: number
  /** Vertical position in CSS pixels within the field. */
  y: number
  /** Resting glyph edge length in CSS pixels, before any pointer boost. */
  size: number
  /** Resting alpha, before twinkle and pointer boost. */
  opacity: number
  /** Current position in the twinkle cycle, in radians. */
  twinklePhase: number
  /** Radians per millisecond the twinkle phase advances. */
  twinkleSpeed: number
  /** Horizontal drift in CSS pixels per millisecond. */
  velocityX: number
  /** Vertical drift in CSS pixels per millisecond. */
  velocityY: number
  /** Current glyph rotation in radians. */
  rotation: number
  /** Radians per millisecond the glyph rotates. */
  rotationSpeed: number
  /** 0–1 parallax weight; larger particles read as nearer and are displaced further by the pointer. */
  depth: number
}

export interface ISparkleInfluence {
  /** 0–1 strength of the pointer on one particle, already scaled by the pointer's intensity ramp. */
  strength: number
  /** Horizontal unit vector pointing away from the pointer; 0 when there is no influence. */
  directionX: number
  /** Vertical unit vector pointing away from the pointer; 0 when there is no influence. */
  directionY: number
}

export interface ISparkleViewport {
  /** Field width in CSS pixels. */
  width: number
  /** Field height in CSS pixels. */
  height: number
  /** Ratio between backing-store pixels and CSS pixels, already capped by the active tier. */
  devicePixelRatio: number
}

export interface ISparkleTierConfig {
  /** Hard ceiling on particles, whatever the field area suggests. */
  maxParticleCount: number
  /** Highest device pixel ratio the backing store may use at this tier. */
  maxDevicePixelRatio: number
  /** Whether sprites are baked with the brand-coloured glow. */
  hasGlow: boolean
  /** Whether this tier keeps a running frame loop rather than a single painted frame. */
  isAnimated: boolean
}

export interface ISparkleFieldConfig {
  /** Field area in CSS pixels² that warrants one particle. */
  areaPerParticle: number
  /** Floor on particle count so narrow viewports still read as a field. */
  minParticleCount: number
  /** Smallest resting glyph edge length in CSS pixels. */
  minSize: number
  /** Largest resting glyph edge length in CSS pixels. */
  maxSize: number
  /** Dimmest resting alpha. */
  minOpacity: number
  /** Brightest resting alpha. */
  maxOpacity: number
  /** Slowest drift in CSS pixels per millisecond. */
  minDriftSpeed: number
  /** Fastest drift in CSS pixels per millisecond. */
  maxDriftSpeed: number
  /** Slowest twinkle in radians per millisecond. */
  minTwinkleSpeed: number
  /** Fastest twinkle in radians per millisecond. */
  maxTwinkleSpeed: number
  /** Slowest rotation in radians per millisecond. */
  minRotationSpeed: number
  /** Fastest rotation in radians per millisecond. */
  maxRotationSpeed: number
  /** Distance in CSS pixels beyond which the pointer no longer affects a particle. */
  influenceRadius: number
  /** Extra size, as a multiple of the resting size, applied at full influence. */
  sizeBoost: number
  /** Extra alpha, as a multiple of the resting alpha, applied at full influence. */
  opacityBoost: number
  /** Largest outward push in CSS pixels applied at full influence and full depth. */
  displacement: number
  /** Fraction of the remaining distance the eased pointer covers per frame. */
  pointerLerp: number
  /** Upper bound in milliseconds on one simulation step, so a backgrounded tab cannot teleport the field. */
  maxFrameDelta: number
  /** How much of the resting alpha the twinkle modulates, 0–1. */
  twinkleDepth: number
}

export interface ISparkleGovernorThresholds {
  /** Number of frames sampled before any tier decision is taken. */
  windowSize: number
  /** p90 frame duration in milliseconds above which the tier steps down. */
  degradedFrameMs: number
  /** p90 frame duration in milliseconds above which the lowest animated tier gives up entirely. */
  criticalFrameMs: number
  /** p90 frame duration in milliseconds below which an upgrade may be considered. */
  healthyFrameMs: number
  /** Frames that must pass since the last tier change before an upgrade is allowed. */
  upgradeAfterFrames: number
}

export interface ISparkleGovernorState {
  /** Tier currently in force. */
  tier: ESparkleTier
  /** Most recent frame durations in milliseconds, oldest first, capped at the window size. */
  frameDurations: number[]
  /** Frames observed since the last tier change; gates upgrades. */
  framesSinceChange: number
  /** Whether the single upgrade permitted for the field's lifetime has been spent. */
  hasUpgraded: boolean
}

export interface ISparkleDeviceSignals {
  /** Logical CPU count, or `undefined` where the browser withholds it. */
  hardwareConcurrency?: number
  /** Approximate device RAM in gigabytes, or `undefined` where the browser withholds it. */
  deviceMemory?: number
  /** Physical device pixel ratio, before any tier cap. */
  devicePixelRatio: number
  /** Whether the primary input is coarse, which correlates with mobile-class GPUs. */
  isCoarsePointer: boolean
}

export interface ISparkleSpriteAtlas<TImage = CanvasImageSource> {
  /** Rasterised frames indexed as `[sizeBucket][rotationStep]`. */
  frames: TImage[][]
  /** CSS-pixel glyph size each bucket was rasterised for, ascending. */
  bucketSizes: number[]
  /** Sprite box size as a multiple of the glyph size; the drawn box is larger than the glyph. */
  paddingFactor: number
}

export interface ISparkleDrawContext<TImage = CanvasImageSource> {
  /** Alpha applied to the next draw call. */
  globalAlpha: number
  /** Wipes a rectangle of the backing store, in device pixels. */
  clearRect(x: number, y: number, width: number, height: number): void
  /** Blits one sprite frame, in device pixels. */
  drawImage(image: TImage, dx: number, dy: number, dWidth: number, dHeight: number): void
}

export interface ISparkleRasterContext {
  /** Colour the glyph body is filled with. */
  fillStyle: string | CanvasGradient | CanvasPattern
  /** Blur radius of the baked glow, in device pixels. */
  shadowBlur: number
  /** Colour of the baked glow. */
  shadowColor: string
  /** Pushes the transform and style stack before one glyph is baked. */
  save(): void
  /** Pops the transform and style stack after one glyph is baked. */
  restore(): void
  /** Moves the origin, in device pixels. */
  translate(x: number, y: number): void
  /** Rotates around the current origin, in radians. */
  rotate(angle: number): void
  /** Scales the glyph's viewBox units up to device pixels. */
  scale(x: number, y: number): void
  /** Fills the glyph outline. */
  fill(path: Path2D): void
}

export interface ISpriteSurface {
  /** Surface handed to `drawImage` once the glyph is baked into it. */
  image: CanvasImageSource
  /** Context used exactly once, to bake the glyph. */
  context: ISparkleRasterContext
}

/** Allocates a square raster surface of `size` device pixels, or returns `null` when 2D is unavailable. */
export type TSpriteSurfaceFactory = (size: number) => ISpriteSurface | null

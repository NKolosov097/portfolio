/** Motion presets the one field engine can be driven with, one per seasonal appearance. */
export const enum ESparkleFieldPreset {
  sparkles = 'sparkles',
  snow = 'snow',
}

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

export interface ISparkleWind {
  /** Current horizontal wind in CSS pixels per millisecond. */
  value: number
  /** The value the wind is easing toward. */
  target: number
  /** Milliseconds until a new target is drawn. */
  retargetRemainingMs: number
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
  /** Radians per millisecond the glyph rotates; sign is random, so particles do not spin in lockstep. */
  rotationSpeed: number
  /** 0–1 parallax weight; larger particles read as nearer and are displaced further by the pointer. */
  depth: number
  /** How strongly this particle answers to the shared wind; larger for nearer particles, for parallax. */
  windFactor: number
  /** Current multiplier on this particle's drift, eased toward `targetSpeedScale`. */
  speedScale: number
  /** Multiplier `speedScale` is currently easing toward. */
  targetSpeedScale: number
  /** Milliseconds until a new `targetSpeedScale` is drawn. */
  retargetRemainingMs: number
  /** How far the crystal's plane is currently tipped away from the viewer, in radians. */
  tiltPhase: number
  /** Radians per millisecond the tilt phase advances. */
  tiltSpeed: number
  /** In-view-plane direction the crystal tips about, in radians. */
  tiltAxis: number
  /** Radians per millisecond the tilt axis drifts. */
  tiltAxisSpeed: number
  /** Current position in the lateral sway cycle, in radians. */
  swayPhase: number
  /** Current position in the secondary, faster sway cycle, in radians; its own independent phase. */
  swayPhaseSecondary: number
  /** Radians per millisecond the lateral sway advances; sign is random, so sway does not lockstep. */
  swaySpeed: number
  /** Largest lateral sway offset for this particle, in CSS pixels. */
  swayAmplitude: number
  /** Current sideways speed in CSS pixels per millisecond, lagging the flutter target so a reversal cannot be instant. */
  lateralVelocity: number
  /** Which baked glyph shape this particle draws, indexing `ISparkleFieldConfig.glyphPaths`. */
  variantIndex: number
  /** 0-1 weight on the resting alpha while a newly seeded particle fades in; 1 once it is fully lit. */
  entryAlpha: number
  /** Milliseconds left before this particle begins its fade-in, which staggers an arriving field. */
  entryDelayMs: number
  /** Whether the particle was seeded above the field and is still falling into it, so it must not wrap. */
  isFallingIn: boolean
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
  /** Outlines the atlas bakes, one per flake shape, authored in the shared glyph viewBox. */
  glyphPaths: string[]
  /** Stroke width in viewBox units; when set the outline is stroked instead of filled. */
  glyphStrokeWidth?: number
  /** Glow blur as a multiple of the glyph size, overriding the shared default. */
  glyphGlowRatio?: number
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
  /** 0–1 how much of the resting alpha is dictated by depth rather than drawn at random. */
  opacityDepthBias: number
  /** Slowest drift in CSS pixels per millisecond. */
  minDriftSpeed: number
  /** Fastest drift in CSS pixels per millisecond. */
  maxDriftSpeed: number
  /** 0–1 how much of the drift speed is dictated by depth rather than drawn at random. */
  speedDepthBias: number
  /** Fraction of random variation left on a depth-dictated speed. */
  speedJitter: number
  /** Narrowest drift heading in radians, measured clockwise from the positive x axis. */
  minDriftAngle: number
  /** Widest drift heading in radians; equal to the minimum plus a full turn for omnidirectional fields. */
  maxDriftAngle: number
  /** Slowest twinkle in radians per millisecond. */
  minTwinkleSpeed: number
  /** Fastest twinkle in radians per millisecond. */
  maxTwinkleSpeed: number
  /** Slowest rotation in radians per millisecond. */
  minRotationSpeed: number
  /** Fastest rotation in radians per millisecond. */
  maxRotationSpeed: number
  /** Slowest out-of-plane tumble in radians per millisecond; 0 disables tumbling entirely. */
  minTumbleSpeed: number
  /** Fastest out-of-plane tumble in radians per millisecond. */
  maxTumbleSpeed: number
  /** 0–1 how far a tilt squashes the glyph; 0 means no out-of-plane tumbling at all. */
  tumbleDepth: number
  /** Slowest drift of the tilt axis in radians per millisecond; 0 keeps the tilt axis fixed. */
  minTiltAxisSpeed: number
  /** Fastest drift of the tilt axis in radians per millisecond. */
  maxTiltAxisSpeed: number
  /** Slowest lateral sway in radians per millisecond; 0 disables sway entirely. */
  minSwaySpeed: number
  /** Fastest lateral sway in radians per millisecond. */
  maxSwaySpeed: number
  /** Largest sideways flutter speed a particle may reach, as a fraction of its own drift speed; 0 disables flutter. */
  maxSwayRatio: number
  /** Frequency of the secondary sway term, as a multiple of the primary sway speed. */
  swaySecondaryFrequency: number
  /** Amplitude of the secondary sway term, as a fraction of `swayAmplitude`. */
  swaySecondaryAmplitude: number
  /** Easing time constant in milliseconds for the lag between the flutter target and the actual lateral velocity, standing in for the crystal's inertia. */
  lateralTauMs: number
  /** Largest wind magnitude in CSS pixels per millisecond; 0 disables wind entirely. */
  maxWindSpeed: number
  /** Shortest time in milliseconds one wind target holds. */
  minWindRetargetMs: number
  /** Longest time in milliseconds one wind target holds. */
  maxWindRetargetMs: number
  /** Easing time constant in milliseconds for the wind value, so a gust ramps in rather than snaps. */
  windTauMs: number
  /** Smallest multiplier a particle's drift speed can be eased toward; 1 disables speed re-targeting. */
  minSpeedScale: number
  /** Largest multiplier a particle's drift speed can be eased toward; 1 disables speed re-targeting. */
  maxSpeedScale: number
  /** Shortest time in milliseconds one particle speed target holds. */
  minRetargetMs: number
  /** Longest time in milliseconds one particle speed target holds. */
  maxRetargetMs: number
  /** Easing time constant in milliseconds for a particle's speed scale. */
  speedTauMs: number
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
  /**
   * How far above the field an arriving population is seeded, in field heights. 0 seeds it in place;
   * a positive value makes the field fall in from above instead of appearing already spread out.
   */
  entrySpawnAboveRatio: number
  /** Window in milliseconds the per-particle fade-ins of an arriving field are scattered over. */
  entryStaggerMs: number
  /** How long one particle of an arriving field takes to reach its resting alpha, in milliseconds. */
  entryFadeMs: number
  /**
   * Multiplier the fall speed is ramped to once the field is being replaced, so the last particles
   * clear the bottom edge in seconds instead of minutes. 1 leaves a departing field at its own pace.
   */
  exitSpeedBoost: number
  /** How long that multiplier takes to ramp in, in milliseconds, so the departure is not a jolt. */
  exitRampMs: number
}

export interface ISparkleGovernorThresholds {
  /** Number of frames sampled before any tier decision is taken. */
  windowSize: number
  /** p90 of the milliseconds the field spends advancing and painting one frame, above which the tier steps down. */
  degradedFrameMs: number
  /** p90 of the milliseconds the field spends advancing and painting one frame, above which the lowest animated tier gives up entirely. */
  criticalFrameMs: number
  /** p90 of the milliseconds the field spends advancing and painting one frame, below which an upgrade may be considered. */
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
  /** Rasterised sprites indexed `[variant][sizeBucket]`, unrotated; rotation is applied at draw time. */
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
  /** Replaces the current transform with the given matrix: `a, b, c, d, e, f`. */
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void
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
  /** Colour a stroked glyph is drawn with. */
  strokeStyle: string | CanvasGradient | CanvasPattern
  /** Stroke width of a stroked glyph, in the glyph's viewBox units. */
  lineWidth: number
  /** Cap shape of a stroked glyph's open ends. */
  lineCap: CanvasLineCap
  /** Join shape where a stroked glyph's segments meet. */
  lineJoin: CanvasLineJoin
  /** Fills the glyph outline. */
  fill(path: Path2D): void
  /** Strokes the glyph outline, for glyphs authored as open lines. */
  stroke(path: Path2D): void
}

export interface ISpriteSurface {
  /** Surface handed to `drawImage` once the glyph is baked into it. */
  image: CanvasImageSource
  /** Context used exactly once, to bake the glyph. */
  context: ISparkleRasterContext
}

/** Allocates a square raster surface of `size` device pixels, or returns `null` when 2D is unavailable. */
export type TSpriteSurfaceFactory = (size: number) => ISpriteSurface | null

export const enum ESparkleWorkerInboundType {
  init = 'init',
  viewport = 'viewport',
  pointer = 'pointer',
  run = 'run',
  exit = 'exit',
  destroy = 'destroy',
}

export const enum ESparkleWorkerOutboundType {
  ready = 'ready',
  tier = 'tier',
}

export type TSparkleWorkerInbound =
  | {
      /** Hands the transferred surface over and starts the controller. */
      type: ESparkleWorkerInboundType.init
      /** Canvas detached from the host element via `transferControlToOffscreen`. */
      canvas: OffscreenCanvas
      /** Field width in CSS pixels at hand-off time. */
      width: number
      /** Field height in CSS pixels at hand-off time. */
      height: number
      /** Physical device pixel ratio, before any tier cap. */
      devicePixelRatio: number
      /** Tier seeded on the main thread, where the device signals live. */
      tier: ESparkleTier
      /** Resolved brand colour, since the worker cannot read computed styles. */
      color: string
      /** Motion preset the host picked for the active appearance; plain data, so it clones across. */
      config: ISparkleFieldConfig
      /** Whether this field replaces another one, which makes it arrive rather than simply exist. */
      isEntering: boolean
    }
  | {
      /** Reports a new field size after a resize. */
      type: ESparkleWorkerInboundType.viewport
      /** Field width in CSS pixels. */
      width: number
      /** Field height in CSS pixels. */
      height: number
      /** Physical device pixel ratio, before any tier cap. */
      devicePixelRatio: number
    }
  | {
      /** Forwards the pointer, coalesced to at most one message per frame. */
      type: ESparkleWorkerInboundType.pointer
      /** Latest position in CSS pixels relative to the field, or `null` once it leaves. */
      position: IPointerPosition | null
    }
  | {
      /** Starts or stops the loop as visibility and intersection change. */
      type: ESparkleWorkerInboundType.run
      /** Whether the field should currently be animating. */
      isRunning: boolean
    }
  | {
      /** Lets the field run out instead of looping: particles leaving the frame are not wrapped back in. */
      type: ESparkleWorkerInboundType.exit
    }
  | {
      /** Releases every resource before the host drops the worker. */
      type: ESparkleWorkerInboundType.destroy
    }

export type TSparkleWorkerOutbound =
  | {
      /** Signals that the worker booted, so the host may safely transfer the canvas. */
      type: ESparkleWorkerOutboundType.ready
    }
  | {
      /** Reports the tier the governor settled on, so the host can mirror it in the DOM. */
      type: ESparkleWorkerOutboundType.tier
      /** Tier now in force. */
      tier: ESparkleTier
    }

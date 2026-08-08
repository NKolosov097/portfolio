import {
  ESparkleTier,
  ISparkleFieldConfig,
  ISparkleGovernorThresholds,
  ISparkleTierConfig,
} from '@/home-sections/Home/types/home.type'

/** Outline of the four-point sparkle glyph in a 24×24 viewBox, shared by the SVG icon and the canvas sprites. */
export const SPARKLE_GLYPH_PATH = 'M12 0Q13 11 24 12 13 13 12 24 11 13 0 12 11 11 12 0Z'

/** Edge length of the viewBox `SPARKLE_GLYPH_PATH` is authored in. */
export const SPARKLE_GLYPH_VIEWBOX = 24

/** Rotation frames baked per size bucket; the glyph has four-fold symmetry, so they span a quarter turn. */
export const SPARKLE_ROTATION_STEPS = 8

/** CSS-pixel glyph sizes the atlas rasterises, ascending; intermediate sizes are scaled from the nearest. */
export const SPARKLE_SPRITE_BUCKETS = [4, 7, 11, 16]

/** Sprite box size as a multiple of the glyph size, wide enough that a rotated glyph never clips. */
export const SPARKLE_SPRITE_PADDING = 1.5

/** Wider sprite box used when the glow is baked in, so the blur is not cut off at the edges. */
export const SPARKLE_SPRITE_GLOW_PADDING = 2.2

/** Glow blur radius as a multiple of the glyph size. */
export const SPARKLE_GLOW_BLUR_RATIO = 0.35

/** Logical CPU count at or below which the field starts on the lowest animated tier. */
export const SPARKLE_LOW_TIER_CORES = 2

/** Device memory in gigabytes at or below which the field starts on the lowest animated tier. */
export const SPARKLE_LOW_TIER_MEMORY_GB = 2

/** Logical CPU count at or below which the field starts on the middle tier. */
export const SPARKLE_MEDIUM_TIER_CORES = 4

/** Device memory in gigabytes at or below which the field starts on the middle tier. */
export const SPARKLE_MEDIUM_TIER_MEMORY_GB = 4

/** Device pixel ratio above which the field starts on the middle tier, since fill cost scales with it. */
export const SPARKLE_MEDIUM_TIER_DPR = 2

/** Per-tier budgets, ordered from richest to the terminal still frame. */
export const SPARKLE_TIERS: Record<ESparkleTier, ISparkleTierConfig> = {
  [ESparkleTier.high]: {
    maxParticleCount: 220,
    maxDevicePixelRatio: 2,
    hasGlow: true,
    isAnimated: true,
  },
  [ESparkleTier.medium]: {
    maxParticleCount: 120,
    maxDevicePixelRatio: 1.5,
    hasGlow: true,
    isAnimated: true,
  },
  [ESparkleTier.low]: {
    maxParticleCount: 60,
    maxDevicePixelRatio: 1,
    hasGlow: false,
    isAnimated: true,
  },
  [ESparkleTier.static]: {
    maxParticleCount: 60,
    maxDevicePixelRatio: 1,
    hasGlow: false,
    isAnimated: false,
  },
}

/** Motion and interaction tuning for the field; no magic numbers belong in the helpers. */
export const SPARKLE_FIELD_CONFIG: ISparkleFieldConfig = {
  areaPerParticle: 9000,
  minParticleCount: 24,
  minSize: 4,
  maxSize: 16,
  minOpacity: 0.18,
  maxOpacity: 0.7,
  minDriftSpeed: 0.002,
  maxDriftSpeed: 0.012,
  minTwinkleSpeed: 0.0006,
  maxTwinkleSpeed: 0.0022,
  minRotationSpeed: 0.00008,
  maxRotationSpeed: 0.00035,
  influenceRadius: 160,
  sizeBoost: 1.1,
  opacityBoost: 1.4,
  displacement: 18,
  pointerLerp: 0.12,
  maxFrameDelta: 50,
  twinkleDepth: 0.55,
}

/** Frame-time budgets the governor grades each sampling window against. */
export const SPARKLE_GOVERNOR_THRESHOLDS: ISparkleGovernorThresholds = {
  windowSize: 60,
  degradedFrameMs: 20,
  criticalFrameMs: 24,
  healthyFrameMs: 11,
  upgradeAfterFrames: 240,
}

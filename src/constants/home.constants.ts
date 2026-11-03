import {
  ESparkleFieldPreset,
  ESparkleTier,
  ISparkleFieldConfig,
  ISparkleGovernorThresholds,
  ISparkleTierConfig,
} from '@/home-sections/Home/types/home.type'

/** Outline of the four-point sparkle glyph in a 24×24 viewBox, shared by the SVG icon and the canvas sprites. */
export const SPARKLE_GLYPH_PATH = 'M12 0Q13 11 24 12 13 13 12 24 11 13 0 12 11 11 12 0Z'

/**
 * Outline of the snowflake glyph in the same 24×24 viewBox: four branched arms on the cardinal axes
 * and four plain ones on the diagonals. Eight-fold symmetry keeps `SPARKLE_ROTATION_STEPS` valid.
 */
export const SNOWFLAKE_GLYPH_PATH =
  'M12.00,10.65 23.00,12.00 12.00,13.35ZM17.13,12.40 19.64,14.72 19.93,14.48 18.07,11.60ZM18.07,12.40 19.93,9.52 19.64,9.28 17.13,11.60ZM19.82,12.32 21.50,13.78 21.73,13.59 20.58,11.68ZM20.58,12.32 21.73,10.41 21.50,10.22 19.82,11.68ZM13.35,12.00 12.00,23.00 10.65,12.00ZM11.60,17.13 9.28,19.64 9.52,19.93 12.40,18.07ZM11.60,18.07 14.48,19.93 14.72,19.64 12.40,17.13ZM11.68,19.82 10.22,21.50 10.41,21.73 12.32,20.58ZM11.68,20.58 13.59,21.73 13.78,21.50 12.32,19.82ZM12.00,13.35 1.00,12.00 12.00,10.65ZM6.87,11.60 4.36,9.28 4.07,9.52 5.93,12.40ZM5.93,11.60 4.07,14.48 4.36,14.72 6.87,12.40ZM4.18,11.68 2.50,10.22 2.27,10.41 3.42,12.32ZM3.42,11.68 2.27,13.59 2.50,13.78 4.18,12.32ZM10.65,12.00 12.00,1.00 13.35,12.00ZM12.40,6.87 14.72,4.36 14.48,4.07 11.60,5.93ZM12.40,5.93 9.52,4.07 9.28,4.36 11.60,6.87ZM12.32,4.18 13.78,2.50 13.59,2.27 11.68,3.42ZM12.32,3.42 10.41,2.27 10.22,2.50 11.68,4.18ZM12.71,11.29 17.09,17.09 11.29,12.71ZM12.71,12.71 6.91,17.09 11.29,11.29ZM11.29,12.71 6.91,6.91 12.71,11.29ZM11.29,11.29 17.09,6.91 12.71,12.71Z'

/** Edge length of the viewBox `SPARKLE_GLYPH_PATH` is authored in. */
export const SPARKLE_GLYPH_VIEWBOX = 24

/** Rotation frames baked per size bucket; the glyph has four-fold symmetry, so they span a quarter turn. */
export const SPARKLE_ROTATION_STEPS = 8

/** CSS-pixel glyph sizes the atlas rasterises, ascending; intermediate sizes are scaled from the nearest. */
export const SPARKLE_SPRITE_BUCKETS = [4, 7, 11, 16, 26]

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
  glyphPath: SPARKLE_GLYPH_PATH,
  areaPerParticle: 9000,
  minParticleCount: 24,
  minSize: 4,
  maxSize: 16,
  minOpacity: 0.18,
  maxOpacity: 0.7,
  minDriftSpeed: 0.002,
  maxDriftSpeed: 0.012,
  minDriftAngle: 0,
  maxDriftAngle: Math.PI * 2,
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

/** Heading straight down the canvas's y axis, which the snow's drift cone is centred on. */
const DOWNWARD_HEADING = Math.PI / 2

/** Half-width of that cone: wide enough to read as wind, narrow enough that nothing drifts sideways. */
const SNOW_DRIFT_SPREAD = Math.PI / 12

/**
 * Winter variant of the field: the same engine, driven downwards instead of omnidirectionally, with
 * larger and calmer flakes. Speeds are an order of magnitude above the sparkles' so snow falls
 * rather than hovers.
 */
export const SNOW_FIELD_CONFIG: ISparkleFieldConfig = {
  glyphPath: SNOWFLAKE_GLYPH_PATH,
  areaPerParticle: 7000,
  minParticleCount: 36,
  minSize: 12,
  maxSize: 28,
  minOpacity: 0.55,
  maxOpacity: 1,
  minDriftSpeed: 0.03,
  maxDriftSpeed: 0.085,
  minDriftAngle: DOWNWARD_HEADING - SNOW_DRIFT_SPREAD,
  maxDriftAngle: DOWNWARD_HEADING + SNOW_DRIFT_SPREAD,
  minTwinkleSpeed: 0.0004,
  maxTwinkleSpeed: 0.0012,
  minRotationSpeed: 0.00005,
  maxRotationSpeed: 0.0002,
  influenceRadius: 150,
  sizeBoost: 1.05,
  opacityBoost: 1.2,
  displacement: 22,
  pointerLerp: 0.12,
  maxFrameDelta: 50,
  twinkleDepth: 0.3,
}

/** Presets the field is driven with; the appearance picks one and the engine stays identical. */
export const SPARKLE_FIELD_PRESETS: Record<ESparkleFieldPreset, ISparkleFieldConfig> = {
  [ESparkleFieldPreset.sparkles]: SPARKLE_FIELD_CONFIG,
  [ESparkleFieldPreset.snow]: SNOW_FIELD_CONFIG,
}

/** Frame-time budgets the governor grades each sampling window against. */
export const SPARKLE_GOVERNOR_THRESHOLDS: ISparkleGovernorThresholds = {
  windowSize: 60,
  degradedFrameMs: 20,
  criticalFrameMs: 24,
  healthyFrameMs: 11,
  upgradeAfterFrames: 240,
}

import {
  ESparkleFieldPreset,
  ESparkleTier,
  ISparkleFieldConfig,
  ISparkleGovernorThresholds,
  ISparkleTierConfig,
} from '@/home-sections/Home/types/home.type'

/** Outline of the four-point sparkle glyph in a 24×24 viewBox, shared by the SVG icon and the canvas sprites. */
export const SPARKLE_GLYPH_PATH = 'M12 0Q13 11 24 12 13 13 12 24 11 13 0 12 11 11 12 0Z'

/** Edge length of the viewBox `SPARKLE_GLYPH_PATH` is authored in. */
export const SPARKLE_GLYPH_VIEWBOX = 24

/** Arms a snowflake glyph grows, spaced evenly around the core. */
const SNOWFLAKE_ARM_COUNT = 6

/**
 * Angle a side branch leaves its shaft at. Real crystals branch at sixty degrees, which is why a
 * snowflake's feathering runs parallel to its neighbouring arms; this also happens to be the angle
 * between adjacent arms, so the same constant closes the core and plate-ring hexagons.
 */
const SNOWFLAKE_BRANCH_ANGLE = Math.PI / 3

interface ISnowflakeShapeOptions {
  /** Length of one arm in viewBox units, leaving room for the stroke width at the tip. */
  armRadius: number
  /** Radius of the hexagonal core the arms grow out of. */
  coreRadius: number
  /** Radius of the inner plate-ring hexagon; omitted for a shape with no sectored plate. */
  plateRingRadius?: number
  /** Side branches per arm, as `[position along the shaft, length as a fraction of the arm]` pairs. */
  branches: readonly (readonly [number, number])[]
}

/**
 * Builds one open snowflake outline the atlas strokes: a hexagonal core, six shafts, an optional
 * inner plate-ring hexagon, and the mirrored 60-degree side branches listed for each shaft.
 */
const buildSnowflakePath = (options: ISnowflakeShapeOptions): string => {
  const center = SPARKLE_GLYPH_VIEWBOX / 2
  const at = (radius: number, angle: number): string =>
    `${(center + Math.cos(angle) * radius).toFixed(2)},${(center + Math.sin(angle) * radius).toFixed(2)}`

  const segments: string[] = []

  for (let arm = 0; arm < SNOWFLAKE_ARM_COUNT; arm += 1) {
    const angle = (arm * Math.PI * 2) / SNOWFLAKE_ARM_COUNT

    segments.push(`M${at(options.coreRadius, angle)}L${at(options.armRadius, angle)}`)
    segments.push(
      `M${at(options.coreRadius, angle)}L${at(options.coreRadius, angle + SNOWFLAKE_BRANCH_ANGLE)}`,
    )

    if (options.plateRingRadius !== undefined) {
      segments.push(
        `M${at(options.plateRingRadius, angle)}L${at(options.plateRingRadius, angle + SNOWFLAKE_BRANCH_ANGLE)}`,
      )
    }

    for (const [position, length] of options.branches) {
      const baseRadius = options.armRadius * position
      const baseX = center + Math.cos(angle) * baseRadius
      const baseY = center + Math.sin(angle) * baseRadius
      const branchLength = options.armRadius * length

      for (const side of [-1, 1]) {
        const branchAngle = angle + side * SNOWFLAKE_BRANCH_ANGLE
        const tipX = baseX + Math.cos(branchAngle) * branchLength
        const tipY = baseY + Math.sin(branchAngle) * branchLength

        segments.push(
          `M${baseX.toFixed(2)},${baseY.toFixed(2)}L${tipX.toFixed(2)},${tipY.toFixed(2)}`,
        )
      }
    }
  }

  return segments.join('')
}

/** Fernlike dendrite: the longest, most feathered of the three shapes. */
export const SNOWFLAKE_FERNLIKE_DENDRITE_PATH = buildSnowflakePath({
  armRadius: 11.4,
  coreRadius: 1.0,
  branches: [
    [0.13, 0.11],
    [0.24, 0.19],
    [0.35, 0.24],
    [0.46, 0.22],
    [0.57, 0.19],
    [0.68, 0.15],
    [0.79, 0.11],
    [0.89, 0.08],
    [0.96, 0.05],
  ],
})

/** Sectored plate: a wider inner hexagon and fewer, broader branches. */
export const SNOWFLAKE_SECTORED_PLATE_PATH = buildSnowflakePath({
  armRadius: 11.2,
  coreRadius: 1.0,
  plateRingRadius: 3.6,
  branches: [
    [0.45, 0.17],
    [0.62, 0.21],
    [0.78, 0.15],
    [0.92, 0.08],
  ],
})

/** Slender stellar: a tighter inner hexagon and sparser branches, reading as the most delicate of the three. */
export const SNOWFLAKE_SLENDER_STELLAR_PATH = buildSnowflakePath({
  armRadius: 11.5,
  coreRadius: 1.0,
  plateRingRadius: 2.6,
  branches: [
    [0.34, 0.15],
    [0.54, 0.2],
    [0.74, 0.14],
    [0.9, 0.07],
  ],
})

/** The three snowflake shapes the atlas bakes, one assigned per particle. */
export const SNOWFLAKE_GLYPH_PATHS: string[] = [
  SNOWFLAKE_FERNLIKE_DENDRITE_PATH,
  SNOWFLAKE_SECTORED_PLATE_PATH,
  SNOWFLAKE_SLENDER_STELLAR_PATH,
]

/** Stroke width the snowflakes are baked with, in viewBox units; thin, so the flakes read as fragile. */
export const SNOWFLAKE_STROKE_WIDTH = 0.55

/** Glow blur for the snowflake, far tighter than the sparkles' so the arms do not wash into a blob. */
export const SNOWFLAKE_GLOW_BLUR_RATIO = 0.03

/** CSS-pixel glyph sizes the atlas rasterises, ascending; intermediate sizes are scaled from the nearest. */
export const SPARKLE_SPRITE_BUCKETS = [4, 7, 11, 16, 26, 38]

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
  glyphPaths: [SPARKLE_GLYPH_PATH],
  areaPerParticle: 9000,
  minParticleCount: 24,
  minSize: 4,
  maxSize: 16,
  minOpacity: 0.18,
  maxOpacity: 0.7,
  opacityDepthBias: 0,
  minDriftSpeed: 0.002,
  maxDriftSpeed: 0.012,
  speedDepthBias: 0,
  speedJitter: 0,
  minDriftAngle: 0,
  maxDriftAngle: Math.PI * 2,
  minTwinkleSpeed: 0.0006,
  maxTwinkleSpeed: 0.0022,
  minRotationSpeed: 0.00008,
  maxRotationSpeed: 0.00035,
  minTumbleSpeed: 0,
  maxTumbleSpeed: 0,
  tumbleDepth: 0,
  minTiltAxisSpeed: 0,
  maxTiltAxisSpeed: 0,
  minSwaySpeed: 0,
  maxSwaySpeed: 0,
  maxSwayRatio: 0,
  swaySecondaryFrequency: 0,
  swaySecondaryAmplitude: 0,
  lateralTauMs: 1000,
  maxWindSpeed: 0,
  minWindRetargetMs: 1000,
  maxWindRetargetMs: 1000,
  windTauMs: 1000,
  minSpeedScale: 1,
  maxSpeedScale: 1,
  minRetargetMs: 1000,
  maxRetargetMs: 1000,
  speedTauMs: 1000,
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

/** Half-width of that cone: lateral motion is now the shared wind's job, not a per-particle fixed heading. */
const SNOW_DRIFT_SPREAD = Math.PI / 40

/**
 * Winter variant of the field: the same engine, driven downwards instead of omnidirectionally, with
 * larger and calmer flakes. Speeds are an order of magnitude above the sparkles' so snow falls
 * rather than hovers.
 */
export const SNOW_FIELD_CONFIG: ISparkleFieldConfig = {
  glyphPaths: SNOWFLAKE_GLYPH_PATHS,
  glyphStrokeWidth: SNOWFLAKE_STROKE_WIDTH,
  glyphGlowRatio: SNOWFLAKE_GLOW_BLUR_RATIO,
  areaPerParticle: 7000,
  minParticleCount: 30,
  minSize: 14,
  maxSize: 40,
  minOpacity: 0.34,
  maxOpacity: 1,
  opacityDepthBias: 0.85,
  minDriftSpeed: 0.016,
  maxDriftSpeed: 0.085,
  speedDepthBias: 1,
  speedJitter: 0.15,
  minDriftAngle: DOWNWARD_HEADING - SNOW_DRIFT_SPREAD,
  maxDriftAngle: DOWNWARD_HEADING + SNOW_DRIFT_SPREAD,
  minTwinkleSpeed: 0.0004,
  maxTwinkleSpeed: 0.0012,
  minRotationSpeed: 0.00012,
  maxRotationSpeed: 0.00045,
  minTumbleSpeed: 0.00035,
  maxTumbleSpeed: 0.0012,
  tumbleDepth: 0.55,
  minTiltAxisSpeed: 0.00008,
  maxTiltAxisSpeed: 0.0003,
  minSwaySpeed: 0.00035,
  maxSwaySpeed: 0.0008,
  maxSwayRatio: 0.35,
  swaySecondaryFrequency: 1.7,
  swaySecondaryAmplitude: 0.25,
  lateralTauMs: 900,
  maxWindSpeed: 0.022,
  minWindRetargetMs: 3200,
  maxWindRetargetMs: 9000,
  windTauMs: 2600,
  minSpeedScale: 0.7,
  maxSpeedScale: 1.3,
  minRetargetMs: 2200,
  maxRetargetMs: 5200,
  speedTauMs: 1100,
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
  degradedFrameMs: 8,
  criticalFrameMs: 12,
  healthyFrameMs: 3,
  upgradeAfterFrames: 240,
}

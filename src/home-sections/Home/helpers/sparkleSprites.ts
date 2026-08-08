import {
  SPARKLE_GLOW_BLUR_RATIO,
  SPARKLE_GLYPH_PATH,
  SPARKLE_GLYPH_VIEWBOX,
  SPARKLE_ROTATION_STEPS,
  SPARKLE_SPRITE_BUCKETS,
  SPARKLE_SPRITE_GLOW_PADDING,
  SPARKLE_SPRITE_PADDING,
} from '@/constants/home.constants'
import { ISparkleSpriteAtlas, TSpriteSurfaceFactory } from '@/home-sections/Home/types/home.type'

/** Quarter turn in radians; the glyph repeats visually every quarter turn. */
const QUARTER_TURN = Math.PI / 2

/** Colour of the glyph body, matching the white core of the existing `Sparkle` icon. */
const GLYPH_FILL = '#fff'

export interface ISparkleAtlasOptions {
  /** Backing-store scale the sprites are rasterised at, already capped by the tier. */
  devicePixelRatio: number
  /** Brand colour the glow is baked with, read from the canvas's computed `color`. */
  color: string
  /** Whether to bake the glow at all; the lowest tiers drop it to save fill cost. */
  hasGlow: boolean
}

/** Finds the pre-rasterised bucket closest to a requested glyph size. */
export const resolveSpriteBucketIndex = (size: number, bucketSizes: number[]): number => {
  if (bucketSizes.length === 0) {
    return 0
  }

  let bestIndex = 0
  let bestDistance = Math.abs(size - bucketSizes[0])

  for (let index = 1; index < bucketSizes.length; index += 1) {
    const distance = Math.abs(size - bucketSizes[index])

    if (distance < bestDistance) {
      bestIndex = index
      bestDistance = distance
    }
  }

  return bestIndex
}

/** Maps a continuous rotation onto one of the baked frames, wrapping in both directions. */
export const resolveRotationIndex = (rotation: number, steps: number): number => {
  if (steps <= 0) {
    return 0
  }

  const stepped = Math.floor((rotation / QUARTER_TURN) * steps)

  return ((stepped % steps) + steps) % steps
}

/**
 * Rasterises the glyph once per size bucket and rotation step. Baking the glow
 * here is what allows the frame loop to avoid `shadowBlur` entirely, which is
 * the single most expensive thing a 2D context can be asked to do per frame.
 *
 * Returns `null` when no raster surface is obtainable, so callers can skip the
 * field rather than render an empty canvas.
 */
export const buildSparkleAtlas = (
  createSurface: TSpriteSurfaceFactory,
  options: ISparkleAtlasOptions,
): ISparkleSpriteAtlas | null => {
  const paddingFactor = options.hasGlow ? SPARKLE_SPRITE_GLOW_PADDING : SPARKLE_SPRITE_PADDING
  const path = new Path2D(SPARKLE_GLYPH_PATH)
  const frames: CanvasImageSource[][] = []

  for (const bucketSize of SPARKLE_SPRITE_BUCKETS) {
    const framePixels = Math.max(
      1,
      Math.ceil(bucketSize * options.devicePixelRatio * paddingFactor),
    )
    const glyphPixels = bucketSize * options.devicePixelRatio
    const rotationFrames: CanvasImageSource[] = []

    for (let step = 0; step < SPARKLE_ROTATION_STEPS; step += 1) {
      const surface = createSurface(framePixels)

      if (!surface) {
        return null
      }

      const { context } = surface

      context.save()
      context.translate(framePixels / 2, framePixels / 2)
      context.rotate((step * QUARTER_TURN) / SPARKLE_ROTATION_STEPS)
      context.scale(glyphPixels / SPARKLE_GLYPH_VIEWBOX, glyphPixels / SPARKLE_GLYPH_VIEWBOX)
      context.translate(-SPARKLE_GLYPH_VIEWBOX / 2, -SPARKLE_GLYPH_VIEWBOX / 2)
      context.fillStyle = GLYPH_FILL

      if (options.hasGlow) {
        context.shadowColor = options.color
        context.shadowBlur = glyphPixels * SPARKLE_GLOW_BLUR_RATIO
      }

      context.fill(path)
      context.restore()

      rotationFrames.push(surface.image)
    }

    frames.push(rotationFrames)
  }

  return { frames, bucketSizes: [...SPARKLE_SPRITE_BUCKETS], paddingFactor }
}

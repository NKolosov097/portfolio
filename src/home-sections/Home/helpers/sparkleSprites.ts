import {
  SPARKLE_GLOW_BLUR_RATIO,
  SPARKLE_GLYPH_VIEWBOX,
  SPARKLE_SPRITE_BUCKETS,
  SPARKLE_SPRITE_GLOW_PADDING,
  SPARKLE_SPRITE_PADDING,
} from '@/constants/home.constants'
import { ISparkleSpriteAtlas, TSpriteSurfaceFactory } from '@/home-sections/Home/types/home.type'

/** Colour of the glyph body, matching the white core of the existing `Sparkle` icon. */
const GLYPH_FILL = '#fff'

export interface ISparkleAtlasOptions {
  /** Backing-store scale the sprites are rasterised at, already capped by the tier. */
  devicePixelRatio: number
  /** Brand colour the glow is baked with, read from the canvas's computed `color`. */
  color: string
  /** Whether to bake the glow at all; the lowest tiers drop it to save fill cost. */
  hasGlow: boolean
  /** Outlines to bake, one per flake shape, taken from the active preset. */
  glyphPaths: string[]
  /** Stroke width in viewBox units; when set the outline is stroked instead of filled. */
  glyphStrokeWidth?: number
  /** Glow blur as a multiple of the glyph size, overriding the shared default. */
  glyphGlowRatio?: number
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

/**
 * Rasterises the glyph once per size bucket, unrotated; rotation, tumble and sway are all applied
 * at draw time instead. Baking the glow still happens here, so the frame loop never pays for
 * `shadowBlur`. Returns `null` when no raster surface is obtainable.
 */
export const buildSparkleAtlas = (
  createSurface: TSpriteSurfaceFactory,
  options: ISparkleAtlasOptions,
): ISparkleSpriteAtlas | null => {
  const paddingFactor = options.hasGlow ? SPARKLE_SPRITE_GLOW_PADDING : SPARKLE_SPRITE_PADDING
  const glowRatio = options.glyphGlowRatio ?? SPARKLE_GLOW_BLUR_RATIO
  const frames: CanvasImageSource[][] = []

  for (const glyphPath of options.glyphPaths) {
    const path = new Path2D(glyphPath)
    const variantFrames: CanvasImageSource[] = []

    for (const bucketSize of SPARKLE_SPRITE_BUCKETS) {
      const framePixels = Math.max(
        1,
        Math.ceil(bucketSize * options.devicePixelRatio * paddingFactor),
      )
      const glyphPixels = bucketSize * options.devicePixelRatio
      const surface = createSurface(framePixels)

      if (!surface) {
        return null
      }

      const { context } = surface

      context.save()
      context.translate(framePixels / 2, framePixels / 2)
      context.scale(glyphPixels / SPARKLE_GLYPH_VIEWBOX, glyphPixels / SPARKLE_GLYPH_VIEWBOX)
      context.translate(-SPARKLE_GLYPH_VIEWBOX / 2, -SPARKLE_GLYPH_VIEWBOX / 2)
      context.fillStyle = GLYPH_FILL

      if (options.hasGlow) {
        context.shadowColor = options.color
        context.shadowBlur = glyphPixels * glowRatio
      }

      // A stroked glyph keeps thin arms legible at small sizes, where a filled hairline turns to mush.
      if (options.glyphStrokeWidth) {
        context.strokeStyle = GLYPH_FILL
        context.lineWidth = options.glyphStrokeWidth
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.stroke(path)
      } else {
        context.fill(path)
      }
      context.restore()

      variantFrames.push(surface.image)
    }

    frames.push(variantFrames)
  }

  return { frames, bucketSizes: [...SPARKLE_SPRITE_BUCKETS], paddingFactor }
}

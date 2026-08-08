import { readSparkleInfluence } from '@/home-sections/Home/helpers/sparkleField'
import {
  resolveRotationIndex,
  resolveSpriteBucketIndex,
} from '@/home-sections/Home/helpers/sparkleSprites'
import {
  ISparkleDrawContext,
  ISparkleFieldConfig,
  ISparkleInfluence,
  ISparkleParticle,
  ISparklePointer,
  ISparkleSpriteAtlas,
  ISparkleViewport,
} from '@/home-sections/Home/types/home.type'

/** Confines a value to 0–1 so alpha never leaves the range the context accepts. */
const clampUnit = (value: number): number => Math.min(Math.max(value, 0), 1)

/**
 * Paints one frame of the field.
 *
 * Generic over the frame image type so the whole draw path can be exercised with
 * test doubles; in the browser `TImage` resolves to `CanvasImageSource`. The
 * `influence` record is supplied by the caller and reused for every particle, so
 * a frame allocates nothing.
 */
export const renderSparkleField = <TImage>(
  context: ISparkleDrawContext<TImage>,
  atlas: ISparkleSpriteAtlas<TImage>,
  particles: ISparkleParticle[],
  pointer: ISparklePointer,
  view: ISparkleViewport,
  config: ISparkleFieldConfig,
  influence: ISparkleInfluence,
): void => {
  const scale = view.devicePixelRatio

  context.clearRect(0, 0, view.width * scale, view.height * scale)

  if (atlas.frames.length === 0) {
    return
  }

  for (const particle of particles) {
    readSparkleInfluence(particle, pointer, config.influenceRadius, influence)

    const twinkle =
      1 - config.twinkleDepth + config.twinkleDepth * (Math.sin(particle.twinklePhase) * 0.5 + 0.5)
    const alpha = clampUnit(
      particle.opacity * twinkle * (1 + influence.strength * config.opacityBoost),
    )

    if (alpha <= 0) {
      continue
    }

    const size = particle.size * (1 + influence.strength * config.sizeBoost)
    const bucketIndex = resolveSpriteBucketIndex(size, atlas.bucketSizes)
    const rotationFrames = atlas.frames[bucketIndex]

    if (!rotationFrames || rotationFrames.length === 0) {
      continue
    }

    const push = influence.strength * config.displacement * particle.depth
    const drawSize = size * scale * atlas.paddingFactor
    const centerX = (particle.x + influence.directionX * push) * scale
    const centerY = (particle.y + influence.directionY * push) * scale

    context.globalAlpha = alpha
    context.drawImage(
      rotationFrames[resolveRotationIndex(particle.rotation, rotationFrames.length)],
      centerX - drawSize / 2,
      centerY - drawSize / 2,
      drawSize,
      drawSize,
    )
  }

  context.globalAlpha = 1
}

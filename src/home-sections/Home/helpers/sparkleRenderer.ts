import { readSparkleInfluence } from '@/home-sections/Home/helpers/sparkleField'
import { resolveSpriteBucketIndex } from '@/home-sections/Home/helpers/sparkleSprites'
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
 * Paints one frame, generic over the image type so the draw path can be exercised with test doubles.
 * The caller's `influence` record is reused for every particle, so a frame allocates nothing.
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

  context.setTransform(1, 0, 0, 1, 0, 0)
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

    const variantFrames = atlas.frames[particle.variantIndex % atlas.frames.length]

    if (!variantFrames || variantFrames.length === 0) {
      continue
    }

    const size = particle.size * (1 + influence.strength * config.sizeBoost)
    const bucketIndex = resolveSpriteBucketIndex(size, atlas.bucketSizes)
    const sprite = variantFrames[bucketIndex]

    if (!sprite) {
      continue
    }

    const push = influence.strength * config.displacement * particle.depth
    const drawSize = size * scale * atlas.paddingFactor
    const centerX = (particle.x + influence.directionX * push) * scale
    const centerY = (particle.y + influence.directionY * push) * scale

    // A flat crystal tipped away from the viewer foreshortens along one direction only, which drifts
    // with the tilt axis; `spin` is the glyph's own rotation, independent of that axis.
    const foreshorten =
      1 - config.tumbleDepth + config.tumbleDepth * Math.abs(Math.cos(particle.tiltPhase))
    const spin = particle.rotation
    const axis = particle.tiltAxis

    const cosAxis = Math.cos(axis)
    const sinAxis = Math.sin(axis)
    const cosSpin = Math.cos(spin)
    const sinSpin = Math.sin(spin)

    const a = cosAxis * cosSpin - foreshorten * sinAxis * sinSpin
    const b = sinAxis * cosSpin + foreshorten * cosAxis * sinSpin
    const c = -cosAxis * sinSpin - foreshorten * sinAxis * cosSpin
    const d = -sinAxis * sinSpin + foreshorten * cosAxis * cosSpin

    context.globalAlpha = alpha
    context.setTransform(a, b, c, d, centerX, centerY)
    context.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
  }

  context.globalAlpha = 1
  context.setTransform(1, 0, 0, 1, 0, 0)
}

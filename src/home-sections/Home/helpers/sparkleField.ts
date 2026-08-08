import {
  IPointerPosition,
  ISparkleFieldConfig,
  ISparkleInfluence,
  ISparkleParticle,
  ISparklePointer,
  ISparkleTierConfig,
} from '@/home-sections/Home/types/home.type'

/** Quarter turn in radians; the glyph's four-fold symmetry makes this a full visual rotation. */
const QUARTER_TURN = Math.PI / 2

/** Draws a value from an inclusive range using the supplied random source. */
const randomBetween = (random: () => number, min: number, max: number): number =>
  min + random() * (max - min)

/** Confines a value to 0–1 so alphas and ramps cannot overshoot. */
const clampUnit = (value: number): number => Math.min(Math.max(value, 0), 1)

/**
 * Wraps a coordinate around the field with a margin, so a glyph leaves one edge
 * and re-enters the opposite one without ever popping in mid-view.
 */
const wrapCoordinate = (value: number, limit: number, margin: number): number => {
  const span = limit + margin * 2

  if (span <= 0) {
    return value
  }

  return ((((value + margin) % span) + span) % span) - margin
}

/**
 * Derives how many particles a field of this size deserves, honouring both the
 * floor that keeps narrow viewports populated and the active tier's ceiling.
 */
export const resolveSparkleParticleCount = (
  width: number,
  height: number,
  tier: ISparkleTierConfig,
  config: ISparkleFieldConfig,
): number => {
  if (width <= 0 || height <= 0) {
    return 0
  }

  const fromArea = Math.round((width * height) / config.areaPerParticle)

  return Math.min(Math.max(fromArea, config.minParticleCount), tier.maxParticleCount)
}

/** Builds one particle with randomised placement, size, drift, twinkle and rotation. */
export const createSparkleParticle = (
  width: number,
  height: number,
  config: ISparkleFieldConfig,
  random: () => number = Math.random,
): ISparkleParticle => {
  const size = randomBetween(random, config.minSize, config.maxSize)
  const sizeSpan = config.maxSize - config.minSize
  const depth = sizeSpan > 0 ? clampUnit((size - config.minSize) / sizeSpan) : 0
  const driftAngle = random() * Math.PI * 2
  const driftSpeed = randomBetween(random, config.minDriftSpeed, config.maxDriftSpeed)

  return {
    x: random() * width,
    y: random() * height,
    size,
    opacity: randomBetween(random, config.minOpacity, config.maxOpacity),
    twinklePhase: random() * Math.PI * 2,
    twinkleSpeed: randomBetween(random, config.minTwinkleSpeed, config.maxTwinkleSpeed),
    velocityX: Math.cos(driftAngle) * driftSpeed,
    velocityY: Math.sin(driftAngle) * driftSpeed,
    rotation: random() * QUARTER_TURN,
    rotationSpeed: randomBetween(random, config.minRotationSpeed, config.maxRotationSpeed),
    depth,
  }
}

/** Builds a whole field in one go; the population is allocated exactly once. */
export const createSparkleParticles = (
  width: number,
  height: number,
  count: number,
  config: ISparkleFieldConfig,
  random: () => number = Math.random,
): ISparkleParticle[] => {
  const particles: ISparkleParticle[] = []

  for (let index = 0; index < count; index += 1) {
    particles.push(createSparkleParticle(width, height, config, random))
  }

  return particles
}

/**
 * Reshapes an existing field for a new viewport: positions are rescaled so the
 * composition survives a resize, and only the surplus or shortfall is trimmed
 * or generated.
 */
export const refitSparkleParticles = (
  particles: ISparkleParticle[],
  previous: { width: number; height: number },
  width: number,
  height: number,
  count: number,
  config: ISparkleFieldConfig,
  random: () => number = Math.random,
): void => {
  const scaleX = previous.width > 0 ? width / previous.width : 1
  const scaleY = previous.height > 0 ? height / previous.height : 1

  for (const particle of particles) {
    particle.x *= scaleX
    particle.y *= scaleY
  }

  const target = Math.max(count, 0)

  if (particles.length > target) {
    particles.length = target

    return
  }

  while (particles.length < target) {
    particles.push(createSparkleParticle(width, height, config, random))
  }
}

/** Caps a frame delta so a backgrounded tab cannot teleport the whole field on resume. */
export const clampSparkleFrameDelta = (deltaMs: number, maxFrameDelta: number): number => {
  if (Number.isNaN(deltaMs) || deltaMs <= 0) {
    return 0
  }

  return Math.min(deltaMs, maxFrameDelta)
}

/** Advances one particle in place; no allocation happens inside the frame loop. */
export const advanceSparkleParticle = (
  particle: ISparkleParticle,
  deltaMs: number,
  width: number,
  height: number,
  config: ISparkleFieldConfig,
): void => {
  particle.x = wrapCoordinate(particle.x + particle.velocityX * deltaMs, width, config.maxSize)
  particle.y = wrapCoordinate(particle.y + particle.velocityY * deltaMs, height, config.maxSize)
  particle.rotation += particle.rotationSpeed * deltaMs
  particle.twinklePhase += particle.twinkleSpeed * deltaMs
}

/** Allocates the single pointer record the loop reuses for its whole lifetime. */
export const createSparklePointer = (): ISparklePointer => ({ x: 0, y: 0, intensity: 0 })

/** Allocates the single influence record the renderer reuses for every particle. */
export const createSparkleInfluence = (): ISparkleInfluence => ({
  strength: 0,
  directionX: 0,
  directionY: 0,
})

/**
 * Eases the pointer toward its latest raw position and ramps its intensity, so
 * both arrival and departure are gradual rather than snapping. A first sighting
 * jumps straight to the target to avoid a sweep in from the field's origin.
 */
export const advanceSparklePointer = (
  pointer: ISparklePointer,
  target: IPointerPosition | null,
  lerp: number,
): void => {
  const factor = clampUnit(lerp)

  if (target) {
    if (pointer.intensity <= 0) {
      pointer.x = target.x
      pointer.y = target.y
    } else {
      pointer.x += (target.x - pointer.x) * factor
      pointer.y += (target.y - pointer.y) * factor
    }
  }

  pointer.intensity += ((target ? 1 : 0) - pointer.intensity) * factor
}

/**
 * Measures how strongly the pointer pulls on one particle and which way it is
 * pushed, writing into a reused record so the hot loop stays allocation-free.
 */
export const readSparkleInfluence = (
  particle: ISparkleParticle,
  pointer: ISparklePointer,
  influenceRadius: number,
  out: ISparkleInfluence,
): void => {
  out.strength = 0
  out.directionX = 0
  out.directionY = 0

  if (pointer.intensity <= 0 || influenceRadius <= 0) {
    return
  }

  const deltaX = particle.x - pointer.x
  const deltaY = particle.y - pointer.y
  const distance = Math.hypot(deltaX, deltaY)

  if (distance >= influenceRadius) {
    return
  }

  const falloff = 1 - distance / influenceRadius

  out.strength = falloff * falloff * pointer.intensity

  if (distance > 0) {
    out.directionX = deltaX / distance
    out.directionY = deltaY / distance
  }
}

import {
  IPointerPosition,
  ISparkleFieldConfig,
  ISparkleInfluence,
  ISparkleParticle,
  ISparklePointer,
  ISparkleTierConfig,
  ISparkleWind,
} from '@/home-sections/Home/types/home.type'

/** Draws a value from an inclusive range using the supplied random source. */
const randomBetween = (random: () => number, min: number, max: number): number =>
  min + random() * (max - min)

/** Draws a magnitude from a range and flips its sign on a coin toss, so rotations do not lockstep. */
const randomSignedBetween = (random: () => number, min: number, max: number): number => {
  const magnitude = randomBetween(random, min, max)

  return random() < 0.5 ? -magnitude : magnitude
}

/** Eases a value toward a target at a frame-rate-independent rate set by a time constant. */
const easeTowards = (value: number, target: number, deltaMs: number, tauMs: number): number =>
  value + (target - value) * (1 - Math.exp(-deltaMs / tauMs))

/** Confines a value to 0–1 so alphas and ramps cannot overshoot. */
const clampUnit = (value: number): number => Math.min(Math.max(value, 0), 1)

/** Wraps a coordinate with a margin, so a glyph re-enters the opposite edge instead of popping in mid-view. */
const wrapCoordinate = (value: number, limit: number, margin: number): number => {
  const span = limit + margin * 2

  if (span <= 0) {
    return value
  }

  return ((((value + margin) % span) + span) % span) - margin
}

/** Derives the particle count for a field of this size, between the viewport floor and the tier ceiling. */
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

/**
 * Builds one particle with randomised placement, size, drift, twinkle and rotation. An arriving
 * field seeds itself differently: it may start above the fold and fade its glyphs in on a stagger.
 */
export const createSparkleParticle = (
  width: number,
  height: number,
  config: ISparkleFieldConfig,
  random: () => number = Math.random,
  isEntering = false,
): ISparkleParticle => {
  const size = randomBetween(random, config.minSize, config.maxSize)
  const sizeSpan = config.maxSize - config.minSize
  const depth = sizeSpan > 0 ? clampUnit((size - config.minSize) / sizeSpan) : 0
  const driftAngle = randomBetween(random, config.minDriftAngle, config.maxDriftAngle)

  // Blends a depth-dictated draw with a random one so a bias of 0 reproduces the pre-depth behaviour.
  const randomSpeed = randomBetween(random, config.minDriftSpeed, config.maxDriftSpeed)
  const depthSpeed =
    config.minDriftSpeed + (config.maxDriftSpeed - config.minDriftSpeed) * depth
  const blendedSpeed = randomSpeed + (depthSpeed - randomSpeed) * config.speedDepthBias
  const driftSpeed =
    blendedSpeed * randomBetween(random, 1 - config.speedJitter, 1 + config.speedJitter)

  const swaySpeed = randomSignedBetween(random, config.minSwaySpeed, config.maxSwaySpeed)

  // Pinning the flutter to a fraction of the particle's own fall speed keeps the path's yaw angle
  // the same at every depth, instead of a fixed amplitude swinging a slow flake further off vertical.
  const swayVelocityWeight = 1 + config.swaySecondaryAmplitude * config.swaySecondaryFrequency
  const peakSwaySpeed = driftSpeed * config.maxSwayRatio * random()
  const swaySpeedMagnitude = Math.abs(swaySpeed)
  const swayAmplitude =
    swaySpeedMagnitude > 0 && swayVelocityWeight > 0
      ? peakSwaySpeed / (swaySpeedMagnitude * swayVelocityWeight)
      : 0

  const randomOpacity = randomBetween(random, config.minOpacity, config.maxOpacity)
  const depthOpacity =
    config.minOpacity + (config.maxOpacity - config.minOpacity) * depth
  const opacity = randomOpacity + (depthOpacity - randomOpacity) * config.opacityDepthBias

  const isSeededAbove = isEntering && config.entrySpawnAboveRatio > 0
  const isStaggered = isEntering && config.entryStaggerMs > 0

  return {
    x: random() * width,
    y: isSeededAbove ? -random() * height * config.entrySpawnAboveRatio : random() * height,
    size,
    opacity,
    twinklePhase: random() * Math.PI * 2,
    twinkleSpeed: randomBetween(random, config.minTwinkleSpeed, config.maxTwinkleSpeed),
    velocityX: Math.cos(driftAngle) * driftSpeed,
    velocityY: Math.sin(driftAngle) * driftSpeed,
    rotation: random() * Math.PI * 2,
    rotationSpeed: randomSignedBetween(random, config.minRotationSpeed, config.maxRotationSpeed),
    depth,
    windFactor: (0.45 + 0.55 * depth) * randomBetween(random, 0.8, 1.2),
    speedScale: randomBetween(random, config.minSpeedScale, config.maxSpeedScale),
    targetSpeedScale: randomBetween(random, config.minSpeedScale, config.maxSpeedScale),
    retargetRemainingMs: randomBetween(random, config.minRetargetMs, config.maxRetargetMs),
    tiltPhase: random() * Math.PI * 2,
    tiltSpeed: randomSignedBetween(random, config.minTumbleSpeed, config.maxTumbleSpeed),
    tiltAxis: random() * Math.PI * 2,
    tiltAxisSpeed: randomSignedBetween(random, config.minTiltAxisSpeed, config.maxTiltAxisSpeed),
    swayPhase: random() * Math.PI * 2,
    swayPhaseSecondary: random() * Math.PI * 2,
    swaySpeed,
    swayAmplitude,
    lateralVelocity: 0,
    variantIndex: Math.min(
      Math.floor(random() * config.glyphPaths.length),
      config.glyphPaths.length - 1,
    ),
    entryAlpha: isStaggered ? 0 : 1,
    entryDelayMs: isStaggered ? random() * config.entryStaggerMs : 0,
    isFallingIn: isSeededAbove,
  }
}

/** Builds a whole field in one go; the population is allocated exactly once. */
export const createSparkleParticles = (
  width: number,
  height: number,
  count: number,
  config: ISparkleFieldConfig,
  random: () => number = Math.random,
  isEntering = false,
): ISparkleParticle[] => {
  const particles: ISparkleParticle[] = []

  for (let index = 0; index < count; index += 1) {
    particles.push(createSparkleParticle(width, height, config, random, isEntering))
  }

  return particles
}

/**
 * Reshapes an existing field for a new viewport: positions are rescaled so the composition survives
 * a resize, and only the surplus or shortfall is trimmed or generated.
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
  wind: ISparkleWind,
  random: () => number = Math.random,
  exitSpeedScale: number | null = null,
): void => {
  // The flutter now lives in the particle's own position, so the wrap margin only needs to cover the
  // glyph itself and the pointer displacement.
  const margin = config.maxSize + config.displacement

  // A staggered particle sits out its delay and then fades in, so an arriving field lights up in
  // scattered places rather than all at once. A fade window of zero means it was never staggered.
  if (particle.entryAlpha < 1) {
    particle.entryDelayMs -= deltaMs

    if (particle.entryDelayMs <= 0) {
      particle.entryAlpha =
        config.entryFadeMs > 0 ? clampUnit(particle.entryAlpha + deltaMs / config.entryFadeMs) : 1
    }
  }

  particle.retargetRemainingMs -= deltaMs

  if (particle.retargetRemainingMs <= 0) {
    particle.targetSpeedScale = randomBetween(random, config.minSpeedScale, config.maxSpeedScale)
    particle.retargetRemainingMs = randomBetween(random, config.minRetargetMs, config.maxRetargetMs)
  }

  particle.speedScale = easeTowards(
    particle.speedScale,
    particle.targetSpeedScale,
    deltaMs,
    config.speedTauMs,
  )

  particle.swayPhase += particle.swaySpeed * deltaMs
  particle.swayPhaseSecondary += particle.swaySpeed * config.swaySecondaryFrequency * deltaMs

  // The flutter target is the time derivative of the sway sum; the actual lateral velocity eases
  // toward it instead of jumping, so a reversal takes real time, as a crystal's inertia would demand.
  const lateralTarget =
    particle.swayAmplitude *
    particle.swaySpeed *
    (Math.cos(particle.swayPhase) +
      config.swaySecondaryAmplitude * config.swaySecondaryFrequency * Math.cos(particle.swayPhaseSecondary))

  particle.lateralVelocity = easeTowards(
    particle.lateralVelocity,
    lateralTarget,
    deltaMs,
    config.lateralTauMs,
  )

  const stepX =
    particle.velocityX * deltaMs * particle.speedScale +
    wind.value * particle.windFactor * deltaMs +
    particle.lateralVelocity * deltaMs
  const stepY = particle.velocityY * deltaMs * particle.speedScale * (exitSpeedScale ?? 1)

  const nextY = particle.y + stepY

  // A particle seeded above the fold is exempt from wrapping until it reaches the band the wrap
  // works in; otherwise its first step would teleport it straight into the middle of the field.
  if (particle.isFallingIn && nextY >= -margin) {
    particle.isFallingIn = false
  }

  // A departing field is never wrapped: what leaves the frame stays gone, so the top empties
  // instead of being re-seeded while the last particles are still on their way down.
  const isWrapped = exitSpeedScale === null && !particle.isFallingIn

  particle.x = isWrapped ? wrapCoordinate(particle.x + stepX, width, margin) : particle.x + stepX
  particle.y = isWrapped ? wrapCoordinate(nextY, height, margin) : nextY
  particle.rotation += particle.rotationSpeed * deltaMs
  particle.twinklePhase += particle.twinkleSpeed * deltaMs
  particle.tiltPhase += particle.tiltSpeed * deltaMs
  particle.tiltAxis += particle.tiltAxisSpeed * deltaMs
}

/** Allocates the shared wind state, so the field moves as one coherent air mass rather than N drifts. */
export const createSparkleWind = (
  config: ISparkleFieldConfig,
  random: () => number = Math.random,
): ISparkleWind => ({
  value: 0,
  target: randomBetween(random, -config.maxWindSpeed, config.maxWindSpeed),
  retargetRemainingMs: randomBetween(random, config.minWindRetargetMs, config.maxWindRetargetMs),
})

/** Advances the shared wind in place: retargets on schedule, then eases toward whatever target is live. */
export const advanceSparkleWind = (
  wind: ISparkleWind,
  deltaMs: number,
  config: ISparkleFieldConfig,
  random: () => number = Math.random,
): void => {
  wind.retargetRemainingMs -= deltaMs

  if (wind.retargetRemainingMs <= 0) {
    wind.target = randomBetween(random, -config.maxWindSpeed, config.maxWindSpeed)
    wind.retargetRemainingMs = randomBetween(random, config.minWindRetargetMs, config.maxWindRetargetMs)
  }

  wind.value = easeTowards(wind.value, wind.target, deltaMs, config.windTauMs)
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
 * Eases the pointer toward its latest position and ramps its intensity, so arrival and departure are
 * gradual. A first sighting jumps to the target, to avoid a sweep in from the field's origin.
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

/** Measures the pointer's pull on one particle into a reused record, so the hot loop stays allocation-free. */
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

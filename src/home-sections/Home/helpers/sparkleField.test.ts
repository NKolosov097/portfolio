import { describe, expect, it } from 'vitest'

import { SPARKLE_FIELD_CONFIG, SPARKLE_TIERS } from '@/constants/home.constants'
import {
  advanceSparkleParticle,
  advanceSparklePointer,
  clampSparkleFrameDelta,
  createSparkleInfluence,
  createSparkleParticle,
  createSparkleParticles,
  createSparklePointer,
  readSparkleInfluence,
  refitSparkleParticles,
  resolveSparkleParticleCount,
} from '@/home-sections/Home/helpers/sparkleField'
import { ESparkleTier } from '@/home-sections/Home/types/home.type'

/** Deterministic stand-in for `Math.random`, cycling through fixed draws so particles are reproducible. */
const createSequenceRandom = (values: number[]): (() => number) => {
  let index = 0

  return () => {
    const value = values[index % values.length]
    index += 1

    return value
  }
}

describe('resolveSparkleParticleCount', () => {
  it('derives the count from the field area', () => {
    const count = resolveSparkleParticleCount(
      1200,
      750,
      SPARKLE_TIERS[ESparkleTier.high],
      SPARKLE_FIELD_CONFIG,
    )

    expect(count).toBe(Math.round((1200 * 750) / SPARKLE_FIELD_CONFIG.areaPerParticle))
  })

  it('never falls below the floor on a narrow viewport', () => {
    const count = resolveSparkleParticleCount(
      320,
      400,
      SPARKLE_TIERS[ESparkleTier.high],
      SPARKLE_FIELD_CONFIG,
    )

    expect(count).toBe(SPARKLE_FIELD_CONFIG.minParticleCount)
  })

  it('never exceeds the tier ceiling on a huge viewport', () => {
    const count = resolveSparkleParticleCount(
      3840,
      2160,
      SPARKLE_TIERS[ESparkleTier.low],
      SPARKLE_FIELD_CONFIG,
    )

    expect(count).toBe(SPARKLE_TIERS[ESparkleTier.low].maxParticleCount)
  })

  it('returns nothing for a collapsed container', () => {
    expect(
      resolveSparkleParticleCount(0, 800, SPARKLE_TIERS[ESparkleTier.high], SPARKLE_FIELD_CONFIG),
    ).toBe(0)
    expect(
      resolveSparkleParticleCount(800, 0, SPARKLE_TIERS[ESparkleTier.high], SPARKLE_FIELD_CONFIG),
    ).toBe(0)
  })
})

describe('createSparkleParticles', () => {
  it('places every particle inside the field and inside the configured ranges', () => {
    const particles = createSparkleParticles(600, 400, 40, SPARKLE_FIELD_CONFIG)

    expect(particles).toHaveLength(40)

    for (const particle of particles) {
      expect(particle.x).toBeGreaterThanOrEqual(0)
      expect(particle.x).toBeLessThanOrEqual(600)
      expect(particle.y).toBeGreaterThanOrEqual(0)
      expect(particle.y).toBeLessThanOrEqual(400)
      expect(particle.size).toBeGreaterThanOrEqual(SPARKLE_FIELD_CONFIG.minSize)
      expect(particle.size).toBeLessThanOrEqual(SPARKLE_FIELD_CONFIG.maxSize)
      expect(particle.opacity).toBeGreaterThanOrEqual(SPARKLE_FIELD_CONFIG.minOpacity)
      expect(particle.opacity).toBeLessThanOrEqual(SPARKLE_FIELD_CONFIG.maxOpacity)
      expect(particle.depth).toBeGreaterThanOrEqual(0)
      expect(particle.depth).toBeLessThanOrEqual(1)
    }
  })

  it('is reproducible for a given random source', () => {
    const first = createSparkleParticles(
      600,
      400,
      5,
      SPARKLE_FIELD_CONFIG,
      createSequenceRandom([0.1, 0.4, 0.7, 0.2, 0.9, 0.5]),
    )
    const second = createSparkleParticles(
      600,
      400,
      5,
      SPARKLE_FIELD_CONFIG,
      createSequenceRandom([0.1, 0.4, 0.7, 0.2, 0.9, 0.5]),
    )

    expect(first).toEqual(second)
  })

  it('gives the largest particles the most depth', () => {
    const smallest = createSparkleParticle(
      600,
      400,
      SPARKLE_FIELD_CONFIG,
      createSequenceRandom([0]),
    )
    const largest = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG, createSequenceRandom([1]))

    expect(smallest.depth).toBeCloseTo(0)
    expect(largest.depth).toBeCloseTo(1)
  })

  it('returns nothing when the count is not positive', () => {
    expect(createSparkleParticles(600, 400, 0, SPARKLE_FIELD_CONFIG)).toEqual([])
    expect(createSparkleParticles(600, 400, -5, SPARKLE_FIELD_CONFIG)).toEqual([])
  })
})

describe('refitSparkleParticles', () => {
  it('rescales positions instead of regenerating the field', () => {
    const particles = createSparkleParticles(600, 400, 4, SPARKLE_FIELD_CONFIG)
    const originalSizes = particles.map((particle) => particle.size)
    const originalX = particles.map((particle) => particle.x)

    refitSparkleParticles(
      particles,
      { width: 600, height: 400 },
      1200,
      400,
      4,
      SPARKLE_FIELD_CONFIG,
    )

    expect(particles.map((particle) => particle.size)).toEqual(originalSizes)

    particles.forEach((particle, index) => {
      expect(particle.x).toBeCloseTo(originalX[index] * 2)
    })
  })

  it('grows and shrinks the population to the requested count', () => {
    const particles = createSparkleParticles(600, 400, 4, SPARKLE_FIELD_CONFIG)

    refitSparkleParticles(particles, { width: 600, height: 400 }, 600, 400, 9, SPARKLE_FIELD_CONFIG)
    expect(particles).toHaveLength(9)

    refitSparkleParticles(particles, { width: 600, height: 400 }, 600, 400, 2, SPARKLE_FIELD_CONFIG)
    expect(particles).toHaveLength(2)
  })

  it('survives a previous size of zero without producing NaN', () => {
    const particles = createSparkleParticles(600, 400, 3, SPARKLE_FIELD_CONFIG)

    refitSparkleParticles(particles, { width: 0, height: 0 }, 600, 400, 3, SPARKLE_FIELD_CONFIG)

    for (const particle of particles) {
      expect(Number.isFinite(particle.x)).toBe(true)
      expect(Number.isFinite(particle.y)).toBe(true)
    }
  })
})

describe('clampSparkleFrameDelta', () => {
  it('passes a normal frame through', () => {
    expect(clampSparkleFrameDelta(16.7, 50)).toBeCloseTo(16.7)
  })

  it('caps the jump produced by a backgrounded tab', () => {
    expect(clampSparkleFrameDelta(9000, 50)).toBe(50)
  })

  it('discards a non-positive or non-finite delta', () => {
    expect(clampSparkleFrameDelta(0, 50)).toBe(0)
    expect(clampSparkleFrameDelta(-16, 50)).toBe(0)
    expect(clampSparkleFrameDelta(Number.NaN, 50)).toBe(0)
    expect(clampSparkleFrameDelta(Number.POSITIVE_INFINITY, 50)).toBe(50)
  })
})

describe('advanceSparkleParticle', () => {
  it('moves a particle along its velocity', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.x = 100
    particle.y = 100
    particle.velocityX = 0.01
    particle.velocityY = 0.02

    advanceSparkleParticle(particle, 100, 600, 400, SPARKLE_FIELD_CONFIG)

    expect(particle.x).toBeCloseTo(101)
    expect(particle.y).toBeCloseTo(102)
  })

  it('wraps a particle that drifts off the right edge back to the left', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.x = 599
    particle.velocityX = 1
    particle.velocityY = 0

    advanceSparkleParticle(particle, 100, 600, 400, SPARKLE_FIELD_CONFIG)

    expect(particle.x).toBeLessThan(600)
    expect(particle.x).toBeGreaterThanOrEqual(-SPARKLE_FIELD_CONFIG.maxSize)
  })

  it('wraps a particle that drifts off the top edge back to the bottom', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.y = 1
    particle.velocityX = 0
    particle.velocityY = -1

    advanceSparkleParticle(particle, 100, 600, 400, SPARKLE_FIELD_CONFIG)

    expect(particle.y).toBeGreaterThan(300)
  })

  it('does not allocate a replacement particle', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const before = particle

    advanceSparkleParticle(particle, 16, 600, 400, SPARKLE_FIELD_CONFIG)

    expect(particle).toBe(before)
  })
})

describe('advanceSparklePointer', () => {
  it('snaps to the first target rather than sweeping in from the origin', () => {
    const pointer = createSparklePointer()

    advanceSparklePointer(pointer, { x: 400, y: 300 }, 0.12)

    expect(pointer.x).toBe(400)
    expect(pointer.y).toBe(300)
    expect(pointer.intensity).toBeGreaterThan(0)
  })

  it('eases toward a moving target instead of jumping', () => {
    const pointer = createSparklePointer()

    advanceSparklePointer(pointer, { x: 0, y: 0 }, 0.5)
    advanceSparklePointer(pointer, { x: 100, y: 0 }, 0.5)

    expect(pointer.x).toBeGreaterThan(0)
    expect(pointer.x).toBeLessThan(100)
  })

  it('relaxes the intensity back toward zero once the pointer leaves', () => {
    const pointer = createSparklePointer()

    for (let frame = 0; frame < 60; frame += 1) {
      advanceSparklePointer(pointer, { x: 100, y: 100 }, 0.5)
    }

    const settled = pointer.intensity

    advanceSparklePointer(pointer, null, 0.5)

    expect(pointer.intensity).toBeLessThan(settled)
    expect(pointer.x).toBeCloseTo(100)
  })
})

describe('readSparkleInfluence', () => {
  it('reports nothing while the pointer has no intensity', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    particle.x = 100
    particle.y = 100
    pointer.x = 100
    pointer.y = 100

    readSparkleInfluence(particle, pointer, 160, influence)

    expect(influence.strength).toBe(0)
  })

  it('reports nothing beyond the influence radius', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    particle.x = 400
    particle.y = 0
    pointer.x = 0
    pointer.y = 0
    pointer.intensity = 1

    readSparkleInfluence(particle, pointer, 160, influence)

    expect(influence.strength).toBe(0)
    expect(influence.directionX).toBe(0)
    expect(influence.directionY).toBe(0)
  })

  it('falls off monotonically as the particle moves away', () => {
    const near = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const far = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    pointer.x = 0
    pointer.y = 0
    pointer.intensity = 1

    near.x = 20
    near.y = 0
    far.x = 120
    far.y = 0

    readSparkleInfluence(near, pointer, 160, influence)
    const nearStrength = influence.strength

    readSparkleInfluence(far, pointer, 160, influence)

    expect(nearStrength).toBeGreaterThan(influence.strength)
    expect(influence.strength).toBeGreaterThan(0)
  })

  it('points directly away from the pointer', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    pointer.x = 0
    pointer.y = 0
    pointer.intensity = 1
    particle.x = 30
    particle.y = 0

    readSparkleInfluence(particle, pointer, 160, influence)

    expect(influence.directionX).toBeCloseTo(1)
    expect(influence.directionY).toBeCloseTo(0)
  })

  it('scales with the pointer intensity ramp', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    pointer.x = 0
    pointer.y = 0
    particle.x = 20
    particle.y = 0

    pointer.intensity = 1
    readSparkleInfluence(particle, pointer, 160, influence)
    const full = influence.strength

    pointer.intensity = 0.25
    readSparkleInfluence(particle, pointer, 160, influence)

    expect(influence.strength).toBeCloseTo(full * 0.25)
  })

  it('survives a particle sitting exactly on the pointer', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    pointer.x = 50
    pointer.y = 50
    pointer.intensity = 1
    particle.x = 50
    particle.y = 50

    readSparkleInfluence(particle, pointer, 160, influence)

    expect(Number.isFinite(influence.directionX)).toBe(true)
    expect(Number.isFinite(influence.directionY)).toBe(true)
    expect(influence.strength).toBeCloseTo(1)
  })
})

import { describe, expect, it } from 'vitest'

import { SPARKLE_FIELD_CONFIG, SPARKLE_ROTATION_STEPS } from '@/constants/home.constants'
import {
  createSparkleInfluence,
  createSparkleParticle,
  createSparklePointer,
} from '@/home-sections/Home/helpers/sparkleField'
import { renderSparkleField } from '@/home-sections/Home/helpers/sparkleRenderer'
import {
  ISparkleDrawContext,
  ISparkleSpriteAtlas,
  ISparkleViewport,
} from '@/home-sections/Home/types/home.type'

interface IRecordedDraw {
  /** Sprite frame the renderer chose. */
  image: string
  /** Destination left edge in device pixels. */
  x: number
  /** Destination top edge in device pixels. */
  y: number
  /** Destination edge length in device pixels. */
  size: number
  /** Alpha in force at the moment of the call. */
  alpha: number
}

/** Records draw calls so the renderer's decisions can be asserted without a real canvas. */
const createRecordingContext = () => {
  const draws: IRecordedDraw[] = []
  const clears: number[] = []

  const context: ISparkleDrawContext<string> = {
    globalAlpha: 1,
    clearRect: (_x, _y, width) => {
      clears.push(width)
    },
    drawImage: (image, x, y, dWidth) => {
      draws.push({ image, x, y, size: dWidth, alpha: context.globalAlpha })
    },
  }

  return { context, draws, clears }
}

/** Two size buckets × the configured rotation steps, labelled so assertions can name a frame. */
const createTestAtlas = (): ISparkleSpriteAtlas<string> => ({
  frames: [
    Array.from({ length: SPARKLE_ROTATION_STEPS }, (_value, step) => `small-${step}`),
    Array.from({ length: SPARKLE_ROTATION_STEPS }, (_value, step) => `large-${step}`),
  ],
  bucketSizes: [4, 16],
  paddingFactor: 1.5,
})

const VIEW: ISparkleViewport = { width: 600, height: 400, devicePixelRatio: 2 }

describe('renderSparkleField', () => {
  it('wipes the whole backing store before drawing', () => {
    const { context, clears } = createRecordingContext()

    renderSparkleField(
      context,
      createTestAtlas(),
      [],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(clears).toEqual([VIEW.width * VIEW.devicePixelRatio])
  })

  it('draws one sprite per particle', () => {
    const { context, draws } = createRecordingContext()
    const particles = [
      createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG),
      createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG),
      createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG),
    ]

    renderSparkleField(
      context,
      createTestAtlas(),
      particles,
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(draws).toHaveLength(3)
  })

  it('scales positions and sizes into device pixels', () => {
    const { context, draws } = createRecordingContext()
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.x = 100
    particle.y = 50
    particle.size = 16
    particle.opacity = 1
    particle.twinklePhase = Math.PI / 2

    renderSparkleField(
      context,
      createTestAtlas(),
      [particle],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    const drawn = draws[0]
    const expectedSize = 16 * VIEW.devicePixelRatio * 1.5

    expect(drawn.size).toBeCloseTo(expectedSize)
    expect(drawn.x).toBeCloseTo(100 * VIEW.devicePixelRatio - expectedSize / 2)
    expect(drawn.y).toBeCloseTo(50 * VIEW.devicePixelRatio - expectedSize / 2)
  })

  it('chooses the bucket nearest the particle size', () => {
    const { context, draws } = createRecordingContext()
    const small = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const large = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    small.size = 4
    small.rotation = 0
    large.size = 16
    large.rotation = 0

    renderSparkleField(
      context,
      createTestAtlas(),
      [small, large],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(draws[0].image).toBe('small-0')
    expect(draws[1].image).toBe('large-0')
  })

  it('brightens and enlarges a particle under the pointer', () => {
    const atlas = createTestAtlas()
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.x = 300
    particle.y = 200
    particle.size = 8
    particle.opacity = 0.3
    particle.twinklePhase = Math.PI / 2
    particle.depth = 1

    const restingRun = createRecordingContext()

    renderSparkleField(
      restingRun.context,
      atlas,
      [particle],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    const pointer = createSparklePointer()

    pointer.x = 300
    pointer.y = 200
    pointer.intensity = 1

    const boostedRun = createRecordingContext()

    renderSparkleField(
      boostedRun.context,
      atlas,
      [particle],
      pointer,
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(boostedRun.draws[0].alpha).toBeGreaterThan(restingRun.draws[0].alpha)
    expect(boostedRun.draws[0].size).toBeGreaterThan(restingRun.draws[0].size)
  })

  it('pushes a particle away from the pointer rather than through it', () => {
    const atlas = createTestAtlas()
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.x = 320
    particle.y = 200
    particle.size = 8
    particle.opacity = 0.5
    particle.twinklePhase = Math.PI / 2
    particle.depth = 1

    const restingRun = createRecordingContext()

    renderSparkleField(
      restingRun.context,
      atlas,
      [particle],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    const pointer = createSparklePointer()

    pointer.x = 300
    pointer.y = 200
    pointer.intensity = 1

    const pushedRun = createRecordingContext()

    renderSparkleField(
      pushedRun.context,
      atlas,
      [particle],
      pointer,
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(pushedRun.draws[0].x).toBeGreaterThan(restingRun.draws[0].x)
  })

  it('never lets alpha exceed one, however strong the boost', () => {
    const { context, draws } = createRecordingContext()
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()

    particle.x = 300
    particle.y = 200
    particle.opacity = 1
    particle.twinklePhase = Math.PI / 2
    pointer.x = 300
    pointer.y = 200
    pointer.intensity = 1

    renderSparkleField(
      context,
      createTestAtlas(),
      [particle],
      pointer,
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(draws[0].alpha).toBeLessThanOrEqual(1)
  })

  it('restores a neutral alpha so the next painter is not tinted', () => {
    const { context } = createRecordingContext()
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    renderSparkleField(
      context,
      createTestAtlas(),
      [particle],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(context.globalAlpha).toBe(1)
  })

  it('draws nothing when the atlas is empty', () => {
    const { context, draws } = createRecordingContext()
    const emptyAtlas: ISparkleSpriteAtlas<string> = {
      frames: [],
      bucketSizes: [],
      paddingFactor: 1.5,
    }

    renderSparkleField(
      context,
      emptyAtlas,
      [createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(draws).toHaveLength(0)
  })
})

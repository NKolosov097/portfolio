import { Object3D, Quaternion, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createSantaMagicTrail } from './santaMagicTrail'
import type { SantaFormation } from './santaModel'
import { placeSantaSleigh } from './santaSleighPose'
import { createSantaRoutes, sampleSantaFlight, sampleSantaTimedFormation } from './santaTrajectory'

/** Allocate independent frames for comparing trail anchors with the rendered sleigh pose. */
function formation(): SantaFormation {
  return {
    frames: [
      { position: new Vector3(), rotation: new Quaternion() },
      { position: new Vector3(), rotation: new Quaternion() },
      { position: new Vector3(), rotation: new Quaternion() },
    ],
    scale: 0.7,
  }
}

describe('Santa magic trail', () => {
  it('matches fresh seeks after fractional frames, reversals, cycles, and layout changes', () => {
    const warmed = createSantaMagicTrail()
    const desktop = createSantaRoutes(1_440, 900)
    const portrait = createSantaRoutes(390, 844)
    const steps = [
      { seconds: 5.123, routes: desktop, spacing: 3, scale: 0.7 },
      { seconds: 5.123 + 1 / 60, routes: desktop, spacing: 3, scale: 0.7 },
      { seconds: 5.123 + 2 / 60, routes: desktop, spacing: 3, scale: 0.7 },
      { seconds: 5.123 + 2 / 60, routes: desktop, spacing: 3, scale: 0.7 },
      { seconds: 10.874, routes: desktop, spacing: 3, scale: 0.7 },
      { seconds: 6.234, routes: desktop, spacing: 3, scale: 0.7 },
      { seconds: 18.234, routes: desktop, spacing: 3, scale: 0.7 },
      { seconds: 66.234, routes: desktop, spacing: 3, scale: 0.7 },
      { seconds: -29.765, routes: desktop, spacing: 3, scale: 0.7 },
      { seconds: -29.765 + 1 / 60, routes: desktop, spacing: 3, scale: 0.7 },
      { seconds: 18.234, routes: portrait, spacing: 3, scale: 0.7 },
      { seconds: 18.25, routes: portrait, spacing: 4, scale: 0.7 },
      { seconds: 18.267, routes: portrait, spacing: 4, scale: 0.4 },
      { seconds: 23, routes: portrait, spacing: 4, scale: 0.4 },
      { seconds: 18.284, routes: portrait, spacing: 4, scale: 0.4 },
      { seconds: -1, routes: portrait, spacing: 4, scale: 0.4 },
      { seconds: 18.301, routes: portrait, spacing: 4, scale: 0.4 },
      { seconds: 48, routes: portrait, spacing: 4, scale: 0.4 },
    ]
    try {
      for (const { seconds, routes, spacing, scale } of steps) {
        const fresh = createSantaMagicTrail()
        try {
          warmed.update(seconds, routes, spacing, scale, 844, 1)
          fresh.update(seconds, routes, spacing, scale, 844, 1)
          expect(warmed.object.visible).toBe(fresh.object.visible)
          const count = fresh.object.geometry.drawRange.count
          expect(warmed.object.geometry.drawRange.count).toBe(count)
          for (const name of ['position', 'appearance']) {
            const expected = fresh.object.geometry.getAttribute(name).array
            const actual = warmed.object.geometry.getAttribute(name).array
            for (let index = 0; index < count * 3; index += 1) {
              expect(Math.abs(actual[index] - expected[index])).toBeLessThanOrEqual(
                Math.max(1, Math.abs(expected[index])) * 1.2e-7,
              )
            }
          }
        } finally {
          fresh.dispose()
        }
      }
    } finally {
      warmed.dispose()
    }
  })

  it('samples only two or three new births per normal frame and bounds large forward seeks', () => {
    const trail = createSantaMagicTrail()
    const routes = createSantaRoutes(1_440, 900)
    const getPoint = vi.spyOn(routes.near, 'getPoint')
    try {
      trail.update(18.123, routes, 3, 0.7, 900, 1)
      // The existing formation sampler reads three route positions for each birth.
      expect(getPoint).toHaveBeenCalledTimes(192 * 3)
      const positions = trail.object.geometry.getAttribute('position')
      const appearance = trail.object.geometry.getAttribute('appearance')
      for (let frame = 1; frame <= 60; frame += 1) {
        getPoint.mockClear()
        trail.update(18.123 + frame / 60, routes, 3, 0.7, 900, 1)
        expect([2 * 3, 3 * 3]).toContain(getPoint.mock.calls.length)
      }
      getPoint.mockClear()
      trail.update(19.123, routes, 3, 0.7, 900, 1)
      expect(getPoint).not.toHaveBeenCalled()
      trail.update(22.8, routes, 3, 0.7, 900, 1)
      expect(getPoint).toHaveBeenCalledTimes(192 * 3)
      expect(trail.object.geometry.getAttribute('position')).toBe(positions)
      expect(trail.object.geometry.getAttribute('appearance')).toBe(appearance)
      expect(positions.count).toBe(192)
      expect(appearance.count).toBe(192)
    } finally {
      trail.dispose()
    }
  })

  it('attaches consecutive births to both scaled rear runner tips in both directions and viewport aspects', () => {
    const trail = createSantaMagicTrail()
    const display = formation()
    const sleigh = new Object3D()
    try {
      for (const [width, height] of [
        [1_440, 900],
        [390, 844],
        [844, 390],
      ]) {
        const routes = createSantaRoutes(width, height)
        for (const [seconds, runnerSide] of [
          [6, -0.68],
          [6 + 1 / 128, 0.68],
          [18, -0.68],
          [18 + 1 / 128, 0.68],
        ]) {
          const flight = sampleSantaFlight(seconds)
          const route = routes[flight.phase === 'near' ? 'near' : 'distant']
          sampleSantaTimedFormation(route, flight.progress, 3 * display.scale, display.frames)
          placeSantaSleigh(seconds, display.frames[2], (3 / 4) * display.scale, sleigh)
          sleigh.updateMatrixWorld()
          const rear = sleigh.localToWorld(new Vector3(-1.98, -0.29, runnerSide))
          const center = sleigh.localToWorld(new Vector3(-1.98, -0.29, 0))
          const front = sleigh.localToWorld(new Vector3(2, -0.15, 0))
          trail.update(seconds, routes, 3, display.scale, height, 1)
          const emitted = new Vector3().fromBufferAttribute(
            trail.object.geometry.getAttribute('position'),
            0,
          )
          expect(emitted.distanceTo(rear)).toBeLessThan(0.00001)
          expect(emitted.distanceTo(center)).toBeGreaterThan(0.35)
          expect(emitted.distanceTo(front)).toBeGreaterThan(2)
          expect(trail.object.visible).toBe(true)
          expect(trail.object.geometry.drawRange.count).toBe(192)
        }
      }
    } finally {
      trail.dispose()
    }
  })

  it('keeps both births on their original runners when buffer indices change parity', () => {
    const trail = createSantaMagicTrail()
    const routes = createSantaRoutes(1_440, 900)
    try {
      const origins: Vector3[] = []
      for (const seconds of [18, 18 + 1 / 128]) {
        trail.update(seconds, routes, 3, 0.7, 900, 1)
        origins.push(
          new Vector3().fromBufferAttribute(trail.object.geometry.getAttribute('position'), 0),
        )
      }
      trail.update(18 + 17 / 128, routes, 3, 0.7, 900, 1)
      const positions = trail.object.geometry.getAttribute('position')
      for (const [particle, index] of [
        [0, 17],
        [1, 16],
      ]) {
        const historical = new Vector3().fromBufferAttribute(positions, index)
        expect(historical.distanceTo(origins[particle])).toBeLessThan(0.1)
        expect(historical.distanceTo(origins[1 - particle])).toBeGreaterThan(0.6)
      }
    } finally {
      trail.dispose()
    }
  })

  it('retains historical world positions, spreads and fades old dust, and reproduces direct seeks', () => {
    const trail = createSantaMagicTrail()
    const routes = createSantaRoutes(1_440, 900)
    try {
      trail.update(18, routes, 3, 0.7, 900, 1)
      const positions = trail.object.geometry.getAttribute('position')
      const appearance = trail.object.geometry.getAttribute('appearance')
      const born = new Vector3().fromBufferAttribute(positions, 0)
      const sought = Array.from(positions.array)
      const soughtAppearance = Array.from(appearance.array)
      trail.update(18.125, routes, 3, 0.7, 900, 1)
      const historical = new Vector3().fromBufferAttribute(positions, 16)
      const current = new Vector3().fromBufferAttribute(positions, 0)
      expect(historical.distanceTo(born)).toBeLessThan(0.08)
      expect(current.distanceTo(born)).toBeGreaterThan(0.2)
      expect(appearance.getY(191)).toBeLessThan(appearance.getY(0) * 0.01)
      expect(appearance.getX(191)).toBeLessThan(appearance.getX(0))
      expect(trail.object.geometry.getAttribute('position')).toBe(positions)
      expect(trail.object.geometry.getAttribute('appearance')).toBe(appearance)
      trail.update(6, routes, 3, 0.7, 900, 1)
      trail.update(18, routes, 3, 0.7, 900, 1)
      expect(Array.from(positions.array)).toEqual(sought)
      expect(Array.from(appearance.array)).toEqual(soughtAppearance)
    } finally {
      trail.dispose()
    }
  })

  it('isolates passes and cycles, hides all still phases, and keeps arbitrary seeks finite', () => {
    const trail = createSantaMagicTrail()
    const routes = createSantaRoutes(390, 844)
    try {
      for (const seconds of [11.99, 22.99, 70.99]) {
        trail.update(seconds, routes, 3, 0.4, 844, 1)
        expect(trail.object.geometry.drawRange.count).toBe(192)
      }
      for (const seconds of [0, 14, 48, 62]) {
        trail.update(seconds, routes, 3, 0.4, 844, 1)
        expect(trail.object.geometry.drawRange.count).toBe(1)
      }
      for (const seconds of [-1, 12, 13.99, 23, 47.99, NaN, Infinity]) {
        trail.update(seconds, routes, 3, 0.4, 844, 1)
        expect(trail.object.visible).toBe(false)
        expect(trail.object.geometry.drawRange.count).toBe(0)
      }
      for (const seconds of [-30, Number.MAX_VALUE, -Number.MAX_VALUE, 18.3]) {
        trail.update(seconds, routes, 3, 0.4, 844, 1)
        expect(trail.object.geometry.drawRange.count).toBeLessThanOrEqual(192)
        for (const name of ['position', 'appearance']) {
          expect(
            Array.from(trail.object.geometry.getAttribute(name).array).every(Number.isFinite),
          ).toBe(true)
        }
      }
    } finally {
      trail.dispose()
    }
  })

  it('twinkles matching births independently while retaining the lifetime fade envelope', () => {
    const trail = createSantaMagicTrail()
    const routes = createSantaRoutes(1_440, 900)
    try {
      const samples: number[][] = []
      for (const seconds of [18, 18.125, 18.25]) {
        trail.update(seconds, routes, 3, 0.7, 900, 1)
        const passTime = seconds - 14
        const newest = Math.floor(passTime * 128)
        const appearance = trail.object.geometry.getAttribute('appearance')
        const brightness: number[] = []
        for (let birth = 464; birth < 496; birth += 1) {
          const age = passTime - birth / 128
          brightness.push(appearance.getY(newest - birth) / (1 - age / 1.5) ** 1.5)
        }
        samples.push(brightness)
      }
      const changes = samples[1].map((brightness, index) => brightness - samples[0][index])
      expect(changes.some((change) => change > 0.01)).toBe(true)
      expect(changes.some((change) => change < -0.01)).toBe(true)
      expect(
        samples[2].some((brightness, index) => Math.abs(brightness - samples[1][index]) > 0.01),
      ).toBe(true)
      expect(samples.flat().every((brightness) => brightness > 0 && brightness <= 1.6)).toBe(true)
    } finally {
      trail.dispose()
    }
  })

  it('moves matching births through subtle curved eddies rather than straight transverse drift', () => {
    const trail = createSantaMagicTrail()
    const routes = createSantaRoutes(1_440, 900)
    try {
      const samples: Vector3[][] = []
      for (const seconds of [18, 18.125, 18.25]) {
        trail.update(seconds, routes, 3, 0.7, 900, 1)
        const newest = Math.floor((seconds - 14) * 128)
        const positions = trail.object.geometry.getAttribute('position')
        samples.push(
          [464, 465, 466, 467].map((birth) =>
            new Vector3().fromBufferAttribute(positions, newest - birth),
          ),
        )
      }
      for (let particle = 0; particle < 4; particle += 1) {
        const firstStep = samples[1][particle].clone().sub(samples[0][particle])
        const secondStep = samples[2][particle].clone().sub(samples[1][particle])
        // Excluding vertical settling distinguishes eddies from the existing gravity curve.
        firstStep.y = 0
        secondStep.y = 0
        expect(firstStep.distanceTo(secondStep)).toBeGreaterThan(0.0001)
        expect(firstStep.clone().cross(secondStep).length()).toBeGreaterThan(0.000001)
        expect(samples[2][particle].distanceTo(samples[0][particle])).toBeLessThan(0.25)
      }
    } finally {
      trail.dispose()
    }
  })

  it('disposes its single draw resources once and ignores later updates', () => {
    const trail = createSantaMagicTrail()
    const geometryDispose = vi.spyOn(trail.object.geometry, 'dispose')
    const materialDispose = vi.spyOn(trail.object.material, 'dispose')
    trail.dispose()
    trail.dispose()
    trail.update(18, createSantaRoutes(1_440, 900), 3, 0.7, 900, 1)
    expect(trail.object.visible).toBe(false)
    expect(geometryDispose).toHaveBeenCalledOnce()
    expect(materialDispose).toHaveBeenCalledOnce()
    expect(trail.object.material.depthWrite).toBe(false)
  })
})

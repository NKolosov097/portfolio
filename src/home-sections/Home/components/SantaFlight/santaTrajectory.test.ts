import { describe, expect, it } from 'vitest'
import { CurvePath, LineCurve3, PerspectiveCamera, Quaternion, Vector3 } from 'three'

import {
  createSantaRoutes,
  sampleSantaFlight,
  sampleSantaFormation,
  SANTA_CAMERA_DISTANCE,
  SANTA_CAMERA_FOV,
} from './santaTrajectory'
import type { SantaFormation } from './santaModel'

/** Allocate the same three mutable formation frames retained by the renderer. */
function frames(): SantaFormation['frames'] {
  return [
    { position: new Vector3(), rotation: new Quaternion() },
    { position: new Vector3(), rotation: new Quaternion() },
    { position: new Vector3(), rotation: new Quaternion() },
  ]
}

describe('Santa flight timeline', () => {
  it('keeps the two visible passes separated by hidden turnaround and rest', () => {
    for (const [seconds, phase, visible] of [
      [0, 'distant', true],
      [11.99, 'distant', true],
      [12, 'turnaround', false],
      [13.99, 'turnaround', false],
      [14, 'near', true],
      [22.99, 'near', true],
      [23, 'rest', false],
      [47.99, 'rest', false],
      [48, 'distant', true],
    ] as const) {
      expect(sampleSantaFlight(seconds)).toMatchObject({ phase, visible })
    }
  })

  it('loops positive and negative times and accepts nonfinite input safely', () => {
    expect(sampleSantaFlight(54)).toEqual(sampleSantaFlight(6))
    expect(sampleSantaFlight(-30)).toEqual(sampleSantaFlight(18))
    expect(sampleSantaFlight(Number.NaN)).toEqual(sampleSantaFlight(0))
    expect(sampleSantaFlight(Infinity)).toEqual(sampleSantaFlight(0))
  })

  it('keeps all route values finite with continuous positions and offscreen endpoints', () => {
    for (let seconds = 0; seconds < 48; seconds += 0.05) {
      const pose = sampleSantaFlight(seconds)
      for (const key of ['x', 'y', 'depth', 'progress'] as const) {
        expect(Number.isFinite(pose[key])).toBe(true)
      }
      const next = sampleSantaFlight(seconds + 0.01)
      if (pose.visible && next.phase === pose.phase) {
        expect(Math.abs(next.x - pose.x)).toBeLessThan(0.01)
        expect(Math.abs(next.y - pose.y)).toBeLessThan(0.01)
      }
    }
    expect(sampleSantaFlight(0).x).toBeCloseTo(0.98)
    expect(sampleSantaFlight(0).y).toBeLessThan(-0.3)
    expect(sampleSantaFlight(11.999).x).toBeLessThan(-0.4)
    expect(sampleSantaFlight(14).x).toBeLessThan(-0.4)
    expect(sampleSantaFlight(11.999).x).toBeCloseTo(sampleSantaFlight(14).x, 3)
    expect(sampleSantaFlight(14).y).toBeLessThan(1)
    expect(sampleSantaFlight(22.999).x).toBeGreaterThan(1.2)
    expect(sampleSantaFlight(18).y).toBeGreaterThan(0.6)
    expect(sampleSantaFlight(18).y).toBeLessThan(0.9)
  })

  it('enters downward from the upper right and levels leftward before the rightward near return', () => {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [844, 390],
    ]) {
      const routes = createSantaRoutes(width, height)
      const route = routes.distant
      const start = route.getTangent(0)
      const level = route.getTangent(0.6)
      expect(start.x).toBeLessThan(0)
      expect(start.y).toBeLessThan(-0.3)
      expect(level.x).toBeLessThan(0)
      expect(Math.abs(level.y)).toBeLessThan(Math.abs(start.y) * 0.3)
      let previous = start
      for (let step = 1; step <= 100; step += 1) {
        const heading = route.getTangent(step / 100)
        expect(heading.x).toBeLessThan(0)
        expect(routes.near.getTangent(step / 100).x).toBeGreaterThan(0)
        expect(heading.dot(previous)).toBeGreaterThan(0.99)
        previous = heading
      }
    }
  })

  it('projects visible arcs exactly and supplies analytic finite upright headings on every aspect', () => {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [844, 390],
    ]) {
      const camera = new PerspectiveCamera(SANTA_CAMERA_FOV, width / height, 0.1, 120)
      camera.position.z = SANTA_CAMERA_DISTANCE
      camera.updateMatrixWorld()
      const routes = createSantaRoutes(width, height)
      for (const phase of ['distant', 'near'] as const) {
        const route = routes[phase]
        const start = route.getPoint(0).project(camera)
        const end = route.getPoint(1).project(camera)
        const middle = route.getPoint(0.5).project(camera)
        const lineY = start.y + ((middle.x - start.x) / (end.x - start.x)) * (end.y - start.y)
        expect(Math.abs(middle.y - lineY)).toBeGreaterThan(0.2)
        const formation = frames()
        for (let t = 0; t <= 1; t += 0.05) {
          const pose = sampleSantaFlight(phase === 'distant' ? t * 12 : 14 + t * 9)
          const projected = route.getPoint(t).project(camera)
          expect(projected.x).toBeCloseTo(pose.x * 2 - 1, 8)
          const yScale = phase === 'near' && width < height ? 0.72 : 1
          expect(projected.y).toBeCloseTo(1 - pose.y * yScale * 2, 8)
          const finiteDifference = route
            .getPoint(Math.min(1, t + 0.00001))
            .sub(route.getPoint(Math.max(0, t - 0.00001)))
            .normalize()
          expect(finiteDifference.dot(route.getTangent(t))).toBeGreaterThan(0.9999)
          sampleSantaFormation(route, t, 2, formation)
          for (const frame of formation) {
            expect(
              [...frame.position.toArray(), ...frame.rotation.toArray()].every(Number.isFinite),
            ).toBe(true)
            expect(new Vector3(0, 1, 0).applyQuaternion(frame.rotation).y).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('preserves pair arc spacing and a fixed, inward-cutting sleigh tow gap through turns', () => {
    const route = createSantaRoutes(1440, 900).near
    const formation = frames()
    const spacing = 3
    sampleSantaFormation(route, 0, spacing, formation)
    expect(formation[0].position.distanceTo(formation[1].position)).toBeCloseTo(spacing, 8)
    expect(formation[1].position.distanceTo(formation[2].position)).toBeCloseTo(spacing, 8)
    const startTangent = route.getTangent(0)
    expect(
      formation[1].position.clone().sub(formation[0].position).normalize().dot(startTangent),
    ).toBeCloseTo(-1, 8)
    for (const progress of [0.2, 0.5, 0.8]) {
      sampleSantaFormation(route, progress, spacing, formation)
      const length = route.getLength()
      const parameters = formation
        .slice(0, 2)
        .map((_, index) => route.getUtoTmapping(0, progress * length - index * spacing))
      for (let frame = 0; frame < 1; frame += 1) {
        let arc = 0
        let previous = route.getPoint(parameters[frame + 1])
        for (let step = 1; step <= 100; step += 1) {
          const point = route.getPoint(
            parameters[frame + 1] + ((parameters[frame] - parameters[frame + 1]) * step) / 100,
          )
          arc += point.distanceTo(previous)
          previous = point
        }
        expect(arc).toBeCloseTo(spacing, 3)
      }
      expect(formation[1].position.distanceTo(formation[2].position)).toBeCloseTo(spacing, 8)
      const pull = formation[1].position.clone().sub(formation[2].position).normalize()
      expect(new Vector3(1, 0, 0).applyQuaternion(formation[2].rotation).dot(pull)).toBeCloseTo(
        1,
        8,
      )
      const oldTrack = route.getPoint(route.getUtoTmapping(0, progress * length - 2 * spacing))
      expect(formation[2].position.distanceTo(oldTrack)).toBeGreaterThan(0.01)
      expect(formation[0].rotation.angleTo(formation[2].rotation)).toBeGreaterThan(0.02)
      const sought = formation.map((frame) => [
        ...frame.position.toArray(),
        ...frame.rotation.toArray(),
      ])
      sampleSantaFormation(route, 0.9, spacing, formation)
      sampleSantaFormation(route, progress, spacing, formation)
      expect(
        formation.map((frame) => [...frame.position.toArray(), ...frame.rotation.toArray()]),
      ).toEqual(sought)
    }
  })

  it('retains straight deer travel and extrapolated entry while suspending the sleigh below its chord', () => {
    const route = new LineCurve3(new Vector3(2, 1, 3), new Vector3(22, 5, 8))
    const formation = frames()
    const direction = route.getTangent(0)
    for (const progress of [0, 0.03, 0.5, 1]) {
      sampleSantaFormation(route, progress, 3, formation)
      const rear = formation[0].position.clone().addScaledVector(direction, -3)
      expect(formation[1].position.distanceTo(rear)).toBeLessThan(1e-8)
      expect(formation[1].rotation.angleTo(formation[0].rotation)).toBeLessThan(1e-7)
      const chord = rear.clone().addScaledVector(direction, -3)
      expect(formation[2].position.y).toBeLessThan(chord.y)
      expect(formation[2].position.distanceTo(rear)).toBeCloseTo(3, 8)
      const pull = rear.sub(formation[2].position).normalize()
      expect(new Vector3(1, 0, 0).applyQuaternion(formation[2].rotation).dot(pull)).toBeCloseTo(
        1,
        8,
      )
    }
    sampleSantaFormation(route, 0.5, 0, formation)
    expect(formation[2].rotation.toArray().every(Number.isFinite)).toBe(true)
  })

  it('hangs lower with a steeper upward tow after descending history reaches level travel', () => {
    const descent = new LineCurve3(new Vector3(0, 4, 0), new Vector3(4, 0, 0))
    const horizontal = new LineCurve3(new Vector3(4, 0, 0), new Vector3(12, 0, 0))
    const leveling = new CurvePath<Vector3>()
    leveling.add(descent)
    leveling.add(horizontal)
    const levelFrames = frames()
    const levelingFrames = frames()
    sampleSantaFormation(horizontal, 2.5 / horizontal.getLength(), 2, levelFrames)
    sampleSantaFormation(
      leveling,
      (descent.getLength() + 2.5) / leveling.getLength(),
      2,
      levelingFrames,
    )
    expect(levelingFrames[1].position.x).toBeCloseTo(levelFrames[1].position.x, 2)
    expect(levelingFrames[1].position.y).toBeCloseTo(0, 8)
    expect(levelingFrames[1].rotation.angleTo(levelFrames[1].rotation)).toBeLessThan(1e-7)
    const levelHeight = levelFrames[2].position.y - levelFrames[1].position.y
    const levelingHeight = levelingFrames[2].position.y - levelingFrames[1].position.y
    expect(levelHeight).toBeLessThan(0)
    expect(levelingHeight).toBeLessThan(levelHeight)
    const levelHeading = new Vector3(1, 0, 0).applyQuaternion(levelFrames[2].rotation)
    const levelingHeading = new Vector3(1, 0, 0).applyQuaternion(levelingFrames[2].rotation)
    expect(levelingHeading.y).toBeGreaterThan(levelHeading.y)
    for (const formation of [levelFrames, levelingFrames]) {
      const pull = formation[1].position.clone().sub(formation[2].position)
      expect(pull.length()).toBeCloseTo(2, 8)
      expect(
        new Vector3(1, 0, 0).applyQuaternion(formation[2].rotation).dot(pull.normalize()),
      ).toBeCloseTo(1, 8)
    }
  })
})

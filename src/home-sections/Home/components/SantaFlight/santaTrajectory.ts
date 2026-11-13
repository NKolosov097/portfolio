import { Curve, Matrix4, Vector3 } from 'three'

import type { SantaFormation } from './santaModel'

export const SANTA_CYCLE_SECONDS = 48
export const SANTA_CAMERA_DISTANCE = 24
export const SANTA_CAMERA_FOV = 35

export type SantaFlightPhase = 'distant' | 'turnaround' | 'near' | 'rest'
type RoutePhase = 'distant' | 'near'
type Controls = readonly [number, number, number, number]

export interface SantaFlightPose {
  x: number
  y: number
  depth: number
  progress: number
  visible: boolean
  phase: SantaFlightPhase
}

const ROUTES: Record<RoutePhase, { x: Controls; y: Controls; depth: Controls }> = {
  distant: {
    x: [0.98, 0.85, 0.3, -0.45],
    y: [-0.35, 0.45, 0.38, 0.25],
    depth: [-18, -17, -11, -6],
  },
  near: { x: [-0.45, 0.1, 0.78, 1.65], y: [0.9, 1.02, 0.78, 0.12], depth: [8, 13, 5, -16] },
}

/** Sample the authored screen-space cubic without frame-dependent integration. */
function cubic(t: number, [a, b, c, d]: Controls): number {
  const u = 1 - t
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
}

/** Differentiate the screen-space route analytically for stable heading at either endpoint. */
function derivative(t: number, [a, b, c, d]: Controls): number {
  const u = 1 - t
  return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c)
}

/** Preserve the existing visible/hidden cadence and expose progress independently of frame rate. */
export function sampleSantaFlight(seconds: number): SantaFlightPose {
  const time = Number.isFinite(seconds)
    ? ((seconds % SANTA_CYCLE_SECONDS) + SANTA_CYCLE_SECONDS) % SANTA_CYCLE_SECONDS
    : 0
  const phase = time < 12 ? 'distant' : time < 14 ? 'turnaround' : time < 23 ? 'near' : 'rest'
  const progress = phase === 'distant' ? time / 12 : phase === 'near' ? (time - 14) / 9 : 0
  const route = ROUTES[phase === 'near' ? 'near' : 'distant']
  return {
    x: cubic(progress, route.x),
    y: cubic(progress, route.y),
    depth: cubic(progress, route.depth),
    progress,
    visible: phase === 'distant' || phase === 'near',
    phase,
  }
}

/** Project the exact authored cubic into world space, including its varying camera depth. */
class ProjectedSantaRoute extends Curve<Vector3> {
  /** Cache arc lengths once per viewport fit; following frames reuse this lookup. */
  constructor(
    private readonly phase: RoutePhase,
    private readonly aspect: number,
  ) {
    super()
    this.arcLengthDivisions = 600
    this.updateArcLengths()
  }

  /** Map the normalized route through the renderer's perspective camera. */
  override getPoint(t: number, target = new Vector3()): Vector3 {
    const route = ROUTES[this.phase]
    const yScale = this.phase === 'near' && this.aspect < 1 ? 0.72 : 1
    const depth = cubic(t, route.depth)
    const halfHeight =
      (SANTA_CAMERA_DISTANCE - depth) * Math.tan((SANTA_CAMERA_FOV * Math.PI) / 360)
    return target.set(
      (cubic(t, route.x) * 2 - 1) * halfHeight * this.aspect,
      (1 - cubic(t, route.y) * yScale * 2) * halfHeight,
      depth,
    )
  }

  /** Include the depth derivative so the train turns along the projected world route. */
  override getTangent(t: number, target = new Vector3()): Vector3 {
    const route = ROUTES[this.phase]
    const yScale = this.phase === 'near' && this.aspect < 1 ? 0.72 : 1
    const factor = Math.tan((SANTA_CAMERA_FOV * Math.PI) / 360)
    const halfHeight = (SANTA_CAMERA_DISTANCE - cubic(t, route.depth)) * factor
    const depthDerivative = derivative(t, route.depth)
    const heightDerivative = -depthDerivative * factor
    return target
      .set(
        (2 * derivative(t, route.x) * halfHeight + (2 * cubic(t, route.x) - 1) * heightDerivative) *
          this.aspect,
        -2 * derivative(t, route.y) * yScale * halfHeight +
          (1 - 2 * cubic(t, route.y) * yScale) * heightDerivative,
        depthDerivative,
      )
      .normalize()
  }
}

/** Rebuild perspective-dependent route lookups only when the viewport dimensions change. */
export function createSantaRoutes(
  width: number,
  height: number,
): Record<RoutePhase, Curve<Vector3>> {
  const aspect = Math.max(1, width) / Math.max(1, height)
  return {
    distant: new ProjectedSantaRoute('distant', aspect),
    near: new ProjectedSantaRoute('near', aspect),
  }
}

/** Preserve authored screen timing while followers use the same cached arc-distance spacing. */
export function sampleSantaTimedFormation(
  route: Curve<Vector3>,
  progress: number,
  spacing: number,
  frames: SantaFormation['frames'],
): void {
  const lengths = route.getLengths()
  const arcIndex = progress * route.arcLengthDivisions
  const before = Math.min(Math.floor(arcIndex), lengths.length - 2)
  const distance = lengths[before] + (lengths[before + 1] - lengths[before]) * (arcIndex - before)
  sampleSantaFormation(route, distance / lengths[lengths.length - 1], spacing, frames)
}

const tangent = new Vector3()
const side = new Vector3()
const up = new Vector3()
const worldUp = new Vector3(0, 1, 0)
const basis = new Matrix4()
const history = new Vector3()
const rearHeading = new Vector3()

/** Extend route history along its entry tangent while retaining the cached arc lookup. */
function sampleDistance(
  route: Curve<Vector3>,
  distance: number,
  length: number,
  target: Vector3,
): void {
  if (distance < 0 || length === 0) {
    route.getPoint(0, target)
    route.getTangent(0, tangent)
    target.addScaledVector(tangent, distance)
  } else {
    const t = route.getUtoTmapping(distance / length, distance)
    route.getPoint(t, target)
    route.getTangent(t, tangent)
  }
}

/** Keep every route component upright around its own travel direction. */
function orient(frame: SantaFormation['frames'][number]): void {
  side.crossVectors(tangent, worldUp).normalize()
  up.crossVectors(side, tangent).normalize()
  frame.rotation.setFromRotationMatrix(basis.makeBasis(tangent, up, side))
}

/** Keep the pairs on the authored arc and tow the sleigh behind their recent travel chord. */
export function sampleSantaFormation(
  route: Curve<Vector3>,
  progress: number,
  spacing: number,
  frames: SantaFormation['frames'],
): void {
  const length = route.getLength()
  const travelled = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) * length
  for (let index = 0; index < 2; index += 1) {
    const frame = frames[index]
    sampleDistance(route, travelled - index * spacing, length, frame.position)
    orient(frame)
  }
  sampleDistance(route, travelled - 3 * spacing, length, history)
  tangent.subVectors(frames[1].position, history)
  if (tangent.lengthSq() < 1e-12) tangent.set(1, 0, 0).applyQuaternion(frames[1].rotation)
  else tangent.normalize()
  rearHeading.set(1, 0, 0).applyQuaternion(frames[1].rotation)
  const leveling = Math.max(0, rearHeading.y - tangent.y)
  // Lift the tow direction to suspend the body lower, with extra sag while recovering from descent.
  tangent.y += 0.12 + 1.25 * leveling
  tangent.normalize()
  frames[2].position.copy(frames[1].position).addScaledVector(tangent, -spacing)
  orient(frames[2])
}

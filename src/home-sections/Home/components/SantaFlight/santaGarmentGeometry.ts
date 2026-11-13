import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  TubeGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const SANTA_COAT_RINGS = 97
export const SANTA_COAT_SIDES = 64
export const SANTA_SLEEVE_RINGS = 48
export const SANTA_SLEEVE_SIDES = 32

type Section = readonly [number, number, number, number, number]
type SurfacePoint = (row: number, side: number) => Vector3

const COAT_SECTIONS: readonly Section[] = [
  [0, 0, 0, 0.35, 0.36],
  [0.04, 0.15, 0, 0.46, 0.43],
  [0.03, 0.46, 0, 0.47, 0.42],
  [-0.02, 0.75, 0, 0.37, 0.36],
  [-0.07, 0.98, 0, 0.27, 0.3],
  [-0.05, 1.08, 0, 0.18, 0.2],
]

/** Fade constrained edges without introducing a kink in the fabric. */
function smoothstep(minimum: number, maximum: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)))
  return t * t * (3 - 2 * t)
}

/** Pair a narrow raised crest with an adjacent recessed cloth valley. */
function crease(distance: number, width: number, height: number): number {
  return (
    height * Math.exp(-((distance / width) ** 2)) -
    height * 0.58 * Math.exp(-(((distance - width * 1.35) / (width * 0.8)) ** 2))
  )
}

/** Match duplicated UV-edge normals without welding their texture coordinates. */
export function smoothGarmentSeamNormals(geometry: BufferGeometry, sides: number): void {
  const normals = geometry.getAttribute('normal')
  const normal = new Vector3()
  for (let start = 0; start < normals.count; start += sides + 1) {
    const end = start + sides
    normal
      .set(
        normals.getX(start) + normals.getX(end),
        normals.getY(start) + normals.getY(end),
        normals.getZ(start) + normals.getZ(end),
      )
      .normalize()
    normals.setXYZ(start, normal.x, normal.y, normal.z)
    normals.setXYZ(end, normal.x, normal.y, normal.z)
  }
}

/** Sample sculpted surfaces with outward winding and a continuous angular UV seam. */
function surface(
  rows: number,
  sides: number,
  pointAt: SurfacePoint,
  reverse = false,
): BufferGeometry {
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let side = 0; side <= sides; side += 1) {
      const point = pointAt(row / (rows - 1), side / sides)
      positions.push(point.x, point.y, point.z)
      uvs.push(side / sides, row / (rows - 1))
      if (row === rows - 1 || side === sides) continue
      const a = row * (sides + 1) + side,
        b = a + sides + 1
      if (reverse) indices.push(a, a + 1, b, b, a + 1, b + 1)
      else indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  smoothGarmentSeamNormals(geometry, sides)
  return geometry
}

/** Concentrate unequal tension channels and compressed ridges at anatomical supports. */
function clothDisplacement(y: number, angle: number): number {
  const sin = Math.sin(angle),
    front = Math.max(0, Math.cos(angle))
  const lateral = Math.abs(sin),
    asymmetry = 0.915 - 0.085 * sin
  const support = front * 0.8 + lateral * lateral * 0.7
  const belt =
    (crease(y - (0.424 + 0.035 * sin), 0.021, 0.034) +
      crease(y - (0.509 - 0.055 * sin + 0.018 * lateral), 0.026, 0.027)) *
    support *
    smoothstep(0.41, 0.435, y) *
    (1 - smoothstep(0.57, 0.64, y))
  const shoulder =
    (crease(y - (0.89 - 0.24 * lateral + 0.034 * sin), 0.025, 0.033) +
      crease(y - (0.78 - 0.19 * lateral - 0.024 * sin), 0.02, 0.022)) *
    support *
    smoothstep(0.52, 0.6, y) *
    (1 - smoothstep(0.91, 1.03, y))
  const lap =
    (crease(y - (0.167 + 0.068 * sin + 0.018 * Math.cos(angle * 2)), 0.026, 0.034) +
      crease(y - (0.258 - 0.034 * sin), 0.02, 0.025)) *
    (0.3 * lateral + front) *
    smoothstep(0.05, 0.12, y) *
    (1 - smoothstep(0.26, 0.29, y))
  return (belt + shoulder + lap) * asymmetry
}

/** Shape upper-arm fullness, a compact elbow and a tapered elliptical forearm around fixed joints. */
function sleeve(side: number): BufferGeometry {
  const curve = new CatmullRomCurve3([
    new Vector3(-0.1, 0.8, side * 0.17),
    new Vector3(-0.06, 0.88, side * 0.34),
    new Vector3(0.3, 0.54, side * 0.49),
    new Vector3(0.76, 0.65, side * 0.35),
  ])
  return surface(
    SANTA_SLEEVE_RINGS + 1,
    SANTA_SLEEVE_SIDES,
    (t, u) => {
      const center = curve.getPoint(t),
        tangent = curve.getTangent(t).normalize()
      const normal = new Vector3().crossVectors(tangent, new Vector3(0, 0, 1)).normalize()
      const binormal = new Vector3().crossVectors(tangent, normal).normalize()
      const angle = u * Math.PI * 2,
        cos = Math.cos(angle),
        sin = Math.sin(angle)
      const upper = Math.exp(-(((t - 0.25) / 0.2) ** 2))
      const elbow = Math.exp(-(((t - 0.6) / 0.1) ** 2))
      const forearm = Math.exp(-(((t - 0.81) / 0.14) ** 2))
      const radius = 0.19 - 0.055 * t
      const inside = Math.max(0, -cos) ** 3
      const compression =
        (crease(t - (0.53 + side * 0.006 * sin), 0.029, 0.029) +
          crease(t - (0.63 - side * 0.008 * sin), 0.026, 0.026) +
          crease(t - 0.72, 0.027, 0.022)) *
        inside
      const tension =
        (crease(sin - 0.36, 0.17, 0.016) + crease(sin + 0.48, 0.15, 0.012)) *
        Math.max(0, cos) *
        smoothstep(0.1, 0.3, t) *
        (1 - smoothstep(0.8, 0.96, t))
      const upperFold =
        crease(t - (0.31 + 0.04 * sin + side * 0.01), 0.035, 0.025) *
        smoothstep(0.12, 0.22, t) *
        (1 - smoothstep(0.42, 0.5, t))
      const cuffGather =
        (crease(t - (0.81 + 0.028 * Math.sin(angle + side * 0.4)), 0.025, 0.035) +
          crease(t - (0.9 - 0.02 * sin), 0.022, 0.028)) *
        smoothstep(0.72, 0.77, t) *
        (1 - smoothstep(0.94, 0.985, t))
      const fold = compression + tension + (upperFold + cuffGather) * (0.6 + 0.4 * sin * sin)
      return center
        .addScaledVector(
          normal,
          cos * (radius + 0.025 * upper - 0.01 * elbow + 0.011 * forearm + fold),
        )
        .addScaledVector(
          binormal,
          sin * (radius + 0.008 * upper - 0.018 * elbow - 0.012 * forearm + fold),
        )
    },
    true,
  )
}

/** Build owned cloth geometry once; all movement and materials remain with the parent model. */
export function createSantaGarmentGeometry(): {
  coat: BufferGeometry
  sleeves: readonly [BufferGeometry, BufferGeometry]
  collar: BufferGeometry
  opening: BufferGeometry
  seams: BufferGeometry
  frontAt: (y: number) => number
} {
  const centers = new CatmullRomCurve3(
    COAT_SECTIONS.map(([x, y, z]) => new Vector3(x, y, z)),
    false,
    'catmullrom',
    0.5,
  )
  const profiles = new CatmullRomCurve3(
    COAT_SECTIONS.map(([, y, , x, z]) => new Vector3(x, y, z)),
    false,
    'catmullrom',
    0.5,
  )
  /** Place fold crests on the smooth silhouette without corrugating the quiet rear. */
  function coatPoint(t: number, angle: number): Vector3 {
    const center = centers.getPoint(t),
      profile = profiles.getPoint(t)
    const fold = clothDisplacement(center.y, angle)
    return new Vector3(
      center.x + Math.cos(angle) * (profile.x + fold),
      center.y,
      center.z + Math.sin(angle) * (profile.z + fold),
    )
  }

  const coat = surface(SANTA_COAT_RINGS, SANTA_COAT_SIDES, (t, u) => coatPoint(t, u * Math.PI * 2))
  const positions = coat.getAttribute('position')

  /** Follow the stored polygon front so trim and buckle touch the rendered surface. */
  function frontAt(y: number): number {
    let row = 0
    while (row < SANTA_COAT_RINGS - 2 && positions.getY((row + 1) * (SANTA_COAT_SIDES + 1)) < y)
      row += 1
    const before = row * (SANTA_COAT_SIDES + 1),
      after = before + SANTA_COAT_SIDES + 1
    const blend = (y - positions.getY(before)) / (positions.getY(after) - positions.getY(before))
    return positions.getX(before) + (positions.getX(after) - positions.getX(before)) * blend
  }

  const opening = surface(33, 12, (t, u) => {
    const y = 0.35 + 0.66 * t,
      angle = u * Math.PI * 2
    const press = smoothstep(0.35, 0.43, y)
    const taper = t === 0 || t === 1 ? 0 : Math.min(1, Math.sin(t * Math.PI) * 5)
    const pile =
      taper * (0.0012 * Math.sin(angle * 5 + t * 57) + 0.0008 * Math.cos(angle * 3 - t * 83))
    return new Vector3(
      frontAt(y) +
        0.006 -
        0.02 * (1 - press) +
        Math.cos(angle) * (0.02 * taper * press + pile * press),
      y,
      Math.sin(angle) * (0.045 * taper + pile),
    )
  })
  const collar = surface(
    49,
    10,
    (t, u) => {
      const angle = t * Math.PI * 2,
        cross = u * Math.PI * 2
      const pile =
        0.0015 * Math.sin(angle * 17 + cross * 3) + 0.001 * Math.cos(angle * 29 - cross * 2)
      return new Vector3(
        -0.06 + Math.cos(angle) * (0.202 + Math.cos(cross) * (0.058 + pile)),
        1.095 + Math.sin(cross) * (0.075 + pile),
        Math.sin(angle) * (0.22 + Math.cos(cross) * (0.07 + pile)),
      )
    },
    true,
  )
  const collarNormals = collar.getAttribute('normal')
  for (let side = 0; side <= 10; side += 1) {
    const first = side,
      last = 48 * 11 + side
    const normal = new Vector3()
      .fromBufferAttribute(collarNormals, first)
      .add(new Vector3().fromBufferAttribute(collarNormals, last))
      .normalize()
    collarNormals.setXYZ(first, normal.x, normal.y, normal.z)
    collarNormals.setXYZ(last, normal.x, normal.y, normal.z)
  }
  const seamParts: BufferGeometry[] = []
  for (const angle of [-1.5, 1.42, Math.PI]) {
    const points: Vector3[] = []
    for (let row = 0; row < SANTA_COAT_RINGS; row += 1) {
      const t = 0.13 + (row / (SANTA_COAT_RINGS - 1)) * 0.74
      const point = coatPoint(t, angle + 0.06 * Math.sin(t * Math.PI))
      point.x += Math.cos(angle) * 0.002
      point.z += Math.sin(angle) * 0.002
      points.push(point)
    }
    seamParts.push(new TubeGeometry(new CatmullRomCurve3(points), 56, 0.0035, 5, false))
  }
  const seams = mergeGeometries(seamParts)
  for (const part of seamParts) part.dispose()
  if (!seams) throw new Error('Garment construction seams must share attributes')
  return { coat, sleeves: [sleeve(-1), sleeve(1)], collar, opening, seams, frontAt }
}

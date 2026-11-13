import { BufferGeometry, CatmullRomCurve3, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  createSantaGarmentGeometry,
  SANTA_COAT_RINGS,
  SANTA_COAT_SIDES,
  SANTA_SLEEVE_RINGS,
  SANTA_SLEEVE_SIDES,
} from './santaGarmentGeometry'

/** Count physical boundary edges after welding only coincident UV seam vertices. */
function boundaryEdges(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position'),
    indices = geometry.index
  if (!indices) throw new Error('Expected indexed garment surfaces')
  const vertices: string[] = []
  for (let vertex = 0; vertex < position.count; vertex += 1)
    vertices.push(
      [position.getX(vertex), position.getY(vertex), position.getZ(vertex)]
        .map((value) => Math.round(value * 1e6))
        .join(','),
    )
  const edges = new Map<string, number>()
  for (let offset = 0; offset < indices.count; offset += 3) {
    const triangle = [
      vertices[indices.getX(offset)],
      vertices[indices.getX(offset + 1)],
      vertices[indices.getX(offset + 2)],
    ]
    if (new Set(triangle).size < 3) continue
    for (let side = 0; side < 3; side += 1) {
      const edge = [triangle[side], triangle[(side + 1) % 3]].sort().join('|')
      edges.set(edge, (edges.get(edge) ?? 0) + 1)
    }
  }
  return [...edges.values()].filter((count) => count !== 2).length
}

/** Release the independent factory's geometry after each isolated inspection. */
function disposeGarment(garment: ReturnType<typeof createSantaGarmentGeometry>): void {
  for (const geometry of [
    garment.coat,
    ...garment.sleeves,
    garment.collar,
    garment.opening,
    garment.seams,
  ])
    geometry.dispose()
}

describe('sculpted Santa garment', () => {
  it('spends the polygon budget on substantial asymmetric crests and recessed valleys', () => {
    const garment = createSantaGarmentGeometry()
    try {
      const anchors = [
        new Vector3(0.35, 0, 0.36),
        new Vector3(0.46, 0.15, 0.43),
        new Vector3(0.47, 0.46, 0.42),
        new Vector3(0.37, 0.75, 0.36),
        new Vector3(0.27, 0.98, 0.3),
        new Vector3(0.18, 1.08, 0.2),
      ]
      const profile = new CatmullRomCurve3(anchors, false, 'catmullrom', 0.5)
      const centers = new CatmullRomCurve3(
        [
          new Vector3(0, 0, 0),
          new Vector3(0.04, 0.15, 0),
          new Vector3(0.03, 0.46, 0),
          new Vector3(-0.02, 0.75, 0),
          new Vector3(-0.07, 0.98, 0),
          new Vector3(-0.05, 1.08, 0),
        ],
        false,
        'catmullrom',
        0.5,
      )
      const position = garment.coat.getAttribute('position')
      const left: number[] = [],
        right: number[] = [],
        rear: number[] = []
      for (let row = 0; row < SANTA_COAT_RINGS; row += 1) {
        const base = profile.getPoint(row / (SANTA_COAT_RINGS - 1)),
          start = row * (SANTA_COAT_SIDES + 1)
        right.push(position.getZ(start + SANTA_COAT_SIDES / 4) - base.z)
        left.push(-position.getZ(start + (SANTA_COAT_SIDES * 3) / 4) - base.z)
        rear.push(position.getZ(start + SANTA_COAT_SIDES / 2))
        // Keep real cloth vertices quiet beneath the leather strap to prevent intersecting crests.
        if (base.y >= 0.3 && base.y <= 0.4) {
          const center = centers.getPoint(row / (SANTA_COAT_RINGS - 1))
          expect(position.getX(start) - center.x - base.x).toBeCloseTo(0, 7)
          expect(right[row]).toBeCloseTo(0, 7)
          expect(left[row]).toBeCloseTo(0, 7)
        }
      }
      expect(Math.max(...right, ...left)).toBeGreaterThan(0.025)
      expect(Math.min(...right, ...left)).toBeLessThan(-0.009)
      expect(
        Math.max(...right.map((value, index) => Math.abs(value - left[index]))),
      ).toBeGreaterThan(0.02)
      expect(Math.max(...rear.map(Math.abs))).toBeLessThan(1e-6)
      // Compression above the belt must change the actual side silhouette repeatedly.
      const belt = right.filter((_, row) => {
        const y = position.getY(row * (SANTA_COAT_SIDES + 1))
        return y > 0.39 && y < 0.58
      })
      let turns = 0
      for (let index = 1; index < belt.length - 1; index += 1)
        if ((belt[index] - belt[index - 1]) * (belt[index + 1] - belt[index]) < 0) turns += 1
      expect(turns).toBeGreaterThanOrEqual(3)
    } finally {
      disposeGarment(garment)
    }
  })

  it('shapes elliptical arms with three compressed elbow creases and fixed cuff centers', () => {
    const garment = createSantaGarmentGeometry()
    try {
      for (const [index, sleeve] of garment.sleeves.entries()) {
        const position = sleeve.getAttribute('position'),
          side = index === 0 ? -1 : 1
        const curve = new CatmullRomCurve3([
          new Vector3(-0.1, 0.8, side * 0.17),
          new Vector3(-0.06, 0.88, side * 0.34),
          new Vector3(0.3, 0.54, side * 0.49),
          new Vector3(0.76, 0.65, side * 0.35),
        ])
        const radii: number[] = []
        for (let row = 0; row <= SANTA_SLEEVE_RINGS; row += 1) {
          const center = curve.getPoint(row / SANTA_SLEEVE_RINGS),
            start = row * (SANTA_SLEEVE_SIDES + 1)
          radii.push(
            new Vector3()
              .fromBufferAttribute(position, start + SANTA_SLEEVE_SIDES / 2)
              .distanceTo(center),
          )
          if (row === 0 || row === SANTA_SLEEVE_RINGS) {
            const mean = new Vector3()
            for (let angular = 0; angular < SANTA_SLEEVE_SIDES; angular += 1)
              mean.add(new Vector3().fromBufferAttribute(position, start + angular))
            expect(mean.divideScalar(SANTA_SLEEVE_SIDES).distanceTo(center)).toBeLessThan(1e-6)
          }
        }
        const compression = radii.slice(23, 37)
        let peaks = 0
        for (let row = 1; row < compression.length - 1; row += 1)
          if (compression[row] > compression[row - 1] && compression[row] > compression[row + 1])
            peaks += 1
        expect(peaks).toBe(3)
        expect(Math.max(...compression) - Math.min(...compression)).toBeGreaterThan(0.025)
        expect(sleeve.morphAttributes.position).toBeUndefined()
      }
    } finally {
      disposeGarment(garment)
    }
  })

  it('raises visible lateral sleeve crests and valleys without moving either endpoint ring', () => {
    const garment = createSantaGarmentGeometry()
    try {
      for (const [index, sleeve] of garment.sleeves.entries()) {
        const side = index === 0 ? -1 : 1,
          position = sleeve.getAttribute('position')
        const curve = new CatmullRomCurve3([
          new Vector3(-0.1, 0.8, side * 0.17),
          new Vector3(-0.06, 0.88, side * 0.34),
          new Vector3(0.3, 0.54, side * 0.49),
          new Vector3(0.76, 0.65, side * 0.35),
        ])
        for (const angular of [SANTA_SLEEVE_SIDES / 4, (SANTA_SLEEVE_SIDES * 3) / 4]) {
          const upperFolds: number[] = [],
            cuffFolds: number[] = []
          for (let row = 0; row <= SANTA_SLEEVE_RINGS; row += 1) {
            const t = row / SANTA_SLEEVE_RINGS,
              center = curve.getPoint(t),
              tangent = curve.getTangent(t).normalize()
            const normal = new Vector3().crossVectors(tangent, new Vector3(0, 0, 1)).normalize(),
              binormal = new Vector3().crossVectors(tangent, normal).normalize()
            const upper = Math.exp(-(((t - 0.25) / 0.2) ** 2)),
              elbow = Math.exp(-(((t - 0.6) / 0.1) ** 2)),
              forearm = Math.exp(-(((t - 0.81) / 0.14) ** 2))
            const radius = 0.19 - 0.055 * t
            const actual = new Vector3()
              .fromBufferAttribute(position, row * (SANTA_SLEEVE_SIDES + 1) + angular)
              .sub(center)
            const displacement =
              Math.abs(actual.dot(binormal)) -
              (radius + 0.008 * upper - 0.018 * elbow - 0.012 * forearm)
            if (t >= 0.2 && t <= 0.5) upperFolds.push(displacement)
            if (t >= 0.75 && t <= 0.98) cuffFolds.push(displacement)
            if (row === 0 || row === SANTA_SLEEVE_RINGS) {
              for (let endpoint = 0; endpoint < SANTA_SLEEVE_SIDES; endpoint += 1) {
                const angle = (endpoint / SANTA_SLEEVE_SIDES) * Math.PI * 2
                const expected = center
                  .clone()
                  .addScaledVector(
                    normal,
                    Math.cos(angle) * (radius + 0.025 * upper - 0.01 * elbow + 0.011 * forearm),
                  )
                  .addScaledVector(
                    binormal,
                    Math.sin(angle) * (radius + 0.008 * upper - 0.018 * elbow - 0.012 * forearm),
                  )
                expect(
                  new Vector3()
                    .fromBufferAttribute(position, row * (SANTA_SLEEVE_SIDES + 1) + endpoint)
                    .distanceTo(expected),
                ).toBeLessThan(1e-7)
              }
            }
          }
          expect(Math.max(...upperFolds)).toBeGreaterThan(0.02)
          expect(Math.min(...upperFolds)).toBeLessThan(-0.004)
          expect(Math.max(...cuffFolds)).toBeGreaterThan(0.025)
          expect(Math.min(...cuffFolds)).toBeLessThan(-0.002)
          let peaks = 0
          for (let row = 1; row < cuffFolds.length - 1; row += 1)
            if (cuffFolds[row] > cuffFolds[row - 1] && cuffFolds[row] > cuffFolds[row + 1])
              peaks += 1
          expect(peaks).toBeGreaterThanOrEqual(1)
          if (angular === (SANTA_SLEEVE_SIDES * 3) / 4) expect(peaks).toBe(2)
        }
      }
    } finally {
      disposeGarment(garment)
    }
  })

  it('closes thick trim, keeps seams finite and owns every returned resource within budget', () => {
    const garment = createSantaGarmentGeometry(),
      second = createSantaGarmentGeometry()
    try {
      expect(boundaryEdges(garment.collar)).toBe(0)
      expect(boundaryEdges(garment.opening)).toBe(0)
      garment.opening.computeBoundingBox()
      garment.collar.computeBoundingBox()
      const collarSize = garment.collar.boundingBox?.getSize(new Vector3())
      expect(collarSize?.y).toBeGreaterThan(0.14)
      const opening = garment.opening.getAttribute('position')
      const middle = 16 * 13
      expect(opening.getX(middle) - opening.getX(middle + 6)).toBeGreaterThan(0.035)
      expect(opening.getZ(middle + 3) - opening.getZ(middle + 9)).toBeGreaterThan(0.08)
      const geometries = [
        garment.coat,
        ...garment.sleeves,
        garment.collar,
        garment.opening,
        garment.seams,
      ]
      const other = [second.coat, ...second.sleeves, second.collar, second.opening, second.seams]
      let triangles = 0
      for (const [index, geometry] of geometries.entries()) {
        expect(geometry).not.toBe(other[index])
        expect(geometry.getAttribute('position').array).toEqual(
          other[index].getAttribute('position').array,
        )
        expect(Array.from(geometry.getAttribute('position').array).every(Number.isFinite)).toBe(
          true,
        )
        expect(Array.from(geometry.getAttribute('normal').array).every(Number.isFinite)).toBe(true)
        const normal = geometry.getAttribute('normal')
        for (let vertex = 0; vertex < normal.count; vertex += 1)
          expect(new Vector3().fromBufferAttribute(normal, vertex).length()).toBeCloseTo(1, 5)
        triangles += (geometry.index?.count ?? geometry.getAttribute('position').count) / 3
      }
      expect(triangles).toBe(21_840)
      expect(triangles).toBeLessThanOrEqual(22_000)
      expect(garment.frontAt(0.35)).toBeGreaterThan(0.49)
    } finally {
      disposeGarment(garment)
      disposeGarment(second)
    }
  })
})

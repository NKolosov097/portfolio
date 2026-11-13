import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { afterEach, describe, expect, it } from 'vitest'

import { createSantaSleigh } from './santaSleighModel'

const instances: ReturnType<typeof createSantaSleigh>[] = []
const borrowed: MeshStandardMaterial[] = []

/** Build independent borrowed surfaces so factory ownership is tested without a renderer. */
function fixture(): ReturnType<typeof createSantaSleigh> {
  const brass = new MeshStandardMaterial(),
    steel = new MeshStandardMaterial()
  const leather = new MeshStandardMaterial(),
    lantern = new MeshStandardMaterial()
  borrowed.push(brass, steel, leather, lantern)
  const sleigh = createSantaSleigh({ brass, steel, leather, lantern })
  instances.push(sleigh)
  return sleigh
}

/** Require real direct-child renderables rather than relying on model metadata. */
function parts(sleigh: ReturnType<typeof createSantaSleigh>, name: string): Mesh[] {
  return sleigh.group.children.filter(
    (part): part is Mesh => part instanceof Mesh && part.name === name,
  )
}

/** Compare actual mesh bounds in the preserved sleigh-local frame. */
function localBounds(part: Mesh): Box3 {
  part.geometry.computeBoundingBox()
  const bounds = part.geometry.boundingBox
  if (!bounds) throw new Error('Expected finite geometry bounds')
  part.updateMatrix()
  return bounds.clone().applyMatrix4(part.matrix)
}

afterEach(() => {
  for (const sleigh of instances.splice(0)) {
    for (const geometry of sleigh.geometries) geometry.dispose()
    for (const material of sleigh.materials) material.dispose()
    for (const texture of sleigh.textures) texture.dispose()
  }
  for (const material of borrowed.splice(0)) material.dispose()
})

describe('crafted sleigh factory', () => {
  it('keeps static meshes batchable, finite and inside the fixed route and triangle budgets', () => {
    const sleigh = fixture()
    expect(sleigh.group.name).toBe('santa-sleigh')
    expect(sleigh.group.position.toArray()).toEqual([-4, -0.1, 0])
    expect(sleigh.group.children.every((part) => part instanceof Mesh)).toBe(true)
    let triangles = 0
    const bounds = new Box3()
    for (const part of sleigh.group.children) {
      if (!(part instanceof Mesh)) throw new Error('Expected static direct-child mesh')
      expect(sleigh.geometries).toContain(part.geometry)
      const position = part.geometry.getAttribute('position')
      const normal = part.geometry.getAttribute('normal')
      const uv = part.geometry.getAttribute('uv')
      expect(normal.count).toBe(position.count)
      expect(uv.count).toBe(position.count)
      for (const attribute of [position, normal, uv]) {
        expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true)
      }
      for (const index of part.geometry.index?.array ?? []) {
        expect(index).toBeGreaterThanOrEqual(0)
        expect(index).toBeLessThan(position.count)
      }
      triangles += (part.geometry.index?.count ?? position.count) / 3
      bounds.union(localBounds(part))
    }
    expect(triangles).toBeGreaterThan(10000)
    expect(triangles).toBe(21_400)
    expect(triangles).toBeLessThanOrEqual(22000)
    expect(bounds.min.x).toBeGreaterThanOrEqual(-2.1)
    expect(bounds.max.x).toBeLessThanOrEqual(2.1)
    expect(bounds.min.y).toBeGreaterThanOrEqual(-0.5)
    expect(bounds.max.y).toBeLessThanOrEqual(2)
    expect(bounds.min.z).toBeGreaterThanOrEqual(-0.9)
    expect(bounds.max.z).toBeLessThanOrEqual(0.9)
  })

  it('closes volumetric bulging hull walls and inset panels with genuine thickness', () => {
    const sleigh = fixture()
    for (const [name, columns, rows, thickness] of [
      ['sleigh-hollow-hull-wall', 32, 6, 0.09],
      ['sleigh-layered-inset-panel', 28, 4, 0.028],
    ] as const) {
      const panels = parts(sleigh, name)
      expect(panels).toHaveLength(2)
      for (const panel of panels) {
        const geometry = panel.geometry
        const position = geometry.getAttribute('position')
        const faceSize = (columns + 1) * (rows + 1)
        expect(position.count).toBe(faceSize * 2)
        for (let vertex = 0; vertex < faceSize; vertex += 1) {
          expect(Math.abs(position.getZ(vertex) - position.getZ(vertex + faceSize))).toBeCloseTo(
            thickness,
            6,
          )
          expect(position.getX(vertex)).toBe(position.getX(vertex + faceSize))
          expect(position.getY(vertex)).toBe(position.getY(vertex + faceSize))
        }
        const edges = new Map<string, number>()
        const index = geometry.index
        if (!index) throw new Error('Expected indexed closed panel')
        for (let vertex = 0; vertex < index.count; vertex += 3) {
          for (let edge = 0; edge < 3; edge += 1) {
            const a = index.getX(vertex + edge),
              b = index.getX(vertex + ((edge + 1) % 3))
            const key = `${Math.min(a, b)}:${Math.max(a, b)}`
            edges.set(key, (edges.get(key) ?? 0) + 1)
          }
        }
        expect([...edges.values()].every((uses) => uses === 2)).toBe(true)
      }
    }
    const position = parts(sleigh, 'sleigh-hollow-hull-wall')[1].geometry.getAttribute('position')
    const middleColumn = 16
    expect(position.getZ(3 * 33 + middleColumn) - position.getZ(middleColumn)).toBeGreaterThan(0.1)
    expect(parts(sleigh, 'sleigh-curved-hull-end')).toHaveLength(2)
  })

  it('uses mirrored flat rounded metal ribbons rather than circular pipe runners', () => {
    const runners = parts(fixture(), 'sleigh-flat-steel-runner')
    expect(runners).toHaveLength(2)
    expect(runners[0].geometry).toBe(runners[1].geometry)
    expect(runners.map((runner) => runner.position.z)).toEqual([-0.68, 0.68])
    const position = runners[0].geometry.getAttribute('position')
    expect(position.count).toBe(73 * 8)
    for (let ring = 0; ring < 73; ring += 1) {
      const start = ring * 8
      const points = Array.from({ length: 8 }, (_, edge) =>
        new Vector3().fromBufferAttribute(position, start + edge),
      )
      const cross = new Box3().setFromPoints(points)
      expect(cross.max.z - cross.min.z).toBeCloseTo(0.12, 6)
      const edge = points[2].clone().sub(points[7])
      expect(edge.length()).toBeCloseTo(0.045, 6)
    }
    const bounds = localBounds(runners[0])
    expect(bounds.max.y).toBeGreaterThan(0.35)
    expect(bounds.min.y).toBeLessThan(-0.4)
    expect(parts(fixture(), 'sleigh-chassis-crossmember')).toHaveLength(2)
  })

  it('supports the fixed seated driver and keeps both towing and lantern anchors unchanged', () => {
    const sleigh = fixture()
    const cushion = localBounds(parts(sleigh, 'sleigh-seat-cushion')[0])
    const floor = localBounds(parts(sleigh, 'sleigh-footwell-floor')[0])
    expect(cushion.max.y).toBeCloseTo(0.58, 6)
    expect(cushion.min.z).toBeCloseTo(-0.58, 6)
    expect(cushion.max.z).toBeCloseTo(0.58, 6)
    expect(cushion.getCenter(new Vector3()).x).toBeCloseTo(-0.35)
    expect(floor.max.y).toBeCloseTo(0.08, 6)
    expect(0.09 - floor.max.y).toBeGreaterThan(0.009)
    expect(cushion.max.y - 0.55).toBeCloseTo(0.03, 6)
    expect(parts(sleigh, 'sleigh-seat-trestle')).toHaveLength(4)
    expect(parts(sleigh, 'sleigh-tow-eye').map((eye) => eye.position.toArray())).toEqual([
      [1.35, 0.57, -0.65],
      [1.35, 0.57, 0.65],
    ])
    expect(
      parts(sleigh, 'sleigh-lantern-amber-chamber').map((chamber) => chamber.position.toArray()),
    ).toEqual([
      [1.15, 1.37, -0.6],
      [1.15, 1.37, 0.6],
    ])
    expect(parts(sleigh, 'sleigh-lantern-cage-bar')).toHaveLength(8)
    const bag = localBounds(parts(sleigh, 'sleigh-folded-linen-sack')[0])
    const back = localBounds(parts(sleigh, 'sleigh-seat-back-frame')[0])
    expect(bag.max.x).toBeLessThan(back.min.x)
    expect(bag.min.y).toBeCloseTo(0.44)
    expect(bag.max.y).toBeLessThan(1.9)
  })

  it('rests a wider ochre sack on the rear deck with its cord and bow following the leaning neck', () => {
    const sleigh = fixture()
    const sack = parts(sleigh, 'sleigh-folded-linen-sack')[0],
      cord = parts(sleigh, 'sleigh-sack-gather-cord')[0],
      bow = parts(sleigh, 'sleigh-sack-tied-bow')[0]
    const bounds = localBounds(sack),
      deck = localBounds(parts(sleigh, 'sleigh-rear-cargo-deck')[0]),
      back = localBounds(parts(sleigh, 'sleigh-seat-back-frame')[0])
    expect(bounds.min.x).toBeGreaterThan(-1.86)
    expect(bounds.max.x).toBeLessThan(-1.06)
    expect(bounds.max.x).toBeLessThan(back.min.x)
    expect(bounds.min.z).toBeGreaterThan(-0.72)
    expect(bounds.max.z).toBeLessThan(0.72)
    expect(bounds.getSize(new Vector3()).z).toBeGreaterThan(1)
    expect(bounds.min.y).toBeCloseTo(0.44, 6)
    expect(deck.max.y - bounds.min.y).toBeGreaterThan(0)
    expect(deck.max.y - bounds.min.y).toBeLessThan(0.01)
    expect(bounds.max.y).toBeLessThan(1.8)
    const position = sack.geometry.getAttribute('position'),
      normals = sack.geometry.getAttribute('normal')
    expect(position.count).toBe(37 * 49)
    const contact: Vector3[] = []
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const point = new Vector3().fromBufferAttribute(position, vertex)
      if (Math.abs(point.y - bounds.min.y) < 1e-6) contact.push(point)
      if (point.y <= 1.14 && Math.abs(point.z) <= 0.685) {
        const rearInnerFace = -1.88 + 0.05 * (1 - (point.z / 0.685) ** 2) + 0.08
        expect(point.x - rearInnerFace).toBeGreaterThan(0.0149)
      }
    }
    expect(contact.length).toBeGreaterThan(20)
    const footprint = new Box3().setFromPoints(contact)
    expect(footprint.getSize(new Vector3()).x).toBeGreaterThan(0.3)
    expect(footprint.getSize(new Vector3()).z).toBeGreaterThan(0.2)
    expect(footprint.min.x).toBeGreaterThan(deck.min.x)
    expect(footprint.max.x).toBeLessThan(deck.max.x)
    expect(footprint.min.z).toBeGreaterThan(deck.min.z)
    expect(footprint.max.z).toBeLessThan(deck.max.z)
    for (let ring = 0; ring <= 36; ring += 1) {
      const start = ring * 49,
        end = start + 48
      for (const attribute of [position, normals])
        expect(
          new Vector3()
            .fromBufferAttribute(attribute, start)
            .distanceTo(new Vector3().fromBufferAttribute(attribute, end)),
        ).toBeLessThan(1e-6)
    }
    const indices = sack.geometry.index
    if (!indices) throw new Error('Expected an indexed closed sack')
    const edges = new Map<string, number>()
    for (let triangle = 0; triangle < indices.count; triangle += 3) {
      const vertices = [0, 1, 2].map((offset) => {
        const vertex = indices.getX(triangle + offset)
        return vertex % 49 === 48 ? vertex - 48 : vertex
      })
      for (let edge = 0; edge < 3; edge += 1) {
        const key = [vertices[edge], vertices[(edge + 1) % 3]].sort((a, b) => a - b).join(':')
        edges.set(key, (edges.get(key) ?? 0) + 1)
      }
    }
    expect([...edges.values()].every((uses) => uses === 2)).toBe(true)
    const neck = new Vector3()
    for (let edge = 0; edge < 48; edge += 1)
      neck.add(new Vector3().fromBufferAttribute(position, 31 * 49 + edge))
    neck.divideScalar(48)
    const cordCenter = localBounds(cord).getCenter(new Vector3())
    expect(cordCenter.distanceTo(neck)).toBeLessThan(0.025)
    expect(cordCenter.y).toBeLessThan(1.45)
    const knot = new Vector3()
    for (let edge = 0; edge < 6; edge += 1)
      knot.add(new Vector3().fromBufferAttribute(bow.geometry.getAttribute('position'), edge))
    knot.divideScalar(6)
    expect(knot.distanceTo(cordCenter)).toBeLessThan(0.1)
    const neckAxis = new Vector3(0, Math.cos(0.65), Math.sin(0.65))
    const cordPosition = cord.geometry.getAttribute('position')
    for (let vertex = 0; vertex < cordPosition.count; vertex += 1)
      expect(
        Math.abs(
          new Vector3().fromBufferAttribute(cordPosition, vertex).sub(cordCenter).dot(neckAxis),
        ),
      ).toBeLessThan(0.02)
    for (const [part, stride, rows] of [
      [cord, 25, 7],
      [bow, 7, 41],
    ] as const) {
      for (const attribute of ['position', 'normal']) {
        const values = part.geometry.getAttribute(attribute)
        for (let row = 0; row < rows; row += 1)
          expect(
            new Vector3()
              .fromBufferAttribute(values, row * stride)
              .distanceTo(new Vector3().fromBufferAttribute(values, row * stride + stride - 1)),
          ).toBeLessThan(1e-6)
        if (part === cord)
          for (let column = 0; column < stride; column += 1)
            expect(
              new Vector3()
                .fromBufferAttribute(values, column)
                .distanceTo(
                  new Vector3().fromBufferAttribute(values, (rows - 1) * stride + column),
                ),
            ).toBeLessThan(1e-6)
      }
    }
    expect(sack.material).toBeInstanceOf(MeshStandardMaterial)
    if (!(sack.material instanceof MeshStandardMaterial)) throw new Error('Expected woven linen')
    expect(sack.material.name).toBe('sleigh-woven-linen')
    expect(sack.material.color.getHex()).toBe(0x9a6a32)
    expect(sack.material.roughness).toBe(1)
    expect(sack.material.map).toBe(sack.material.bumpMap)
    expect(sack.material.map?.name).toBe('sleigh-linen-weave')
  })

  it('returns exact owned resources while borrowing the shared metal, tack and lamp surfaces', () => {
    const sleigh = fixture()
    expect(new Set(sleigh.geometries).size).toBe(sleigh.geometries.length)
    expect(new Set(sleigh.materials).size).toBe(5)
    expect(new Set(sleigh.textures).size).toBe(2)
    const usedMaterials = new Set(
      sleigh.group.children.flatMap((part) => (part instanceof Mesh ? [part.material] : [])),
    )
    for (const material of sleigh.materials) {
      expect(usedMaterials.has(material)).toBe(true)
      expect(borrowed).not.toContain(material)
      if (!(material instanceof MeshStandardMaterial))
        throw new Error('Expected standard painted and fabric surfaces')
      expect(material.metalness).toBe(0)
      for (const texture of [material.map, material.bumpMap]) {
        if (texture) expect(sleigh.textures).toContain(texture)
      }
    }
    for (const material of borrowed) expect(usedMaterials.has(material)).toBe(true)
    const painted = sleigh.materials.find(
      (material) => material.name === 'sleigh-crimson-painted-wood',
    )
    if (!(painted instanceof MeshStandardMaterial)) throw new Error('Expected painted timber')
    expect(painted.color.getHex()).toBe(0x600e16)
    expect(painted.roughness).toBe(0.45)
    expect(painted.envMapIntensity).toBe(0.25)
    const other = fixture()
    for (const resource of [...other.geometries, ...other.materials, ...other.textures])
      expect([...sleigh.geometries, ...sleigh.materials, ...sleigh.textures]).not.toContain(
        resource,
      )
    expect(sleigh.textures[0].image.data).toEqual(other.textures[0].image.data)
  })
})

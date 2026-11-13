import {
  Box3,
  BufferGeometry,
  CurvePath,
  DataTexture,
  ExtrudeGeometry,
  Group,
  LineCurve3,
  Skeleton,
  SkinnedMesh,
  Texture,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { loadNaturalDeerFixture } from './naturalDeerAsset.fixture'
import { loadNaturalSantaFixture } from './naturalSantaAsset.fixture'
import { createSantaTeam, type SantaFormation } from './santaModel'
import {
  SANTA_COAT_RINGS,
  SANTA_COAT_SIDES,
  SANTA_SLEEVE_RINGS,
  SANTA_SLEEVE_SIDES,
} from './santaGarmentGeometry'
import {
  createSantaRoutes,
  sampleSantaFlight,
  sampleSantaFormation,
  SANTA_CAMERA_DISTANCE,
  SANTA_CAMERA_FOV,
} from './santaTrajectory'

let template: Group
let santaTemplate: Group

beforeAll(async () => {
  template = await loadNaturalDeerFixture()
  santaTemplate = await loadNaturalSantaFixture()
})

/** Retain the renderer's three independent route frames in model integration checks. */
function formation(scale: number): SantaFormation {
  return {
    frames: [
      { position: new Vector3(), rotation: new Quaternion() },
      { position: new Vector3(), rotation: new Quaternion() },
      { position: new Vector3(), rotation: new Quaternion() },
    ],
    scale,
  }
}

/** Collect actual renderable meshes without weakening Three's object types. */
function meshes(group: ReturnType<typeof createSantaTeam>['group']): Mesh[] {
  const result: Mesh[] = []
  // Inspect the real scene graph, including meshes nested inside articulated limbs.
  group.traverse((object) => {
    if (object instanceof Mesh) result.push(object)
  })
  return result
}

// The cap assertions cover named renderable geometry, rather than descriptive metadata.
describe('textured Santa team', () => {
  it('uses the shipped textured anatomical head and red knit cap under the same seated parent', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const santa = team.group.getObjectByName('santa')
      expect(santa?.position.toArray()).toEqual([-0.25, 0.7, 0])
      for (const name of ['santa-natural-head', 'santa-hat-cloth', 'santa-hat-fur']) {
        const part = santa?.getObjectByName(name)
        const original = santaTemplate.getObjectByName(name)
        if (
          !(part instanceof Mesh) ||
          !(original instanceof Mesh) ||
          !(part.material instanceof MeshStandardMaterial)
        )
          throw new Error('Expected authored Santa surface')
        expect(part.geometry === original.geometry).toBe(false)
        expect(part.geometry.getAttribute('position').array).toEqual(
          original.geometry.getAttribute('position').array,
        )
        expect(part.material.map).toBeTruthy()
        expect(part.geometry.index?.count).toBe(original.geometry.index?.count)
      }
      expect(santa?.getObjectByName('santa-beard-lock')).toBeUndefined()
      expect(santa?.getObjectByName('santa-sleeve-upper')).toBeUndefined()
      const upper = santa?.getObjectByName('santa-upper-body')
      const angle = upper?.rotation.z
      team.animate(0.32)
      expect(santa?.rotation.z).toBe(0)
      expect(upper?.rotation.z).not.toBe(angle)
    } finally {
      team.dispose()
    }
  })

  it('closes the cropped head with continuous textured hair overlapping the cap and collar', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const hair = team.group.getObjectByName('santa-nape-hair')
      if (
        !(hair instanceof Mesh) ||
        !(hair.material instanceof MeshStandardMaterial) ||
        !(hair.material.map instanceof DataTexture)
      )
        throw new Error('Expected owned strand-textured nape')
      const texture = hair.material.map
      const { geometry, material } = hair
      const positions = geometry.getAttribute('position')
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
      geometry.computeBoundingBox()
      expect(geometry.boundingBox?.min.y).toBeLessThan(1.17)
      expect(geometry.boundingBox?.max.y).toBeGreaterThan(1.47)
      expect(texture).toBe(material.bumpMap)
      expect(texture.image.width).toBe(256)
      expect(texture.image.height).toBe(256)
      expect(texture.repeat.toArray()).toEqual([2, 1])
      expect(material.color.toArray()).toEqual([0.68, 0.65, 0.6])
      expect(material.bumpScale).toBe(0.012)
      const pixels = texture.image.data
      if (!(pixels instanceof Uint8Array))
        throw new Error('Expected deterministic RGBA strand pixels')
      const brightness = new Set<number>()
      for (let offset = 0; offset < pixels.length; offset += 4) {
        brightness.add(pixels[offset])
        if (
          pixels[offset] !== pixels[offset + 1] ||
          pixels[offset] !== pixels[offset + 2] ||
          pixels[offset + 3] !== 255
        )
          throw new Error('Hair map must remain opaque grayscale')
      }
      expect(brightness.size).toBeGreaterThan(30)
      expect(Math.min(...brightness)).toBeGreaterThanOrEqual(140)
      expect(Math.max(...brightness)).toBeLessThanOrEqual(188)
    } finally {
      team.dispose()
    }
  })

  it('uses the identical classic-red wool and white trim materials for the fitted cap and suit', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const santa = team.group.getObjectByName('santa')
      if (!(santa instanceof Group)) throw new Error('Expected seated Santa')
      const cloth = santa.getObjectByName('santa-hat-cloth'),
        fur = santa.getObjectByName('santa-hat-fur')
      const coat = santa.getObjectByName('santa-wool-coat')
      const trim = santa.getObjectByName('santa-fur-collar')
      if (
        !(cloth instanceof Mesh) ||
        !(fur instanceof Mesh) ||
        !(coat instanceof Mesh) ||
        !(trim instanceof Mesh) ||
        !(cloth.material instanceof MeshStandardMaterial)
      )
        throw new Error('Expected shared suit/cap materials')
      expect(cloth.material).toBe(coat.material)
      expect(fur.material).toBe(trim.material)
      expect(cloth.material.color.getHex()).toBe(0xa20b0e)
      expect(cloth.material.bumpScale).toBe(0.008)
      expect(cloth.material.map).toBe(cloth.material.bumpMap)
      expect(cloth.material.map).toBeInstanceOf(DataTexture)
      expect(cloth.material.map?.repeat.toArray()).toEqual([4, 4])
      expect(cloth.material.roughness).toBe(1)
      expect(cloth.material.metalness).toBe(0)
      expect(cloth.material.envMapIntensity).toBe(0.1)
      expect(cloth.material.normalMap).toBeNull()
      expect(cloth.material.roughnessMap).toBeNull()
      for (const part of meshes(santa).filter(
        (candidate) => candidate.name === 'santa-continuous-sleeve',
      ))
        expect(part.material).toBe(coat.material)
      const opening = santa.getObjectByName('santa-fur-front-opening')
      if (!(opening instanceof Mesh)) throw new Error('Expected sewn fur opening')
      expect(opening.material).toBe(trim.material)
      expect(opening.parent?.name).toBe('santa-coat-details')
      expect(opening.parent?.parent?.name).toBe('santa-upper-body-contents')
      const wool = cloth.material.map
      if (!(wool instanceof DataTexture) || !(wool.image.data instanceof Uint8Array))
        throw new Error('Expected prepared owned wool pixels')
      expect([wool.image.width, wool.image.height]).toEqual([256, 256])
      let minimum = 255,
        maximum = 0,
        grayscale = true
      for (let offset = 0; offset < wool.image.data.length; offset += 4) {
        const value = wool.image.data[offset]
        minimum = Math.min(minimum, value)
        maximum = Math.max(maximum, value)
        grayscale &&=
          value === wool.image.data[offset + 1] &&
          value === wool.image.data[offset + 2] &&
          wool.image.data[offset + 3] === 255
      }
      expect(grayscale).toBe(true)
      expect(minimum).toBeGreaterThanOrEqual(165)
      expect(maximum).toBeLessThanOrEqual(185)
      expect(maximum - minimum).toBeGreaterThan(10)
    } finally {
      team.dispose()
    }
  })

  it('prepares smooth finite coat and sleeve seams with continuous signed morph normals', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const coat = team.group.getObjectByName('santa-wool-coat')
      const opening = team.group.getObjectByName('santa-fur-front-opening')
      const sleeves = meshes(team.group).filter((part) => part.name === 'santa-continuous-sleeve')
      if (!(coat instanceof Mesh) || !(opening instanceof Mesh))
        throw new Error('Expected actual tailored garment geometry')
      const garments = [
        { part: coat, rings: SANTA_COAT_RINGS, sides: SANTA_COAT_SIDES },
        ...sleeves.map((part) => ({
          part,
          rings: SANTA_SLEEVE_RINGS + 1,
          sides: SANTA_SLEEVE_SIDES,
        })),
        { part: opening, rings: 33, sides: 12 },
      ]
      for (const { part, rings, sides } of garments) {
        const positions = part.geometry.getAttribute('position')
        const normals = part.geometry.getAttribute('normal')
        const uv = part.geometry.getAttribute('uv')
        const normalDelta = part.geometry.morphAttributes.normal?.[0]
        expect(positions.count).toBe(rings * (sides + 1))
        expect(part.geometry.index?.count).toBe((rings - 1) * sides * 6)
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
        expect(Array.from(normals.array).every(Number.isFinite)).toBe(true)
        let continuous = true,
          increasing = true,
          positiveRadii = true
        for (let ring = 0; ring < rings; ring += 1) {
          const first = ring * (sides + 1),
            last = first + sides
          const start = new Vector3().fromBufferAttribute(positions, first)
          const end = new Vector3().fromBufferAttribute(positions, last)
          continuous &&= start.distanceTo(end) < 1e-7
          expect([uv.getX(first), uv.getX(last)]).toEqual([0, 1])
          for (const influence of [-1, 0, 1]) {
            const normalStart = new Vector3().fromBufferAttribute(normals, first)
            const normalEnd = new Vector3().fromBufferAttribute(normals, last)
            if (normalDelta) {
              normalStart.addScaledVector(
                new Vector3().fromBufferAttribute(normalDelta, first),
                influence,
              )
              normalEnd.addScaledVector(
                new Vector3().fromBufferAttribute(normalDelta, last),
                influence,
              )
            }
            continuous &&= normalStart.distanceTo(normalEnd) < 1e-7
          }
          if (part === coat) {
            if (ring > 0) increasing &&= positions.getY(first) > positions.getY(first - sides - 1)
            positiveRadii &&=
              positions.getX(first) > positions.getX(first + sides / 2) &&
              positions.getZ(first + sides / 4) > positions.getZ(first + (sides * 3) / 4)
          }
        }
        expect(continuous).toBe(true)
        expect(increasing).toBe(true)
        expect(positiveRadii).toBe(true)
      }
      const openingPositions = opening.geometry.getAttribute('position')
      expect(openingPositions.getY(0)).toBeCloseTo(0.35, 7)
      expect(openingPositions.getY(openingPositions.count - 1)).toBeCloseTo(1.01, 7)
      const coatPositions = coat.geometry.getAttribute('position')
      let lowerRing = 0
      while (coatPositions.getY((lowerRing + 1) * (SANTA_COAT_SIDES + 1)) < 0.35) lowerRing += 1
      const before = lowerRing * (SANTA_COAT_SIDES + 1),
        after = (lowerRing + 1) * (SANTA_COAT_SIDES + 1)
      const blend =
        (0.35 - coatPositions.getY(before)) /
        (coatPositions.getY(after) - coatPositions.getY(before))
      const front =
        coatPositions.getX(before) +
        (coatPositions.getX(after) - coatPositions.getX(before)) * blend
      expect(openingPositions.getX(0)).toBeCloseTo(front - 0.014, 6)
      const buckle = team.group.getObjectByName('santa-belt-buckle')
      if (!(buckle instanceof Mesh)) throw new Error('Expected the actual belt buckle')
      expect(buckle.position.x).toBeCloseTo(front + 0.016, 6)
      expect(buckle.position.y).toBe(0.35)
      expect(buckle.geometry).toBeInstanceOf(ExtrudeGeometry)
      if (!(buckle.geometry instanceof ExtrudeGeometry))
        throw new Error('Expected a flat frame with a real opening')
      const shape = buckle.geometry.parameters.shapes
      if (Array.isArray(shape)) throw new Error('Expected one buckle frame')
      expect(shape.holes).toHaveLength(1)
      expect(
        Array.from(buckle.geometry.getAttribute('position').array).every(Number.isFinite),
      ).toBe(true)
      expect(Array.from(buckle.geometry.getAttribute('normal').array).every(Number.isFinite)).toBe(
        true,
      )
      buckle.updateMatrix()
      buckle.geometry.computeBoundingBox()
      if (!buckle.geometry.boundingBox) throw new Error('Expected finite buckle bounds')
      const buckleBounds = buckle.geometry.boundingBox.clone().applyMatrix4(buckle.matrix)
      const buckleSize = buckleBounds.getSize(new Vector3())
      expect(buckleSize.x).toBeCloseTo(0.016, 6)
      expect(buckleSize.y).toBeCloseTo(0.13, 6)
      expect(buckleSize.z).toBeCloseTo(0.18, 6)
      for (const first of [0, openingPositions.count - 13]) {
        const tip = new Vector3().fromBufferAttribute(openingPositions, first)
        for (let side = 1; side <= 12; side += 1)
          expect(
            new Vector3().fromBufferAttribute(openingPositions, first + side).distanceTo(tip),
          ).toBe(0)
      }
    } finally {
      team.dispose()
    }
  })

  it('keeps the seated lower body fixed while the torso, head and independent wrists respond continuously', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const santa = team.group.getObjectByName('santa')
      const upper = santa?.getObjectByName('santa-upper-body')
      const contents = santa?.getObjectByName('santa-upper-body-contents')
      const head = santa?.getObjectByName('santa-head-pivot')
      const authored = santa?.getObjectByName('santa-authored-surfaces')
      const hands = ['santa-hand-left', 'santa-hand-right'].map((name) =>
        santa?.getObjectByName(name),
      )
      if (!santa || !upper || !contents || !head || !authored || !hands[0] || !hands[1])
        throw new Error('Santa needs fixed hips and independent upper-body joints')
      expect(upper.parent).toBe(santa)
      expect(upper.position.toArray()).toEqual([0, 0.25, 0])
      expect(contents.parent).toBe(upper)
      expect(contents.position.toArray()).toEqual([0, -0.25, 0])
      expect(head.parent).toBe(contents)
      expect(head.position.toArray()).toEqual([-0.04, 1.13, 0])
      expect(authored.parent).toBe(head)
      expect(authored.position.toArray()).toEqual([0.04, -1.13, -0])
      const gloves = hands.map((hand) =>
        meshes(hand instanceof Group ? hand : team.group).find((part) =>
          part.name.startsWith(`${hand?.name}-surface-`),
        ),
      )
      if (!(gloves[0] instanceof Mesh) || !(gloves[1] instanceof Mesh))
        throw new Error('Hands need independently mirrored glove surfaces')
      expect(gloves[0].geometry).not.toBe(gloves[1].geometry)
      const leftGlove = gloves[0].geometry.getAttribute('position')
      const rightGlove = gloves[1].geometry.getAttribute('position')
      expect(leftGlove.count).toBe(rightGlove.count)
      let mirrored = true
      for (let vertex = 0; vertex < leftGlove.count; vertex += 1) {
        // Mirrored thumbs keep their authored longitudinal and vertical placement.
        mirrored &&=
          Math.abs(leftGlove.getX(vertex) - rightGlove.getX(vertex)) < 1e-7 &&
          Math.abs(leftGlove.getY(vertex) - rightGlove.getY(vertex)) < 1e-7
      }
      expect(mirrored).toBe(true)
      gloves[0].geometry.computeBoundingBox()
      gloves[1].geometry.computeBoundingBox()
      expect(gloves[0].geometry.boundingBox?.max.z).toBeCloseTo(
        -(gloves[1].geometry.boundingBox?.min.z ?? 1),
        7,
      )
      const lower = meshes(santa).filter((part) => part.parent === santa)
      expect(lower.length).toBeGreaterThanOrEqual(3)
      const lowerRest = lower.map((part) => part.matrix.toArray())
      const sleeves = meshes(santa).filter((part) => part.name === 'santa-continuous-sleeve')
      expect(sleeves).toHaveLength(2)
      const poses: number[][] = []
      const pullExtremes = [
        (Math.PI / 2 + 0.5) / 2.1,
        (1.5 * Math.PI + 0.5) / 2.1,
        (Math.PI / 2 - 0.7) / 2.37,
        (1.5 * Math.PI - 0.7) / 2.37,
      ]
      for (const time of [-19.4, -0.3, 0, 0.3, 0.8, 1.4, 3.1, ...pullExtremes, Number.MAX_VALUE]) {
        team.animate(time)
        expect(santa.position.toArray()).toEqual([-0.25, 0.7, 0])
        expect(santa.rotation.toArray()).toEqual([0, 0, 0, 'XYZ'])
        expect(lower.map((part) => part.matrix.toArray())).toEqual(lowerRest)
        const angles = [
          ...upper.rotation.toArray().slice(0, 3),
          ...head.rotation.toArray().slice(0, 3),
        ]
        expect(
          angles.every(
            (value) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 0.1,
          ),
        ).toBe(true)
        hands.forEach((hand, index) => {
          if (!hand) throw new Error('Missing independent hand')
          expect(hand.parent).toBe(contents)
          const weight = sleeves[index].morphTargetInfluences?.[0]
          if (weight === undefined) throw new Error('Sleeve needs an active wrist morph')
          expect(Math.abs(weight)).toBeLessThanOrEqual(1)
          expect(hand.position.x).toBeCloseTo(0.85 - 0.1 * weight, 12)
          expect(hand.position.y).toBeCloseTo(0.66 + 0.06 * weight, 12)
          const wrist = sleeves[index].geometry.morphAttributes.position[0]
          expect(wrist.getX(wrist.count - 1)).toBeCloseTo(-0.1, 7)
          expect(wrist.getY(wrist.count - 1)).toBeCloseTo(0.06, 7)
          expect(wrist.getX(0) === 0).toBe(true)
          expect(wrist.getY(0)).toBe(0)
          const positions = sleeves[index].geometry.getAttribute('position')
          const endCenter = new Vector3()
          for (let side = 0; side < SANTA_SLEEVE_SIDES; side += 1) {
            const vertex = positions.count - SANTA_SLEEVE_SIDES - 1 + side
            endCenter
              .add(new Vector3().fromBufferAttribute(positions, vertex))
              .addScaledVector(new Vector3().fromBufferAttribute(wrist, vertex), weight)
          }
          endCenter.divideScalar(SANTA_SLEEVE_SIDES).sub(hand.position)
          // The sleeve end remains inside the cuff ellipsoid at every signed pull extreme.
          const side = index === 0 ? -1 : 1
          expect(endCenter.x).toBeCloseTo(-0.09, 6)
          expect(endCenter.y).toBeCloseTo(-0.01, 6)
          expect(endCenter.z).toBeCloseTo(side * 0.01, 6)
          expect(
            ((endCenter.x + 0.12) / 0.09) ** 2 +
              ((endCenter.y + 0.01) / 0.14) ** 2 +
              ((endCenter.z - side * 0.01) / 0.13) ** 2,
          ).toBeLessThan(1)
        })
        poses.push([upper.rotation.z, head.rotation.z, hands[0].position.x, hands[1].position.x])
      }
      expect(new Set(poses.map((pose) => pose[0])).size).toBeGreaterThan(4)
      expect(poses.some((pose) => Math.abs(pose[2] - pose[3]) > 0.005)).toBe(true)
      for (const handIndex of [2, 3]) {
        const positions = poses.map((pose) => pose[handIndex])
        expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThan(0.12)
      }
      team.animate(0.8)
      const before = upper.rotation.z
      team.animate(0.800001)
      expect(Math.abs(upper.rotation.z - before)).toBeLessThan(0.000001)
    } finally {
      team.dispose()
    }
  })

  it('prepares four bounded cap and sleeve GPU targets while preserving the static anatomical head', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const targets = meshes(team.group).filter(
        (part) => part.geometry.morphAttributes.position?.length,
      )
      expect(targets).toHaveLength(4)
      const head = team.group.getObjectByName('santa-natural-head')
      const sourceHead = santaTemplate.getObjectByName('santa-natural-head')
      if (!(head instanceof Mesh) || !(sourceHead instanceof Mesh))
        throw new Error('Expected anatomical head buffers')
      const headBuffers = ['position', 'normal', 'uv'].map((name) => ({
        name,
        owned: Array.from(head.geometry.getAttribute(name).array),
        source: Array.from(sourceHead.geometry.getAttribute(name).array),
      }))
      expect(head.geometry.morphAttributes.position).toBeUndefined()
      expect(head.geometry.morphAttributes.normal).toBeUndefined()
      expect(head.morphTargetInfluences).toBeUndefined()
      let pompom = 0,
        fixedFur = 0,
        movingCloth = 0
      for (const part of targets) {
        const geometry = part.geometry
        const base = geometry.getAttribute('position')
        const delta = geometry.morphAttributes.position[0]
        const normal = geometry.morphAttributes.normal[0]
        const normalSupport = new Set<number>()
        const indices = geometry.index
        if (!indices) throw new Error('Performance targets retain indexed topology')
        for (let triangle = 0; triangle < indices.count; triangle += 3) {
          const vertices = [
            indices.getX(triangle),
            indices.getX(triangle + 1),
            indices.getX(triangle + 2),
          ]
          if (
            vertices.some(
              (vertex) =>
                delta.getX(vertex) !== 0 || delta.getY(vertex) !== 0 || delta.getZ(vertex) !== 0,
            )
          ) {
            for (const vertex of vertices) normalSupport.add(vertex)
          }
        }
        expect(geometry.morphTargetsRelative).toBe(true)
        expect(delta.count).toBe(base.count)
        expect(normal.count).toBe(base.count)
        expect(Array.from(delta.array).every(Number.isFinite)).toBe(true)
        expect(Array.from(normal.array).every(Number.isFinite)).toBe(true)
        if (!geometry.boundingBox || !geometry.boundingSphere)
          throw new Error('Morph extremes need conservative culling bounds')
        const original = santaTemplate.getObjectByName(part.name)
        if (original instanceof Mesh) {
          expect(base.array).toEqual(original.geometry.getAttribute('position').array)
          expect(geometry.getAttribute('normal').array).toEqual(
            original.geometry.getAttribute('normal').array,
          )
          expect(geometry.getAttribute('uv').array).toEqual(
            original.geometry.getAttribute('uv').array,
          )
          expect(original.geometry.morphAttributes.position).toBeUndefined()
        }
        let validBounds = true,
          localNormals = true
        for (let vertex = 0; vertex < base.count; vertex += 1) {
          const x = base.getX(vertex),
            y = base.getY(vertex),
            z = base.getZ(vertex)
          const displacement = new Vector3().fromBufferAttribute(delta, vertex)
          const moved = displacement.lengthSq() > 0
          if (!normalSupport.has(vertex))
            localNormals &&= new Vector3().fromBufferAttribute(normal, vertex).length() === 0
          for (const influence of [-1, 1]) {
            const point = new Vector3(x, y, z).addScaledVector(displacement, influence)
            validBounds &&=
              geometry.boundingBox.containsPoint(point) &&
              point.distanceTo(geometry.boundingSphere.center) <=
                geometry.boundingSphere.radius + 1e-7
          }
          if (part.name === 'santa-hat-fur') {
            if (x < -0.1895) {
              pompom += 1
              expect(displacement.toArray()).toEqual([0, Math.fround(0.02), Math.fround(0.016)])
            } else {
              fixedFur += 1
              expect(moved).toBe(false)
              expect(new Vector3().fromBufferAttribute(normal, vertex).length()).toBe(0)
            }
          } else if (part.name === 'santa-hat-cloth') {
            if (moved) movingCloth += 1
            if (y <= 1.565 || x >= -0.04) expect(moved).toBe(false)
            if (x < -0.225)
              expect(displacement.toArray()).toEqual([0, Math.fround(0.02), Math.fround(0.016)])
          }
        }
        expect(validBounds).toBe(true)
        expect(localNormals).toBe(true)
      }
      for (const time of [-3.5, 0, 1.4, Number.MAX_VALUE]) team.animate(time)
      for (const { name, owned, source } of headBuffers) {
        expect(owned).toEqual(source)
        expect(Array.from(head.geometry.getAttribute(name).array)).toEqual(owned)
        expect(Array.from(sourceHead.geometry.getAttribute(name).array)).toEqual(source)
      }
      expect(pompom).toBe(440)
      expect(fixedFur).toBe(1167)
      expect(movingCloth).toBeGreaterThan(100)
    } finally {
      team.dispose()
    }
  })

  it('reproduces complete performance poses after arbitrary seeks and route switches without rewriting morph buffers', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const parts = meshes(team.group).filter(
        (part) => part.geometry.morphAttributes.position?.length,
      )
      const buffers = parts.map((part) => ({
        geometry: part.geometry,
        base: Array.from(part.geometry.getAttribute('position').array),
        target: Array.from(part.geometry.morphAttributes.position[0].array),
        normals: Array.from(part.geometry.morphAttributes.normal[0].array),
      }))
      const joints = [
        'santa',
        'santa-upper-body',
        'santa-head-pivot',
        'santa-hand-left',
        'santa-hand-right',
      ].map((name) => {
        const part = team.group.getObjectByName(name)
        if (!part) throw new Error('Performance joint is missing')
        return part
      })
      team.animate(-2.7)
      const pose = joints.map((part) => part.matrixWorld.toArray())
      const influences = parts.map((part) => [...(part.morphTargetInfluences ?? [])])
      for (const time of [3.7, -1000, 0.4]) {
        team.animate(time, formation(0.4))
        team.animate(-2.7)
        expect(joints.map((part) => part.matrixWorld.toArray())).toEqual(pose)
        expect(parts.map((part) => part.morphTargetInfluences)).toEqual(influences)
      }
      for (const time of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        team.animate(time)
        expect(joints.map((part) => part.matrixWorld.toArray())).toEqual(pose)
      }
      parts.forEach((part, index) => {
        expect(part.geometry).toBe(buffers[index].geometry)
        expect(Array.from(part.geometry.getAttribute('position').array)).toEqual(
          buffers[index].base,
        )
        expect(Array.from(part.geometry.morphAttributes.position[0].array)).toEqual(
          buffers[index].target,
        )
        expect(Array.from(part.geometry.morphAttributes.normal[0].array)).toEqual(
          buffers[index].normals,
        )
      })
      const cloth = parts.find((part) => part.name === 'santa-hat-cloth')
      const fur = parts.find((part) => part.name === 'santa-hat-fur')
      for (const time of [-30, 0.2, 2.8, 35]) {
        team.animate(time)
        expect(cloth?.morphTargetInfluences?.[0]).toBe(fur?.morphTargetInfluences?.[0])
        expect(Math.abs(cloth?.morphTargetInfluences?.[0] ?? 2)).toBeLessThanOrEqual(1)
      }
      const final = joints.map((part) => part.matrixWorld.toArray())
      team.dispose()
      team.animate(1)
      expect(joints.map((part) => part.matrixWorld.toArray())).toEqual(final)
    } finally {
      team.dispose()
    }
  })

  // Check the four quadrupeds and the limb transforms used by the renderer.
  it('contains two pairs of four-legged reindeer with independent gallop phases', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      for (let deer = 1; deer <= 4; deer += 1) {
        const animal = team.group.getObjectByName(`reindeer-${deer}`)
        expect(animal).toBeDefined()
        for (let leg = 1; leg <= 4; leg += 1) {
          expect(animal?.getObjectByName(`deer-leg-${leg}-upper`)).toBeDefined()
          expect(animal?.getObjectByName(`deer-leg-${leg}-lower`)).toBeDefined()
        }
      }
      const first = team.group.getObjectByName('reindeer-1')?.getObjectByName('deer-leg-1-upper')
      const second = team.group.getObjectByName('reindeer-2')?.getObjectByName('deer-leg-1-upper')
      const oldAngle = first?.rotation.z
      team.animate(0.27)
      expect(first?.rotation.z).not.toBe(oldAngle)
      expect(first?.rotation.z).not.toBe(second?.rotation.z)
    } finally {
      team.dispose()
    }
  })

  // Different periods keep the animals distinct beyond a fixed offset of one shared cycle.
  it('uses deterministic independent periods, amplitudes and joint time series', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const periods = [1.03, 1.18, 1.09, 1.24]
      const joints = periods.map((_, index) => {
        const joint = team.group
          .getObjectByName(`reindeer-${index + 1}`)
          ?.getObjectByName('deer-leg-1-upper')
        if (!joint) throw new Error('Each animal needs an independent articulated stride')
        return joint
      })
      const series = joints.map(() => [] as number[])
      for (let sample = 0; sample < 40; sample += 1) {
        team.animate(sample * 0.17)
        joints.forEach((joint, index) => series[index].push(joint.rotation.z))
      }
      for (let first = 0; first < joints.length; first += 1) {
        for (let second = first + 1; second < joints.length; second += 1) {
          expect(
            series[first].filter((value, index) => Math.abs(value - series[second][index]) > 0.1)
              .length,
          ).toBeGreaterThan(20)
        }
        team.animate(0.173)
        const angles = joints.map((joint) => joint.rotation.z)
        team.animate(0.173 + periods[first])
        expect(joints[first].rotation.z).toBeCloseTo(angles[first], 9)
        expect(
          joints.some(
            (joint, index) => index !== first && Math.abs(joint.rotation.z - angles[index]) > 0.02,
          ),
        ).toBe(true)
        team.animate(0.173)
        expect(joints.map((joint) => joint.rotation.z)).toEqual(angles)
      }
    } finally {
      team.dispose()
    }
  })

  // Shared opaque cores and additive radial points keep antler decorations within the draw budget.
  it('shares eight colored antler tip lights and soft halo resources across the team', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const firstCore = team.group.getObjectByName('deer-antler-light-cores')
      const firstHalo = team.group.getObjectByName('deer-antler-light-halos')
      if (
        !(firstCore instanceof Mesh) ||
        !(firstCore.material instanceof MeshBasicMaterial) ||
        !(firstHalo instanceof Points) ||
        !(firstHalo.material instanceof PointsMaterial)
      )
        throw new Error('Antlers need material-backed light cores and halos')
      const centers = firstHalo.geometry.getAttribute('position')
      const colors = firstHalo.geometry.getAttribute('color')
      expect(centers.count).toBe(8)
      expect(new Set(Array.from(colors.array))).not.toEqual(new Set([1]))
      expect(firstCore.material.vertexColors).toBe(true)
      expect(firstCore.material.toneMapped).toBe(false)
      expect(firstHalo.material.size).toBeGreaterThan(0.1)
      expect(firstHalo.material.opacity).toBeGreaterThan(0.3)
      expect(firstHalo.material.depthWrite).toBe(false)
      team.group.updateMatrixWorld(true)
      Reflect.apply(firstHalo.onBeforeRender, firstHalo, [])
      const modelSize = firstHalo.material.size
      team.group.scale.setScalar(0.2)
      team.group.updateMatrixWorld(true)
      Reflect.apply(firstHalo.onBeforeRender, firstHalo, [])
      expect(firstHalo.material.size).toBeCloseTo(modelSize * 0.2, 9)
      const texture = firstHalo.material.map
      if (!(texture instanceof DataTexture) || !texture.image.data)
        throw new Error('Light halos need a radial alpha texture')
      expect(texture.image.data[3]).toBe(0)
      expect(texture.image.data[(16 * 32 + 16) * 4 + 3]).toBeGreaterThan(200)
      for (const [sideIndex, side] of ['left', 'right'].entries()) {
        for (let tip = 1; tip <= 4; tip += 1) {
          const attachment = template.getObjectByName(`deer-antler-light-${side}-${tip}`)
          if (!attachment) throw new Error('The actual rack needs an attachment at each light')
          const center = new Vector3().fromBufferAttribute(centers, sideIndex * 4 + tip - 1)
          expect(center.distanceTo(attachment.position)).toBeLessThan(0.00001)
          expect(center.y + 1.65).toBeGreaterThan(2.1)
        }
      }
      for (let deer = 1; deer <= 4; deer += 1) {
        const animal = team.group.getObjectByName(`reindeer-${deer}`)
        const core = animal?.getObjectByName('deer-antler-light-cores')
        const halo = animal?.getObjectByName('deer-antler-light-halos')
        if (!(core instanceof Mesh) || !(halo instanceof Points))
          throw new Error('Every deer needs antler lights')
        expect(core.geometry).toBe(firstCore.geometry)
        expect(core.material).toBe(firstCore.material)
        expect(halo.geometry).toBe(firstHalo.geometry)
        expect(halo.material).toBe(firstHalo.material)
        expect(halo.parent?.parent?.name).toBe('deer-head')
      }
    } finally {
      team.dispose()
    }
  })

  // Six full posed-skin scans need a longer timeout on contended software-rendering hosts.
  it('shares the real continuous textured surface with independent skeletons and stable torso', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const skins = meshes(team.group).filter(
        (mesh): mesh is SkinnedMesh => mesh instanceof SkinnedMesh,
      )
      expect(skins).toHaveLength(4)
      expect(new Set(skins.map((skin) => skin.skeleton)).size).toBe(4)
      const original = template.getObjectByName('deer-natural-surface')
      if (!(original instanceof SkinnedMesh)) throw new Error('Actual deer asset needs a skin')
      const first = skins[0]
      expect(first.geometry).not.toBe(original.geometry)
      const geometry = first.geometry
      const positions = geometry.getAttribute('position')
      const weights = geometry.getAttribute('skinWeight')
      const joints = geometry.getAttribute('skinIndex')
      expect(positions.count).toBe(17_294)
      expect(geometry.index?.count).toBe(59_997)
      expect(geometry.getAttribute('uv').count).toBe(positions.count)
      expect(geometry.getAttribute('color')).toBeUndefined()
      const lowVertices: number[] = []
      const torsoVertices: number[] = []
      const bellyVertices: number[] = []
      let stableInnerShins = true
      let validWeights = true
      let validJoints = true
      let normalizedWeights = true
      for (let vertex = 0; vertex < positions.count; vertex += 1) {
        let sum = 0
        for (let slot = 0; slot < 4; slot += 1) {
          const weight = weights.getComponent(vertex, slot)
          const joint = joints.getComponent(vertex, slot)
          validWeights &&= weight >= 0 && weight <= 1 && Number.isFinite(weight)
          validJoints &&= Number.isInteger(joint) && joint >= 0 && joint < 11
          sum += weight
        }
        normalizedWeights &&= Math.abs(sum - 1) < 1e-6
        if (
          positions.getY(vertex) < 0.3 &&
          (positions.getX(vertex) > 0.48 || positions.getX(vertex) < -0.85)
        )
          stableInnerShins &&= weights.getX(vertex) === 0
        if (
          positions.getX(vertex) >= -0.35 &&
          positions.getX(vertex) <= 0.25 &&
          positions.getY(vertex) >= 0.35 &&
          positions.getY(vertex) <= 0.5
        )
          bellyVertices.push(vertex)
        if (positions.getY(vertex) < -0.5 && lowVertices.length < 32) lowVertices.push(vertex)
        if (positions.getY(vertex) > 1 && weights.getX(vertex) === 1 && torsoVertices.length < 32)
          torsoVertices.push(vertex)
      }
      expect(validWeights && validJoints && normalizedWeights).toBe(true)
      expect(stableInnerShins).toBe(true)
      expect(bellyVertices.length).toBeGreaterThan(10)
      expect(bellyVertices.every((vertex) => weights.getX(vertex) === 1)).toBe(true)
      for (const name of ['normal', 'uv'])
        expect(Array.from(geometry.getAttribute(name).array).every(Number.isFinite)).toBe(true)
      expect(lowVertices.length).toBe(32)
      expect(torsoVertices.length).toBe(32)
      const initial = [...lowVertices, ...torsoVertices].map((vertex) =>
        first.getVertexPosition(vertex, new Vector3()),
      )
      team.animate(0.43)
      const moved = lowVertices.map((vertex, index) =>
        first.getVertexPosition(vertex, new Vector3()).distanceTo(initial[index]),
      )
      expect(Math.max(...moved)).toBeGreaterThan(0.15)
      torsoVertices.forEach((vertex, index) => {
        expect(
          first
            .getVertexPosition(vertex, new Vector3())
            .distanceTo(initial[lowVertices.length + index]),
        ).toBeLessThan(0.00001)
      })
      for (const skin of skins) {
        expect(skin.geometry).toBe(geometry)
        expect(skin.frustumCulled).toBe(false)
        if (
          !(skin.material instanceof MeshStandardMaterial) ||
          !(first.material instanceof MeshStandardMaterial) ||
          !(original.material instanceof MeshStandardMaterial)
        )
          throw new Error('Natural coats need textured standard materials')
        expect(skin.material.map).toBe(first.material.map)
        expect(skin.material.map).not.toBe(original.material.map)
        expect(skin.material.roughness).toBe(0.96)
        expect(skin.material.metalness).toBe(0)
      }
      const bellyRest = bellyVertices.map((vertex) =>
        new Vector3().fromBufferAttribute(positions, vertex),
      )
      for (const seconds of [0, 0.2, 0.43, 0.6, 0.8, 1.03]) {
        team.animate(seconds)
        const bellyError = bellyVertices.map((vertex, index) =>
          first.getVertexPosition(vertex, new Vector3()).distanceTo(bellyRest[index]),
        )
        expect(Math.max(...bellyError)).toBeLessThan(0.00001)
        const bounds = new Box3().setFromObject(team.group, true)
        expect([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)).toBe(true)
      }
    } finally {
      team.dispose()
    }
  }, 15_000)

  // Actual geometry and attachment transforms must agree with the articulated head skin.
  it('articulates actual head and rack vertices with attached lights and tack on each independent stride', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const original = template.getObjectByName('deer-natural-surface')
      if (!(original instanceof SkinnedMesh)) throw new Error('Actual deer asset needs a skin')
      const positions = original.geometry.getAttribute('position')
      const weights = original.geometry.getAttribute('skinWeight')
      const headVertices: number[] = []
      let rack = -1
      let muzzle = -1
      template.updateMatrixWorld(true)
      let restError = 0
      for (let vertex = 0; vertex < positions.count; vertex += 1) {
        const rest = new Vector3().fromBufferAttribute(positions, vertex)
        restError = Math.max(
          restError,
          original.getVertexPosition(vertex, new Vector3()).distanceTo(rest),
        )
        if (rest.y > 1.95 || (rest.x > 1.65 && rest.y > 1.4)) {
          headVertices.push(vertex)
          expect(weights.getZ(vertex)).toBe(1)
          if (rest.y > 2.1) rack = vertex
          if (rest.x > 1.7 && rest.y < 1.7) muzzle = vertex
        }
      }
      expect(restError).toBeLessThan(1e-6)
      expect(headVertices.length).toBeGreaterThan(100)
      expect(rack).toBeGreaterThan(-1)
      expect(muzzle).toBeGreaterThan(-1)
      for (const [index, period] of [1.03, 1.18, 1.09, 1.24].entries()) {
        const animal = team.group.getObjectByName(`reindeer-${index + 1}`)
        const skin = animal?.getObjectByName('deer-natural-surface')
        const head = animal?.getObjectByName('deer-head')
        const neck = animal?.getObjectByName('deer-neck')
        const tack = animal?.getObjectByName('deer-head-tack')
        const bridle = animal?.getObjectByName('deer-bridle')
        const halos = animal?.getObjectByName('deer-antler-light-halos')
        if (
          !animal ||
          !(skin instanceof SkinnedMesh) ||
          !head ||
          !neck ||
          !tack ||
          !bridle ||
          !(halos instanceof Points)
        )
          throw new Error('Every animal needs a complete articulated head and attachments')
        expect(skin.skeleton.bones).toHaveLength(11)
        expect(tack.parent).toBe(head)
        expect(bridle.parent).toBe(tack)
        team.animate(0.173)
        const initial = [rack, muzzle].map((vertex) =>
          skin.getVertexPosition(vertex, new Vector3()),
        )
        const pose = [head.rotation.z, neck.rotation.z, animal.position.y]
        team.animate(0.173 + period)
        expect([head.rotation.z, neck.rotation.z, animal.position.y]).toEqual(
          pose.map((value) => expect.closeTo(value, 9)),
        )
        for (const seconds of [0.1, 0.3, 0.5, 0.7, 0.9]) {
          team.animate(seconds)
          for (const vertex of [rack, muzzle]) {
            const actual = skin.localToWorld(skin.getVertexPosition(vertex, new Vector3()))
            const expected = head.localToWorld(
              new Vector3().fromBufferAttribute(positions, vertex).sub(new Vector3(1.2, 1.65, 0)),
            )
            expect(actual.distanceTo(expected)).toBeLessThan(1e-6)
          }
          const centers = halos.geometry.getAttribute('position')
          for (const [sideIndex, side] of ['left', 'right'].entries()) {
            for (let tip = 1; tip <= 4; tip += 1) {
              const marker = animal.getObjectByName(`deer-antler-light-${side}-${tip}`)
              if (!marker) throw new Error('Every light needs its moving rack marker')
              const actual = halos.localToWorld(
                new Vector3().fromBufferAttribute(centers, sideIndex * 4 + tip - 1),
              )
              expect(actual.distanceTo(marker.getWorldPosition(new Vector3()))).toBeLessThan(1e-6)
            }
          }
        }
        expect(
          Math.max(
            ...[rack, muzzle].map((vertex, slot) =>
              skin.getVertexPosition(vertex, new Vector3()).distanceTo(initial[slot]),
            ),
          ),
        ).toBeGreaterThan(0.01)
      }
    } finally {
      team.dispose()
    }
  })

  // Bound both resource complexity and actual drawn triangle count, including shared instances.
  it('has finite centered bounds, finite vertices and a bounded geometry budget', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const renderables = meshes(team.group)
      const unique = new Set<BufferGeometry>()
      let triangles = 0
      let finite = true
      for (const object of renderables) {
        const geometry = object.geometry
        unique.add(geometry)
        const positions = geometry.getAttribute('position')
        triangles += (geometry.index?.count ?? positions.count) / 3
        for (const coordinate of positions.array) finite &&= Number.isFinite(coordinate)
      }
      const bounds = new Box3().setFromObject(team.group, true)
      const size = bounds.getSize(new Vector3())
      const center = bounds.getCenter(new Vector3())
      expect(finite).toBe(true)
      expect(size.x).toBeCloseTo(14, 1)
      expect(size.y).toBeGreaterThan(3)
      expect(size.z).toBeGreaterThan(1)
      expect(center.length()).toBeLessThan(0.12)
      expect(triangles).toBeLessThan(180_000)
      expect(unique.size).toBeLessThanOrEqual(45)
      expect(renderables.length).toBeLessThan(125)
      const points: Points[] = []
      team.group.traverse((object) => {
        if (object instanceof Points) points.push(object)
      })
      expect(renderables.length + points.length).toBeLessThan(125)
      expect(
        new Set([...unique, ...points.map((object) => object.geometry)]).size,
      ).toBeLessThanOrEqual(45)
    } finally {
      team.dispose()
    }
  })

  // Animation must reuse geometry while moving rein vertices smoothly and predictably.
  it('reuses geometry and changes responsive reins without accepting non-finite time', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const rein = team.group.getObjectByName('santa-hand-rein')
      if (!(rein instanceof Mesh)) throw new Error('Santa needs visible hand reins')
      const geometry = rein.geometry
      const attribute = geometry.getAttribute('position')
      const initial = Array.from(attribute.array)
      team.animate(0.42)
      expect(rein.geometry).toBe(geometry)
      expect(Array.from(attribute.array)).not.toEqual(initial)
      const valid = Array.from(attribute.array)
      team.animate(Number.NaN)
      expect(Array.from(attribute.array)).toEqual(valid)
      team.animate(0.42)
      expect(Array.from(attribute.array)).toEqual(valid)
    } finally {
      team.dispose()
    }
  })

  it('wraps an anatomical collected/extended stride without pausing at intermediate keys', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const deer = team.group.getObjectByName('reindeer-1')
      const front = deer?.getObjectByName('deer-leg-1-upper')
      const frontKnee = deer?.getObjectByName('deer-leg-1-lower')
      const hind = deer?.getObjectByName('deer-leg-3-upper')
      if (!front || !frontKnee || !hind) throw new Error('The stride needs articulated limbs')
      team.animate(0.9476)
      expect(front.rotation.z).toBeGreaterThan(0.7)
      expect(hind.rotation.z).toBeLessThan(-0.7)
      team.animate(0.4326)
      expect(frontKnee.rotation.z).toBeLessThan(-1.3)
      const collected = frontKnee.rotation.z
      team.animate(1.4626)
      expect(frontKnee.rotation.z).toBeCloseTo(collected, 8)
      team.animate(0.1442 - 0.0001)
      const before = front.rotation.z
      team.animate(0.1442 + 0.0001)
      expect(Math.abs((front.rotation.z - before) / 0.0002)).toBeGreaterThan(0.5)
      for (let time = 0; time < 1.1; time += 0.011) {
        team.animate(time)
        for (let animal = 1; animal <= 4; animal += 1) {
          for (let limb = 1; limb <= 4; limb += 1) {
            const joint = team.group
              .getObjectByName(`reindeer-${animal}`)
              ?.getObjectByName(`deer-leg-${limb}-lower`)
            if (!joint) throw new Error('Every deer needs a knee/hock')
            expect(Number.isFinite(joint.rotation.z)).toBe(true)
            expect(limb <= 2 ? joint.rotation.z < -0.09 : joint.rotation.z > 0.09).toBe(true)
          }
        }
      }
      team.animate(0.9476 - 0.00001)
      const wrap = front.rotation.z
      team.animate(0.9476 + 0.00001)
      expect(front.rotation.z).toBeCloseTo(wrap, 5)
    } finally {
      team.dispose()
    }
  })

  it('suspends the rendered sleigh nose-up below the rear pair and adds sag after descent', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const sleigh = team.group.getObjectByName('santa-sleigh')
      const rearLeft = team.group.getObjectByName('reindeer-1')
      const rearRight = team.group.getObjectByName('reindeer-2')
      if (!sleigh || !rearLeft || !rearRight) throw new Error('Expected the rendered towing team')
      const display = formation(2 / team.spacing)
      for (const yaw of [0, 0.8]) {
        const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw)
        const descent = new LineCurve3(
          new Vector3(0, 4, 0).applyQuaternion(turn),
          new Vector3(4, 0, 0).applyQuaternion(turn),
        )
        const horizontal = new LineCurve3(
          new Vector3(4, 0, 0).applyQuaternion(turn),
          new Vector3(12, 0, 0).applyQuaternion(turn),
        )
        const leveling = new CurvePath<Vector3>()
        leveling.add(descent)
        leveling.add(horizontal)
        for (const time of [0, 1.1, 2.3, 4.7, 8.2]) {
          const heights: number[] = []
          for (const [route, distance] of [
            [horizontal, 2.5],
            [leveling, descent.getLength() + 2.5],
          ] as const) {
            sampleSantaFormation(route, distance / route.getLength(), 2, display.frames)
            team.animate(time, display)
            const rear = rearLeft
              .getWorldPosition(new Vector3())
              .add(rearRight.getWorldPosition(new Vector3()))
              .multiplyScalar(0.5)
            const height = sleigh.getWorldPosition(new Vector3()).y - rear.y
            expect(height).toBeLessThan(0)
            expect(sleigh.localToWorld(new Vector3(1, 0, 0)).y).toBeGreaterThan(
              sleigh.localToWorld(new Vector3(-1, 0, 0)).y,
            )
            heights.push(height)
          }
          expect(heights[1]).toBeLessThan(heights[0])
        }
      }
    } finally {
      team.dispose()
    }
  })

  it('rises and dips visibly at constant heading and remains continuous across the old stride wrap', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const sleigh = team.group.getObjectByName('santa-sleigh')
      if (!sleigh) throw new Error('Expected the rendered sleigh')
      const display = formation(1)
      const poses: number[][] = []
      for (let time = 0; time <= 24; time += 0.8) {
        team.animate(time, display)
        expect(Math.abs(sleigh.rotation.z)).toBeLessThanOrEqual(0.075)
        expect(Math.abs(sleigh.rotation.x)).toBeLessThanOrEqual(0.022)
        const height = sleigh.position.y / (team.spacing / 4)
        expect(Math.abs(height + 0.1)).toBeLessThanOrEqual(0.285)
        poses.push([sleigh.rotation.z, sleigh.rotation.x, height])
      }
      const heights = poses.map((pose) => pose[2])
      expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.4)
      for (let axis = 0; axis < 3; axis += 1)
        expect(new Set(poses.map((pose) => pose[axis])).size).toBeGreaterThan(20)
      team.animate(22 - 0.00001, display)
      const before = sleigh.matrixWorld.clone()
      team.animate(22 + 0.00001, display)
      for (let index = 0; index < 16; index += 1)
        expect(Math.abs(sleigh.matrixWorld.elements[index] - before.elements[index])).toBeLessThan(
          0.00003,
        )
    } finally {
      team.dispose()
    }
  })

  it('reproduces finite sleigh poses across extreme seeks, real passes and Model restores', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      const sleigh = team.group.getObjectByName('santa-sleigh')
      if (!sleigh) throw new Error('Expected the rendered sleigh')
      const display = formation(0.4)
      const routes = createSantaRoutes(1440, 900)
      /** Seek both delayed route frames and animation directly without relying on prior frames. */
      const seek = (seconds: number): number[] => {
        const flight = sampleSantaFlight(seconds)
        sampleSantaFormation(
          routes[flight.phase === 'near' ? 'near' : 'distant'],
          flight.progress,
          team.spacing * display.scale,
          display.frames,
        )
        team.animate(seconds, display)
        return sleigh.matrixWorld.toArray()
      }
      const modelTime = 3.7
      team.animate(modelTime)
      const model = sleigh.matrixWorld.toArray()
      expect(sleigh.position.y).toBeCloseTo(-0.1 + Math.sin((modelTime / 1.1) * Math.PI) * 0.035)
      expect(sleigh.rotation.z).toBeCloseTo(Math.sin((modelTime / 1.1) * Math.PI * 0.9) * 0.012)
      const times = [2.3, 17.8, 22, Number.MAX_VALUE, -Number.MAX_VALUE]
      const poses = times.map(seek)
      for (const pose of poses) expect(pose.every(Number.isFinite)).toBe(true)
      for (const index of [3, 0, 4, 2, 1]) {
        team.animate(modelTime)
        expect(sleigh.matrixWorld.toArray()).toEqual(model)
        expect(seek(times[index])).toEqual(poses[index])
      }
    } finally {
      team.dispose()
    }
  })

  it('keeps the complete team above its first entry and beyond horizontal pass boundaries', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      for (const [width, height] of [
        [1440, 900],
        [390, 844],
        [844, 390],
      ]) {
        const camera = new PerspectiveCamera(SANTA_CAMERA_FOV, width / height, 0.1, 120)
        camera.position.z = SANTA_CAMERA_DISTANCE
        camera.updateMatrixWorld()
        const routes = createSantaRoutes(width, height)
        const display = formation(
          (2 *
            SANTA_CAMERA_DISTANCE *
            Math.tan((SANTA_CAMERA_FOV * Math.PI) / 360) *
            camera.aspect *
            (width <= 600 ? 0.16 : 0.18)) /
            14,
        )
        for (const seconds of [0, 11.99999, 14, 22.99999]) {
          const pose = sampleSantaFlight(seconds)
          sampleSantaFormation(
            routes[pose.phase === 'near' ? 'near' : 'distant'],
            pose.progress,
            team.spacing * display.scale,
            display.frames,
          )
          team.animate(seconds, display)
          const bounds = new Box3().setFromObject(team.group, true)
          for (const x of [bounds.min.x, bounds.max.x]) {
            for (const y of [bounds.min.y, bounds.max.y]) {
              for (const z of [bounds.min.z, bounds.max.z]) {
                const projected = new Vector3(x, y, z).project(camera)
                expect(
                  seconds === 0
                    ? projected.y > 1
                    : seconds <= 14
                      ? projected.x < -1
                      : projected.x > 1,
                ).toBe(true)
              }
            }
          }
        }
      }
    } finally {
      team.dispose()
    }
  })

  it('keeps all six reused trace endpoints on their moving owners through Model/flight restores', () => {
    const team = createSantaTeam(template, santaTemplate)
    try {
      team.group.updateMatrixWorld(true)
      const traces = meshes(team.group).filter((mesh) =>
        ['santa-hand-rein', 'deer-pair-trace', 'sleigh-pull-trace'].includes(mesh.name),
      )
      expect(traces).toHaveLength(6)
      const endpoints = traces.flatMap((trace) => {
        const attribute = trace.geometry.getAttribute('position')
        const side = attribute.getZ(0) < 0 ? 0 : 1
        const rear = team.group.getObjectByName(`reindeer-${side + 1}`)
        const front = team.group.getObjectByName(`reindeer-${side + 3}`)
        const sleigh = team.group.getObjectByName('santa-sleigh')
        const hand = team.group.getObjectByName(side === 0 ? 'santa-hand-left' : 'santa-hand-right')
        const owners =
          trace.name === 'santa-hand-rein'
            ? [hand, rear?.getObjectByName('deer-head-tack')]
            : trace.name === 'deer-pair-trace'
              ? [rear, front]
              : [sleigh, rear]
        // TubeGeometry has seven vertices per radial ring; its last ring begins seven vertices before the end.
        return [0, attribute.count - 7].map((vertex, index) => {
          const owner = owners[index]
          if (!owner) throw new Error('Every trace endpoint needs its original owner')
          const local = owner.worldToLocal(
            trace.localToWorld(new Vector3().fromBufferAttribute(attribute, vertex)),
          )
          return {
            trace,
            geometry: trace.geometry,
            attribute,
            normal: trace.geometry.getAttribute('normal'),
            owner,
            vertex,
            local,
          }
        })
      })
      const route = createSantaRoutes(1440, 900).near
      const display = formation(0.4)
      for (const time of [
        0.3,
        0.7,
        1.1,
        (Math.PI / 2 + 0.5) / 2.1,
        (1.5 * Math.PI + 0.5) / 2.1,
        (Math.PI / 2 - 0.7) / 2.37,
        (1.5 * Math.PI - 0.7) / 2.37,
      ]) {
        sampleSantaFormation(route, 0.45 + time * 0.1, team.spacing * display.scale, display.frames)
        for (const pose of [display, undefined]) {
          team.animate(time, pose)
          team.group.updateMatrixWorld(true)
          for (const endpoint of endpoints) {
            const { trace, attribute, owner, vertex, local } = endpoint
            expect(trace.geometry).toBe(endpoint.geometry)
            expect(trace.geometry.getAttribute('position')).toBe(attribute)
            expect(trace.geometry.getAttribute('normal')).toBe(endpoint.normal)
            expect(trace.frustumCulled).toBe(false)
            const actual = trace.localToWorld(new Vector3().fromBufferAttribute(attribute, vertex))
            const expected = owner.localToWorld(local.clone())
            expect(actual.distanceTo(expected)).toBeLessThan(0.00001)
            expect(Array.from(endpoint.normal.array).every(Number.isFinite)).toBe(true)
          }
        }
      }
      team.animate(0)
      const restored = new Box3().setFromObject(team.group, true)
      expect(restored.getSize(new Vector3()).x).toBeCloseTo(14, 1)
      expect(restored.getCenter(new Vector3()).length()).toBeLessThan(0.12)
    } finally {
      team.dispose()
    }
  })

  // Test ownership at the disposal boundary so unused construction resources are covered too.
  it('disposes every owned resource once and leaves other teams independent', () => {
    const first = createSantaTeam(template, santaTemplate)
    const second = createSantaTeam(template, santaTemplate)
    const geometryDispose = vi.spyOn(BufferGeometry.prototype, 'dispose')
    const materialDispose = vi.spyOn(Material.prototype, 'dispose')
    const textureDispose = vi.spyOn(Texture.prototype, 'dispose')
    const skeletonDispose = vi.spyOn(Skeleton.prototype, 'dispose')
    try {
      const finishParts = [
        'deer-antler-light-cores',
        'deer-antler-light-halos',
        'deer-natural-surface',
        'santa-natural-head',
        'santa-hat-cloth',
        'santa-hat-fur',
        'santa-nape-hair',
      ].map((name) => {
        const part = first.group.getObjectByName(name)
        if (!(part instanceof Mesh) && !(part instanceof Points))
          throw new Error('Finish parts must own renderable resources')
        return part
      })
      // Vitest computes deep-equality hints for negative toBe, so compare resource identities directly.
      const santaResources = ['santa-natural-head', 'santa-hat-cloth', 'santa-hat-fur'].map(
        (name) => {
          const own = first.group.getObjectByName(name)
          const other = second.group.getObjectByName(name)
          const cached = santaTemplate.getObjectByName(name)
          if (
            !(own instanceof Mesh) ||
            !(other instanceof Mesh) ||
            !(cached instanceof Mesh) ||
            !(own.material instanceof MeshStandardMaterial) ||
            !(other.material instanceof MeshStandardMaterial) ||
            !(cached.material instanceof MeshStandardMaterial)
          )
            throw new Error('Santa resources must remain individually owned')
          expect(own.geometry === other.geometry).toBe(false)
          expect(own.geometry === cached.geometry).toBe(false)
          expect(own.material === other.material).toBe(false)
          expect(own.material === cached.material).toBe(false)
          const maps: Texture[] = []
          for (const [key, texture] of Object.entries(cached.material)) {
            if (!(texture instanceof Texture)) continue
            const owned = Reflect.get(own.material, key),
              otherTexture = Reflect.get(other.material, key)
            expect(owned).toBeInstanceOf(Texture)
            expect(owned === texture).toBe(false)
            expect(owned === otherTexture).toBe(false)
            if (!(owned instanceof Texture)) throw new Error('Expected cloned map')
            expect(owned.image).toBe(texture.image)
            maps.push(owned)
          }
          return { own, other, cached, maps }
        },
      )
      /** Inspect the two factory-owned maps through the actual batched sleigh materials. */
      function sleighMaps(team: ReturnType<typeof createSantaTeam>): Map<string, Texture> {
        const sleigh = team.group.getObjectByName('santa-sleigh')
        if (!(sleigh instanceof Group)) throw new Error('Expected the rendered sleigh')
        const maps = new Map<string, Texture>()
        for (const part of meshes(sleigh)) {
          const surfaces = Array.isArray(part.material) ? part.material : [part.material]
          for (const surface of surfaces)
            for (const value of Object.values(surface))
              if (
                value instanceof Texture &&
                ['sleigh-wood-grain', 'sleigh-linen-weave'].includes(value.name)
              )
                maps.set(value.name, value)
        }
        expect([...maps.keys()].sort()).toEqual(['sleigh-linen-weave', 'sleigh-wood-grain'])
        return maps
      }
      const firstSleighMaps = sleighMaps(first),
        secondSleighMaps = sleighMaps(second)
      for (const [name, map] of firstSleighMaps)
        expect(map === secondSleighMaps.get(name)).toBe(false)
      first.dispose()
      // Check identities without asking assertion diagnostics to inspect large GPU resource graphs.
      const disposedGeometries = new Set(geometryDispose.mock.contexts)
      const disposedMaterials = new Set(materialDispose.mock.contexts)
      const disposedTextures = new Set(textureDispose.mock.contexts)
      const disposedSkeletons = new Set(skeletonDispose.mock.contexts)
      for (const map of firstSleighMaps.values()) {
        expect(disposedTextures.has(map)).toBe(true)
        expect(textureDispose.mock.contexts.filter((texture) => texture === map)).toHaveLength(1)
      }
      for (const map of secondSleighMaps.values()) expect(disposedTextures.has(map)).toBe(false)
      for (const { own, other, cached, maps } of santaResources) {
        expect(disposedGeometries.has(own.geometry)).toBe(true)
        expect(disposedMaterials.has(own.material)).toBe(true)
        expect(disposedGeometries.has(other.geometry)).toBe(false)
        expect(disposedGeometries.has(cached.geometry)).toBe(false)
        expect(disposedMaterials.has(other.material)).toBe(false)
        expect(disposedMaterials.has(cached.material)).toBe(false)
        for (const map of maps) expect(disposedTextures.has(map)).toBe(true)
        for (const surface of [other.material, cached.material])
          for (const texture of Object.values(surface))
            if (texture instanceof Texture) expect(disposedTextures.has(texture)).toBe(false)
      }
      const templateSkin = template.getObjectByName('deer-natural-surface')
      if (
        !(templateSkin instanceof SkinnedMesh) ||
        !(templateSkin.material instanceof MeshStandardMaterial)
      )
        throw new Error('The cached template must retain its source resources')
      expect(disposedGeometries.has(templateSkin.geometry)).toBe(false)
      expect(disposedMaterials.has(templateSkin.material)).toBe(false)
      expect(disposedTextures.has(templateSkin.material.map)).toBe(false)
      expect(disposedSkeletons.has(templateSkin.skeleton)).toBe(false)
      expect(skeletonDispose).toHaveBeenCalledTimes(4)
      const geometryCalls = geometryDispose.mock.calls.length
      const materialCalls = materialDispose.mock.calls.length
      expect(geometryCalls).toBeGreaterThan(0)
      expect(materialCalls).toBeGreaterThan(0)
      expect(textureDispose).toHaveBeenCalledTimes(9)
      expect(
        materialDispose.mock.contexts.some((surface) => surface instanceof MeshBasicMaterial),
      ).toBe(true)
      expect(
        materialDispose.mock.contexts.some((surface) => surface instanceof PointsMaterial),
      ).toBe(true)
      for (const part of finishParts) {
        expect(disposedGeometries.has(part.geometry)).toBe(true)
        expect(disposedMaterials.has(part.material)).toBe(true)
      }
      expect(new Set(geometryDispose.mock.contexts).size).toBe(geometryCalls)
      expect(new Set(materialDispose.mock.contexts).size).toBe(materialCalls)
      expect(new Set(textureDispose.mock.contexts).size).toBe(9)
      first.dispose()
      expect(geometryDispose).toHaveBeenCalledTimes(geometryCalls)
      expect(materialDispose).toHaveBeenCalledTimes(materialCalls)
      expect(textureDispose).toHaveBeenCalledTimes(9)
      for (const map of secondSleighMaps.values())
        expect(textureDispose.mock.contexts.includes(map)).toBe(false)
      second.animate(1.2)
      second.dispose()
      expect(skeletonDispose).toHaveBeenCalledTimes(8)
      expect(geometryDispose).toHaveBeenCalledTimes(geometryCalls * 2)
      expect(materialDispose).toHaveBeenCalledTimes(materialCalls * 2)
      expect(textureDispose).toHaveBeenCalledTimes(18)
      for (const map of [...firstSleighMaps.values(), ...secondSleighMaps.values()])
        expect(textureDispose.mock.contexts.filter((texture) => texture === map)).toHaveLength(1)
    } finally {
      first.dispose()
      second.dispose()
      vi.restoreAllMocks()
    }
  })
})

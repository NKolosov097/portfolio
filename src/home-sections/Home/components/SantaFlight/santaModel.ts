import {
  AdditiveBlending,
  Bone,
  Box3,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DataTexture,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Matrix3,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Path,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  RepeatWrapping,
  RGBAFormat,
  Shape,
  Skeleton,
  SkinnedMesh,
  Sphere,
  SphereGeometry,
  Texture,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Material,
  type Object3D,
} from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  createSantaGarmentGeometry,
  SANTA_SLEEVE_RINGS,
  SANTA_SLEEVE_SIDES,
  smoothGarmentSeamNormals,
} from './santaGarmentGeometry'
import { createSantaSleigh } from './santaSleighModel'
import { placeSantaSleigh } from './santaSleighPose'

type Point = readonly [number, number, number]
type Leg = { upper: Bone; lower: Bone; phase: number; rear: boolean }
type Animal = {
  body: Group
  neck: Bone
  head: Bone
  headTack: Group
  period: number
  phase: number
  amplitude: number
  legs: Leg[]
}

export interface SantaFormationFrame {
  position: Vector3
  rotation: Quaternion
}

export interface SantaFormation {
  frames: readonly [SantaFormationFrame, SantaFormationFrame, SantaFormationFrame]
  scale: number
}

type TraceAnchor = {
  object: Object3D
  inverseOriginal: Matrix4
  delta: Matrix4
  normal: Matrix3
}
type Trace = {
  mesh: Mesh<TubeGeometry, MeshStandardMaterial>
  positions: Float32Array
  normals: Float32Array
  start: TraceAnchor
  end: TraceAnchor
}

const STRIDE_SECONDS = 1.1
const ANIMAL_PERIODS = [1.03, 1.18, 1.09, 1.24] as const
const ANIMAL_PHASES = [0.08, 0.36, 0.65, 0.9] as const
const ANIMAL_AMPLITUDES = [0.96, 1.03, 0.98, 1.06] as const
const STRIDE_KEYS = [0, 0.22, 0.5, 0.74, 1] as const
const FRONT_UPPER = [0.85, 0.1, -0.6, -0.2, 0.85] as const
const FRONT_LOWER = [-0.12, -0.25, -1.45, -1, -0.12] as const
const HIND_UPPER = [-0.85, -0.1, 0.65, 0.1, -0.85] as const
const HIND_LOWER = [0.18, 0.2, 1.4, 0.9, 0.18] as const

/** Fade anatomical masks smoothly without moving their fixed boundaries. */
function smoothstep(minimum: number, maximum: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)))
  return t * t * (3 - 2 * t)
}

/** Keep harmonic phases finite even when seeking to an arbitrary finite timestamp. */
function wave(seconds: number, frequency: number, phase = 0): number {
  return Math.sin((seconds % ((Math.PI * 2) / frequency)) * frequency + phase)
}

/** Prepare owned relative GPU deltas while preserving authored positions and split normals. */
function addMorph(
  geometry: BufferGeometry,
  displacement: (x: number, y: number, z: number, vertex: number) => Point,
  seamSides?: number,
): void {
  const base = geometry.getAttribute('position')
  const target = geometry.clone()
  target.computeVertexNormals()
  if (seamSides !== undefined) smoothGarmentSeamNormals(target, seamSides)
  const neutralNormals = target.getAttribute('normal').clone()
  const positions = target.getAttribute('position')
  const deltas = new Float32BufferAttribute(new Float32Array(base.count * 3), 3)
  const bounds = new Box3()
  const point = new Vector3()
  for (let vertex = 0; vertex < base.count; vertex += 1) {
    const x = base.getX(vertex),
      y = base.getY(vertex),
      z = base.getZ(vertex)
    deltas.setXYZ(vertex, ...displacement(x, y, z, vertex))
    const dx = deltas.getX(vertex),
      dy = deltas.getY(vertex),
      dz = deltas.getZ(vertex)
    positions.setXYZ(vertex, x + dx, y + dy, z + dz)
    bounds.expandByPoint(point.set(x - Math.abs(dx), y - Math.abs(dy), z - Math.abs(dz)))
    bounds.expandByPoint(point.set(x + Math.abs(dx), y + Math.abs(dy), z + Math.abs(dz)))
  }
  target.computeVertexNormals()
  if (seamSides !== undefined) smoothGarmentSeamNormals(target, seamSides)
  const deformedNormals = target.getAttribute('normal')
  const normals = new Float32BufferAttribute(new Float32Array(base.count * 3), 3)
  for (let vertex = 0; vertex < base.count; vertex += 1) {
    normals.setXYZ(
      vertex,
      deformedNormals.getX(vertex) - neutralNormals.getX(vertex),
      deformedNormals.getY(vertex) - neutralNormals.getY(vertex),
      deformedNormals.getZ(vertex) - neutralNormals.getZ(vertex),
    )
  }
  geometry.morphTargetsRelative = true
  geometry.morphAttributes.position = [deltas]
  geometry.morphAttributes.normal = [normals]
  geometry.boundingBox = bounds
  geometry.boundingSphere = bounds.getBoundingSphere(new Sphere())
  target.dispose()
}

/** Preserve nonzero sweep velocity between extrema while keeping every anatomical angle in range. */
function strideSlope(key: number, angles: readonly number[]): number {
  const current = key % (STRIDE_KEYS.length - 1)
  const previous = current === 0 ? STRIDE_KEYS.length - 2 : current - 1
  const next = current + 1
  const before =
    (angles[current] - angles[previous]) /
    (STRIDE_KEYS[current] - STRIDE_KEYS[previous] + (current === 0 ? 1 : 0))
  const after = (angles[next] - angles[current]) / (STRIDE_KEYS[next] - STRIDE_KEYS[current])
  return before * after <= 0 ? 0 : (2 * before * after) / (before + after)
}

/** Interpolate a periodic Hermite stride with continuous velocity through the sweep and wrap. */
function stride(phase: number, angles: readonly number[]): number {
  const t = ((phase % 1) + 1) % 1
  let key = 0
  while (key < STRIDE_KEYS.length - 2 && t > STRIDE_KEYS[key + 1]) key += 1
  const duration = STRIDE_KEYS[key + 1] - STRIDE_KEYS[key]
  const blend = (t - STRIDE_KEYS[key]) / duration
  const squared = blend * blend
  const cubed = squared * blend
  return (
    (2 * cubed - 3 * squared + 1) * angles[key] +
    (cubed - 2 * squared + blend) * duration * strideSlope(key, angles) +
    (-2 * cubed + 3 * squared) * angles[key + 1] +
    (cubed - squared) * duration * strideSlope(key + 1, angles)
  )
}

/** Bake repeatable fine surface relief without browser APIs or downloaded images. */
function surfaceTexture(seed: number, fibers: boolean, size = 64, contrast = 1): DataTexture {
  const pixels = new Uint8Array(size * size * 4)
  let state = seed
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      state = (state * 1664525 + 1013904223) >>> 0
      const grain = (state >>> 24) / 255
      const weave = fibers ? Math.sin(x * 2.7 + Math.sin(y * 0.42)) * 18 : 0
      const relief = 140 + grain * 70 + weave
      const value = Math.round(contrast === 1 ? relief : 175 + (relief - 175) * contrast)
      const offset = (y * size + x) * 4
      pixels[offset] = value
      pixels[offset + 1] = value
      pixels[offset + 2] = value
      pixels[offset + 3] = 255
    }
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(fibers ? 4 : 2, fibers ? 4 : 2)
  texture.needsUpdate = true
  return texture
}

/** Bake short overlapping directional fibers without changing the cloth or leather relief. */
function furReliefTexture(): DataTexture {
  const size = 256
  const pixels = new Uint8Array(size * size * 4)
  let state = 29
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      state = (state * 1664525 + 1013904223) >>> 0
      const fiber = Math.sin(x * 1.8 + y * 0.29 + Math.sin(y * 0.23) * 1.7)
      const broken = 0.5 + 0.5 * Math.sin(y * 0.57 + Math.floor(x / 4) * 2.3)
      const value = Math.round(155 + fiber * broken * 34 + (state >>> 24) * 0.12)
      const offset = (y * size + x) * 4
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value
      pixels[offset + 3] = 255
    }
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(4, 4)
  texture.needsUpdate = true
  return texture
}

/** Bake long wavy hair fibers once so the closed nape keeps relief under the bright night light. */
function hairStrandTexture(): DataTexture {
  const size = 256,
    pixels = new Uint8Array(size * size * 4)
  let state = 87
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      state = (state * 1664525 + 1013904223) >>> 0
      const phase = (x / size) * Math.PI * 2
      const broad =
        18 * Math.sin(phase * 38 + 2 * Math.sin(y * 0.018) + 0.5 * Math.sin(y * 0.045 + phase * 3))
      const fine = 4 * Math.sin(phase * 118 + Math.sin(y * 0.03))
      const value = Math.round(164 + broad + fine + ((state >>> 24) / 255) * 4 - 2)
      const offset = (y * size + x) * 4
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value
      pixels[offset + 3] = 255
    }
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(2, 1)
  texture.needsUpdate = true
  return texture
}

/** Close the cropped crown-to-collar volume with continuous, subtly grooved hair. */
function napeHairGeometry(): SphereGeometry {
  const geometry = new SphereGeometry(1, 32, 24)
  const position = geometry.getAttribute('position')
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const nx = position.getX(vertex),
      ny = position.getY(vertex),
      nz = position.getZ(vertex)
    const phi = Math.atan2(nz, nx)
    const groove =
      (0.004 * Math.sin(phi * 13 + ny * 2) + 0.002 * Math.sin(phi * 27 - ny * 3)) * (1 - ny * ny)
    position.setXYZ(vertex, -0.05 + nx * (0.22 + groove), 1.29 + ny * 0.23, nz * (0.18 + groove))
  }
  geometry.computeVertexNormals()
  return geometry
}

/** Give each antler point a soft radial halo with a transparent outer edge. */
function haloTexture(): DataTexture {
  const size = 32
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const radius = Math.hypot(((x + 0.5) / size) * 2 - 1, ((y + 0.5) / size) * 2 - 1)
      const offset = (y * size + x) * 4
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255
      pixels[offset + 3] = Math.round(Math.pow(Math.max(0, 1 - radius), 2.5) * 255)
    }
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat)
  texture.needsUpdate = true
  return texture
}

/** Assemble the textured deer and authored sleigh facing +X with independently owned GPU resources. */
export function createSantaTeam(
  template: Group,
  santaTemplate: Group,
): {
  group: Group
  spacing: number
  animate: (seconds: number, formation?: SantaFormation) => void
  dispose: VoidFunction
} {
  const group = new Group()
  group.name = 'santa-team'
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  const skeletons = new Set<Skeleton>()
  const animals: Animal[] = []
  const furTexture = furReliefTexture()
  const woolTexture = surfaceTexture(73, true, 256, 0.18)
  const leatherTexture = surfaceTexture(173, false)
  const hairTexture = hairStrandTexture()
  textures.add(furTexture).add(woolTexture).add(leatherTexture).add(hairTexture)

  /** Register each shared material once so teardown does not double-dispose resources. */
  function material(
    color: number,
    roughness: number,
    metalness = 0,
    bumpMap?: DataTexture,
  ): MeshStandardMaterial {
    const result = new MeshStandardMaterial({
      color,
      roughness,
      metalness,
      bumpMap: bumpMap ?? null,
      bumpScale: 0.024,
    })
    materials.add(result)
    return result
  }

  const leather = material(0x241c18, 0.72, 0, leatherTexture)
  const red = material(0xa20b0e, 1, 0, woolTexture)
  red.map = woolTexture
  red.bumpScale = 0.008
  red.envMapIntensity = 0.1
  red.name = 'santa-red-wool'
  const white = material(0xede5d5, 0.96, 0, furTexture)
  white.name = 'santa-white-fur'
  white.map = furTexture
  white.color.setRGB(0.68, 0.65, 0.6)
  white.bumpScale = 0.008
  const hair = material(0xffffff, 0.96, 0, hairTexture)
  hair.map = hairTexture
  hair.color.setRGB(0.68, 0.65, 0.6)
  hair.envMapIntensity = 0.18
  hair.bumpScale = 0.012
  const brass = material(0xac8651, 0.3, 0.78)
  const steel = material(0x7a8794, 0.26, 0.85)
  const lanternMaterial = material(0xe9b75b, 0.26, 0.18)
  lanternMaterial.emissive = new Color(0xffac39)
  lanternMaterial.emissiveIntensity = 1.6
  const sphere = new SphereGeometry(1, 20, 12)
  const smallSphere = new SphereGeometry(1, 12, 8)
  const taperedSegment = new CylinderGeometry(0.55, 1, 1, 10, 1)
  const beltRing = new TorusGeometry(1, 0.045, 6, 36)

  /** Add a named mesh, retaining geometry ownership even when reused by many parts. */
  function mesh<TGeometry extends BufferGeometry>(
    parent: Group,
    name: string,
    geometry: TGeometry,
    surface: MeshStandardMaterial,
    position: Point,
    scale: Point = [1, 1, 1],
  ): Mesh<TGeometry, MeshStandardMaterial> {
    geometries.add(geometry)
    const result = new Mesh(geometry, surface)
    result.name = name
    result.position.set(...position)
    result.scale.set(...scale)
    parent.add(result)
    return result
  }

  /** Shape one smoothly shaded volume using shared topology. */
  function oval(
    parent: Group,
    name: string,
    surface: MeshStandardMaterial,
    position: Point,
    scale: Point,
  ) {
    return mesh(parent, name, sphere, surface, position, scale)
  }

  /** Join anatomical or decorative points with a tapered solid whose ends overlap naturally. */
  function segment(
    parent: Group,
    name: string,
    surface: MeshStandardMaterial,
    start: Point,
    end: Point,
    radius: number,
  ) {
    const from = new Vector3(...start)
    const to = new Vector3(...end)
    const direction = to.sub(from)
    const result = mesh(parent, name, taperedSegment, surface, [0, 0, 0])
    result.position.copy(from).addScaledVector(direction, 0.5)
    result.scale.set(radius, direction.length(), radius)
    result.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize())
    return result
  }

  /** Use continuous curves for runners, rails and reins instead of visibly segmented pipes. */
  function tube(points: readonly Point[], radius: number, segments = 32): TubeGeometry {
    const vectors: Vector3[] = []
    for (const point of points) vectors.push(new Vector3(...point))
    return new TubeGeometry(new CatmullRomCurve3(vectors), segments, radius, 6, false)
  }

  /** Clone each authored map once per team while sharing only decoded CPU image data. */
  function ownedNaturalSanta(): Group {
    const natural = santaTemplate.clone(true)
    const ownedGeometry = new Map<BufferGeometry, BufferGeometry>()
    const ownedMaterials = new Map<Material, Material>()
    const ownedTextures = new Map<Texture, Texture>()
    natural.traverse((object) => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return
      const sourceGeometry: BufferGeometry = object.geometry
      let geometry = ownedGeometry.get(sourceGeometry)
      if (!geometry) {
        geometry = sourceGeometry.clone()
        ownedGeometry.set(sourceGeometry, geometry)
        geometries.add(geometry)
      }
      object.geometry = geometry
      if (object.name === 'santa-hat-cloth' || object.name === 'santa-hat-fur') {
        const cloth = object.name === 'santa-hat-cloth'
        addMorph(geometry, (x, y) => {
          const weight = cloth
            ? smoothstep(1.565, 1.63, y) * smoothstep(0.04, 0.225, -x)
            : x < -0.1895
              ? 1
              : 0
          return [0, 0.02 * weight, 0.016 * weight]
        })
      }
      object.updateMorphTargets()
      if (object.name === 'santa-hat-cloth') {
        object.material = red
        return
      }
      if (object.name === 'santa-hat-fur') {
        object.material = white
        return
      }
      let surface = ownedMaterials.get(object.material)
      if (!surface) {
        surface = object.material.clone()
        for (const [key, value] of Object.entries(surface)) {
          if (!(value instanceof Texture)) continue
          let texture = ownedTextures.get(value)
          if (!texture) {
            texture = value.clone()
            texture.needsUpdate = true
            ownedTextures.set(value, texture)
            textures.add(texture)
          }
          Reflect.set(surface, key, texture)
        }
        if (surface instanceof MeshStandardMaterial) {
          surface.envMapIntensity = 0.18
          if (object.name === 'santa-natural-head') surface.color.setRGB(0.55, 0.52, 0.49)
        }
        ownedMaterials.set(object.material, surface)
        materials.add(surface)
      }
      object.material = surface
    })
    return natural
  }

  const source = template.getObjectByName('deer-natural-surface')
  if (
    !(source instanceof SkinnedMesh) ||
    !(source.material instanceof MeshStandardMaterial) ||
    !source.material.map
  )
    throw new Error('Prepared natural deer surface is unavailable')
  const sourceMaterial = source.material
  const bodyGeometry = source.geometry.clone()
  const coatTexture = source.material.map.clone()
  coatTexture.needsUpdate = true
  geometries.add(bodyGeometry)
  textures.add(coatTexture)
  const lightCenters: number[] = []
  const lightColors: number[] = []
  const lightParts: BufferGeometry[] = []
  const lightPalette = [new Color(0xffdfae), new Color(0xc9dadf), new Color(0xf2cfac)]
  for (const side of ['left', 'right']) {
    for (let tip = 1; tip <= 4; tip += 1) {
      const attachment = template.getObjectByName(`deer-antler-light-${side}-${tip}`)
      if (!attachment) throw new Error('Prepared natural deer rack attachment is unavailable')
      const center = attachment.position
      const color = lightPalette[(tip + (side === 'left' ? 0 : 1)) % lightPalette.length]
      lightCenters.push(...center.toArray())
      lightColors.push(color.r, color.g, color.b)
      const core = smallSphere
        .clone()
        .scale(0.025, 0.025, 0.025)
        .translate(center.x, center.y, center.z)
      const colors = new Float32Array(core.getAttribute('position').count * 3)
      for (let vertex = 0; vertex < colors.length; vertex += 3) {
        colors[vertex] = color.r
        colors[vertex + 1] = color.g
        colors[vertex + 2] = color.b
      }
      core.setAttribute('color', new Float32BufferAttribute(colors, 3))
      lightParts.push(core)
    }
  }

  const lightGeometry = mergeGeometries(lightParts)
  for (const part of lightParts) part.dispose()
  if (!lightGeometry) throw new Error('Antler light cores must share vertex attributes')
  lightGeometry.name = 'deer-antler-light-cores'
  const glowGeometry = new BufferGeometry()
  glowGeometry.setAttribute('position', new Float32BufferAttribute(lightCenters, 3))
  glowGeometry.setAttribute('color', new Float32BufferAttribute(lightColors, 3))
  const glowTexture = haloTexture()
  const lightMaterial = new MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  const glowMaterial = new PointsMaterial({
    vertexColors: true,
    map: glowTexture,
    size: 0.4,
    opacity: 0.7,
    transparent: true,
    blending: AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    sizeAttenuation: true,
    toneMapped: false,
  })
  geometries.add(lightGeometry).add(glowGeometry)
  materials.add(lightMaterial).add(glowMaterial)
  textures.add(glowTexture)

  /** Give each textured deer its own skeleton and coat while sharing team-owned surface resources. */
  function reindeer(index: number, x: number, z: number) {
    const body = new Group()
    body.name = `reindeer-${index + 1}`
    body.position.set(x, 0.02, z)
    group.add(body)
    const natural = clone(template)
    const surface = natural.getObjectByName('deer-natural-surface')
    if (!(surface instanceof SkinnedMesh)) throw new Error('Natural deer clone lost its skin')
    const neck = natural.getObjectByName('deer-neck')
    const head = natural.getObjectByName('deer-head')
    if (!(neck instanceof Bone) || !(head instanceof Bone))
      throw new Error('Natural deer clone lost its head rig')
    const coat = sourceMaterial.clone()
    const tint = [0.42, 0.46, 0.4, 0.44][index]
    coat.color.setRGB(tint * 0.96, tint * 0.98, tint)
    coat.map = coatTexture
    coat.roughness = 0.96
    coat.metalness = 0
    coat.envMapIntensity = 0.18
    surface.geometry = bodyGeometry
    surface.material = coat
    surface.frustumCulled = false
    materials.add(coat)
    skeletons.add(surface.skeleton)
    body.add(natural)
    const lights = new Group()
    lights.name = 'deer-antler-lights'
    const cores = new Mesh(lightGeometry, lightMaterial)
    cores.name = 'deer-antler-light-cores'
    const halos = new Points(glowGeometry, glowMaterial)
    halos.name = 'deer-antler-light-halos'
    // PointsMaterial size needs the object's world scale to match the scaled light cores.
    halos.onBeforeRender = () => {
      const elements = halos.matrixWorld.elements
      glowMaterial.size = 0.4 * Math.hypot(elements[0], elements[1], elements[2])
    }
    lights.add(cores, halos)
    head.add(lights)
    const headTack = new Group()
    headTack.name = 'deer-head-tack'
    headTack.position.set(-1.2, -1.65, 0)
    head.add(headTack)
    const chestStrap = mesh(
      body,
      'deer-chest-harness',
      beltRing,
      leather,
      [0.55, 0.94, 0],
      [0.47, 0.39, 1],
    )
    chestStrap.rotation.y = Math.PI / 2
    const bridle = mesh(
      headTack,
      'deer-bridle',
      beltRing,
      leather,
      [1.76, 1.57, 0],
      [0.15, 0.155, 0.7],
    )
    bridle.rotation.y = Math.PI / 2
    for (const side of [-1, 1]) {
      segment(
        body,
        'deer-harness-side',
        leather,
        [-0.72, 0.98, side * 0.35],
        [0.72, 1.08, side * 0.34],
        0.025,
      )
      oval(body, 'deer-brass-harness-ring', brass, [0.67, 1.02, side * 0.36], [0.055, 0.055, 0.02])
    }
    const legs: Leg[] = []
    for (let limb = 0; limb < 4; limb += 1) {
      const rear = limb >= 2
      const upper = natural.getObjectByName(`deer-leg-${limb + 1}-upper`)
      const lower = natural.getObjectByName(`deer-leg-${limb + 1}-lower`)
      if (!(upper instanceof Bone) || !(lower instanceof Bone))
        throw new Error('Natural deer clone lost a limb bone')
      legs.push({ upper, lower, rear, phase: (limb % 2) * (0.035 + index * 0.012) })
    }
    animals.push({
      body,
      neck,
      head,
      headTack,
      period: ANIMAL_PERIODS[index],
      phase: ANIMAL_PHASES[index],
      amplitude: ANIMAL_AMPLITUDES[index],
      legs,
    })
  }

  for (let index = 0; index < 4; index += 1) {
    reindeer(index, index < 2 ? 0 : 4, index % 2 === 0 ? -0.65 : 0.65)
  }

  const craftedSleigh = createSantaSleigh({ brass, steel, leather, lantern: lanternMaterial })
  const sleigh = craftedSleigh.group
  for (const geometry of craftedSleigh.geometries) geometries.add(geometry)
  for (const surface of craftedSleigh.materials) materials.add(surface)
  for (const texture of craftedSleigh.textures) textures.add(texture)
  group.add(sleigh)

  const santa = new Group()
  santa.name = 'santa'
  santa.position.set(-0.25, 0.7, 0)
  sleigh.add(santa)
  const upperBody = new Group()
  upperBody.name = 'santa-upper-body'
  upperBody.position.set(0, 0.25, 0)
  santa.add(upperBody)
  const upperContents = new Group()
  upperContents.name = 'santa-upper-body-contents'
  upperContents.position.set(0, -0.25, 0)
  upperBody.add(upperContents)
  const headPivot = new Group()
  headPivot.name = 'santa-head-pivot'
  headPivot.position.set(-0.04, 1.13, 0)
  upperContents.add(headPivot)
  const hands: Group[] = []
  const sleeves: Mesh<BufferGeometry, MeshStandardMaterial>[] = []
  const garment = createSantaGarmentGeometry()
  mesh(upperContents, 'santa-wool-coat', garment.coat, red, [0, 0, 0])
  const coatDetails = new Group()
  coatDetails.name = 'santa-coat-details'
  upperContents.add(coatDetails)
  mesh(coatDetails, 'santa-cloth-construction-seams', garment.seams, red, [0, 0, 0])
  mesh(coatDetails, 'santa-fur-front-opening', garment.opening, white, [0, 0, 0])
  oval(santa, 'santa-coat-hem', white, [0.05, 0.07, 0], [0.43, 0.09, 0.43])
  const belt = mesh(
    upperContents,
    'santa-belt',
    beltRing,
    leather,
    [0.05, 0.35, 0],
    [0.47, 0.43, 1.3],
  )
  belt.rotation.x = Math.PI / 2
  const buckleShape = new Shape()
  const buckleHole = new Path()
  const buckleContours: readonly [Path, number, number, number][] = [
    [buckleShape, 0.176, 0.126, 0.01],
    [buckleHole, 0.14, 0.09, 0.006],
  ]
  for (const [contour, width, height, radius] of buckleContours) {
    const x = width / 2,
      y = height / 2
    contour.moveTo(-x + radius, -y)
    contour.lineTo(x - radius, -y)
    contour.quadraticCurveTo(x, -y, x, -y + radius)
    contour.lineTo(x, y - radius)
    contour.quadraticCurveTo(x, y, x - radius, y)
    contour.lineTo(-x + radius, y)
    contour.quadraticCurveTo(-x, y, -x, y - radius)
    contour.lineTo(-x, -y + radius)
    contour.quadraticCurveTo(-x, -y, -x + radius, -y)
    contour.closePath()
  }
  buckleShape.holes.push(buckleHole)
  const buckle = mesh(
    upperContents,
    'santa-belt-buckle',
    new ExtrudeGeometry(buckleShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 1,
      steps: 1,
      curveSegments: 4,
    }),
    brass,
    [garment.frontAt(0.35) + 0.016, 0.35, 0],
  )
  buckle.rotation.y = Math.PI / 2
  for (const side of [-1, 1]) {
    const thigh = oval(
      santa,
      'santa-seated-thigh',
      red,
      [0.43, 0.04, side * 0.24],
      [0.52, 0.19, 0.2],
    )
    thigh.rotation.z = -0.13
    segment(
      santa,
      'santa-boot-shaft',
      leather,
      [0.77, 0.08, side * 0.24],
      [0.91, -0.49, side * 0.24],
      0.17,
    )
    oval(santa, 'santa-boot', leather, [1.04, -0.47, side * 0.24], [0.31, 0.14, 0.18])
    const sleeveGeometry = garment.sleeves[side < 0 ? 0 : 1]
    addMorph(
      sleeveGeometry,
      (_x, _y, _z, vertex) => {
        const weight = smoothstep(
          0,
          1,
          Math.floor(vertex / (SANTA_SLEEVE_SIDES + 1)) / SANTA_SLEEVE_RINGS,
        )
        return [-0.1 * weight, 0.06 * weight, 0]
      },
      SANTA_SLEEVE_SIDES,
    )
    sleeves.push(mesh(upperContents, 'santa-continuous-sleeve', sleeveGeometry, red, [0, 0, 0]))
    const hand = new Group()
    hand.name = side < 0 ? 'santa-hand-left' : 'santa-hand-right'
    hand.position.set(0.85, 0.66, side * 0.34)
    upperContents.add(hand)
    hands.push(hand)
    oval(hand, 'santa-fur-cuff', white, [-0.12, -0.01, side * 0.01], [0.09, 0.14, 0.13])
    oval(hand, 'santa-glove', leather, [0, 0, 0], [0.14, 0.105, 0.095])
    oval(hand, 'santa-glove-thumb', leather, [-0.02, 0.07, side * -0.05], [0.09, 0.055, 0.06])
  }
  mesh(upperContents, 'santa-fur-collar', garment.collar, white, [0, 0, 0])
  const naturalSanta = ownedNaturalSanta()
  naturalSanta.name = 'santa-authored-surfaces'
  naturalSanta.position.copy(headPivot.position).multiplyScalar(-1)
  headPivot.add(naturalSanta)
  mesh(naturalSanta, 'santa-nape-hair', napeHairGeometry(), hair, [0, 0, 0])
  const capCloth = naturalSanta.getObjectByName('santa-hat-cloth')
  const capFur = naturalSanta.getObjectByName('santa-hat-fur')
  if (!(capCloth instanceof Mesh) || !(capFur instanceof Mesh))
    throw new Error('Prepared natural Santa performance surfaces are unavailable')
  const capClothInfluences = capCloth.morphTargetInfluences
  const capFurInfluences = capFur.morphTargetInfluences
  if (!capClothInfluences || !capFurInfluences)
    throw new Error('Prepared natural Santa performance targets are unavailable')
  const performance = {
    cloth: capClothInfluences,
    fur: capFurInfluences,
  }

  const lantern = new PointLight(0xffbc70, 1.8, 5, 2)
  lantern.position.set(1.15, 1.37, 0)
  sleigh.add(lantern)
  group.updateMatrixWorld(true)
  const anchors: TraceAnchor[] = []
  const traces: Trace[] = []

  /** Retain the authored attachment frame once for all traces sharing a moving component. */
  function anchor(object: Object3D): TraceAnchor {
    const existing = anchors.find((entry) => entry.object === object)
    if (existing) return existing
    const result = {
      object,
      inverseOriginal: object.matrixWorld.clone().invert(),
      delta: new Matrix4(),
      normal: new Matrix3(),
    }
    anchors.push(result)
    return result
  }

  /** Retain tube attributes and endpoint frames so every attachment follows without rebuilding geometry. */
  function trace(
    item: Mesh<TubeGeometry, MeshStandardMaterial>,
    start: Object3D,
    end: Object3D,
  ): void {
    item.frustumCulled = false
    traces.push({
      mesh: item,
      positions: new Float32Array(item.geometry.getAttribute('position').array),
      normals: new Float32Array(item.geometry.getAttribute('normal').array),
      start: anchor(start),
      end: anchor(end),
    })
  }

  for (const side of [-1, 1]) {
    const rear = animals[side < 0 ? 0 : 1].body
    const front = animals[side < 0 ? 2 : 3].body
    const rein = mesh(
      group,
      'santa-hand-rein',
      tube(
        [
          [-3.4, 1.26, side * 0.34],
          [-2.1, 1.13, side * 0.47],
          [-0.7, 1.15, side * 0.65],
          [1.76, 1.57, side * 0.65],
        ],
        0.012,
        40,
      ),
      leather,
      [0, 0, 0],
    )
    trace(rein, hands[side < 0 ? 0 : 1], animals[side < 0 ? 0 : 1].headTack)
    const pairTrace = mesh(
      group,
      'deer-pair-trace',
      tube(
        [
          [0.65, 1.06, side * 1.02],
          [1.6, 0.9, side * 1.05],
          [2.8, 1.02, side * 1.03],
          [4.65, 1.1, side * 1.02],
        ],
        0.018,
      ),
      leather,
      [0, 0, 0],
    )
    trace(pairTrace, rear, front)
    const pullTrace = mesh(
      group,
      'sleigh-pull-trace',
      tube(
        [
          [-2.65, 0.47, side * 0.65],
          [-1.5, 0.7, side * 0.95],
          [0.62, 1.05, side * 1.02],
        ],
        0.023,
      ),
      leather,
      [0, 0, 0],
    )
    trace(pullTrace, sleigh, rear)
  }
  const mergedParts = new Map<string, BufferGeometry>()

  /** Batch rigid details by surface while retaining joints and inspectable cap parts. */
  function mergeRigidParts(parent: Group, prefix: string): void {
    const byMaterial = new Map<MeshStandardMaterial, Mesh<BufferGeometry, MeshStandardMaterial>[]>()
    for (const child of [...parent.children]) {
      if (!(child instanceof Mesh) || !(child.material instanceof MeshStandardMaterial)) continue
      if (child.name.startsWith('santa-hat-') || child.name === 'santa-hand-rein') continue
      if ((child.geometry.morphAttributes.position?.length ?? 0) > 0) continue
      const parts = byMaterial.get(child.material) ?? []
      parts.push(child)
      byMaterial.set(child.material, parts)
    }
    for (const [surface, parts] of byMaterial) {
      if (parts.length < 2) continue
      const key = `${prefix}-${surface.uuid}`
      let geometry = mergedParts.get(key)
      if (!geometry) {
        const transformed: BufferGeometry[] = []
        for (const part of parts) {
          part.updateMatrix()
          const copy = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone()
          copy.applyMatrix4(part.matrix)
          transformed.push(copy)
        }
        geometry = mergeGeometries(transformed) ?? undefined
        for (const copy of transformed) copy.dispose()
        if (!geometry) throw new Error('Santa rigid model parts must share vertex attributes')
        mergedParts.set(key, geometry)
      }
      for (const part of parts) parent.remove(part)
      mesh(
        parent,
        `${prefix}-surface-${surface.color.getHexString()}`,
        geometry,
        surface,
        [0, 0, 0],
      )
    }
  }

  for (const animal of animals) {
    mergeRigidParts(animal.body, 'deer')
  }
  mergeRigidParts(santa, 'santa')
  mergeRigidParts(upperContents, 'santa-upper')
  for (const hand of hands) mergeRigidParts(hand, hand.name)
  mergeRigidParts(sleigh, 'sleigh')
  let disposed = false
  let normalization = 1
  const center = new Vector3()
  const rig = new Group()
  rig.name = 'santa-centered-rig'
  for (const child of [...group.children]) rig.add(child)
  group.add(rig)
  const inverseRig = new Matrix4()
  const startVertex = new Vector3()
  const endVertex = new Vector3()
  const startNormal = new Vector3()
  const endNormal = new Vector3()

  /** Place a component in its own route frame while retaining its small local gait motion. */
  function place(component: Group, frame: SantaFormationFrame, scale: number): void {
    component.position.multiplyScalar(scale).applyQuaternion(frame.rotation).add(frame.position)
    component.quaternion.premultiply(frame.rotation)
    component.scale.setScalar(scale)
  }

  /** Pose keyed anatomical strides and let each pair and the sleigh follow its own route frame. */
  function animate(seconds: number, formation?: SantaFormation): void {
    if (disposed || !Number.isFinite(seconds)) return
    const cycle = (seconds % (STRIDE_SECONDS * 20)) / STRIDE_SECONDS
    const componentScale = formation ? normalization * formation.scale : 1
    rig.scale.setScalar(formation ? 1 : normalization)
    rig.position.copy(center).multiplyScalar(formation ? 0 : -normalization)
    for (let index = 0; index < animals.length; index += 1) {
      const animal = animals[index]
      const phase =
        (((seconds % animal.period) + animal.period) % animal.period) / animal.period + animal.phase
      const pulse = phase * Math.PI * 2
      animal.body.position.set(
        (formation ? 0 : index < 2 ? 0 : 4) + Math.sin(pulse - 0.2) * 0.035 * animal.amplitude,
        0.02 + Math.cos(pulse - 0.35) * 0.1 * animal.amplitude,
        index % 2 === 0 ? -0.65 : 0.65,
      )
      animal.body.rotation.set(0, 0, Math.sin(pulse - 0.6) * 0.045 * animal.amplitude)
      animal.neck.rotation.z = Math.sin(pulse - 0.45) * 0.065 * animal.amplitude
      animal.head.rotation.z = -Math.sin(pulse - 0.9) * 0.045 * animal.amplitude
      animal.body.scale.setScalar(1)
      for (const leg of animal.legs) {
        const swing = phase + leg.phase
        leg.upper.rotation.z = stride(swing, leg.rear ? HIND_UPPER : FRONT_UPPER) * animal.amplitude
        leg.lower.rotation.z = stride(swing, leg.rear ? HIND_LOWER : FRONT_LOWER) * animal.amplitude
      }
      if (formation) place(animal.body, formation.frames[index < 2 ? 1 : 0], componentScale)
    }
    sleigh.position.set(formation ? 0 : -4, -0.1 + Math.sin(cycle * Math.PI) * 0.035, 0)
    sleigh.rotation.set(0, 0, Math.sin(cycle * Math.PI * 0.9) * 0.012)
    sleigh.scale.setScalar(1)
    if (formation) {
      placeSantaSleigh(seconds, formation.frames[2], componentScale, sleigh)
    }
    const frequency = Math.PI / STRIDE_SECONDS
    upperBody.rotation.set(
      0.018 * (wave(seconds, 1.39, 0.3) - Math.sin(0.3)),
      0.012 * wave(seconds, 0.83),
      0.045 * (wave(seconds, frequency, -0.35) - Math.sin(-0.35)) +
        0.015 * (wave(seconds, 1.13, 0.4) - Math.sin(0.4)),
    )
    headPivot.rotation.set(
      0,
      0.035 * wave(seconds, 0.79),
      -0.018 * (wave(seconds, frequency, -0.8) - Math.sin(-0.8)),
    )
    for (let index = 0; index < hands.length; index += 1) {
      const phase = index === 0 ? -0.5 : 0.7
      const weight =
        (wave(seconds, index === 0 ? 2.1 : 2.37, phase) - Math.sin(phase)) /
        (1 + Math.abs(Math.sin(phase)))
      hands[index].position.set(
        0.85 - 0.1 * weight,
        0.66 + 0.06 * weight,
        index === 0 ? -0.34 : 0.34,
      )
      const influences = sleeves[index].morphTargetInfluences
      if (influences) influences[0] = weight
    }
    const capWeight =
      (wave(seconds, frequency, -1.1) - Math.sin(-1.1)) / (1 + Math.abs(Math.sin(-1.1)))
    performance.cloth[0] = capWeight
    performance.fur[0] = capWeight
    group.updateMatrixWorld(true)
    inverseRig.copy(rig.matrixWorld).invert()
    for (const entry of anchors) {
      entry.delta
        .copy(inverseRig)
        .multiply(entry.object.matrixWorld)
        .multiply(entry.inverseOriginal)
      entry.normal.getNormalMatrix(entry.delta)
    }
    for (const entry of traces) {
      const attribute = entry.mesh.geometry.getAttribute('position')
      const normal = entry.mesh.geometry.getAttribute('normal')
      const { tubularSegments, radialSegments } = entry.mesh.geometry.parameters
      for (let vertex = 0; vertex < attribute.count; vertex += 1) {
        const t = Math.floor(vertex / (radialSegments + 1)) / tubularSegments
        startVertex.fromArray(entry.positions, vertex * 3)
        endVertex.copy(startVertex).applyMatrix4(entry.end.delta)
        startVertex.applyMatrix4(entry.start.delta).lerp(endVertex, t)
        startVertex.y -= 4 * t * (1 - t) * 0.008 * componentScale
        attribute.setXYZ(vertex, startVertex.x, startVertex.y, startVertex.z)
        startNormal.fromArray(entry.normals, vertex * 3)
        endNormal.copy(startNormal).applyMatrix3(entry.end.normal)
        startNormal.applyMatrix3(entry.start.normal).lerp(endNormal, t).normalize()
        normal.setXYZ(vertex, startNormal.x, startNormal.y, startNormal.z)
      }
      attribute.needsUpdate = true
      normal.needsUpdate = true
    }
  }

  /** Release shared textures, materials and geometry exactly once, including repeated teardown calls. */
  function dispose(): void {
    if (disposed) return
    disposed = true
    for (const geometry of geometries) geometry.dispose()
    for (const surface of materials) surface.dispose()
    for (const texture of textures) texture.dispose()
    for (const skeleton of skeletons) skeleton.dispose()
  }

  animate(0)
  const bounds = new Box3().setFromObject(group, true)
  bounds.getCenter(center)
  normalization = 14 / bounds.getSize(new Vector3()).x
  rig.scale.setScalar(normalization)
  rig.position.copy(center).multiplyScalar(-normalization)
  return { group, spacing: 4 * normalization, animate, dispose }
}

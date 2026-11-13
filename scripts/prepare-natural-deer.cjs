/* eslint-disable @typescript-eslint/no-require-imports -- This standalone CommonJS compiler uses the pinned Node preparation tooling. */
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const { MeshoptSimplifier } = require('meshoptimizer')
const sharp = createRequire(require.resolve('next/package.json'))('sharp')

const SOURCE_HASH = 'e1c790cf50f1cbad11fdf945e4a7e0d40580a35ef17e4644542a77449c745023'
const components = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }

// Ease skin transitions so adjacent surface vertices keep a continuous shoulder and knee.
function smooth(value, low, high) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)))
  return t * t * (3 - 2 * t)
}

// Compile only the verified publisher source into a compact, self-contained skinned GLB.
async function main() {
  const input = process.argv[2]
  assert(input, 'Usage: node scripts/prepare-natural-deer.cjs <original.glb> [output.glb]')
  const source = fs.readFileSync(input)
  assert.equal(createHash('sha256').update(source).digest('hex'), SOURCE_HASH)
  assert.equal(source.toString('ascii', 0, 4), 'glTF')
  assert.equal(source.readUInt32LE(4), 2)
  assert.equal(source.readUInt32LE(8), source.length)
  const jsonLength = source.readUInt32LE(12)
  const original = JSON.parse(source.toString('utf8', 20, 20 + jsonLength))
  const binaryStart = 28 + jsonLength
  assert(binaryStart + original.buffers[0].byteLength <= source.length)

  // Copy bounded typed accessors rather than retaining the original unused vertex arrays.
  function readAccessor(index) {
    const accessor = original.accessors[index]
    const view = original.bufferViews[accessor.bufferView]
    const Type = components[accessor.componentType]
    assert(Type && widths[accessor.type] && !view.byteStride && !accessor.sparse)
    const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0)
    const count = accessor.count * widths[accessor.type]
    assert(offset >= 0 && offset + count * Type.BYTES_PER_ELEMENT <= original.buffers[0].byteLength)
    assert((accessor.byteOffset || 0) + count * Type.BYTES_PER_ELEMENT <= view.byteLength)
    return new Type(source.buffer, source.byteOffset + binaryStart + offset, count).slice()
  }

  const primitive = original.meshes[0].primitives[0]
  const positions = readAccessor(primitive.attributes.POSITION)
  const normals = readAccessor(primitive.attributes.NORMAL)
  const uvs = readAccessor(primitive.attributes.TEXCOORD_0)
  const indices = readAccessor(primitive.indices)
  assert(indices.every((index) => index < positions.length / 3))
  const attributes = new Float32Array((positions.length / 3) * 5)
  for (let i = 0; i < positions.length / 3; i += 1)
    attributes.set(
      [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2], uvs[i * 2], uvs[i * 2 + 1]],
      i * 5,
    )
  await MeshoptSimplifier.ready
  const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(
    indices,
    positions,
    3,
    attributes,
    5,
    [0.1, 0.1, 0.1, 0.5, 0.5],
    null,
    60_000,
    0.005,
    ['Prune'],
  )
  const used = [...new Set(simplified)]
  assert(used.length <= 65_535)
  const remap = new Map(used.map((index, compact) => [index, compact]))
  const compactPositions = new Float32Array(used.length * 3)
  const compactNormals = new Float32Array(used.length * 3)
  const compactUvs = new Float32Array(used.length * 2)
  const joints = new Uint8Array(used.length * 4)
  const weights = new Float32Array(used.length * 4)
  const compactIndices = Uint16Array.from(simplified, (index) => remap.get(index))
  const minimum = [Infinity, Infinity, Infinity]
  const maximum = [-Infinity, -Infinity, -Infinity]
  for (const [vertex, originalIndex] of used.entries()) {
    const x = positions[originalIndex * 3 + 2] * 2.2 + 0.2
    const y = positions[originalIndex * 3 + 1] * 2.2 - 0.88
    const z = -positions[originalIndex * 3] * 2.2
    compactPositions.set([x, y, z], vertex * 3)
    compactNormals.set(
      [normals[originalIndex * 3 + 2], normals[originalIndex * 3 + 1], -normals[originalIndex * 3]],
      vertex * 3,
    )
    compactUvs.set(uvs.subarray(originalIndex * 2, originalIndex * 2 + 2), vertex * 2)
    for (let axis = 0; axis < 3; axis += 1) {
      minimum[axis] = Math.min(minimum[axis], compactPositions[vertex * 3 + axis])
      maximum[axis] = Math.max(maximum[axis], compactPositions[vertex * 3 + axis])
    }
    const rear = x < -0.35
    const limb = (rear ? 2 : 0) + (z < 0 ? 0 : 1)
    const fade = 1 - smooth(y, 0.3, rear ? 0.8 : 0.75)
    const longitudinal = rear ? 1 - smooth(x, -0.85, -0.45) : smooth(x, 0.28, 0.48)
    const influence = fade * longitudinal
    const lower = 1 - smooth(y, -0.37, -0.09)
    const head = Math.max(smooth(y, 1.65, 1.95), smooth(x + 0.65 * y, 1.95, 2.35))
    const neck = Math.max(smooth(y, 0.85, 1.25) * smooth(x, 0.25, 0.72), head)
    joints.set(neck > 0 ? [0, 9, 10, 0] : [0, limb * 2 + 1, limb * 2 + 2, 0], vertex * 4)
    weights.set(
      neck > 0
        ? [1 - neck, neck * (1 - head), neck * head, 0]
        : [1 - influence, influence * (1 - lower), influence * lower, 0],
      vertex * 4,
    )
    if (y > 1.95 || (x > 1.65 && y > 1.4))
      assert.equal(weights[vertex * 4 + 2], 1, 'Rack and muzzle must follow the head rigidly')
  }
  assert(compactPositions.every(Number.isFinite))
  assert(weights.every((weight) => Number.isFinite(weight) && weight >= 0))
  for (let vertex = 0; vertex < used.length; vertex += 1)
    assert(
      Math.abs(
        weights.subarray(vertex * 4, vertex * 4 + 4).reduce((sum, weight) => sum + weight, 0) - 1,
      ) < 1e-6,
    )
  const colorTexture =
    original.materials[primitive.material].pbrMetallicRoughness.baseColorTexture.index
  const colorImage = original.images[original.textures[colorTexture].source]
  const colorView = original.bufferViews[colorImage.bufferView]
  const image = await sharp(
    source.subarray(
      binaryStart + colorView.byteOffset,
      binaryStart + colorView.byteOffset + colorView.byteLength,
    ),
  )
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()
  const nodes = [
    { name: 'natural-deer', children: [1, 2] },
    { name: 'deer-natural-surface', mesh: 0, skin: 0 },
    { name: 'deer-root', children: [] },
  ]
  const inverse = new Float32Array(11 * 16)
  for (let bone = 0; bone < 11; bone += 1)
    inverse.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], bone * 16)
  for (let limb = 0; limb < 4; limb += 1) {
    const rear = limb >= 2
    const hip = [rear ? -0.8 : 0.55, rear ? 0.78 : 0.65, limb % 2 === 0 ? -0.25 : 0.25]
    const knee = [rear ? -1.22 : 0.52, -0.25, hip[2]]
    const upperIndex = nodes.length
    nodes[2].children.push(upperIndex)
    nodes.push(
      { name: `deer-leg-${limb + 1}-upper`, translation: hip, children: [upperIndex + 1] },
      {
        name: `deer-leg-${limb + 1}-lower`,
        translation: knee.map((value, axis) => value - hip[axis]),
      },
    )
    for (const [part, point] of [hip, knee].entries())
      inverse.set(
        point.map((value) => -value),
        (limb * 2 + part + 1) * 16 + 12,
      )
  }
  const neckRest = [0.65, 1, 0]
  const headRest = [1.2, 1.65, 0]
  const neckIndex = nodes.length
  const headIndex = neckIndex + 1
  nodes[2].children.push(neckIndex)
  nodes.push(
    { name: 'deer-neck', translation: neckRest, children: [headIndex] },
    {
      name: 'deer-head',
      translation: headRest.map((value, axis) => value - neckRest[axis]),
      children: [],
    },
  )
  for (const [part, point] of [neckRest, headRest].entries())
    inverse.set(
      point.map((value) => -value),
      (9 + part) * 16 + 12,
    )
  for (const side of [-1, 1]) {
    const candidates = used
      .map((_, vertex) => vertex)
      .filter(
        (vertex) =>
          compactPositions[vertex * 3 + 1] > 2.1 && compactPositions[vertex * 3 + 2] * side > 0.12,
      )
      .sort((a, b) => compactPositions[b * 3 + 1] - compactPositions[a * 3 + 1])
    const chosen = []
    for (const vertex of candidates) {
      const point = Array.from(compactPositions.subarray(vertex * 3, vertex * 3 + 3))
      if (
        chosen.some(
          (other) => Math.hypot(...point.map((value, axis) => value - other[axis])) < 0.33,
        )
      )
        continue
      chosen.push(point)
      nodes[headIndex].children.push(nodes.length)
      nodes.push({
        name: `deer-antler-light-${side < 0 ? 'left' : 'right'}-${chosen.length}`,
        translation: point.map(
          (value, axis) => value + compactNormals[vertex * 3 + axis] * 0.012 - headRest[axis],
        ),
      })
      if (chosen.length === 4) break
    }
    assert.equal(chosen.length, 4)
  }
  const chunks = []
  const bufferViews = []
  const accessors = []
  let binaryLength = 0

  // Align each standard glTF buffer view so all typed arrays load without a custom decoder.
  function addView(data, target) {
    const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
    bufferViews.push({
      buffer: 0,
      byteOffset: binaryLength,
      byteLength: bytes.length,
      ...(target ? { target } : {}),
    })
    chunks.push(bytes, Buffer.alloc((4 - (bytes.length % 4)) % 4))
    binaryLength += bytes.length + ((4 - (bytes.length % 4)) % 4)
    return bufferViews.length - 1
  }

  // Describe the compact arrays directly using portable glTF component types.
  function addAccessor(data, type, componentType, target, bounds) {
    accessors.push({
      bufferView: addView(data, target),
      componentType,
      count: data.length / (type === 'MAT4' ? 16 : widths[type]),
      type,
      ...bounds,
    })
    return accessors.length - 1
  }

  const outputPrimitive = {
    attributes: {
      POSITION: addAccessor(compactPositions, 'VEC3', 5126, 34962, { min: minimum, max: maximum }),
      NORMAL: addAccessor(compactNormals, 'VEC3', 5126, 34962),
      TEXCOORD_0: addAccessor(compactUvs, 'VEC2', 5126, 34962),
      JOINTS_0: addAccessor(joints, 'VEC4', 5121, 34962),
      WEIGHTS_0: addAccessor(weights, 'VEC4', 5126, 34962),
    },
    indices: addAccessor(compactIndices, 'SCALAR', 5123, 34963),
    material: 0,
  }
  const inverseAccessor = addAccessor(inverse, 'MAT4', 5126)
  const imageView = addView(image)
  const json = {
    asset: { version: '2.0', copyright: 'Grab3D White-Tailed Deer, CC0; see SOURCE.md' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    meshes: [{ name: 'natural-deer-continuous-coat', primitives: [outputPrimitive] }],
    skins: [
      {
        name: 'natural-deer-rig',
        inverseBindMatrices: inverseAccessor,
        skeleton: 2,
        joints: Array.from({ length: 11 }, (_, index) => index + 2),
      },
    ],
    materials: [
      {
        name: 'natural-deer-coat',
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0,
          roughnessFactor: 0.96,
        },
      },
    ],
    textures: [{ sampler: 0, extensions: { EXT_texture_webp: { source: 0 } } }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    images: [{ name: 'natural-deer-coat', bufferView: imageView, mimeType: 'image/webp' }],
    extensionsUsed: ['EXT_texture_webp'],
    extensionsRequired: ['EXT_texture_webp'],
    accessors,
    bufferViews,
    buffers: [{ byteLength: binaryLength }],
  }
  const jsonBytes = Buffer.from(JSON.stringify(json))
  const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 32)])
  const header = Buffer.alloc(20)
  header.write('glTF')
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(28 + paddedJson.length + binaryLength, 8)
  header.writeUInt32LE(paddedJson.length, 12)
  header.write('JSON', 16)
  const binaryHeader = Buffer.alloc(8)
  binaryHeader.writeUInt32LE(binaryLength)
  binaryHeader.write('BIN\0', 4)
  const result = Buffer.concat([header, paddedJson, binaryHeader, ...chunks])
  assert(result.length < 1_500_000, 'Prepared asset exceeds its download budget')
  const output =
    process.argv[3] || path.join(__dirname, '../public/assets/models/winter/natural-deer-v2.glb')
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, result)
  console.log(
    JSON.stringify(
      {
        bytes: result.length,
        triangles: compactIndices.length / 3,
        vertices: used.length,
        error,
        bones: 11,
        attachments: 8,
        bounds: { minimum, maximum },
        sha256: createHash('sha256').update(result).digest('hex'),
      },
      null,
      2,
    ),
  )
}

// Report preparation failures without writing a partially valid asset.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

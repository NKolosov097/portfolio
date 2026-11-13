/* eslint-disable @typescript-eslint/no-require-imports -- Standalone compiler reuses pinned Node tooling. */
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const { MeshoptSimplifier } = require('meshoptimizer')
const sharp = createRequire(require.resolve('next/package.json'))('sharp')

const HASHES = [
  '6a8242b2eda14a3611d3bca09ddeee120cc4cedb19c8f0741535aa9e220e2df6',
  '9af195ed9b898256abc836ce0ac4b206d9192d86edc04acdc44df42f19d1c5fb',
]
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3 }
const components = { 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }

// Reject unexpected source bytes before interpreting their bounded standard glTF arrays.
function source(file, hash) {
  const bytes = fs.readFileSync(file)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hash)
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF')
  assert.equal(bytes.readUInt32LE(4), 2)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  const length = bytes.readUInt32LE(12)
  assert.equal(bytes.toString('ascii', 16, 20), 'JSON')
  assert(length > 0 && length % 4 === 0 && length + 28 <= bytes.length)
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + length))
  const start = length + 28
  assert.equal(bytes.toString('ascii', length + 24, start), 'BIN\0')
  assert.equal(json.buffers.length, 1)
  assert.equal(json.buffers[0].byteLength + start, bytes.length)
  assert.equal(json.meshes.length, 1)
  assert.equal(json.meshes[0].primitives.length, 1)
  assert(!json.skins && !json.animations)
  // Keep each accessor within both its view and the binary chunk.
  function read(index) {
    const a = json.accessors[index]
    const v = json.bufferViews[a.bufferView]
    const Type = components[a.componentType]
    assert(Type && widths[a.type] && !v.byteStride && !a.sparse && v.buffer === 0)
    const offset = (v.byteOffset || 0) + (a.byteOffset || 0)
    const count = a.count * widths[a.type]
    assert(Number.isInteger(a.count) && a.count > 0)
    assert(offset >= 0 && offset + count * Type.BYTES_PER_ELEMENT <= json.buffers[0].byteLength)
    assert((a.byteOffset || 0) + count * Type.BYTES_PER_ELEMENT <= v.byteLength)
    const result = new Type(bytes.buffer, bytes.byteOffset + start + offset, count).slice()
    assert(result.every(Number.isFinite))
    return result
  }
  // Read only an embedded publisher image, never an external URI.
  function image(texture) {
    const im = json.images[json.textures[texture].source]
    const v = json.bufferViews[im.bufferView]
    assert(
      !im.uri &&
        v.buffer === 0 &&
        v.byteOffset >= 0 &&
        v.byteOffset + v.byteLength <= json.buffers[0].byteLength,
    )
    return bytes.subarray(start + v.byteOffset, start + v.byteOffset + v.byteLength)
  }
  const primitive = json.meshes[0].primitives[0]
  assert(!primitive.mode || primitive.mode === 4)
  const positions = read(primitive.attributes.POSITION)
  const normals = read(primitive.attributes.NORMAL)
  const uvs = read(primitive.attributes.TEXCOORD_0)
  const indices = read(primitive.indices)
  assert(
    positions instanceof Float32Array &&
      normals instanceof Float32Array &&
      uvs instanceof Float32Array,
  )
  assert.equal(positions.length, normals.length)
  assert.equal(positions.length / 3, uvs.length / 2)
  assert(indices.length % 3 === 0 && indices.every((i) => i < positions.length / 3))
  return {
    json,
    positions,
    normals,
    uvs,
    indices,
    image,
    material: json.materials[primitive.material],
  }
}

// Apply the visually verified color/spatial mask, joining UV seams only for component selection.
async function headIndices(head) {
  const { data, info } = await sharp(
    head.image(head.material.pbrMetallicRoughness.baseColorTexture.index),
  )
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { positions: p, uvs, indices } = head
  const kept = []
  for (let t = 0; t < indices.length; t += 3) {
    let x = 0,
      y = 0,
      z = 0,
      u = 0,
      v = 0
    for (let k = 0; k < 3; k += 1) {
      const i = indices[t + k]
      x += p[i * 3] / 3
      y += p[i * 3 + 1] / 3
      z += p[i * 3 + 2] / 3
      u += uvs[i * 2] / 3
      v += uvs[i * 2 + 1] / 3
    }
    const pixel =
      (Math.max(0, Math.min(info.height - 1, Math.floor(v * info.height))) * info.width +
        Math.max(0, Math.min(info.width - 1, Math.floor(u * info.width)))) *
      info.channels
    const [r, g, b] = data.subarray(pixel, pixel + 3)
    const white = Math.min(r, g, b) > 80 && Math.min(r, g, b) / Math.max(r, g, b) > 0.7
    const face = (x / 0.115) ** 2 + ((y - 1.645) / 0.087) ** 2 + ((z - 0.12) / 0.095) ** 2 < 1
    if (y > 1.16 && y < 1.715 && Math.abs(x) < 0.22 && z > -0.15 && (white || face))
      kept.push(indices[t], indices[t + 1], indices[t + 2])
  }
  const parents = Array.from({ length: p.length / 3 }, (_, i) => i)
  // Path compression makes the fixed mesh connectivity pass linear in practice.
  function root(i) {
    while (parents[i] !== i) {
      parents[i] = parents[parents[i]]
      i = parents[i]
    }
    return i
  }
  const seams = new Map()
  for (let i = 0; i < parents.length; i += 1) {
    const key = Array.from(p.subarray(i * 3, i * 3 + 3), (n) => n.toFixed(5)).join(',')
    if (seams.has(key)) parents[root(i)] = root(seams.get(key))
    else seams.set(key, i)
  }
  for (let i = 0; i < kept.length; i += 3) {
    parents[root(kept[i + 1])] = root(kept[i])
    parents[root(kept[i + 2])] = root(kept[i])
  }
  const counts = new Map()
  for (let i = 0; i < kept.length; i += 3) {
    const key = root(kept[i])
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const largest = [...counts].sort((a, b) => b[1] - a[1])[0][0]
  const clean = []
  for (let i = 0; i < kept.length; i += 3)
    if (root(kept[i]) === largest) clean.push(kept[i], kept[i + 1], kept[i + 2])
  assert.equal(clean.length / 3, 46_669, 'Verified extraction mask changed')
  return Uint32Array.from(clean)
}

// Remove every unreferenced vertex while retaining authored UV seams and normal splits.
function compact(surface, indices, transform, normalTransform) {
  const used = [...new Set(indices)]
  assert(used.length <= 65_535)
  const remap = new Map(used.map((index, i) => [index, i]))
  const positions = new Float32Array(used.length * 3)
  const normals = new Float32Array(used.length * 3)
  const uvs = new Float32Array(used.length * 2)
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity]
  for (const [i, original] of used.entries()) {
    positions.set(transform(...surface.positions.subarray(original * 3, original * 3 + 3)), i * 3)
    const normal = normalTransform(...surface.normals.subarray(original * 3, original * 3 + 3))
    const length = Math.hypot(...normal)
    assert(length > 0)
    normals.set(
      normal.map((n) => n / length),
      i * 3,
    )
    uvs.set(surface.uvs.subarray(original * 2, original * 2 + 2), i * 2)
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[i * 3 + axis])
      max[axis] = Math.max(max[axis], positions[i * 3 + axis])
    }
  }
  assert(
    positions.every(Number.isFinite) &&
      normals.every(Number.isFinite) &&
      uvs.every(Number.isFinite),
  )
  return {
    positions,
    normals,
    uvs,
    indices: Uint16Array.from(indices, (i) => remap.get(i)),
    min,
    max,
  }
}

// Separate the verified cap cloth from its disconnected lining, brim and pompom without welding UV seams.
function splitHat(hat) {
  const parent = Array.from({ length: hat.positions.length / 3 }, (_, i) => i)
  // Compress paths while selecting position-connected components only.
  function root(i) {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  const seams = new Map()
  for (let i = 0; i < parent.length; i += 1) {
    const key = Array.from(hat.positions.subarray(i * 3, i * 3 + 3), (n) => n.toFixed(5)).join(',')
    if (seams.has(key)) parent[root(i)] = root(seams.get(key))
    else seams.set(key, i)
  }
  for (let t = 0; t < hat.indices.length; t += 3) {
    parent[root(hat.indices[t + 1])] = root(hat.indices[t])
    parent[root(hat.indices[t + 2])] = root(hat.indices[t])
  }
  const partsByRoot = new Map()
  for (let t = 0; t < hat.indices.length; t += 3) {
    const key = root(hat.indices[t]),
      part = partsByRoot.get(key) || { indices: [], maxY: -Infinity }
    for (let k = 0; k < 3; k += 1) {
      const index = hat.indices[t + k]
      part.indices.push(index)
      part.maxY = Math.max(part.maxY, hat.positions[index * 3 + 1])
    }
    partsByRoot.set(key, part)
  }
  const parts = [...partsByRoot.values()]
  assert.deepEqual(
    parts.map((part) => part.indices.length / 3).sort((a, b) => a - b),
    [128, 624, 1440, 2336],
  )
  const cloth = parts.filter((part) => part.maxY > 0.25)
  assert.equal(cloth.length, 1)
  assert.equal(cloth[0].indices.length / 3, 2336)
  return [
    cloth[0].indices,
    parts.filter((part) => part !== cloth[0]).flatMap((part) => part.indices),
  ]
}

// Compile the two pinned static surfaces into one portable asset with embedded compact maps.
async function main() {
  assert(
    process.argv[2] && process.argv[3],
    'Usage: node scripts/prepare-natural-santa.cjs <wizard-light.glb> <santa-hat.glb> [output.glb]',
  )
  const head = source(process.argv[2], HASHES[0]),
    hat = source(process.argv[3], HASHES[1])
  const extracted = compact(
    head,
    await headIndices(head),
    (x, y, z) => [x, y, z],
    (x, y, z) => [x, y, z],
  )
  const attributes = new Float32Array((extracted.positions.length / 3) * 5)
  for (let i = 0; i < extracted.positions.length / 3; i += 1)
    attributes.set(
      [
        ...extracted.normals.subarray(i * 3, i * 3 + 3),
        ...extracted.uvs.subarray(i * 2, i * 2 + 2),
      ],
      i * 5,
    )
  await MeshoptSimplifier.ready
  const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(
    extracted.indices,
    extracted.positions,
    3,
    attributes,
    5,
    [0.1, 0.1, 0.1, 0.5, 0.5],
    null,
    60_000,
    0.005,
    ['Prune'],
  )
  assert(simplified.length / 3 >= 16_000 && simplified.length / 3 <= 22_000)
  const preparedHead = compact(
    extracted,
    simplified,
    (x, y, z) => [(z - 0.12) * 1.35 + 0.1, (y - 1.645) * 1.35 + 1.4, -x * 1.2],
    (x, y, z) => [z / 1.35, y / 1.35, -x / 1.2],
  )
  const translation = hat.json.nodes[0].translation
  assert.equal(translation[0], -0.03291893005371094)
  const preparedHat = splitHat(hat).map((indices) =>
    compact(
      hat,
      indices,
      (x, y, z) => [
        -(x + translation[0]) * 1.6 - 0.04,
        y * 1.6 + 1.47,
        -(z + translation[2]) * 1.6,
      ],
      (x, y, z) => [-x, y, -z],
    ),
  )
  const headColor = await sharp(
    head.image(head.material.pbrMetallicRoughness.baseColorTexture.index),
  )
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer()
  const chunks = [],
    bufferViews = [],
    accessors = []
  let binaryLength = 0
  // Align every portable buffer view for typed-array decoding.
  function view(data, target) {
    const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
    bufferViews.push({
      buffer: 0,
      byteOffset: binaryLength,
      byteLength: bytes.length,
      ...(target ? { target } : {}),
    })
    const pad = (4 - (bytes.length % 4)) % 4
    chunks.push(bytes, Buffer.alloc(pad))
    binaryLength += bytes.length + pad
    return bufferViews.length - 1
  }
  // Describe compact geometry without retaining donor arrays.
  function accessor(data, type, componentType, target, bounds) {
    accessors.push({
      bufferView: view(data, target),
      componentType,
      count: data.length / widths[type],
      type,
      ...bounds,
    })
    return accessors.length - 1
  }
  const surfaces = [preparedHead, ...preparedHat]
  const meshes = surfaces.map((s, material) => ({
    name: ['santa-natural-head', 'santa-hat-cloth', 'santa-hat-fur'][material],
    primitives: [
      {
        attributes: {
          POSITION: accessor(s.positions, 'VEC3', 5126, 34962, { min: s.min, max: s.max }),
          NORMAL: accessor(s.normals, 'VEC3', 5126, 34962),
          TEXCOORD_0: accessor(s.uvs, 'VEC2', 5126, 34962),
        },
        indices: accessor(s.indices, 'SCALAR', 5123, 34963),
        material,
      },
    ],
  }))
  const images = [headColor].map((data) => ({
    bufferView: view(data),
    mimeType: 'image/webp',
  }))
  const json = {
    asset: {
      version: '2.0',
      copyright: 'Grab3D Wizard and Santa Hat, CC0; see natural-santa-SOURCE.md',
    },
    scene: 0,
    scenes: [{ nodes: [0, 1, 2] }],
    nodes: meshes.map((m, mesh) => ({ name: m.name, mesh })),
    meshes,
    materials: [
      {
        name: 'santa-natural-skin-hair',
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0,
          roughnessFactor: 0.9,
        },
      },
      {
        name: 'santa-red-wool',
        pbrMetallicRoughness: {
          baseColorFactor: [0.462077, 0.01096, 0.016807, 1],
          metallicFactor: 0,
          roughnessFactor: 1,
        },
      },
      {
        name: 'santa-white-fur',
        pbrMetallicRoughness: {
          baseColorFactor: [0.68, 0.65, 0.6, 1],
          metallicFactor: 0,
          roughnessFactor: 1,
        },
      },
    ],
    textures: images.map((_, imageIndex) => ({
      sampler: 0,
      extensions: { EXT_texture_webp: { source: imageIndex } },
    })),
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    images,
    extensionsUsed: ['EXT_texture_webp'],
    extensionsRequired: ['EXT_texture_webp'],
    accessors,
    bufferViews,
    buffers: [{ byteLength: binaryLength }],
  }
  const rawJson = Buffer.from(JSON.stringify(json)),
    jsonBytes = Buffer.concat([rawJson, Buffer.alloc((4 - (rawJson.length % 4)) % 4, 32)])
  const header = Buffer.alloc(20)
  header.write('glTF')
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(28 + jsonBytes.length + binaryLength, 8)
  header.writeUInt32LE(jsonBytes.length, 12)
  header.write('JSON', 16)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(binaryLength)
  binHeader.write('BIN\0', 4)
  const result = Buffer.concat([header, jsonBytes, binHeader, ...chunks])
  assert(
    result.length < 2_000_000 &&
      surfaces.reduce((sum, surface) => sum + surface.indices.length / 3, 0) <= 27_000,
  )
  const output =
    process.argv[4] || path.join(__dirname, '../public/assets/models/winter/natural-santa-v2.glb')
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, result)
  console.log(
    JSON.stringify(
      {
        bytes: result.length,
        sha256: createHash('sha256').update(result).digest('hex'),
        error,
        surfaces: surfaces.map((s) => ({
          triangles: s.indices.length / 3,
          vertices: s.positions.length / 3,
          min: s.min,
          max: s.max,
        })),
      },
      null,
      2,
    ),
  )
}

// Fail before publishing a partial or unverified asset.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

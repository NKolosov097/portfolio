import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DataTexture,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  RGBAFormat,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Material,
  type Texture,
} from 'three'

type Point = readonly [number, number, number]
type SharedSurfaces = {
  brass: MeshStandardMaterial
  steel: MeshStandardMaterial
  leather: MeshStandardMaterial
  lantern: MeshStandardMaterial
}

/** Give paint and linen quiet, repeatable relief without a downloaded image or canvas. */
function surfaceMap(woven: boolean): DataTexture {
  const size = 128
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const grain = woven
        ? 4 * Math.sin(x * Math.PI * 0.5) * Math.sin(y * Math.PI * 0.5)
        : 3 * Math.sin(y * 0.65 + 1.5 * Math.sin(x * 0.075)) + 2 * Math.sin(y * 1.7)
      const value = Math.round(241 + grain)
      const offset = (y * size + x) * 4
      pixels.set([value, value, value, 255], offset)
    }
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat)
  texture.name = woven ? 'sleigh-linen-weave' : 'sleigh-wood-grain'
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(woven ? 5 : 2, woven ? 5 : 1)
  texture.needsUpdate = true
  return texture
}

/** Keep authored surfaces indexed, with normals and bounds prepared only at construction. */
function indexedSurface(positions: number[], indices: number[], uvs: number[]): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/** Close both faces and every edge of a shaped panel, including its visible wall thickness. */
function panelVolume(
  columns: number,
  rows: number,
  pointAt: (u: number, v: number) => Vector3,
  depth: Vector3,
): BufferGeometry {
  const positions: number[] = [],
    indices: number[] = [],
    uvs: number[] = []
  const stride = columns + 1
  const faceSize = stride * (rows + 1)
  for (let face = 0; face < 2; face += 1) {
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        const u = column / columns,
          v = row / rows
        const point = pointAt(u, v).addScaledVector(depth, -face)
        positions.push(point.x, point.y, point.z)
        uvs.push(u, v)
        if (row < rows && column < columns) {
          const a = face * faceSize + row * stride + column,
            b = a + stride
          if (face === 0) indices.push(a, a + 1, b, b, a + 1, b + 1)
          else indices.push(a, b, a + 1, b, b + 1, a + 1)
        }
      }
    }
  }
  const edge: number[] = []
  for (let column = 0; column <= columns; column += 1) edge.push(column)
  for (let row = 1; row <= rows; row += 1) edge.push(row * stride + columns)
  for (let column = columns - 1; column >= 0; column -= 1) edge.push(rows * stride + column)
  for (let row = rows - 1; row > 0; row -= 1) edge.push(row * stride)
  for (let i = 0; i < edge.length; i += 1) {
    const a = edge[i],
      b = edge[(i + 1) % edge.length]
    indices.push(a, a + faceSize, b, b, a + faceSize, b + faceSize)
  }
  if (depth.z < 0 || depth.x > 0) {
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]]
  }
  return indexedSurface(positions, indices, uvs)
}

/** Ease between carpentered profile stations while preserving a monotonic longitudinal frame. */
function hullTop(x: number): number {
  const stations = [
    [-1.88, 1.14],
    [-1.55, 1.39],
    [-1.1, 1.17],
    [-0.55, 0.68],
    [0.35, 0.62],
    [1, 0.82],
    [1.53, 1.14],
    [1.84, 0.98],
  ]
  for (let i = 1; i < stations.length; i += 1) {
    const previous = stations[i - 1],
      next = stations[i]
    if (x <= next[0]) {
      const t = Math.max(0, (x - previous[0]) / (next[0] - previous[0]))
      return previous[1] + (next[1] - previous[1]) * t * t * (3 - 2 * t)
    }
  }
  return stations[stations.length - 1][1]
}

/** Bulge the hull between its foot and rail instead of extruding a flat silhouette. */
function hullPoint(x: number, v: number, side: number): Vector3 {
  const bottom = -0.015 + 0.12 * (Math.abs(x) / 1.88) ** 4
  return new Vector3(
    x,
    bottom + (hullTop(x) - bottom) * v,
    side * (0.72 + 0.105 * Math.sin(Math.PI * v) - 0.035 * (Math.abs(x) / 1.88) ** 3),
  )
}

/** Round timber and upholstered edges without turning the bench into an ellipsoid. */
function roundedBox(width: number, height: number, depth: number, radius: number): ExtrudeGeometry {
  const shape = new Shape()
  const x = width / 2 - radius,
    y = height / 2 - radius
  shape.moveTo(-x, -height / 2)
  shape.lineTo(x, -height / 2)
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -y)
  shape.lineTo(width / 2, y)
  shape.quadraticCurveTo(width / 2, height / 2, x, height / 2)
  shape.lineTo(-x, height / 2)
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, y)
  shape.lineTo(-width / 2, -y)
  shape.quadraticCurveTo(-width / 2, -height / 2, -x, -height / 2)
  const geometry = new ExtrudeGeometry(shape, {
    depth: depth - 2 * radius,
    steps: 1,
    curveSegments: 2,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: radius * 0.35,
    bevelThickness: radius,
  })
  geometry.translate(0, 0, -depth / 2 + radius)
  return geometry
}

/** Sweep a flattened rounded rectangle in a stable XY frame, including the curled nose. */
function runnerRibbon(): BufferGeometry {
  const curve = new CatmullRomCurve3([
    new Vector3(-1.98, -0.29, 0),
    new Vector3(-1.3, -0.42, 0),
    new Vector3(0.8, -0.42, 0),
    new Vector3(1.54, -0.31, 0),
    new Vector3(1.93, 0.05, 0),
    new Vector3(1.9, 0.36, 0),
    new Vector3(1.64, 0.35, 0),
  ])
  const section = [
    [-0.0175, -0.06],
    [0.0175, -0.06],
    [0.0225, -0.055],
    [0.0225, 0.055],
    [0.0175, 0.06],
    [-0.0175, 0.06],
    [-0.0225, 0.055],
    [-0.0225, -0.055],
  ]
  const positions: number[] = [],
    indices: number[] = [],
    uvs: number[] = []
  for (let ring = 0; ring <= 72; ring += 1) {
    const t = ring / 72,
      center = curve.getPoint(t),
      tangent = curve.getTangent(t)
    const normal = new Vector3(-tangent.y, tangent.x, 0).normalize()
    for (let edge = 0; edge < section.length; edge += 1) {
      const point = center.clone().addScaledVector(normal, section[edge][0])
      positions.push(point.x, point.y, section[edge][1])
      uvs.push(t, edge / section.length)
      if (ring < 72) {
        const a = ring * 8 + edge,
          b = ring * 8 + ((edge + 1) % 8)
        indices.push(a, b, a + 8, b, b + 8, a + 8)
      }
    }
  }
  for (let edge = 1; edge < 7; edge += 1)
    indices.push(0, edge + 1, edge, 576, 576 + edge, 577 + edge)
  return indexedSurface(positions, indices, uvs)
}

/** Settle the weighted sack onto the deck and inside the curved rear board. */
function settleCargoGeometry(geometry: BufferGeometry): BufferGeometry {
  const positions = geometry.getAttribute('position')
  const cosine = Math.cos(0.65),
    sine = Math.sin(0.65)
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const x = (positions.getX(vertex) + 1.43) * 1.1,
      y = (positions.getY(vertex) - 0.44) * 0.95,
      z = (positions.getZ(vertex) - 0.12) * 1.25
    let settledX = -1.47 + x
    const settledY = Math.max(0.44, 0.44 + y * cosine - z * sine),
      settledZ = -0.32 + y * sine + z * cosine
    // Press the weighted cloth inside the curved rear board, then release its free upper bulge.
    if (Math.abs(settledZ) <= 0.685) {
      const fade = Math.max(0, Math.min(1, (settledY - 1.14) / 0.1))
      const rearLimit = -1.88 + 0.05 * (1 - (settledZ / 0.685) ** 2) + 0.08 + 0.015
      settledX += Math.max(0, rearLimit - settledX) * (1 - fade * fade * (3 - 2 * fade))
    }
    positions.setXYZ(vertex, settledX, settledY, settledZ)
  }
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/** Gather angular tension creases into a narrow tied neck above the weighted sack body. */
function foldedSack(): BufferGeometry {
  const positions: number[] = [],
    indices: number[] = [],
    uvs: number[] = []
  const profiles = [
    [0.44, 0.1],
    [0.55, 0.76],
    [0.83, 1],
    [1.16, 0.96],
    [1.43, 0.72],
    [1.64, 0.22],
    [1.72, 0.23],
    [1.87, 0.48],
  ]
  for (let ring = 0; ring <= 36; ring += 1) {
    const y = 0.44 + (1.43 * ring) / 36
    let radius = profiles[profiles.length - 1][1]
    for (let i = 1; i < profiles.length; i += 1) {
      if (y <= profiles[i][0]) {
        const previous = profiles[i - 1],
          next = profiles[i]
        const t = (y - previous[0]) / (next[0] - previous[0])
        radius = previous[1] + (next[1] - previous[1]) * t * t * (3 - 2 * t)
        break
      }
    }
    for (let edge = 0; edge <= 48; edge += 1) {
      const angle = (edge / 48) * Math.PI * 2
      const fold =
        (0.025 + 0.025 * Math.max(0, (y - 1.2) / 0.67)) *
        (Math.sin(9 * angle + 1.3 * y) + 0.35 * Math.sin(15 * angle - y))
      const r = radius + fold
      positions.push(
        -1.43 + 0.33 * r * Math.cos(angle) - 0.025 * Math.sin((y - 0.44) * 2),
        y,
        0.12 + 0.39 * r * Math.sin(angle),
      )
      uvs.push(edge / 48, ring / 36)
      if (ring < 36 && edge < 48) {
        const a = ring * 49 + edge,
          b = a + 49
        indices.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
  }
  for (let edge = 1; edge < 47; edge += 1)
    indices.push(0, edge, edge + 1, 1764, 1765 + edge, 1764 + edge)
  const geometry = settleCargoGeometry(indexedSurface(positions, indices, uvs))
  const normals = geometry.getAttribute('normal')
  for (let ring = 0; ring <= 36; ring += 1) {
    const start = ring * 49,
      end = start + 48
    const normal = new Vector3(
      normals.getX(start) + normals.getX(end),
      normals.getY(start) + normals.getY(end),
      normals.getZ(start) + normals.getZ(end),
    ).normalize()
    normals.setXYZ(start, normal.x, normal.y, normal.z)
    normals.setXYZ(end, normal.x, normal.y, normal.z)
  }
  return geometry
}

/** Assemble a hollow coach-built sleigh while leaving all disposal to the parent registry. */
export function createSantaSleigh(shared: SharedSurfaces): {
  group: Group
  geometries: readonly BufferGeometry[]
  materials: readonly Material[]
  textures: readonly Texture[]
} {
  const group = new Group()
  group.name = 'santa-sleigh'
  group.position.set(-4, -0.1, 0)
  const geometries = new Set<BufferGeometry>()
  const woodMap = surfaceMap(false),
    weaveMap = surfaceMap(true)
  const paint = new MeshStandardMaterial({
    name: 'sleigh-crimson-painted-wood',
    color: 0x600e16,
    roughness: 0.45,
    metalness: 0,
    envMapIntensity: 0.25,
    bumpMap: woodMap,
    bumpScale: 0.006,
  })
  const wood = new MeshStandardMaterial({
    name: 'sleigh-warm-carved-wood',
    color: 0x352319,
    roughness: 0.78,
    metalness: 0,
    bumpMap: woodMap,
    bumpScale: 0.009,
  })
  const inset = new MeshStandardMaterial({
    name: 'sleigh-recessed-crimson-panel',
    color: 0x4d0c13,
    roughness: 0.56,
    metalness: 0,
    bumpMap: woodMap,
    bumpScale: 0.005,
  })
  const padding = new MeshStandardMaterial({
    name: 'sleigh-tufted-dark-leather',
    color: 0x3b2020,
    roughness: 0.8,
    metalness: 0,
    bumpMap: weaveMap,
    bumpScale: 0.003,
  })
  const linen = new MeshStandardMaterial({
    name: 'sleigh-woven-linen',
    color: 0x9a6a32,
    roughness: 1,
    metalness: 0,
    map: weaveMap,
    bumpMap: weaveMap,
    bumpScale: 0.012,
  })

  /** Keep every static mesh batchable and register each reused geometry only once. */
  function mesh(
    name: string,
    geometry: BufferGeometry,
    material: MeshStandardMaterial,
    position: Point = [0, 0, 0],
  ): Mesh<BufferGeometry, MeshStandardMaterial> {
    geometries.add(geometry)
    const result = new Mesh(geometry, material)
    result.name = name
    result.position.set(...position)
    group.add(result)
    return result
  }

  /** Follow a purposeful join or scroll with a modest six-sided rounded molding. */
  function molding(
    name: string,
    points: readonly Point[],
    radius: number,
    material: MeshStandardMaterial,
    intervals = 32,
  ): Mesh<BufferGeometry, MeshStandardMaterial> {
    return mesh(
      name,
      new TubeGeometry(
        new CatmullRomCurve3(points.map((point) => new Vector3(...point))),
        intervals,
        radius,
        6,
        false,
      ),
      material,
    )
  }

  /** Span the chassis with solid supports whose ends actually meet their attached surfaces. */
  function beam(
    name: string,
    from: Point,
    to: Point,
    width: number,
    depth: number,
    material: MeshStandardMaterial,
  ): void {
    const start = new Vector3(...from),
      end = new Vector3(...to),
      delta = end.sub(start)
    const part = mesh(
      name,
      roundedBox(width, delta.length(), depth, Math.min(width, depth) * 0.15),
      material,
    )
    part.position.copy(start).addScaledVector(delta, 0.5)
    part.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize())
  }

  const runner = runnerRibbon(),
    rivet = new SphereGeometry(1, 8, 6)
  const towEye = new TorusGeometry(0.058, 0.015, 6, 16)
  for (const side of [-1, 1]) {
    mesh(
      'sleigh-hollow-hull-wall',
      panelVolume(
        32,
        6,
        (u, v) => hullPoint(-1.88 + 3.72 * u, v, side),
        new Vector3(0, 0, side * 0.09),
      ),
      paint,
    )
    mesh(
      'sleigh-layered-inset-panel',
      panelVolume(
        28,
        4,
        (u, v) => {
          const point = hullPoint(-1.68 + 3.27 * u, 0.17 + 0.62 * v, side)
          point.z += side * 0.024
          return point
        },
        new Vector3(0, 0, side * 0.028),
      ),
      inset,
    )
    const rail: Point[] = [],
      lowerRail: Point[] = [],
      panelRail: Point[] = []
    for (let i = 0; i <= 32; i += 1) {
      const x = -1.88 + (3.72 * i) / 32
      const top = hullPoint(x, 1, side),
        bottom = hullPoint(x, 0.055, side)
      rail.push([top.x, top.y, top.z])
      lowerRail.push([bottom.x, bottom.y, bottom.z + side * 0.018])
      const panelPoint = hullPoint(-1.68 + (3.27 * i) / 32, 0.79, side)
      panelRail.push([panelPoint.x, panelPoint.y, panelPoint.z + side * 0.03])
    }
    molding('sleigh-rounded-wood-gunwale', rail, 0.038, wood, 48)
    molding('sleigh-lower-wood-molding', lowerRail, 0.027, wood, 32)
    molding('sleigh-inset-brass-bead', panelRail, 0.009, shared.brass, 32)
    mesh('sleigh-flat-steel-runner', runner, shared.steel, [0, 0, side * 0.68])
    for (const x of [-1.23, 0.65]) {
      beam(
        'sleigh-runner-strut',
        [x - 0.13, -0.39, side * 0.68],
        [x + 0.12, 0.04, side * 0.65],
        0.075,
        0.07,
        shared.brass,
      )
      const bolt = mesh('sleigh-chassis-rivet', rivet, shared.brass, [x + 0.12, 0.1, side * 0.753])
      bolt.scale.set(0.026, 0.026, 0.012)
    }
    mesh('sleigh-tow-eye', towEye, shared.brass, [1.35, 0.57, side * 0.65])
    beam(
      'sleigh-tow-eye-bracket',
      [1.35, 0.56, side * 0.65],
      [1.16, 0.3, side * 0.69],
      0.04,
      0.045,
      shared.brass,
    )
    molding(
      'sleigh-restrained-brass-scroll',
      [
        [-1.45, 0.54, side * 0.852],
        [-1.24, 0.7, side * 0.849],
        [-0.98, 0.63, side * 0.851],
        [-1.02, 0.47, side * 0.854],
        [-1.18, 0.46, side * 0.854],
        [-1.17, 0.55, side * 0.855],
      ],
      0.013,
      shared.brass,
      28,
    )
  }
  for (const x of [-1.23, 0.65])
    beam('sleigh-chassis-crossmember', [x, -0.2, -0.7], [x, -0.2, 0.7], 0.085, 0.09, wood)
  for (const end of [-1, 1]) {
    mesh(
      'sleigh-curved-hull-end',
      panelVolume(
        20,
        6,
        (u, v) => {
          const across = 2 * u - 1
          const top = end > 0 ? 0.98 - 0.42 * (1 - across * across) : 1.14
          return new Vector3(
            end > 0 ? 1.84 - 0.14 * (1 - across * across) : -1.88 + 0.05 * (1 - across * across),
            0.1 + (top - 0.1) * v,
            0.685 * across,
          )
        },
        new Vector3(end * 0.08, 0, 0),
      ),
      wood,
    )
  }
  mesh('sleigh-footwell-floor', roundedBox(2.84, 0.12, 1.35, 0.025), wood, [0.03, 0.01125, 0])
  for (const z of [-0.4, -0.13, 0.14, 0.41])
    molding(
      'sleigh-floor-plank-joint',
      [
        [-1.35, 0.081, z],
        [0, 0.081, z],
        [1.41, 0.081, z],
      ],
      0.0025,
      shared.leather,
      4,
    )
  mesh('sleigh-rear-cargo-deck', roundedBox(0.66, 0.1, 1.28, 0.025), wood, [-1.46, 0.39, 0])
  for (const x of [-0.79, 0.05])
    beam('sleigh-seat-trestle', [x, 0.08, -0.48], [x, 0.43, -0.48], 0.07, 0.07, wood)
  for (const x of [-0.79, 0.05])
    beam('sleigh-seat-trestle', [x, 0.08, 0.48], [x, 0.43, 0.48], 0.07, 0.07, wood)
  mesh('sleigh-seat-frame', roundedBox(1.13, 0.09, 1.26, 0.025), wood, [-0.35, 0.405, 0])
  mesh('sleigh-seat-cushion', roundedBox(1.04, 0.16, 1.16, 0.035), padding, [-0.35, 0.48775, 0])
  mesh('sleigh-seat-back-frame', roundedBox(0.14, 1.02, 1.26, 0.025), wood, [-1.015, 1.01, 0])
  mesh(
    'sleigh-tufted-seat-back',
    panelVolume(
      16,
      20,
      (u, v) => {
        const z = -0.57 + 1.14 * u,
          y = 0.55 + 0.94 * v
        const edge = Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
        let compression = 0
        for (const channel of [-0.285, 0, 0.285])
          compression += 0.017 * Math.exp(-(((z - channel) / 0.025) ** 2))
        return new Vector3(-0.91 + edge * (0.058 - compression), y, z)
      },
      new Vector3(0.065, 0, 0),
    ),
    padding,
  )
  for (const z of [-0.285, 0, 0.285]) {
    molding(
      'sleigh-seat-stitched-channel',
      [
        [-0.901, 0.6, z],
        [-0.875, 1.02, z],
        [-0.901, 1.44, z],
      ],
      0.003,
      shared.leather,
      16,
    )
    for (const y of [0.86, 1.2]) {
      const button = mesh('sleigh-leather-tuft-button', rivet, shared.leather, [-0.867, y, z])
      button.scale.set(0.012, 0.022, 0.022)
    }
  }
  molding(
    'sleigh-seat-piping',
    [
      [0.13, 0.51, -0.55],
      [0.16, 0.51, 0],
      [0.13, 0.51, 0.55],
      [-0.35, 0.51, 0.58],
      [-0.83, 0.51, 0.55],
      [-0.86, 0.51, 0],
      [-0.83, 0.51, -0.55],
      [-0.35, 0.51, -0.58],
      [0.13, 0.51, -0.55],
    ],
    0.008,
    shared.leather,
    48,
  )
  mesh('sleigh-folded-linen-sack', foldedSack(), linen)
  // The raised tie stays affine so its analytic normals remain continuous across both UV seams.
  const cargoFrame = new Matrix4()
    .makeTranslation(-1.47, 0.44, -0.32)
    .multiply(new Matrix4().makeRotationX(0.65))
    .multiply(new Matrix4().makeScale(1.1, 0.95, 1.25))
    .multiply(new Matrix4().makeTranslation(1.43, -0.44, -0.12))
  mesh(
    'sleigh-sack-gather-cord',
    new TorusGeometry(0.087, 0.014, 6, 24)
      .scale(1, 1.18, 1)
      .rotateX(Math.PI / 2)
      .translate(-1.46, 1.675, 0.12)
      .applyMatrix4(cargoFrame),
    shared.leather,
  )
  const bow = molding(
    'sleigh-sack-tied-bow',
    [
      [-1.38, 1.68, 0.13],
      [-1.32, 1.76, 0.25],
      [-1.27, 1.67, 0.26],
      [-1.38, 1.68, 0.13],
      [-1.3, 1.7, 0.02],
      [-1.29, 1.61, 0],
      [-1.38, 1.68, 0.13],
      [-1.29, 1.49, 0.14],
    ],
    0.012,
    shared.leather,
    40,
  )
  bow.geometry.applyMatrix4(cargoFrame)
  const chamber = new CylinderGeometry(0.072, 0.072, 0.19, 8)
  const cap = new CylinderGeometry(0.025, 0.115, 0.065, 8)
  const base = new CylinderGeometry(0.1, 0.085, 0.035, 8)
  const cageBar = new CylinderGeometry(0.007, 0.007, 0.225, 6)
  for (const side of [-1, 1]) {
    const z = side * 0.6
    beam('sleigh-lantern-standard', [1.15, 0.2, z], [1.15, 1.255, z], 0.035, 0.035, shared.brass)
    mesh('sleigh-lantern-amber-chamber', chamber, shared.lantern, [1.15, 1.37, z])
    mesh('sleigh-lantern-roof', cap, shared.brass, [1.15, 1.505, z])
    mesh('sleigh-lantern-base', base, shared.brass, [1.15, 1.25, z])
    for (const dx of [-0.071, 0.071])
      for (const dz of [-0.071, 0.071])
        mesh('sleigh-lantern-cage-bar', cageBar, shared.brass, [1.15 + dx, 1.375, z + dz])
    mesh('sleigh-lantern-handle', new TorusGeometry(0.036, 0.007, 5, 12), shared.brass, [
      1.15,
      1.565,
      z,
    ])
  }
  return {
    group,
    geometries: [...geometries],
    materials: [paint, wood, inset, padding, linen],
    textures: [woodMap, weaveMap],
  }
}

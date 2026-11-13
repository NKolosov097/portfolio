/** Fixed raster coordinates of a supporting ink sample. */
type Point = {
  /** Horizontal raster coordinate. */
  x: number
  /** Vertical raster coordinate. */
  y: number
}
/** Upward-facing ink transitions in one raster column. */
type Column = Point & {
  /** Transparent-to-ink boundaries from top to bottom. */
  transitions: number[]
}
/** Cached fixed-font outline and supported accumulation runs. */
type Outline = {
  /** Padded canvas width. */
  cw: number
  /** Padded canvas height. */
  chPx: number
  /** Transparent canvas margin. */
  padding: number
  /** Exposed upper ink contours. */
  runs: Point[][]
  /** Approved inner surface contours. */
  recessRuns: Point[][]
  /** Diagonal floors next to retaining stems. */
  cornerRuns: Point[][]
}
/** Heading role determines approved word-specific fullness and lips. */
export type SnowPart = 'intro' | 'firstName' | 'lastName'
/** Physical surface role, independent of decorative QA markers. */
export type SnowMotionKind = 'cap' | 'basin'
/** One prepared native mask state on the common clock. */
export type SnowMaskKeyframe = {
  /** Shared phase fraction. */
  offset: number
  /** Source-space polygon with stable vertex correspondence. */
  clipPath: string
}
/** Immutable fixed-shape envelope and original supporting ink. */
export type SnowProfileColumn = {
  /** Source-space column center. */
  x: number
  /** Original ink support ordinate. */
  support: number
  /** Full upper reveal bound. */
  top: number
  /** Unbulged lower reveal bound. */
  bodyBottom: number
  /** Complete lower reveal bound. */
  fullBottom: number
}
/** Actual occurrence geometry used for bounded native contact sampling. */
export type SnowContactLayout = {
  /** Current CSS font size. */
  fontSize: number
  /** Current physical pixel ratio. */
  pixelRatio: number
  /** Glyph screen origin. */
  glyphLeft: number
  /** Measured live alphabetic baseline. */
  baseline: number
  /** SVG screen origin. */
  svgLeft: number
  /** SVG screen ordinate. */
  svgTop: number
}
/** One filled SVG patch and its material classification. */
export type SnowPath = {
  /** Approved SVG path geometry. */
  d: string
  /** Physical motion family. */
  motion: SnowMotionKind
  /** Cached fixed profile; layout recalibration never mutates it. */
  profile: { columns: SnowProfileColumn[]; minSupport: number }
  /** Prepared body polygon states. */
  bodyKeyframes: SnowMaskKeyframe[]
  /** Fixed floor and phase-matched lower lobe for an actual bulge. */
  lip?: {
    /** Floor-only unbulged clip; outer contours remain owned by the visible path. */
    bodyD: string
    /** Lower-lobe polygons sharing the body's clock. */
    keyframes: SnowMaskKeyframe[]
  }
  /** Scoped fill and shadow treatment. */
  material: 'plain' | 'hanging' | 'interior'
  /** Supported extra-patch glyph marker. */
  pocket?: string
  /** Stem-retained accumulation marker. */
  corner?: string
  /** Position-specific main-cap lip marker. */
  hasExtraLip?: boolean
}
/** Geometry uses the same padded 200px coordinate space for every locale. */
export type SnowGlyph = Pick<Outline, 'cw' | 'chPx' | 'padding'> & {
  /** Filled contour patches in paint order. */
  paths: SnowPath[]
}

// Raster sampling constants: fixed glyph render size, its 1.15 line-height and a transparent margin for overshoot.
const RASTER_SIZE = 200
const RASTER_LINE_HEIGHT = 230
const RASTER_PADDING = 24
const INK_THRESHOLD = 128
const SCAN_STEP = 1
const TOP_BAND_PX = 20
const STEEP_JUMP_PX = 15
const OVERLAP_PX = 3
const MIN_RUN_POINTS = 3

// Caches each distinct glyph's sampled top-edge runs, since repeated letters (o, a, ...) share one outline.
const glyphOutlineCache = new Map<string, Outline>()
/** Fixed shape/envelope preparation is reused across toggles and locale revisits. */
const glyphGeometryCache = new Map<string, SnowGlyph>()

// Creates a guarded canvas 2D context used both for glyph rasterization and ink sampling.
export function createRasterContext(): CanvasRenderingContext2D | null {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  return ctx || null
}

// Rasterizes one glyph at 200px Inter 700 and samples its upward-facing ink contour, split into disjoint runs.
function sampleGlyphOutline(ctx: CanvasRenderingContext2D, ch: string): Outline {
  const cached = glyphOutlineCache.get(ch)
  if (cached) return cached
  ctx.font = `700 ${RASTER_SIZE}px Inter`
  ctx.textBaseline = 'alphabetic'
  const metrics = ctx.measureText(ch)
  const ascent = metrics.fontBoundingBoxAscent ?? RASTER_SIZE * 0.97
  const descent = metrics.fontBoundingBoxDescent ?? RASTER_SIZE * 0.24
  const baseline = (RASTER_LINE_HEIGHT - ascent - descent) / 2 + ascent
  const advance = Math.max(Math.ceil(metrics.width), 1)
  const cw = advance + RASTER_PADDING * 2
  const chPx = Math.ceil(RASTER_LINE_HEIGHT) + RASTER_PADDING * 2

  const glyphCanvas = document.createElement('canvas')
  glyphCanvas.width = cw
  glyphCanvas.height = chPx
  const gctx = glyphCanvas.getContext('2d')
  const outline: Outline = {
    cw,
    chPx,
    padding: RASTER_PADDING,
    runs: [],
    cornerRuns: [],
    recessRuns: [],
  }
  if (!gctx) {
    throw new Error('Glyph raster context is unavailable.')
  }
  gctx.font = `700 ${RASTER_SIZE}px Inter`
  gctx.textBaseline = 'alphabetic'
  gctx.fillStyle = '#000'
  gctx.fillText(ch, RASTER_PADDING, baseline + RASTER_PADDING)

  const { data } = gctx.getImageData(0, 0, cw, chPx)
  const columns: Column[] = []
  for (let x = 0; x < cw; x += SCAN_STEP) {
    const transitions: number[] = []
    let wasInk = false
    for (let y = 0; y < chPx; y++) {
      const alpha = data[(y * cw + x) * 4 + 3]
      const isInk = alpha >= INK_THRESHOLD
      if (isInk && !wasInk) transitions.push(y)
      wasInk = isInk
    }
    if (transitions.length) columns.push({ x, y: transitions[0], transitions })
  }
  if (columns.length === 0) {
    glyphOutlineCache.set(ch, outline)
    return outline
  }

  const globalMinY = Math.min(...columns.map((p) => p.y))
  const supported = columns.filter((p) => p.y <= globalMinY + TOP_BAND_PX)
  outline.runs = splitIntoRuns(supported)
  outline.recessRuns = splitIntoRuns(selectRecessPoints(columns, ch, globalMinY))
  outline.cornerRuns = splitIntoRuns(selectCornerPoints(columns, ch, globalMinY))

  glyphOutlineCache.set(ch, outline)
  return outline
}

// Splits a list of per-column points into disjoint runs, breaking at missing columns or steep shoulder jumps.
function splitIntoRuns(points: Point[]) {
  const runs: Point[][] = []
  let run: Point[] = []
  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const prev = run[run.length - 1]
    const isAdjacent = prev && point.x - prev.x <= SCAN_STEP * 1.5
    const isSmooth = prev && Math.abs(point.y - prev.y) <= STEEP_JUMP_PX
    if (prev && (!isAdjacent || !isSmooth)) {
      if (run.length >= MIN_RUN_POINTS) runs.push(run)
      run = []
    }
    run.push(point)
  }
  if (run.length >= MIN_RUN_POINTS) runs.push(run)
  return runs
}

// Picks supported snow sample points (N/k/t/v patches) from the full column profile, normalized to the glyph's own ink width.
// shortcut: retune when font/text changes.
function selectRecessPoints(columns: Column[], ch: string, globalMinY: number) {
  if (ch === 't') {
    return columns
      .filter((c) => c.transitions.length > 0)
      .map((c) => ({ x: c.x, y: c.transitions[0] }))
      .filter((p) => p.y >= globalMinY + 20 && p.y <= globalMinY + 40)
  }
  const RECESS_RANGES: Record<string, [number, number] | undefined> = {
    N: [0.62, 0.78],
    k: [0.62, 0.92],
    v: [0.38, 0.62],
  }
  const range = RECESS_RANGES[ch]
  if (!range) return []
  const inkXs = columns.map((c) => c.x)
  const inkMinX = Math.min(...inkXs)
  const inkSpan = Math.max(Math.max(...inkXs) - inkMinX, 1)
  return columns
    .filter((c) => c.transitions.length > 0)
    .map((c) => ({ x: c.x, y: c.transitions[0] }))
    .filter((p) => {
      const normX = (p.x - inkMinX) / inkSpan
      return normX >= range[0] && normX <= range[1]
    })
    .filter((p) => ch !== 'N' || p.y > globalMinY + TOP_BAND_PX)
    .filter((p) => ch !== 'k' || p.y <= globalMinY + 60)
}

// Selects diagonal floors beside the retaining stems for the three corner snowbanks.
function selectCornerPoints(columns: Column[], ch: string, globalMinY: number) {
  const ranges: Record<string, [number, number] | undefined> = {
    N: [0.52, 0.79],
    k: [0.2, 0.61],
    K: [0.2, 0.52],
  }
  const range = ranges[ch]
  if (!range) return []
  const inkMinX = columns[0].x
  const inkSpan = Math.max(columns[columns.length - 1].x - inkMinX, 1)
  return columns.filter((p) => {
    const normX = (p.x - inkMinX) / inkSpan
    return normX >= range[0] && normX <= range[1] && p.y > globalMinY + TOP_BAND_PX
  })
}

// Smooths a sampled top-edge run with one quadratic-midpoint pass, avoiding a jagged pixel-stepped profile.
function smoothRun(values: number[]) {
  return values.map((v, i, arr) => {
    if (i === 0 || i === arr.length - 1) return v
    return (arr[i - 1] + 2 * v + arr[i + 1]) / 4
  })
}

/** Approved fill and whether its existing lower samples contain a lobe. */
type BuiltSnowPatch = { path: string; hasLip: boolean }
/** Prepared reveal fields shared by fixed and calibrated geometry. */
type SnowRevealFields = Pick<SnowPath, 'motion' | 'profile' | 'bodyKeyframes' | 'lip'>
const CAP_PHASES = [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.45, 0.6, 1]
const HEIGHT_PHASES = [0, 0.1, 0.3, 0.6, 1]

/** Keep identical vertex ordering for every native keyframe. */
function serializeMask(top: readonly Point[], bottom: readonly Point[]): string {
  return `polygon(${top
    .map((point) => `${point.x}px ${point.y}px`)
    .concat([...bottom].reverse().map((point) => `${point.x}px ${point.y}px`))
    .join(',')})`
}

/** Interpolate the measured source support, extending only its existing endpoint floors. */
function supportAt(run: readonly Point[], x: number): number {
  if (x <= run[0].x) return run[0].y
  if (x >= run[run.length - 1].x) return run[run.length - 1].y
  const index = run.findIndex((point) => point.x >= x)
  const left = run[index - 1]
  const right = run[index]
  return left.y + ((right.y - left.y) * (x - left.x)) / (right.x - left.x)
}

/** Preserve the approved height schedule at the additional shoulder knots. */
function capHeight(phase: number): number {
  if (phase === 0) return 0
  const index = HEIGHT_PHASES.findIndex((value) => value >= phase)
  const low = HEIGHT_PHASES[index - 1]
  const high = HEIGHT_PHASES[index]
  return Math.sqrt(low) + ((Math.sqrt(high) - Math.sqrt(low)) * (phase - low)) / (high - low)
}

/** Delay only descending source shoulders; contact calibration never changes this exposure order. */
function capExposure(phase: number, support: number, minSupport: number): number {
  const activation = 0.6 * Math.max(0, Math.min(1, (support - minSupport) / TOP_BAND_PX))
  if (activation === 0) return 1
  const progress = Math.max(0, Math.min(1, (phase - activation / 2) / (activation / 2)))
  return progress * progress * (3 - 2 * progress)
}

/** Rebuild only cap reveal polygons when actual ink contact changes. */
function bodyFrames(
  columns: readonly SnowProfileColumn[],
  minSupport: number,
  motion: SnowMotionKind,
  contact: readonly number[],
): SnowMaskKeyframe[] {
  return (motion === 'cap' ? CAP_PHASES : [0, 1]).map((phase) => {
    const top = columns.map((column, index) => {
      const exposure = motion === 'cap' ? capExposure(phase, column.support, minSupport) : 1
      const height = motion === 'cap' ? capHeight(phase) : phase
      return { x: column.x, y: contact[index] + height * exposure * (column.top - contact[index]) }
    })
    const bottom = columns.map((column, index) => {
      const exposure = motion === 'cap' ? capExposure(phase, column.support, minSupport) : 1
      return {
        x: column.x,
        y: contact[index] + phase * exposure * (column.bodyBottom - contact[index]),
      }
    })
    return { offset: phase, clipPath: serializeMask(top, bottom) }
  })
}

/** Keep the late lobe on the same contact curve and common phase with a small inward union overlap. */
function lipFrames(
  columns: readonly SnowProfileColumn[],
  contact: readonly number[],
): SnowMaskKeyframe[] {
  return [0, 0.7, 1].map((phase) => {
    const upper = columns.map((column, index) => ({
      x: column.x,
      y: (1 - phase) * Math.min(contact[index], column.bodyBottom) + phase * column.bodyBottom - 1,
    }))
    const lower =
      phase === 1 ? columns.map((column) => ({ x: column.x, y: column.fullBottom })) : upper
    return { offset: phase, clipPath: serializeMask(upper, lower) }
  })
}

/** Detect actual existing bulges instead of relying on a material or glyph label. */
function hasLowerBulge(run: readonly Point[], bottom: readonly Point[], overlap: number): boolean {
  return run.some((point, index) => bottom[index].y > point.y + overlap + 0.000001)
}

/** Protect only the exact unbulged floor, avoiding duplicated outer-contour antialiasing. */
function floorClip(
  run: readonly Point[],
  overlap: number,
  size: Pick<Outline, 'cw' | 'padding'>,
): string {
  const left = -size.padding
  const right = size.cw + size.padding
  return `M${left},${left} L${right},${left} L${right},${run[run.length - 1].y + overlap} ${[...run]
    .reverse()
    .map((point) => `L${point.x},${point.y + overlap}`)
    .join(' ')} L${left},${run[0].y + overlap} Z`
}

/** Sample each fixed full path once; layout updates reuse these immutable envelope columns. */
function buildRevealFrames(
  ctx: CanvasRenderingContext2D,
  patch: BuiltSnowPatch,
  run: readonly Point[],
  motion: SnowMotionKind,
  overlap: number,
  size: Pick<Outline, 'cw' | 'chPx' | 'padding'>,
): SnowRevealFields {
  const previousWidth = ctx.canvas.width
  const previousHeight = ctx.canvas.height
  let data: Uint8ClampedArray
  const width = size.cw * 2
  const height = size.chPx * 2
  try {
    ctx.canvas.width = width
    ctx.canvas.height = height
    ctx.setTransform(2, 0, 0, 2, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fill(new Path2D(patch.path))
    data = ctx.getImageData(0, 0, width, height).data
  } finally {
    ctx.canvas.width = previousWidth
    ctx.canvas.height = previousHeight
  }
  const columns: SnowProfileColumn[] = []
  for (let x = 0; x < size.cw; x++) {
    let low = Infinity
    let high = -Infinity
    for (let y = 0; y < height; y++) {
      if (data[(y * width + x * 2) * 4 + 3] > 5 || data[(y * width + x * 2 + 1) * 4 + 3] > 5) {
        low = Math.min(low, y / 2)
        high = Math.max(high, (y + 1) / 2)
      }
    }
    if (high < low) continue
    const sourceX = x + 0.5
    const support = supportAt(run, sourceX)
    columns.push({
      x: sourceX,
      support,
      top: low - 1,
      bodyBottom: patch.hasLip ? support + overlap : high + 1,
      fullBottom: high + 1,
    })
  }
  if (!columns.length) throw new Error('Snow path has no raster envelope.')
  const first = columns[0]
  const last = columns[columns.length - 1]
  columns.unshift({
    ...first,
    x: first.x - 1,
    support: supportAt(run, first.x - 1),
    bodyBottom: patch.hasLip ? supportAt(run, first.x - 1) + overlap : first.bodyBottom,
  })
  columns.push({
    ...last,
    x: last.x + 1,
    support: supportAt(run, last.x + 1),
    bodyBottom: patch.hasLip ? supportAt(run, last.x + 1) + overlap : last.bodyBottom,
  })
  const minSupport = Math.min(...run.map((point) => point.y))
  let contact = columns.map((column) => column.support)
  if (motion === 'basin') {
    const lowest = Math.max(...run.map((point) => point.y))
    const candidates = run.filter((point) => point.y >= lowest - 1)
    const middle = (candidates[0].x + candidates[candidates.length - 1].x) / 2
    const anchor = candidates.reduce((nearest, point) =>
      Math.abs(point.x - middle) < Math.abs(nearest.x - middle) ? point : nearest,
    )
    const extent = Math.max(1, ...columns.map((column) => Math.abs(column.x - anchor.x)))
    const bow = 0.35 * (run[run.length - 1].x - run[0].x)
    contact = columns.map((column) => lowest + bow * ((column.x - anchor.x) / extent) ** 2)
  }
  return {
    motion,
    profile: { columns, minSupport },
    bodyKeyframes: bodyFrames(columns, minSupport, motion, contact),
    lip: patch.hasLip
      ? { bodyD: floorClip(run, overlap, size), keyframes: lipFrames(columns, contact) }
      : undefined,
  }
}

/** Calibrate only the contact of this actual occurrence without rebuilding its approved shape or envelope. */
export function prepareSnowContact(
  ctx: CanvasRenderingContext2D,
  glyph: SnowGlyph,
  ch: string,
  layout: SnowContactLayout,
): SnowGlyph {
  if (!glyph.paths.some((path) => path.motion === 'cap')) return glyph
  if (
    !Object.values(layout).every(Number.isFinite) ||
    layout.fontSize <= 0 ||
    layout.pixelRatio <= 0
  )
    throw new Error('Invalid snow contact layout.')
  const emScale = layout.fontSize / RASTER_SIZE
  const scale = emScale * layout.pixelRatio
  const phaseX = layout.svgLeft * layout.pixelRatio - Math.floor(layout.svgLeft * layout.pixelRatio)
  const phaseY = layout.svgTop * layout.pixelRatio - Math.floor(layout.svgTop * layout.pixelRatio)
  const width = Math.ceil(glyph.cw * scale) + 2
  const height = Math.ceil(glyph.chPx * scale) + 2
  const previousWidth = ctx.canvas.width
  const previousHeight = ctx.canvas.height
  let pixels: Uint8ClampedArray
  try {
    ctx.canvas.width = width
    ctx.canvas.height = height
    ctx.setTransform(scale, 0, 0, scale, phaseX, phaseY)
    ctx.font = '700 200px Inter'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#000000'
    ctx.fillText(
      ch,
      (layout.glyphLeft - layout.svgLeft) / emScale,
      (layout.baseline - layout.svgTop) / emScale,
    )
    pixels = ctx.getImageData(0, 0, width, height).data
  } finally {
    ctx.canvas.width = previousWidth
    ctx.canvas.height = previousHeight
  }
  const paths = glyph.paths.map((path) => {
    if (path.motion !== 'cap') return path
    const contact = path.profile.columns.map((column) => {
      const nativeX = Math.max(0, Math.min(width - 1, Math.floor(phaseX + column.x * scale)))
      const expected = phaseY + column.support * scale
      let chosen = column.support
      let distance = Infinity
      for (
        let row = Math.max(0, Math.floor(expected) - 3);
        row <= Math.min(height - 1, Math.floor(expected) + 4);
        row++
      ) {
        const previous = row === 0 ? 0 : pixels[((row - 1) * width + nativeX) * 4 + 3]
        if (pixels[(row * width + nativeX) * 4 + 3] < 128 || previous >= 128) continue
        const candidate = (row + 0.5 - phaseY) / scale
        const difference = Math.abs(row - expected)
        if (candidate >= column.top && candidate <= column.bodyBottom && difference < distance) {
          chosen = candidate
          distance = difference
        }
      }
      return chosen
    })
    return {
      ...path,
      bodyKeyframes: bodyFrames(path.profile.columns, path.profile.minSupport, 'cap', contact),
      lip: path.lip
        ? { bodyD: path.lip.bodyD, keyframes: lipFrames(path.profile.columns, contact) }
        : undefined,
    }
  })
  return { ...glyph, paths }
}

// Builds the snow band for one contour run: a low half-ellipse capped by the run's own width, plus an optional rounded hanging lip.
// `isFull` modestly raises the width-limited depth ratio and overlap for the first name.
function buildRunPath(run: Point[], seed: number, lip: { center: number } | null, isFull: boolean) {
  const n = run.length
  const span = Math.max(run[n - 1].x - run[0].x, 1)
  const overlapPx = isFull ? 5 : OVERLAP_PX
  const maxDepthPx = Math.min((12 / 56) * RASTER_SIZE, span * (isFull ? 0.3 : 0.24))
  const moundPhase = (seed % 7) * 0.35
  // Caps the snow mound to a low rounded profile, bounded by the run's own width so it never overgrows a short stroke.
  const thicknessAt = (t: number) => {
    const dome = Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2))
    const variation = 0.94 + 0.06 * Math.cos(Math.PI * t * 2 + moundPhase)
    const asymmetry = 1
    return maxDepthPx * dome * variation * asymmetry
  }
  const lipDepthPx = lip ? Math.min(0.07 * RASTER_SIZE, span * 0.2) : 0
  const lipHalfWidth = 0.16
  // Shapes a small hanging lip attached to the mound, smoothly tapering to zero away from its center.
  const bulgeAt = (t: number) => {
    if (!lip) return 0
    const d = (t - lip.center) / lipHalfWidth
    if (Math.abs(d) >= 1) return 0
    return lipDepthPx * Math.cos((Math.PI / 2) * d) ** 2
  }
  const bottom = run.map((p, i) => ({ x: p.x, y: p.y + overlapPx + bulgeAt(i / (n - 1)) }))
  const topY = smoothRun(run.map((p, i) => p.y - thicknessAt(i / (n - 1))))
  const top = run.map((p, i) => ({ x: p.x, y: topY[i] }))

  const bottomPath = bottom.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const topPath = top
    .slice()
    .reverse()
    .map((p) => `L${p.x},${p.y}`)
    .join(' ')
  const upperPath = `${topPath} Z`
  return {
    path: `${bottomPath} ${upperPath}`,
    hasLip: Boolean(lip) && hasLowerBulge(run, bottom, overlapPx),
  }
}

// Adds a small attached lip while keeping the support endpoints and all samples outside its window unchanged.
function buildInnerLipBottom(run: Point[], center: number, depthRatio = 0.25) {
  const span = Math.max(run[run.length - 1].x - run[0].x, 1)
  const depth = Math.min(RASTER_SIZE * 0.04, span * depthRatio)
  const distances = run.map((p) => ((p.x - run[0].x) / span - center) / 0.22)
  const bottom = run.map((p, i) => ({
    x: p.x,
    y:
      p.y +
      OVERLAP_PX +
      (Math.abs(distances[i]) < 1 ? depth * Math.cos((Math.PI / 2) * distances[i]) ** 2 : 0),
  }))
  const smoothed = smoothRun(smoothRun(bottom.map((p) => p.y)))
  return bottom.map((p, i) => ({ ...p, y: Math.abs(distances[i]) < 1 ? smoothed[i] : p.y }))
}

// Keeps the original recess arch and adds a rounded lower lip only inside v.
function buildRecessPath(run: Point[], ch: string) {
  const n = run.length
  const span = Math.max(run[n - 1].x - run[0].x, 1)
  const bottom =
    ch === 'v' ? buildInnerLipBottom(run, 0.5) : run.map((p) => ({ x: p.x, y: p.y + OVERLAP_PX }))
  const left = bottom[0]
  const right = bottom[n - 1]
  const crestY = Math.min(run[0].y, run[n - 1].y) - Math.min(0.045 * RASTER_SIZE, span * 0.35)
  const bottomPath = bottom.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const upperPath = `C ${right.x},${crestY} ${left.x},${crestY} ${left.x},${left.y} Z`
  return {
    path: `${bottomPath} ${upperPath}`,
    hasLip: ch === 'v' && hasLowerBulge(run, bottom, OVERLAP_PX),
  }
}

// Holds a rounded snowbank against its stem with a small attached lip along the diagonal floor.
function buildCornerPath(run: Point[], ch: string) {
  const left = run[0]
  const right = run[run.length - 1]
  const span = right.x - left.x
  const crestY = Math.min(left.y, right.y) - Math.min(8, span * 0.25)
  const midX = (left.x + right.x) / 2
  const bottom = buildInnerLipBottom(
    run,
    ch === 'k' ? 0.6 : 0.5,
    ch === 'k' || ch === 'K' ? 0.1 : 0.25,
  )
  const bottomPath = bottom.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  if (ch === 'N') {
    // Overlap the opaque stem so filtering and antialiasing cannot open a seam.
    const wallX = right.x + 2 * OVERLAP_PX
    const upperPath = `L${wallX},${right.y + OVERLAP_PX} L${wallX},${crestY + 3} Q${wallX},${crestY} ${wallX - 3},${crestY} C${midX},${crestY} ${left.x},${crestY} ${left.x},${left.y + OVERLAP_PX} Z`
    return {
      path: `${bottomPath} ${upperPath}`,
      hasLip: hasLowerBulge(run, bottom, OVERLAP_PX),
    }
  }
  const wallX = left.x - 1
  const upperPath = `C${right.x},${crestY} ${midX},${crestY} ${wallX + 3},${crestY} Q${wallX},${crestY} ${wallX},${crestY + 3} L${wallX},${left.y + OVERLAP_PX} Z`
  return {
    path: `${bottomPath} ${upperPath}`,
    hasLip: hasLowerBulge(run, bottom, OVERLAP_PX),
  }
}

/** Builds the approved deep-snow paths without changing the live heading text. */
export function prepareSnowGlyph(
  ctx: CanvasRenderingContext2D,
  ch: string,
  part: SnowPart,
  index: number,
): SnowGlyph {
  const cacheKey = JSON.stringify([ch, part, index])
  const cached = glyphGeometryCache.get(cacheKey)
  if (cached) return cached
  const outline = sampleGlyphOutline(ctx, ch)
  const seed = ch.charCodeAt(0)
  const centers: Record<string, number | undefined> = { m: 0.7, a: 0.68, s: 0.28 }
  const lipCenter = centers[ch]
  const hasExtraLip =
    (part === 'intro' && ch === 'm') || (part === 'lastName' && index === 1 && ch === 'o')
  const extraLipRun =
    hasExtraLip && outline.runs.length
      ? outline.runs.reduce((widest, run) =>
          run[run.length - 1].x - run[0].x > widest[widest.length - 1].x - widest[0].x
            ? run
            : widest,
        )
      : null
  const paths: SnowPath[] = outline.runs.map((run, i) => {
    const span = run[run.length - 1].x - run[0].x
    const hasRunLip = run === extraLipRun
    const lip = hasRunLip
      ? { center: ch === 'm' ? 0.77 : 0.73 }
      : i === 0 && lipCenter !== undefined && span >= RASTER_SIZE * 0.14
        ? { center: lipCenter }
        : null
    const patch = buildRunPath(run, seed + i, lip, part === 'firstName')
    return {
      d: patch.path,
      ...buildRevealFrames(ctx, patch, run, 'cap', part === 'firstName' ? 5 : OVERLAP_PX, outline),
      material: lip ? 'hanging' : 'plain',
      hasExtraLip: hasRunLip,
    }
  })
  if (ch !== 'N')
    for (const run of outline.recessRuns) {
      const patch = ch === 'k' ? buildRunPath(run, seed, null, false) : buildRecessPath(run, ch)
      paths.push({
        d: patch.path,
        ...buildRevealFrames(ctx, patch, run, ch === 'v' ? 'basin' : 'cap', OVERLAP_PX, outline),
        material: ch === 'v' ? 'interior' : 'plain',
        pocket: ch,
      })
    }
  for (const run of outline.cornerRuns) {
    const left = run[0]
    const right = run[run.length - 1]
    // A shallow lip on the straight diagonal floor cannot fold back into a sharp notch.
    const supportRun =
      ch === 'k' || ch === 'K'
        ? run.map(({ x }) => ({
            x,
            y: left.y + ((right.y - left.y) * (x - left.x)) / (right.x - left.x),
          }))
        : run
    const patch = buildCornerPath(supportRun, ch)
    paths.push({
      d: patch.path,
      ...buildRevealFrames(ctx, patch, supportRun, 'basin', OVERLAP_PX, outline),
      material: 'interior',
      pocket: ch,
      corner: ch,
    })
  }
  const glyph = { cw: outline.cw, chPx: outline.chPx, padding: outline.padding, paths }
  glyphGeometryCache.set(cacheKey, glyph)
  return glyph
}

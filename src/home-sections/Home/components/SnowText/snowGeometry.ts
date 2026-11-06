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
/** One filled SVG patch and its material classification. */
export type SnowPath = {
  /** Approved SVG path geometry. */
  d: string
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
    glyphOutlineCache.set(ch, outline)
    return outline
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
  return { path: `${bottomPath} ${topPath} Z`, top, bottom }
}

// Adds a small attached lip while keeping the support endpoints and all samples outside its window unchanged.
function buildInnerLipBottom(run: Point[], center: number) {
  const span = Math.max(run[run.length - 1].x - run[0].x, 1)
  const depth = Math.min(RASTER_SIZE * 0.04, span * 0.25)
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
  return `${bottomPath} C ${right.x},${crestY} ${left.x},${crestY} ${left.x},${left.y} Z`
}

// Holds a rounded snowbank against its stem with a small attached lip along the diagonal floor.
function buildCornerPath(run: Point[], ch: string) {
  const left = run[0]
  const right = run[run.length - 1]
  const span = right.x - left.x
  const crestY = Math.min(left.y, right.y) - Math.min(8, span * 0.25)
  const midX = (left.x + right.x) / 2
  const bottomPath = buildInnerLipBottom(run, ch === 'k' ? 0.6 : 0.5)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
    .join(' ')
  if (ch === 'N') {
    // Overlap the opaque stem so filtering and antialiasing cannot open a seam.
    const wallX = right.x + 2 * OVERLAP_PX
    return `${bottomPath} L${wallX},${right.y + OVERLAP_PX} L${wallX},${crestY + 3} Q${wallX},${crestY} ${wallX - 3},${crestY} C${midX},${crestY} ${left.x},${crestY} ${left.x},${left.y + OVERLAP_PX} Z`
  }
  const wallX = left.x - 1
  return `${bottomPath} C${right.x},${crestY} ${midX},${crestY} ${wallX + 3},${crestY} Q${wallX},${crestY} ${wallX},${crestY + 3} L${wallX},${left.y + OVERLAP_PX} Z`
}

/** Builds the approved deep-snow paths without changing the live heading text. */
export function prepareSnowGlyph(
  ctx: CanvasRenderingContext2D,
  ch: string,
  part: SnowPart,
  index: number,
): SnowGlyph {
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
    return {
      d: buildRunPath(run, seed + i, lip, part === 'firstName').path,
      material: lip ? 'hanging' : 'plain',
      hasExtraLip: hasRunLip,
    }
  })
  if (ch !== 'N')
    for (const run of outline.recessRuns) {
      paths.push({
        d: ch === 'k' ? buildRunPath(run, seed, null, false).path : buildRecessPath(run, ch),
        material: ch === 'v' ? 'interior' : 'plain',
        pocket: ch,
      })
    }
  for (const run of outline.cornerRuns)
    paths.push({ d: buildCornerPath(run, ch), material: 'interior', pocket: ch, corner: ch })
  return { cw: outline.cw, chPx: outline.chPx, padding: outline.padding, paths }
}

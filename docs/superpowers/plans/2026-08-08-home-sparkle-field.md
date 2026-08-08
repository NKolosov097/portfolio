# Home Sparkle Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the empty upper area of the `Home` hero with a decorative, pointer-reactive field of sparkle glyphs that stays smooth on low-end devices.

**Architecture:** A single `<canvas>` behind the hero text renders pre-rasterised sprite frames of the existing sparkle glyph. All simulation maths, the frame loop, and the quality governor are pure, dependency-injected modules shared by two transports: a main-thread path and an OffscreenCanvas worker path. A measurement-driven governor steps quality tiers up and down at runtime and ultimately falls back to a single static frame.

**Tech Stack:** React 19, Next.js 16 (App Router), TypeScript 5.9 (strict), Canvas 2D, OffscreenCanvas + Web Worker, CSS Modules, Vitest 4, Playwright 1.62. No new runtime dependencies.

**Source spec:** `docs/superpowers/specs/2026-08-08-home-sparkle-field-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **No new dependencies.** Nothing may be added to `package.json`.
- **`any` is forbidden.** Avoid `as` and type assertions; prefer generics, discriminated unions, and type guards.
- **JSDoc is mandatory** on every `interface` field, every `type` field, and every module-level variable. JSDoc explains intent, never restates the identifier.
- **Exported module-level constants must be `SCREAMING_SNAKE_CASE`** from the start. A save-time hook renames them otherwise and cascades the rename across the repo.
- **Only JSDoc (`/** _/`) comments survive edits.** A save-time hook strips ordinary `//`and`/_ \*/` comments. Anything that must persist goes in JSDoc.
- **New boolean identifiers use an `is` / `has` prefix.**
- **Every new component lives in its own directory** with separate component and style files.
- **No new user-facing strings.** The field is decorative and `aria-hidden`; `public/locales/en.json` and `public/locales/ru.json` must not change.
- **QA selectors** use `id` / `data-testid` / `data-key` with characters limited to `a-z`, `0-9`, `-`, `_`, `/`.
- **Run test and lint binaries directly, never through `pnpm <script>`** — `pnpm` triggers a deps-status reinstall that aborts in a non-TTY shell. Use `node_modules/.bin/vitest`, `node_modules/.bin/tsc`, `node_modules/.bin/eslint`, `node_modules/.bin/prettier`, `node_modules/.bin/stylelint`, `node_modules/.bin/playwright`.
- **Vitest routing:** `src/**/*.test.ts` runs in the `node` environment; only `src/**/*.dom.test.ts` runs in `jsdom`. Pure modules must be plain `.test.ts`.
- **`tsconfig.json` `lib` is `["dom", "dom.iterable", "esnext"]` — no `webworker`.** The worker file must not reference `DedicatedWorkerGlobalScope`, `self` typed as a worker scope, or any webworker-only global. Bare `addEventListener` / `postMessage` / `requestAnimationFrame` / `OffscreenCanvas` all type-check against the DOM lib and work at runtime inside a worker.
- **Playwright runs against a production build** (`next build` + `next start`) across six projects: chromium, mobile-chrome, firefox, mobile-firefox, safari, mobile-safari. Reduced motion must be set with `await page.emulateMedia({ reducedMotion: 'reduce' })`, never `test.use()`.
- **`e2e/smoke.spec.ts` asserts zero console errors on load.** No code path in this feature may `console.error`, including worker fallback.
- **Validation gate for every task:** `node_modules/.bin/tsc --pretty --noEmit`, `node_modules/.bin/eslint .`, `node_modules/.bin/prettier --check .`, and `node_modules/.bin/vitest run`.
- **Pre-existing noise to ignore:** `src/styles/globals.css` has three stylelint errors (line 31 font-family quoting, line 218 `--_--item-gap` casing) that predate this work.

## Refinements to the spec

Two deliberate deviations from `docs/superpowers/specs/2026-08-08-home-sparkle-field-design.md`, both narrowing rather than widening scope:

1. **`helpers/sparkleController.ts` is added.** The spec's file list stops at the loop. Extracting the "own the surface, react to viewport and tier changes" wiring into a controller is what lets the main-thread path and the worker path share everything except message transport — which is the spec's own stated goal in §9.
2. **The fade-in's target opacity is not a separate constant.** The spec's §15 lists "fade-in duration and target opacity"; the implementation fades the layer `0 → 1` and expresses subtlety through `minOpacity` / `maxOpacity` in the field config, keeping one source of truth for how bright a sparkle is.

## File Structure

| File                                                                     | Responsibility                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `src/home-sections/Home/types/home.type.ts`                              | Every interface, enum, and message union for the feature                  |
| `src/constants/home.constants.ts`                                        | Glyph path, field config, tier table, governor thresholds, seeding bounds |
| `src/home-sections/Home/helpers/sparkleField.ts`                         | Pure particle maths: creation, drift, wrap, pointer influence             |
| `src/home-sections/Home/helpers/sparkleGovernor.ts`                      | Pure tier seeding and frame-time-driven tier decisions                    |
| `src/home-sections/Home/helpers/sparkleSprites.ts`                       | Sprite bucket resolution (pure) and atlas rasterisation (browser-only)    |
| `src/home-sections/Home/helpers/sparkleRenderer.ts`                      | One frame of drawing, generic over the frame image type                   |
| `src/home-sections/Home/helpers/sparkleEngine.ts`                        | Frame loop: advance, render, measure, react to tier changes               |
| `src/home-sections/Home/helpers/sparkleController.ts`                    | Surface ownership: viewport, particle refit, atlas rebuild, tier apply    |
| `src/home-sections/Home/components/SparkleField/SparkleField.tsx`        | React lifecycle, DOM events, transport selection                          |
| `src/home-sections/Home/components/SparkleField/SparkleField.module.css` | Layer placement, mask, brand colour, fade-in                              |
| `src/home-sections/Home/workers/sparkleField.worker.ts`                  | Message transport only; runs the shared controller                        |
| `src/helpers/idleCallback.ts`                                            | `requestIdleCallback` with a `setTimeout` fallback                        |

---

### Task 1: Types, constants, and glyph extraction

**Files:**

- Create: `src/home-sections/Home/types/home.type.ts`
- Create: `src/constants/home.constants.ts`
- Create: `src/constants/home.constants.test.ts`
- Modify: `src/home-sections/Home/components/Sparkle/Sparkle.tsx:13`

**Interfaces:**

- Consumes: nothing.
- Produces: `ESparkleTier`, `ISparkleParticle`, `IPointerPosition`, `ISparklePointer`, `ISparkleInfluence`, `ISparkleViewport`, `ISparkleTierConfig`, `ISparkleFieldConfig`, `ISparkleGovernorThresholds`, `ISparkleGovernorState`, `ISparkleDeviceSignals`, `ISparkleSpriteAtlas<TImage>`, `ISparkleDrawContext<TImage>`, `ISparkleRasterContext`, `ISpriteSurface`, `TSpriteSurfaceFactory`; constants `SPARKLE_GLYPH_PATH`, `SPARKLE_GLYPH_VIEWBOX`, `SPARKLE_ROTATION_STEPS`, `SPARKLE_SPRITE_BUCKETS`, `SPARKLE_SPRITE_PADDING`, `SPARKLE_SPRITE_GLOW_PADDING`, `SPARKLE_GLOW_BLUR_RATIO`, `SPARKLE_FIELD_CONFIG`, `SPARKLE_TIERS`, `SPARKLE_GOVERNOR_THRESHOLDS`, `SPARKLE_LOW_TIER_CORES`, `SPARKLE_LOW_TIER_MEMORY_GB`, `SPARKLE_MEDIUM_TIER_CORES`, `SPARKLE_MEDIUM_TIER_MEMORY_GB`, `SPARKLE_MEDIUM_TIER_DPR`.

- [ ] **Step 1: Write the failing test**

Create `src/constants/home.constants.test.ts`. These assertions guard the tier table against a careless future edit — the governor's downgrade path is only meaningful if each step is genuinely cheaper.

```ts
import { describe, expect, it } from 'vitest'

import {
  SPARKLE_FIELD_CONFIG,
  SPARKLE_GLYPH_PATH,
  SPARKLE_GOVERNOR_THRESHOLDS,
  SPARKLE_SPRITE_BUCKETS,
  SPARKLE_SPRITE_PADDING,
  SPARKLE_TIERS,
} from '@/constants/home.constants'
import { ESparkleTier } from '@/home-sections/Home/types/home.type'

/** Tier order from most to least expensive; every budget must be non-increasing along it. */
const TIER_ORDER = [
  ESparkleTier.high,
  ESparkleTier.medium,
  ESparkleTier.low,
  ESparkleTier.static,
] as const

describe('sparkle constants', () => {
  it('describes a closed SVG path in the shared glyph', () => {
    expect(SPARKLE_GLYPH_PATH.startsWith('M')).toBe(true)
    expect(SPARKLE_GLYPH_PATH.endsWith('Z')).toBe(true)
  })

  it('never raises a budget as the tier degrades', () => {
    for (let index = 1; index < TIER_ORDER.length; index += 1) {
      const richer = SPARKLE_TIERS[TIER_ORDER[index - 1]]
      const poorer = SPARKLE_TIERS[TIER_ORDER[index]]

      expect(poorer.maxParticleCount).toBeLessThanOrEqual(richer.maxParticleCount)
      expect(poorer.maxDevicePixelRatio).toBeLessThanOrEqual(richer.maxDevicePixelRatio)
      expect(Number(poorer.hasGlow)).toBeLessThanOrEqual(Number(richer.hasGlow))
    }
  })

  it('animates every tier except the terminal one', () => {
    expect(SPARKLE_TIERS[ESparkleTier.high].isAnimated).toBe(true)
    expect(SPARKLE_TIERS[ESparkleTier.low].isAnimated).toBe(true)
    expect(SPARKLE_TIERS[ESparkleTier.static].isAnimated).toBe(false)
  })

  it('leaves a gap between the healthy and degraded frame budgets so tiers cannot oscillate', () => {
    expect(SPARKLE_GOVERNOR_THRESHOLDS.healthyFrameMs).toBeLessThan(
      SPARKLE_GOVERNOR_THRESHOLDS.degradedFrameMs,
    )
    expect(SPARKLE_GOVERNOR_THRESHOLDS.degradedFrameMs).toBeLessThan(
      SPARKLE_GOVERNOR_THRESHOLDS.criticalFrameMs,
    )
  })

  it('covers the whole particle size range with ascending sprite buckets', () => {
    expect(SPARKLE_SPRITE_BUCKETS[0]).toBeLessThanOrEqual(SPARKLE_FIELD_CONFIG.minSize)
    expect(SPARKLE_SPRITE_BUCKETS.at(-1)).toBeGreaterThanOrEqual(SPARKLE_FIELD_CONFIG.maxSize)

    for (let index = 1; index < SPARKLE_SPRITE_BUCKETS.length; index += 1) {
      expect(SPARKLE_SPRITE_BUCKETS[index]).toBeGreaterThan(SPARKLE_SPRITE_BUCKETS[index - 1])
    }
  })

  it('pads sprite boxes enough that a rotated glyph is never clipped', () => {
    expect(SPARKLE_SPRITE_PADDING).toBeGreaterThanOrEqual(Math.SQRT2)
  })

  it('keeps opacity and size ranges ordered and inside sane bounds', () => {
    expect(SPARKLE_FIELD_CONFIG.minSize).toBeLessThan(SPARKLE_FIELD_CONFIG.maxSize)
    expect(SPARKLE_FIELD_CONFIG.minOpacity).toBeGreaterThan(0)
    expect(SPARKLE_FIELD_CONFIG.maxOpacity).toBeLessThanOrEqual(1)
    expect(SPARKLE_FIELD_CONFIG.minOpacity).toBeLessThan(SPARKLE_FIELD_CONFIG.maxOpacity)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/constants/home.constants.test.ts`
Expected: FAIL — `Failed to resolve import "@/constants/home.constants"`.

- [ ] **Step 3: Create the types module**

Create `src/home-sections/Home/types/home.type.ts`:

```ts
export const enum ESparkleTier {
  high = 'high',
  medium = 'medium',
  low = 'low',
  static = 'static',
}

export interface IPointerPosition {
  /** Horizontal position in CSS pixels, relative to the field's top-left corner. */
  x: number
  /** Vertical position in CSS pixels, relative to the field's top-left corner. */
  y: number
}

export interface ISparklePointer {
  /** Eased horizontal position the particles actually react to; lags the raw pointer. */
  x: number
  /** Eased vertical position the particles actually react to; lags the raw pointer. */
  y: number
  /** 0–1 ramp of how strongly the pointer currently pulls on the field; eases to 0 once it leaves. */
  intensity: number
}

export interface ISparkleParticle {
  /** Horizontal position in CSS pixels within the field. */
  x: number
  /** Vertical position in CSS pixels within the field. */
  y: number
  /** Resting glyph edge length in CSS pixels, before any pointer boost. */
  size: number
  /** Resting alpha, before twinkle and pointer boost. */
  opacity: number
  /** Current position in the twinkle cycle, in radians. */
  twinklePhase: number
  /** Radians per millisecond the twinkle phase advances. */
  twinkleSpeed: number
  /** Horizontal drift in CSS pixels per millisecond. */
  velocityX: number
  /** Vertical drift in CSS pixels per millisecond. */
  velocityY: number
  /** Current glyph rotation in radians. */
  rotation: number
  /** Radians per millisecond the glyph rotates. */
  rotationSpeed: number
  /** 0–1 parallax weight; larger particles read as nearer and are displaced further by the pointer. */
  depth: number
}

export interface ISparkleInfluence {
  /** 0–1 strength of the pointer on one particle, already scaled by the pointer's intensity ramp. */
  strength: number
  /** Horizontal unit vector pointing away from the pointer; 0 when there is no influence. */
  directionX: number
  /** Vertical unit vector pointing away from the pointer; 0 when there is no influence. */
  directionY: number
}

export interface ISparkleViewport {
  /** Field width in CSS pixels. */
  width: number
  /** Field height in CSS pixels. */
  height: number
  /** Ratio between backing-store pixels and CSS pixels, already capped by the active tier. */
  devicePixelRatio: number
}

export interface ISparkleTierConfig {
  /** Hard ceiling on particles, whatever the field area suggests. */
  maxParticleCount: number
  /** Highest device pixel ratio the backing store may use at this tier. */
  maxDevicePixelRatio: number
  /** Whether sprites are baked with the brand-coloured glow. */
  hasGlow: boolean
  /** Whether this tier keeps a running frame loop rather than a single painted frame. */
  isAnimated: boolean
}

export interface ISparkleFieldConfig {
  /** Field area in CSS pixels² that warrants one particle. */
  areaPerParticle: number
  /** Floor on particle count so narrow viewports still read as a field. */
  minParticleCount: number
  /** Smallest resting glyph edge length in CSS pixels. */
  minSize: number
  /** Largest resting glyph edge length in CSS pixels. */
  maxSize: number
  /** Dimmest resting alpha. */
  minOpacity: number
  /** Brightest resting alpha. */
  maxOpacity: number
  /** Slowest drift in CSS pixels per millisecond. */
  minDriftSpeed: number
  /** Fastest drift in CSS pixels per millisecond. */
  maxDriftSpeed: number
  /** Slowest twinkle in radians per millisecond. */
  minTwinkleSpeed: number
  /** Fastest twinkle in radians per millisecond. */
  maxTwinkleSpeed: number
  /** Slowest rotation in radians per millisecond. */
  minRotationSpeed: number
  /** Fastest rotation in radians per millisecond. */
  maxRotationSpeed: number
  /** Distance in CSS pixels beyond which the pointer no longer affects a particle. */
  influenceRadius: number
  /** Extra size, as a multiple of the resting size, applied at full influence. */
  sizeBoost: number
  /** Extra alpha, as a multiple of the resting alpha, applied at full influence. */
  opacityBoost: number
  /** Largest outward push in CSS pixels applied at full influence and full depth. */
  displacement: number
  /** Fraction of the remaining distance the eased pointer covers per frame. */
  pointerLerp: number
  /** Upper bound in milliseconds on one simulation step, so a backgrounded tab cannot teleport the field. */
  maxFrameDelta: number
  /** How much of the resting alpha the twinkle modulates, 0–1. */
  twinkleDepth: number
}

export interface ISparkleGovernorThresholds {
  /** Number of frames sampled before any tier decision is taken. */
  windowSize: number
  /** p90 frame duration in milliseconds above which the tier steps down. */
  degradedFrameMs: number
  /** p90 frame duration in milliseconds above which the lowest animated tier gives up entirely. */
  criticalFrameMs: number
  /** p90 frame duration in milliseconds below which an upgrade may be considered. */
  healthyFrameMs: number
  /** Frames that must pass since the last tier change before an upgrade is allowed. */
  upgradeAfterFrames: number
}

export interface ISparkleGovernorState {
  /** Tier currently in force. */
  tier: ESparkleTier
  /** Most recent frame durations in milliseconds, oldest first, capped at the window size. */
  frameDurations: number[]
  /** Frames observed since the last tier change; gates upgrades. */
  framesSinceChange: number
  /** Whether the single upgrade permitted for the field's lifetime has been spent. */
  hasUpgraded: boolean
}

export interface ISparkleDeviceSignals {
  /** Logical CPU count, or `undefined` where the browser withholds it. */
  hardwareConcurrency?: number
  /** Approximate device RAM in gigabytes, or `undefined` where the browser withholds it. */
  deviceMemory?: number
  /** Physical device pixel ratio, before any tier cap. */
  devicePixelRatio: number
  /** Whether the primary input is coarse, which correlates with mobile-class GPUs. */
  isCoarsePointer: boolean
}

export interface ISparkleSpriteAtlas<TImage = CanvasImageSource> {
  /** Rasterised frames indexed as `[sizeBucket][rotationStep]`. */
  frames: TImage[][]
  /** CSS-pixel glyph size each bucket was rasterised for, ascending. */
  bucketSizes: number[]
  /** Sprite box size as a multiple of the glyph size; the drawn box is larger than the glyph. */
  paddingFactor: number
}

export interface ISparkleDrawContext<TImage = CanvasImageSource> {
  /** Alpha applied to the next draw call. */
  globalAlpha: number
  /** Wipes a rectangle of the backing store, in device pixels. */
  clearRect(x: number, y: number, width: number, height: number): void
  /** Blits one sprite frame, in device pixels. */
  drawImage(image: TImage, dx: number, dy: number, dWidth: number, dHeight: number): void
}

export interface ISparkleRasterContext {
  /** Colour the glyph body is filled with. */
  fillStyle: string | CanvasGradient | CanvasPattern
  /** Blur radius of the baked glow, in device pixels. */
  shadowBlur: number
  /** Colour of the baked glow. */
  shadowColor: string
  /** Pushes the transform and style stack before one glyph is baked. */
  save(): void
  /** Pops the transform and style stack after one glyph is baked. */
  restore(): void
  /** Moves the origin, in device pixels. */
  translate(x: number, y: number): void
  /** Rotates around the current origin, in radians. */
  rotate(angle: number): void
  /** Scales the glyph's viewBox units up to device pixels. */
  scale(x: number, y: number): void
  /** Fills the glyph outline. */
  fill(path: Path2D): void
}

export interface ISpriteSurface {
  /** Surface handed to `drawImage` once the glyph is baked into it. */
  image: CanvasImageSource
  /** Context used exactly once, to bake the glyph. */
  context: ISparkleRasterContext
}

/** Allocates a square raster surface of `size` device pixels, or returns `null` when 2D is unavailable. */
export type TSpriteSurfaceFactory = (size: number) => ISpriteSurface | null
```

- [ ] **Step 4: Create the constants module**

Create `src/constants/home.constants.ts`:

```ts
import {
  ESparkleTier,
  ISparkleFieldConfig,
  ISparkleGovernorThresholds,
  ISparkleTierConfig,
} from '@/home-sections/Home/types/home.type'

/** Outline of the four-point sparkle glyph in a 24×24 viewBox, shared by the SVG icon and the canvas sprites. */
export const SPARKLE_GLYPH_PATH = 'M12 0Q13 11 24 12 13 13 12 24 11 13 0 12 11 11 12 0Z'

/** Edge length of the viewBox `SPARKLE_GLYPH_PATH` is authored in. */
export const SPARKLE_GLYPH_VIEWBOX = 24

/** Rotation frames baked per size bucket; the glyph has four-fold symmetry, so they span a quarter turn. */
export const SPARKLE_ROTATION_STEPS = 8

/** CSS-pixel glyph sizes the atlas rasterises, ascending; intermediate sizes are scaled from the nearest. */
export const SPARKLE_SPRITE_BUCKETS = [4, 7, 11, 16]

/** Sprite box size as a multiple of the glyph size, wide enough that a rotated glyph never clips. */
export const SPARKLE_SPRITE_PADDING = 1.5

/** Wider sprite box used when the glow is baked in, so the blur is not cut off at the edges. */
export const SPARKLE_SPRITE_GLOW_PADDING = 2.2

/** Glow blur radius as a multiple of the glyph size. */
export const SPARKLE_GLOW_BLUR_RATIO = 0.35

/** Logical CPU count at or below which the field starts on the lowest animated tier. */
export const SPARKLE_LOW_TIER_CORES = 2

/** Device memory in gigabytes at or below which the field starts on the lowest animated tier. */
export const SPARKLE_LOW_TIER_MEMORY_GB = 2

/** Logical CPU count at or below which the field starts on the middle tier. */
export const SPARKLE_MEDIUM_TIER_CORES = 4

/** Device memory in gigabytes at or below which the field starts on the middle tier. */
export const SPARKLE_MEDIUM_TIER_MEMORY_GB = 4

/** Device pixel ratio above which the field starts on the middle tier, since fill cost scales with it. */
export const SPARKLE_MEDIUM_TIER_DPR = 2

/** Per-tier budgets, ordered from richest to the terminal still frame. */
export const SPARKLE_TIERS: Record<ESparkleTier, ISparkleTierConfig> = {
  [ESparkleTier.high]: {
    maxParticleCount: 220,
    maxDevicePixelRatio: 2,
    hasGlow: true,
    isAnimated: true,
  },
  [ESparkleTier.medium]: {
    maxParticleCount: 120,
    maxDevicePixelRatio: 1.5,
    hasGlow: true,
    isAnimated: true,
  },
  [ESparkleTier.low]: {
    maxParticleCount: 60,
    maxDevicePixelRatio: 1,
    hasGlow: false,
    isAnimated: true,
  },
  [ESparkleTier.static]: {
    maxParticleCount: 60,
    maxDevicePixelRatio: 1,
    hasGlow: false,
    isAnimated: false,
  },
}

/** Motion and interaction tuning for the field; no magic numbers belong in the helpers. */
export const SPARKLE_FIELD_CONFIG: ISparkleFieldConfig = {
  areaPerParticle: 9000,
  minParticleCount: 24,
  minSize: 4,
  maxSize: 16,
  minOpacity: 0.18,
  maxOpacity: 0.7,
  minDriftSpeed: 0.002,
  maxDriftSpeed: 0.012,
  minTwinkleSpeed: 0.0006,
  maxTwinkleSpeed: 0.0022,
  minRotationSpeed: 0.00008,
  maxRotationSpeed: 0.00035,
  influenceRadius: 160,
  sizeBoost: 1.1,
  opacityBoost: 1.4,
  displacement: 18,
  pointerLerp: 0.12,
  maxFrameDelta: 50,
  twinkleDepth: 0.55,
}

/** Frame-time budgets the governor grades each sampling window against. */
export const SPARKLE_GOVERNOR_THRESHOLDS: ISparkleGovernorThresholds = {
  windowSize: 60,
  degradedFrameMs: 20,
  criticalFrameMs: 24,
  healthyFrameMs: 11,
  upgradeAfterFrames: 240,
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/constants/home.constants.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 6: Point the existing Sparkle icon at the shared glyph**

Modify `src/home-sections/Home/components/Sparkle/Sparkle.tsx`. Add the import and replace the inline `d` attribute so the path has exactly one definition:

```tsx
import styles from './Sparkle.module.css'

import { SPARKLE_GLYPH_PATH, SPARKLE_GLYPH_VIEWBOX } from '@/constants/home.constants'

export const Sparkle = () => {
  return (
    <svg
      viewBox={`0 0 ${SPARKLE_GLYPH_VIEWBOX} ${SPARKLE_GLYPH_VIEWBOX}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-testid="home-sparkle"
      className={styles.sparkle}
    >
      <path fill="currentColor" d={SPARKLE_GLYPH_PATH} />
    </svg>
  )
}
```

- [ ] **Step 7: Validate**

Run each and expect a clean result:

```bash
node_modules/.bin/tsc --pretty --noEmit
node_modules/.bin/eslint .
node_modules/.bin/prettier --check .
node_modules/.bin/vitest run
```

- [ ] **Step 8: Commit**

```bash
git add src/home-sections/Home/types/home.type.ts src/constants/home.constants.ts src/constants/home.constants.test.ts src/home-sections/Home/components/Sparkle/Sparkle.tsx
git commit -m "feat: added sparkle field types, constants and shared glyph path"
```

---

### Task 2: Pure particle maths

**Files:**

- Create: `src/home-sections/Home/helpers/sparkleField.ts`
- Create: `src/home-sections/Home/helpers/sparkleField.test.ts`

**Interfaces:**

- Consumes: `ISparkleParticle`, `IPointerPosition`, `ISparklePointer`, `ISparkleInfluence`, `ISparkleFieldConfig`, `ISparkleTierConfig` from Task 1.
- Produces:
  - `resolveSparkleParticleCount(width: number, height: number, tier: ISparkleTierConfig, config: ISparkleFieldConfig): number`
  - `createSparkleParticle(width: number, height: number, config: ISparkleFieldConfig, random?: () => number): ISparkleParticle`
  - `createSparkleParticles(width: number, height: number, count: number, config: ISparkleFieldConfig, random?: () => number): ISparkleParticle[]`
  - `refitSparkleParticles(particles: ISparkleParticle[], previous: { width: number; height: number }, width: number, height: number, count: number, config: ISparkleFieldConfig, random?: () => number): void`
  - `clampSparkleFrameDelta(deltaMs: number, maxFrameDelta: number): number`
  - `advanceSparkleParticle(particle: ISparkleParticle, deltaMs: number, width: number, height: number, config: ISparkleFieldConfig): void`
  - `advanceSparklePointer(pointer: ISparklePointer, target: IPointerPosition | null, lerp: number): void`
  - `readSparkleInfluence(particle: ISparkleParticle, pointer: ISparklePointer, influenceRadius: number, out: ISparkleInfluence): void`
  - `createSparklePointer(): ISparklePointer`
  - `createSparkleInfluence(): ISparkleInfluence`

- [ ] **Step 1: Write the failing test**

Create `src/home-sections/Home/helpers/sparkleField.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { SPARKLE_FIELD_CONFIG, SPARKLE_TIERS } from '@/constants/home.constants'
import {
  advanceSparkleParticle,
  advanceSparklePointer,
  clampSparkleFrameDelta,
  createSparkleInfluence,
  createSparkleParticle,
  createSparkleParticles,
  createSparklePointer,
  readSparkleInfluence,
  refitSparkleParticles,
  resolveSparkleParticleCount,
} from '@/home-sections/Home/helpers/sparkleField'
import { ESparkleTier } from '@/home-sections/Home/types/home.type'

/** Deterministic stand-in for `Math.random`, cycling through fixed draws so particles are reproducible. */
const createSequenceRandom = (values: number[]): (() => number) => {
  let index = 0

  return () => {
    const value = values[index % values.length]
    index += 1

    return value
  }
}

describe('resolveSparkleParticleCount', () => {
  it('derives the count from the field area', () => {
    const count = resolveSparkleParticleCount(
      1200,
      750,
      SPARKLE_TIERS[ESparkleTier.high],
      SPARKLE_FIELD_CONFIG,
    )

    expect(count).toBe(Math.round((1200 * 750) / SPARKLE_FIELD_CONFIG.areaPerParticle))
  })

  it('never falls below the floor on a narrow viewport', () => {
    const count = resolveSparkleParticleCount(
      320,
      400,
      SPARKLE_TIERS[ESparkleTier.high],
      SPARKLE_FIELD_CONFIG,
    )

    expect(count).toBe(SPARKLE_FIELD_CONFIG.minParticleCount)
  })

  it('never exceeds the tier ceiling on a huge viewport', () => {
    const count = resolveSparkleParticleCount(
      3840,
      2160,
      SPARKLE_TIERS[ESparkleTier.low],
      SPARKLE_FIELD_CONFIG,
    )

    expect(count).toBe(SPARKLE_TIERS[ESparkleTier.low].maxParticleCount)
  })

  it('returns nothing for a collapsed container', () => {
    expect(
      resolveSparkleParticleCount(0, 800, SPARKLE_TIERS[ESparkleTier.high], SPARKLE_FIELD_CONFIG),
    ).toBe(0)
    expect(
      resolveSparkleParticleCount(800, 0, SPARKLE_TIERS[ESparkleTier.high], SPARKLE_FIELD_CONFIG),
    ).toBe(0)
  })
})

describe('createSparkleParticles', () => {
  it('places every particle inside the field and inside the configured ranges', () => {
    const particles = createSparkleParticles(600, 400, 40, SPARKLE_FIELD_CONFIG)

    expect(particles).toHaveLength(40)

    for (const particle of particles) {
      expect(particle.x).toBeGreaterThanOrEqual(0)
      expect(particle.x).toBeLessThanOrEqual(600)
      expect(particle.y).toBeGreaterThanOrEqual(0)
      expect(particle.y).toBeLessThanOrEqual(400)
      expect(particle.size).toBeGreaterThanOrEqual(SPARKLE_FIELD_CONFIG.minSize)
      expect(particle.size).toBeLessThanOrEqual(SPARKLE_FIELD_CONFIG.maxSize)
      expect(particle.opacity).toBeGreaterThanOrEqual(SPARKLE_FIELD_CONFIG.minOpacity)
      expect(particle.opacity).toBeLessThanOrEqual(SPARKLE_FIELD_CONFIG.maxOpacity)
      expect(particle.depth).toBeGreaterThanOrEqual(0)
      expect(particle.depth).toBeLessThanOrEqual(1)
    }
  })

  it('is reproducible for a given random source', () => {
    const first = createSparkleParticles(
      600,
      400,
      5,
      SPARKLE_FIELD_CONFIG,
      createSequenceRandom([0.1, 0.4, 0.7, 0.2, 0.9, 0.5]),
    )
    const second = createSparkleParticles(
      600,
      400,
      5,
      SPARKLE_FIELD_CONFIG,
      createSequenceRandom([0.1, 0.4, 0.7, 0.2, 0.9, 0.5]),
    )

    expect(first).toEqual(second)
  })

  it('gives the largest particles the most depth', () => {
    const smallest = createSparkleParticle(
      600,
      400,
      SPARKLE_FIELD_CONFIG,
      createSequenceRandom([0]),
    )
    const largest = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG, createSequenceRandom([1]))

    expect(smallest.depth).toBeCloseTo(0)
    expect(largest.depth).toBeCloseTo(1)
  })

  it('returns nothing when the count is not positive', () => {
    expect(createSparkleParticles(600, 400, 0, SPARKLE_FIELD_CONFIG)).toEqual([])
    expect(createSparkleParticles(600, 400, -5, SPARKLE_FIELD_CONFIG)).toEqual([])
  })
})

describe('refitSparkleParticles', () => {
  it('rescales positions instead of regenerating the field', () => {
    const particles = createSparkleParticles(600, 400, 4, SPARKLE_FIELD_CONFIG)
    const originalSizes = particles.map((particle) => particle.size)
    const originalX = particles.map((particle) => particle.x)

    refitSparkleParticles(
      particles,
      { width: 600, height: 400 },
      1200,
      400,
      4,
      SPARKLE_FIELD_CONFIG,
    )

    expect(particles.map((particle) => particle.size)).toEqual(originalSizes)

    particles.forEach((particle, index) => {
      expect(particle.x).toBeCloseTo(originalX[index] * 2)
    })
  })

  it('grows and shrinks the population to the requested count', () => {
    const particles = createSparkleParticles(600, 400, 4, SPARKLE_FIELD_CONFIG)

    refitSparkleParticles(particles, { width: 600, height: 400 }, 600, 400, 9, SPARKLE_FIELD_CONFIG)
    expect(particles).toHaveLength(9)

    refitSparkleParticles(particles, { width: 600, height: 400 }, 600, 400, 2, SPARKLE_FIELD_CONFIG)
    expect(particles).toHaveLength(2)
  })

  it('survives a previous size of zero without producing NaN', () => {
    const particles = createSparkleParticles(600, 400, 3, SPARKLE_FIELD_CONFIG)

    refitSparkleParticles(particles, { width: 0, height: 0 }, 600, 400, 3, SPARKLE_FIELD_CONFIG)

    for (const particle of particles) {
      expect(Number.isFinite(particle.x)).toBe(true)
      expect(Number.isFinite(particle.y)).toBe(true)
    }
  })
})

describe('clampSparkleFrameDelta', () => {
  it('passes a normal frame through', () => {
    expect(clampSparkleFrameDelta(16.7, 50)).toBeCloseTo(16.7)
  })

  it('caps the jump produced by a backgrounded tab', () => {
    expect(clampSparkleFrameDelta(9000, 50)).toBe(50)
  })

  it('discards a non-positive or non-finite delta', () => {
    expect(clampSparkleFrameDelta(0, 50)).toBe(0)
    expect(clampSparkleFrameDelta(-16, 50)).toBe(0)
    expect(clampSparkleFrameDelta(Number.NaN, 50)).toBe(0)
    expect(clampSparkleFrameDelta(Number.POSITIVE_INFINITY, 50)).toBe(50)
  })
})

describe('advanceSparkleParticle', () => {
  it('moves a particle along its velocity', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.x = 100
    particle.y = 100
    particle.velocityX = 0.01
    particle.velocityY = 0.02

    advanceSparkleParticle(particle, 100, 600, 400, SPARKLE_FIELD_CONFIG)

    expect(particle.x).toBeCloseTo(101)
    expect(particle.y).toBeCloseTo(102)
  })

  it('wraps a particle that drifts off the right edge back to the left', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.x = 599
    particle.velocityX = 1
    particle.velocityY = 0

    advanceSparkleParticle(particle, 100, 600, 400, SPARKLE_FIELD_CONFIG)

    expect(particle.x).toBeLessThan(600)
    expect(particle.x).toBeGreaterThanOrEqual(-SPARKLE_FIELD_CONFIG.maxSize)
  })

  it('wraps a particle that drifts off the top edge back to the bottom', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.y = 1
    particle.velocityX = 0
    particle.velocityY = -1

    advanceSparkleParticle(particle, 100, 600, 400, SPARKLE_FIELD_CONFIG)

    expect(particle.y).toBeGreaterThan(300)
  })

  it('does not allocate a replacement particle', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const before = particle

    advanceSparkleParticle(particle, 16, 600, 400, SPARKLE_FIELD_CONFIG)

    expect(particle).toBe(before)
  })
})

describe('advanceSparklePointer', () => {
  it('snaps to the first target rather than sweeping in from the origin', () => {
    const pointer = createSparklePointer()

    advanceSparklePointer(pointer, { x: 400, y: 300 }, 0.12)

    expect(pointer.x).toBe(400)
    expect(pointer.y).toBe(300)
    expect(pointer.intensity).toBeGreaterThan(0)
  })

  it('eases toward a moving target instead of jumping', () => {
    const pointer = createSparklePointer()

    advanceSparklePointer(pointer, { x: 0, y: 0 }, 0.5)
    advanceSparklePointer(pointer, { x: 100, y: 0 }, 0.5)

    expect(pointer.x).toBeGreaterThan(0)
    expect(pointer.x).toBeLessThan(100)
  })

  it('relaxes the intensity back toward zero once the pointer leaves', () => {
    const pointer = createSparklePointer()

    for (let frame = 0; frame < 60; frame += 1) {
      advanceSparklePointer(pointer, { x: 100, y: 100 }, 0.5)
    }

    const settled = pointer.intensity

    advanceSparklePointer(pointer, null, 0.5)

    expect(pointer.intensity).toBeLessThan(settled)
    expect(pointer.x).toBeCloseTo(100)
  })
})

describe('readSparkleInfluence', () => {
  it('reports nothing while the pointer has no intensity', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    particle.x = 100
    particle.y = 100
    pointer.x = 100
    pointer.y = 100

    readSparkleInfluence(particle, pointer, 160, influence)

    expect(influence.strength).toBe(0)
  })

  it('reports nothing beyond the influence radius', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    particle.x = 400
    particle.y = 0
    pointer.x = 0
    pointer.y = 0
    pointer.intensity = 1

    readSparkleInfluence(particle, pointer, 160, influence)

    expect(influence.strength).toBe(0)
    expect(influence.directionX).toBe(0)
    expect(influence.directionY).toBe(0)
  })

  it('falls off monotonically as the particle moves away', () => {
    const near = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const far = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    pointer.x = 0
    pointer.y = 0
    pointer.intensity = 1

    near.x = 20
    near.y = 0
    far.x = 120
    far.y = 0

    readSparkleInfluence(near, pointer, 160, influence)
    const nearStrength = influence.strength

    readSparkleInfluence(far, pointer, 160, influence)

    expect(nearStrength).toBeGreaterThan(influence.strength)
    expect(influence.strength).toBeGreaterThan(0)
  })

  it('points directly away from the pointer', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    pointer.x = 0
    pointer.y = 0
    pointer.intensity = 1
    particle.x = 30
    particle.y = 0

    readSparkleInfluence(particle, pointer, 160, influence)

    expect(influence.directionX).toBeCloseTo(1)
    expect(influence.directionY).toBeCloseTo(0)
  })

  it('scales with the pointer intensity ramp', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    pointer.x = 0
    pointer.y = 0
    particle.x = 20
    particle.y = 0

    pointer.intensity = 1
    readSparkleInfluence(particle, pointer, 160, influence)
    const full = influence.strength

    pointer.intensity = 0.25
    readSparkleInfluence(particle, pointer, 160, influence)

    expect(influence.strength).toBeCloseTo(full * 0.25)
  })

  it('survives a particle sitting exactly on the pointer', () => {
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()
    const influence = createSparkleInfluence()

    pointer.x = 50
    pointer.y = 50
    pointer.intensity = 1
    particle.x = 50
    particle.y = 50

    readSparkleInfluence(particle, pointer, 160, influence)

    expect(Number.isFinite(influence.directionX)).toBe(true)
    expect(Number.isFinite(influence.directionY)).toBe(true)
    expect(influence.strength).toBeCloseTo(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleField.test.ts`
Expected: FAIL — `Failed to resolve import "@/home-sections/Home/helpers/sparkleField"`.

- [ ] **Step 3: Write the implementation**

Create `src/home-sections/Home/helpers/sparkleField.ts`:

```ts
import {
  IPointerPosition,
  ISparkleFieldConfig,
  ISparkleInfluence,
  ISparkleParticle,
  ISparklePointer,
  ISparkleTierConfig,
} from '@/home-sections/Home/types/home.type'

/** Quarter turn in radians; the glyph's four-fold symmetry makes this a full visual rotation. */
const QUARTER_TURN = Math.PI / 2

/** Draws a value from an inclusive range using the supplied random source. */
const randomBetween = (random: () => number, min: number, max: number): number =>
  min + random() * (max - min)

/** Confines a value to 0–1 so alphas and ramps cannot overshoot. */
const clampUnit = (value: number): number => Math.min(Math.max(value, 0), 1)

/**
 * Wraps a coordinate around the field with a margin, so a glyph leaves one edge
 * and re-enters the opposite one without ever popping in mid-view.
 */
const wrapCoordinate = (value: number, limit: number, margin: number): number => {
  const span = limit + margin * 2

  if (span <= 0) {
    return value
  }

  return ((((value + margin) % span) + span) % span) - margin
}

/**
 * Derives how many particles a field of this size deserves, honouring both the
 * floor that keeps narrow viewports populated and the active tier's ceiling.
 */
export const resolveSparkleParticleCount = (
  width: number,
  height: number,
  tier: ISparkleTierConfig,
  config: ISparkleFieldConfig,
): number => {
  if (width <= 0 || height <= 0) {
    return 0
  }

  const fromArea = Math.round((width * height) / config.areaPerParticle)

  return Math.min(Math.max(fromArea, config.minParticleCount), tier.maxParticleCount)
}

/** Builds one particle with randomised placement, size, drift, twinkle and rotation. */
export const createSparkleParticle = (
  width: number,
  height: number,
  config: ISparkleFieldConfig,
  random: () => number = Math.random,
): ISparkleParticle => {
  const size = randomBetween(random, config.minSize, config.maxSize)
  const sizeSpan = config.maxSize - config.minSize
  const depth = sizeSpan > 0 ? clampUnit((size - config.minSize) / sizeSpan) : 0
  const driftAngle = random() * Math.PI * 2
  const driftSpeed = randomBetween(random, config.minDriftSpeed, config.maxDriftSpeed)

  return {
    x: random() * width,
    y: random() * height,
    size,
    opacity: randomBetween(random, config.minOpacity, config.maxOpacity),
    twinklePhase: random() * Math.PI * 2,
    twinkleSpeed: randomBetween(random, config.minTwinkleSpeed, config.maxTwinkleSpeed),
    velocityX: Math.cos(driftAngle) * driftSpeed,
    velocityY: Math.sin(driftAngle) * driftSpeed,
    rotation: random() * QUARTER_TURN,
    rotationSpeed: randomBetween(random, config.minRotationSpeed, config.maxRotationSpeed),
    depth,
  }
}

/** Builds a whole field in one go; the population is allocated exactly once. */
export const createSparkleParticles = (
  width: number,
  height: number,
  count: number,
  config: ISparkleFieldConfig,
  random: () => number = Math.random,
): ISparkleParticle[] => {
  const particles: ISparkleParticle[] = []

  for (let index = 0; index < count; index += 1) {
    particles.push(createSparkleParticle(width, height, config, random))
  }

  return particles
}

/**
 * Reshapes an existing field for a new viewport: positions are rescaled so the
 * composition survives a resize, and only the surplus or shortfall is trimmed
 * or generated.
 */
export const refitSparkleParticles = (
  particles: ISparkleParticle[],
  previous: { width: number; height: number },
  width: number,
  height: number,
  count: number,
  config: ISparkleFieldConfig,
  random: () => number = Math.random,
): void => {
  const scaleX = previous.width > 0 ? width / previous.width : 1
  const scaleY = previous.height > 0 ? height / previous.height : 1

  for (const particle of particles) {
    particle.x *= scaleX
    particle.y *= scaleY
  }

  const target = Math.max(count, 0)

  if (particles.length > target) {
    particles.length = target

    return
  }

  while (particles.length < target) {
    particles.push(createSparkleParticle(width, height, config, random))
  }
}

/** Caps a frame delta so a backgrounded tab cannot teleport the whole field on resume. */
export const clampSparkleFrameDelta = (deltaMs: number, maxFrameDelta: number): number => {
  if (Number.isNaN(deltaMs) || deltaMs <= 0) {
    return 0
  }

  return Math.min(deltaMs, maxFrameDelta)
}

/** Advances one particle in place; no allocation happens inside the frame loop. */
export const advanceSparkleParticle = (
  particle: ISparkleParticle,
  deltaMs: number,
  width: number,
  height: number,
  config: ISparkleFieldConfig,
): void => {
  particle.x = wrapCoordinate(particle.x + particle.velocityX * deltaMs, width, config.maxSize)
  particle.y = wrapCoordinate(particle.y + particle.velocityY * deltaMs, height, config.maxSize)
  particle.rotation += particle.rotationSpeed * deltaMs
  particle.twinklePhase += particle.twinkleSpeed * deltaMs
}

/** Allocates the single pointer record the loop reuses for its whole lifetime. */
export const createSparklePointer = (): ISparklePointer => ({ x: 0, y: 0, intensity: 0 })

/** Allocates the single influence record the renderer reuses for every particle. */
export const createSparkleInfluence = (): ISparkleInfluence => ({
  strength: 0,
  directionX: 0,
  directionY: 0,
})

/**
 * Eases the pointer toward its latest raw position and ramps its intensity, so
 * both arrival and departure are gradual rather than snapping. A first sighting
 * jumps straight to the target to avoid a sweep in from the field's origin.
 */
export const advanceSparklePointer = (
  pointer: ISparklePointer,
  target: IPointerPosition | null,
  lerp: number,
): void => {
  const factor = clampUnit(lerp)

  if (target) {
    if (pointer.intensity <= 0) {
      pointer.x = target.x
      pointer.y = target.y
    } else {
      pointer.x += (target.x - pointer.x) * factor
      pointer.y += (target.y - pointer.y) * factor
    }
  }

  pointer.intensity += ((target ? 1 : 0) - pointer.intensity) * factor
}

/**
 * Measures how strongly the pointer pulls on one particle and which way it is
 * pushed, writing into a reused record so the hot loop stays allocation-free.
 */
export const readSparkleInfluence = (
  particle: ISparkleParticle,
  pointer: ISparklePointer,
  influenceRadius: number,
  out: ISparkleInfluence,
): void => {
  out.strength = 0
  out.directionX = 0
  out.directionY = 0

  if (pointer.intensity <= 0 || influenceRadius <= 0) {
    return
  }

  const deltaX = particle.x - pointer.x
  const deltaY = particle.y - pointer.y
  const distance = Math.hypot(deltaX, deltaY)

  if (distance >= influenceRadius) {
    return
  }

  const falloff = 1 - distance / influenceRadius

  out.strength = falloff * falloff * pointer.intensity

  if (distance > 0) {
    out.directionX = deltaX / distance
    out.directionY = deltaY / distance
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleField.test.ts`
Expected: PASS — 24 tests.

- [ ] **Step 5: Validate and commit**

```bash
node_modules/.bin/tsc --pretty --noEmit
node_modules/.bin/eslint .
node_modules/.bin/prettier --check .
git add src/home-sections/Home/helpers/sparkleField.ts src/home-sections/Home/helpers/sparkleField.test.ts
git commit -m "feat: added pure sparkle particle maths"
```

---

### Task 3: Quality governor

**Files:**

- Create: `src/home-sections/Home/helpers/sparkleGovernor.ts`
- Create: `src/home-sections/Home/helpers/sparkleGovernor.test.ts`

**Interfaces:**

- Consumes: `ESparkleTier`, `ISparkleGovernorState`, `ISparkleGovernorThresholds`, `ISparkleDeviceSignals` from Task 1.
- Produces:
  - `resolveInitialSparkleTier(signals: ISparkleDeviceSignals): ESparkleTier`
  - `createSparkleGovernorState(tier: ESparkleTier): ISparkleGovernorState`
  - `recordSparkleFrame(state: ISparkleGovernorState, durationMs: number, thresholds: ISparkleGovernorThresholds): ESparkleTier | null`

`recordSparkleFrame` returns the new tier only on the frame where it changes, and `null` otherwise.

- [ ] **Step 1: Write the failing test**

Create `src/home-sections/Home/helpers/sparkleGovernor.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { SPARKLE_GOVERNOR_THRESHOLDS } from '@/constants/home.constants'
import {
  createSparkleGovernorState,
  recordSparkleFrame,
  resolveInitialSparkleTier,
} from '@/home-sections/Home/helpers/sparkleGovernor'
import { ESparkleTier, ISparkleGovernorState } from '@/home-sections/Home/types/home.type'

/** Feeds a whole sampling window of identical frames and returns the last tier decision. */
const feedWindow = (
  state: ISparkleGovernorState,
  durationMs: number,
  frames: number = SPARKLE_GOVERNOR_THRESHOLDS.windowSize,
): ESparkleTier | null => {
  let decision: ESparkleTier | null = null

  for (let frame = 0; frame < frames; frame += 1) {
    const result = recordSparkleFrame(state, durationMs, SPARKLE_GOVERNOR_THRESHOLDS)

    if (result) {
      decision = result
    }
  }

  return decision
}

describe('resolveInitialSparkleTier', () => {
  it('starts a capable desktop at the richest tier', () => {
    expect(
      resolveInitialSparkleTier({
        hardwareConcurrency: 12,
        deviceMemory: 16,
        devicePixelRatio: 2,
        isCoarsePointer: false,
      }),
    ).toBe(ESparkleTier.high)
  })

  it('starts a two-core machine at the lowest animated tier', () => {
    expect(
      resolveInitialSparkleTier({
        hardwareConcurrency: 2,
        deviceMemory: 8,
        devicePixelRatio: 1,
        isCoarsePointer: false,
      }),
    ).toBe(ESparkleTier.low)
  })

  it('starts a memory-starved machine at the lowest animated tier', () => {
    expect(
      resolveInitialSparkleTier({
        hardwareConcurrency: 8,
        deviceMemory: 2,
        devicePixelRatio: 1,
        isCoarsePointer: false,
      }),
    ).toBe(ESparkleTier.low)
  })

  it('starts a touch device at the middle tier', () => {
    expect(
      resolveInitialSparkleTier({
        hardwareConcurrency: 8,
        deviceMemory: 8,
        devicePixelRatio: 2,
        isCoarsePointer: true,
      }),
    ).toBe(ESparkleTier.medium)
  })

  it('starts a very dense display at the middle tier', () => {
    expect(
      resolveInitialSparkleTier({
        hardwareConcurrency: 8,
        deviceMemory: 8,
        devicePixelRatio: 3,
        isCoarsePointer: false,
      }),
    ).toBe(ESparkleTier.medium)
  })

  it('ignores signals the browser withholds rather than assuming the worst', () => {
    expect(resolveInitialSparkleTier({ devicePixelRatio: 1, isCoarsePointer: false })).toBe(
      ESparkleTier.high,
    )
  })
})

describe('recordSparkleFrame', () => {
  it('holds its tier while frames stay healthy', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)

    expect(feedWindow(state, 8)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.high)
  })

  it('withholds any decision until a full window has been sampled', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)

    expect(feedWindow(state, 40, SPARKLE_GOVERNOR_THRESHOLDS.windowSize - 1)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.high)
  })

  it('steps down once a window comes in over the degraded budget', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)

    expect(feedWindow(state, 30)).toBe(ESparkleTier.medium)
    expect(state.tier).toBe(ESparkleTier.medium)
  })

  it('steps down again on a second bad window', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)

    feedWindow(state, 22)
    expect(feedWindow(state, 22)).toBe(ESparkleTier.low)
    expect(state.tier).toBe(ESparkleTier.low)
  })

  it('keeps the lowest animated tier while frames are merely degraded', () => {
    const state = createSparkleGovernorState(ESparkleTier.low)

    expect(feedWindow(state, 22)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.low)
  })

  it('gives up on animation when the lowest tier still overruns critically', () => {
    const state = createSparkleGovernorState(ESparkleTier.low)

    expect(feedWindow(state, 40)).toBe(ESparkleTier.static)
    expect(state.tier).toBe(ESparkleTier.static)
  })

  it('treats the still frame as terminal', () => {
    const state = createSparkleGovernorState(ESparkleTier.static)

    expect(feedWindow(state, 4)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.static)
    expect(state.frameDurations).toHaveLength(0)
  })

  it('refuses to upgrade before the settling period has elapsed', () => {
    const state = createSparkleGovernorState(ESparkleTier.medium)

    expect(feedWindow(state, 5)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.medium)
  })

  it('upgrades once healthy frames are sustained', () => {
    const state = createSparkleGovernorState(ESparkleTier.medium)

    expect(feedWindow(state, 5, SPARKLE_GOVERNOR_THRESHOLDS.upgradeAfterFrames)).toBe(
      ESparkleTier.high,
    )
    expect(state.tier).toBe(ESparkleTier.high)
  })

  it('never upgrades twice, however good the frames get', () => {
    const state = createSparkleGovernorState(ESparkleTier.low)

    expect(feedWindow(state, 5, SPARKLE_GOVERNOR_THRESHOLDS.upgradeAfterFrames)).toBe(
      ESparkleTier.medium,
    )
    expect(feedWindow(state, 5, SPARKLE_GOVERNOR_THRESHOLDS.upgradeAfterFrames * 2)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.medium)
  })

  it('settles instead of oscillating when frame times alternate', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)
    const observed: ESparkleTier[] = []

    for (let round = 0; round < 8; round += 1) {
      const degraded = feedWindow(state, 30)

      if (degraded) {
        observed.push(degraded)
      }

      const healthy = feedWindow(state, 5, SPARKLE_GOVERNOR_THRESHOLDS.upgradeAfterFrames)

      if (healthy) {
        observed.push(healthy)
      }
    }

    expect(observed.filter((tier) => tier === ESparkleTier.high)).toHaveLength(1)
    expect(state.tier).toBe(ESparkleTier.static)
  })

  it('ignores frames that carry no usable duration', () => {
    const state = createSparkleGovernorState(ESparkleTier.high)

    recordSparkleFrame(state, 0, SPARKLE_GOVERNOR_THRESHOLDS)
    recordSparkleFrame(state, -5, SPARKLE_GOVERNOR_THRESHOLDS)
    recordSparkleFrame(state, Number.NaN, SPARKLE_GOVERNOR_THRESHOLDS)

    expect(state.frameDurations).toHaveLength(0)
  })

  it('never lets the sampling window grow past its bound', () => {
    const state = createSparkleGovernorState(ESparkleTier.low)

    feedWindow(state, 12, SPARKLE_GOVERNOR_THRESHOLDS.windowSize * 3)

    expect(state.frameDurations.length).toBeLessThanOrEqual(SPARKLE_GOVERNOR_THRESHOLDS.windowSize)
  })

  it('starts a fresh window after every evaluation, not only after a tier change', () => {
    const state = createSparkleGovernorState(ESparkleTier.medium)

    expect(feedWindow(state, 5)).toBeNull()
    expect(state.tier).toBe(ESparkleTier.medium)
    expect(state.frameDurations).toHaveLength(0)
  })

  it('refuses to judge a new regime on leftovers from the previous window', () => {
    const state = createSparkleGovernorState(ESparkleTier.medium)

    feedWindow(state, 5)

    for (let frame = 0; frame < 10; frame += 1) {
      expect(recordSparkleFrame(state, 30, SPARKLE_GOVERNOR_THRESHOLDS)).toBeNull()
    }

    expect(state.tier).toBe(ESparkleTier.medium)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleGovernor.test.ts`
Expected: FAIL — `Failed to resolve import "@/home-sections/Home/helpers/sparkleGovernor"`.

- [ ] **Step 3: Write the implementation**

Create `src/home-sections/Home/helpers/sparkleGovernor.ts`:

```ts
import {
  SPARKLE_LOW_TIER_CORES,
  SPARKLE_LOW_TIER_MEMORY_GB,
  SPARKLE_MEDIUM_TIER_CORES,
  SPARKLE_MEDIUM_TIER_DPR,
  SPARKLE_MEDIUM_TIER_MEMORY_GB,
} from '@/constants/home.constants'
import {
  ESparkleTier,
  ISparkleDeviceSignals,
  ISparkleGovernorState,
  ISparkleGovernorThresholds,
} from '@/home-sections/Home/types/home.type'

/** Tier reached when the current one proves too expensive; the still frame has nowhere further to fall. */
const CHEAPER_TIER: Partial<Record<ESparkleTier, ESparkleTier>> = {
  [ESparkleTier.high]: ESparkleTier.medium,
  [ESparkleTier.medium]: ESparkleTier.low,
}

/** Tier reached when headroom is proven; the richest tier has nowhere further to climb. */
const RICHER_TIER: Partial<Record<ESparkleTier, ESparkleTier>> = {
  [ESparkleTier.low]: ESparkleTier.medium,
  [ESparkleTier.medium]: ESparkleTier.high,
}

/** Percentile of the sampled window, used instead of a mean so a few stalls are not averaged away. */
const readPercentile = (values: number[], ratio: number): number => {
  const sorted = [...values].sort((first, second) => first - second)
  const index = Math.min(sorted.length - 1, Math.floor(ratio * sorted.length))

  return sorted[index]
}

/** Commits a tier change and restarts the settling counter, so a new tier must prove itself before it can climb. */
const applyTier = (state: ISparkleGovernorState, tier: ESparkleTier): ESparkleTier => {
  state.tier = tier
  state.framesSinceChange = 0

  return tier
}

/**
 * Picks the tier the field starts on from what the device is willing to reveal.
 * Seeding is deliberately conservative, since the governor grants at most one
 * upgrade but will step down as often as needed. A withheld signal is skipped
 * rather than read as a low value.
 */
export const resolveInitialSparkleTier = (signals: ISparkleDeviceSignals): ESparkleTier => {
  const { hardwareConcurrency, deviceMemory, devicePixelRatio, isCoarsePointer } = signals

  if (
    (hardwareConcurrency !== undefined && hardwareConcurrency <= SPARKLE_LOW_TIER_CORES) ||
    (deviceMemory !== undefined && deviceMemory <= SPARKLE_LOW_TIER_MEMORY_GB)
  ) {
    return ESparkleTier.low
  }

  if (
    (hardwareConcurrency !== undefined && hardwareConcurrency <= SPARKLE_MEDIUM_TIER_CORES) ||
    (deviceMemory !== undefined && deviceMemory <= SPARKLE_MEDIUM_TIER_MEMORY_GB) ||
    isCoarsePointer ||
    devicePixelRatio > SPARKLE_MEDIUM_TIER_DPR
  ) {
    return ESparkleTier.medium
  }

  return ESparkleTier.high
}

/** Starts a governor on a seeded tier with an empty sampling window. */
export const createSparkleGovernorState = (tier: ESparkleTier): ISparkleGovernorState => ({
  tier,
  frameDurations: [],
  framesSinceChange: 0,
  hasUpgraded: false,
})

/**
 * Grades one frame and returns a new tier on the frame a change is warranted.
 *
 * Windows are non-overlapping: a decision consumes a full window and leaves the
 * next one empty, whatever the outcome. A sliding window would let a handful of
 * fresh frames flip a percentile still dominated by a superseded regime's
 * samples — at the lowest animated tier that could trip the irreversible drop to
 * the still frame off frames that were actually healthy. Emptying the window
 * also keeps the sort to once per window instead of once per frame, so the
 * measurement stays out of the budget it is measuring.
 */
export const recordSparkleFrame = (
  state: ISparkleGovernorState,
  durationMs: number,
  thresholds: ISparkleGovernorThresholds,
): ESparkleTier | null => {
  if (state.tier === ESparkleTier.static) {
    return null
  }

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return null
  }

  state.frameDurations.push(durationMs)
  state.framesSinceChange += 1

  if (state.frameDurations.length < thresholds.windowSize) {
    return null
  }

  const worstTypicalFrame = readPercentile(state.frameDurations, 0.9)

  state.frameDurations.length = 0

  if (state.tier === ESparkleTier.low && worstTypicalFrame > thresholds.criticalFrameMs) {
    return applyTier(state, ESparkleTier.static)
  }

  if (worstTypicalFrame > thresholds.degradedFrameMs) {
    const cheaper = CHEAPER_TIER[state.tier]

    return cheaper ? applyTier(state, cheaper) : null
  }

  if (
    !state.hasUpgraded &&
    worstTypicalFrame < thresholds.healthyFrameMs &&
    state.framesSinceChange >= thresholds.upgradeAfterFrames
  ) {
    const richer = RICHER_TIER[state.tier]

    if (richer) {
      state.hasUpgraded = true

      return applyTier(state, richer)
    }
  }

  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleGovernor.test.ts`
Expected: PASS — 21 tests.

- [ ] **Step 5: Validate and commit**

```bash
node_modules/.bin/tsc --pretty --noEmit
node_modules/.bin/eslint .
node_modules/.bin/prettier --check .
git add src/home-sections/Home/helpers/sparkleGovernor.ts src/home-sections/Home/helpers/sparkleGovernor.test.ts
git commit -m "feat: added adaptive sparkle quality governor"
```

---

### Task 4: Sprite atlas and renderer

**Files:**

- Create: `src/home-sections/Home/helpers/sparkleSprites.ts`
- Create: `src/home-sections/Home/helpers/sparkleSprites.test.ts`
- Create: `src/home-sections/Home/helpers/sparkleRenderer.ts`
- Create: `src/home-sections/Home/helpers/sparkleRenderer.test.ts`

**Interfaces:**

- Consumes: everything from Tasks 1–2.
- Produces:
  - `resolveSpriteBucketIndex(size: number, bucketSizes: number[]): number`
  - `resolveRotationIndex(rotation: number, steps: number): number`
  - `buildSparkleAtlas(createSurface: TSpriteSurfaceFactory, options: ISparkleAtlasOptions): ISparkleSpriteAtlas | null`
  - `ISparkleAtlasOptions` — `{ devicePixelRatio: number; color: string; hasGlow: boolean }`
  - `renderSparkleField<TImage>(context: ISparkleDrawContext<TImage>, atlas: ISparkleSpriteAtlas<TImage>, particles: ISparkleParticle[], pointer: ISparklePointer, view: ISparkleViewport, config: ISparkleFieldConfig, influence: ISparkleInfluence): void`

`buildSparkleAtlas` is browser-only and is exercised by the e2e suite, not by unit tests; the two pure resolvers it depends on are unit-tested here.

- [ ] **Step 1: Write the failing sprite test**

Create `src/home-sections/Home/helpers/sparkleSprites.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { SPARKLE_ROTATION_STEPS, SPARKLE_SPRITE_BUCKETS } from '@/constants/home.constants'
import {
  resolveRotationIndex,
  resolveSpriteBucketIndex,
} from '@/home-sections/Home/helpers/sparkleSprites'

describe('resolveSpriteBucketIndex', () => {
  it('picks the smallest bucket for a tiny glyph', () => {
    expect(resolveSpriteBucketIndex(1, SPARKLE_SPRITE_BUCKETS)).toBe(0)
  })

  it('picks the largest bucket for an oversized glyph', () => {
    expect(resolveSpriteBucketIndex(999, SPARKLE_SPRITE_BUCKETS)).toBe(
      SPARKLE_SPRITE_BUCKETS.length - 1,
    )
  })

  it('picks the nearest bucket for a size between two of them', () => {
    expect(resolveSpriteBucketIndex(4.4, [4, 7, 11, 16])).toBe(0)
    expect(resolveSpriteBucketIndex(6.4, [4, 7, 11, 16])).toBe(1)
    expect(resolveSpriteBucketIndex(13, [4, 7, 11, 16])).toBe(2)
  })

  it('falls back to the first index when there are no buckets', () => {
    expect(resolveSpriteBucketIndex(8, [])).toBe(0)
  })
})

describe('resolveRotationIndex', () => {
  it('maps a fresh glyph to the first frame', () => {
    expect(resolveRotationIndex(0, SPARKLE_ROTATION_STEPS)).toBe(0)
  })

  it('cycles back to the first frame after a quarter turn', () => {
    expect(resolveRotationIndex(Math.PI / 2, SPARKLE_ROTATION_STEPS)).toBe(0)
  })

  it('stays inside the frame range for a long-lived glyph', () => {
    for (let rotation = 0; rotation < 100; rotation += 0.37) {
      const index = resolveRotationIndex(rotation, SPARKLE_ROTATION_STEPS)

      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(SPARKLE_ROTATION_STEPS)
    }
  })

  it('stays inside the frame range for a negative rotation', () => {
    expect(resolveRotationIndex(-0.4, SPARKLE_ROTATION_STEPS)).toBeGreaterThanOrEqual(0)
    expect(resolveRotationIndex(-0.4, SPARKLE_ROTATION_STEPS)).toBeLessThan(SPARKLE_ROTATION_STEPS)
  })

  it('falls back to the first frame when there are no steps', () => {
    expect(resolveRotationIndex(1.2, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleSprites.test.ts`
Expected: FAIL — `Failed to resolve import "@/home-sections/Home/helpers/sparkleSprites"`.

- [ ] **Step 3: Write the sprite module**

Create `src/home-sections/Home/helpers/sparkleSprites.ts`:

```ts
import {
  SPARKLE_GLOW_BLUR_RATIO,
  SPARKLE_GLYPH_PATH,
  SPARKLE_GLYPH_VIEWBOX,
  SPARKLE_ROTATION_STEPS,
  SPARKLE_SPRITE_BUCKETS,
  SPARKLE_SPRITE_GLOW_PADDING,
  SPARKLE_SPRITE_PADDING,
} from '@/constants/home.constants'
import { ISparkleSpriteAtlas, TSpriteSurfaceFactory } from '@/home-sections/Home/types/home.type'

/** Quarter turn in radians; the glyph repeats visually every quarter turn. */
const QUARTER_TURN = Math.PI / 2

/** Colour of the glyph body, matching the white core of the existing `Sparkle` icon. */
const GLYPH_FILL = '#fff'

export interface ISparkleAtlasOptions {
  /** Backing-store scale the sprites are rasterised at, already capped by the tier. */
  devicePixelRatio: number
  /** Brand colour the glow is baked with, read from the canvas's computed `color`. */
  color: string
  /** Whether to bake the glow at all; the lowest tiers drop it to save fill cost. */
  hasGlow: boolean
}

/** Finds the pre-rasterised bucket closest to a requested glyph size. */
export const resolveSpriteBucketIndex = (size: number, bucketSizes: number[]): number => {
  if (bucketSizes.length === 0) {
    return 0
  }

  let bestIndex = 0
  let bestDistance = Math.abs(size - bucketSizes[0])

  for (let index = 1; index < bucketSizes.length; index += 1) {
    const distance = Math.abs(size - bucketSizes[index])

    if (distance < bestDistance) {
      bestIndex = index
      bestDistance = distance
    }
  }

  return bestIndex
}

/** Maps a continuous rotation onto one of the baked frames, wrapping in both directions. */
export const resolveRotationIndex = (rotation: number, steps: number): number => {
  if (steps <= 0) {
    return 0
  }

  const stepped = Math.floor((rotation / QUARTER_TURN) * steps)

  return ((stepped % steps) + steps) % steps
}

/**
 * Rasterises the glyph once per size bucket and rotation step. Baking the glow
 * here is what allows the frame loop to avoid `shadowBlur` entirely, which is
 * the single most expensive thing a 2D context can be asked to do per frame.
 *
 * Returns `null` when no raster surface is obtainable, so callers can skip the
 * field rather than render an empty canvas.
 */
export const buildSparkleAtlas = (
  createSurface: TSpriteSurfaceFactory,
  options: ISparkleAtlasOptions,
): ISparkleSpriteAtlas | null => {
  const paddingFactor = options.hasGlow ? SPARKLE_SPRITE_GLOW_PADDING : SPARKLE_SPRITE_PADDING
  const path = new Path2D(SPARKLE_GLYPH_PATH)
  const frames: CanvasImageSource[][] = []

  for (const bucketSize of SPARKLE_SPRITE_BUCKETS) {
    const framePixels = Math.max(
      1,
      Math.ceil(bucketSize * options.devicePixelRatio * paddingFactor),
    )
    const glyphPixels = bucketSize * options.devicePixelRatio
    const rotationFrames: CanvasImageSource[] = []

    for (let step = 0; step < SPARKLE_ROTATION_STEPS; step += 1) {
      const surface = createSurface(framePixels)

      if (!surface) {
        return null
      }

      const { context } = surface

      context.save()
      context.translate(framePixels / 2, framePixels / 2)
      context.rotate((step * QUARTER_TURN) / SPARKLE_ROTATION_STEPS)
      context.scale(glyphPixels / SPARKLE_GLYPH_VIEWBOX, glyphPixels / SPARKLE_GLYPH_VIEWBOX)
      context.translate(-SPARKLE_GLYPH_VIEWBOX / 2, -SPARKLE_GLYPH_VIEWBOX / 2)
      context.fillStyle = GLYPH_FILL

      if (options.hasGlow) {
        context.shadowColor = options.color
        context.shadowBlur = glyphPixels * SPARKLE_GLOW_BLUR_RATIO
      }

      context.fill(path)
      context.restore()

      rotationFrames.push(surface.image)
    }

    frames.push(rotationFrames)
  }

  return { frames, bucketSizes: [...SPARKLE_SPRITE_BUCKETS], paddingFactor }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleSprites.test.ts`
Expected: PASS — 10 tests.

- [ ] **Step 5: Write the failing renderer test**

Create `src/home-sections/Home/helpers/sparkleRenderer.test.ts`. The renderer is generic over the frame image type, so the whole draw path can be exercised with plain strings — no canvas, no jsdom.

```ts
import { describe, expect, it } from 'vitest'

import { SPARKLE_FIELD_CONFIG, SPARKLE_ROTATION_STEPS } from '@/constants/home.constants'
import {
  createSparkleInfluence,
  createSparkleParticle,
  createSparklePointer,
} from '@/home-sections/Home/helpers/sparkleField'
import { renderSparkleField } from '@/home-sections/Home/helpers/sparkleRenderer'
import {
  ISparkleDrawContext,
  ISparkleSpriteAtlas,
  ISparkleViewport,
} from '@/home-sections/Home/types/home.type'

interface IRecordedDraw {
  /** Sprite frame the renderer chose. */
  image: string
  /** Destination left edge in device pixels. */
  x: number
  /** Destination top edge in device pixels. */
  y: number
  /** Destination edge length in device pixels. */
  size: number
  /** Alpha in force at the moment of the call. */
  alpha: number
}

/** Records draw calls so the renderer's decisions can be asserted without a real canvas. */
const createRecordingContext = () => {
  const draws: IRecordedDraw[] = []
  const clears: number[] = []

  const context: ISparkleDrawContext<string> = {
    globalAlpha: 1,
    clearRect: (_x, _y, width) => {
      clears.push(width)
    },
    drawImage: (image, x, y, dWidth) => {
      draws.push({ image, x, y, size: dWidth, alpha: context.globalAlpha })
    },
  }

  return { context, draws, clears }
}

/** Two size buckets × the configured rotation steps, labelled so assertions can name a frame. */
const createTestAtlas = (): ISparkleSpriteAtlas<string> => ({
  frames: [
    Array.from({ length: SPARKLE_ROTATION_STEPS }, (_value, step) => `small-${step}`),
    Array.from({ length: SPARKLE_ROTATION_STEPS }, (_value, step) => `large-${step}`),
  ],
  bucketSizes: [4, 16],
  paddingFactor: 1.5,
})

const VIEW: ISparkleViewport = { width: 600, height: 400, devicePixelRatio: 2 }

describe('renderSparkleField', () => {
  it('wipes the whole backing store before drawing', () => {
    const { context, clears } = createRecordingContext()

    renderSparkleField(
      context,
      createTestAtlas(),
      [],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(clears).toEqual([VIEW.width * VIEW.devicePixelRatio])
  })

  it('draws one sprite per particle', () => {
    const { context, draws } = createRecordingContext()
    const particles = [
      createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG),
      createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG),
      createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG),
    ]

    renderSparkleField(
      context,
      createTestAtlas(),
      particles,
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(draws).toHaveLength(3)
  })

  it('scales positions and sizes into device pixels', () => {
    const { context, draws } = createRecordingContext()
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.x = 100
    particle.y = 50
    particle.size = 16
    particle.opacity = 1
    particle.twinklePhase = Math.PI / 2

    renderSparkleField(
      context,
      createTestAtlas(),
      [particle],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    const drawn = draws[0]
    const expectedSize = 16 * VIEW.devicePixelRatio * 1.5

    expect(drawn.size).toBeCloseTo(expectedSize)
    expect(drawn.x).toBeCloseTo(100 * VIEW.devicePixelRatio - expectedSize / 2)
    expect(drawn.y).toBeCloseTo(50 * VIEW.devicePixelRatio - expectedSize / 2)
  })

  it('chooses the bucket nearest the particle size', () => {
    const { context, draws } = createRecordingContext()
    const small = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const large = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    small.size = 4
    small.rotation = 0
    large.size = 16
    large.rotation = 0

    renderSparkleField(
      context,
      createTestAtlas(),
      [small, large],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(draws[0].image).toBe('small-0')
    expect(draws[1].image).toBe('large-0')
  })

  it('brightens and enlarges a particle under the pointer', () => {
    const atlas = createTestAtlas()
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.x = 300
    particle.y = 200
    particle.size = 8
    particle.opacity = 0.3
    particle.twinklePhase = Math.PI / 2
    particle.depth = 1

    const restingRun = createRecordingContext()

    renderSparkleField(
      restingRun.context,
      atlas,
      [particle],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    const pointer = createSparklePointer()

    pointer.x = 300
    pointer.y = 200
    pointer.intensity = 1

    const boostedRun = createRecordingContext()

    renderSparkleField(
      boostedRun.context,
      atlas,
      [particle],
      pointer,
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(boostedRun.draws[0].alpha).toBeGreaterThan(restingRun.draws[0].alpha)
    expect(boostedRun.draws[0].size).toBeGreaterThan(restingRun.draws[0].size)
  })

  it('pushes a particle away from the pointer rather than through it', () => {
    const atlas = createTestAtlas()
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    particle.x = 320
    particle.y = 200
    particle.size = 8
    particle.opacity = 0.5
    particle.twinklePhase = Math.PI / 2
    particle.depth = 1

    const restingRun = createRecordingContext()

    renderSparkleField(
      restingRun.context,
      atlas,
      [particle],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    const pointer = createSparklePointer()

    pointer.x = 300
    pointer.y = 200
    pointer.intensity = 1

    const pushedRun = createRecordingContext()

    renderSparkleField(
      pushedRun.context,
      atlas,
      [particle],
      pointer,
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(pushedRun.draws[0].x).toBeGreaterThan(restingRun.draws[0].x)
  })

  it('never lets alpha exceed one, however strong the boost', () => {
    const { context, draws } = createRecordingContext()
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)
    const pointer = createSparklePointer()

    particle.x = 300
    particle.y = 200
    particle.opacity = 1
    particle.twinklePhase = Math.PI / 2
    pointer.x = 300
    pointer.y = 200
    pointer.intensity = 1

    renderSparkleField(
      context,
      createTestAtlas(),
      [particle],
      pointer,
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(draws[0].alpha).toBeLessThanOrEqual(1)
  })

  it('restores a neutral alpha so the next painter is not tinted', () => {
    const { context } = createRecordingContext()
    const particle = createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)

    renderSparkleField(
      context,
      createTestAtlas(),
      [particle],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(context.globalAlpha).toBe(1)
  })

  it('draws nothing when the atlas is empty', () => {
    const { context, draws } = createRecordingContext()
    const emptyAtlas: ISparkleSpriteAtlas<string> = {
      frames: [],
      bucketSizes: [],
      paddingFactor: 1.5,
    }

    renderSparkleField(
      context,
      emptyAtlas,
      [createSparkleParticle(600, 400, SPARKLE_FIELD_CONFIG)],
      createSparklePointer(),
      VIEW,
      SPARKLE_FIELD_CONFIG,
      createSparkleInfluence(),
    )

    expect(draws).toHaveLength(0)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleRenderer.test.ts`
Expected: FAIL — `Failed to resolve import "@/home-sections/Home/helpers/sparkleRenderer"`.

- [ ] **Step 7: Write the renderer**

Create `src/home-sections/Home/helpers/sparkleRenderer.ts`:

```ts
import { readSparkleInfluence } from '@/home-sections/Home/helpers/sparkleField'
import {
  resolveRotationIndex,
  resolveSpriteBucketIndex,
} from '@/home-sections/Home/helpers/sparkleSprites'
import {
  ISparkleDrawContext,
  ISparkleFieldConfig,
  ISparkleInfluence,
  ISparkleParticle,
  ISparklePointer,
  ISparkleSpriteAtlas,
  ISparkleViewport,
} from '@/home-sections/Home/types/home.type'

/** Confines a value to 0–1 so alpha never leaves the range the context accepts. */
const clampUnit = (value: number): number => Math.min(Math.max(value, 0), 1)

/**
 * Paints one frame of the field.
 *
 * Generic over the frame image type so the whole draw path can be exercised with
 * test doubles; in the browser `TImage` resolves to `CanvasImageSource`. The
 * `influence` record is supplied by the caller and reused for every particle, so
 * a frame allocates nothing.
 */
export const renderSparkleField = <TImage>(
  context: ISparkleDrawContext<TImage>,
  atlas: ISparkleSpriteAtlas<TImage>,
  particles: ISparkleParticle[],
  pointer: ISparklePointer,
  view: ISparkleViewport,
  config: ISparkleFieldConfig,
  influence: ISparkleInfluence,
): void => {
  const scale = view.devicePixelRatio

  context.clearRect(0, 0, view.width * scale, view.height * scale)

  if (atlas.frames.length === 0) {
    return
  }

  for (const particle of particles) {
    readSparkleInfluence(particle, pointer, config.influenceRadius, influence)

    const twinkle =
      1 - config.twinkleDepth + config.twinkleDepth * (Math.sin(particle.twinklePhase) * 0.5 + 0.5)
    const alpha = clampUnit(
      particle.opacity * twinkle * (1 + influence.strength * config.opacityBoost),
    )

    if (alpha <= 0) {
      continue
    }

    const size = particle.size * (1 + influence.strength * config.sizeBoost)
    const bucketIndex = resolveSpriteBucketIndex(size, atlas.bucketSizes)
    const rotationFrames = atlas.frames[bucketIndex]

    if (!rotationFrames || rotationFrames.length === 0) {
      continue
    }

    const push = influence.strength * config.displacement * particle.depth
    const drawSize = size * scale * atlas.paddingFactor
    const centerX = (particle.x + influence.directionX * push) * scale
    const centerY = (particle.y + influence.directionY * push) * scale

    context.globalAlpha = alpha
    context.drawImage(
      rotationFrames[resolveRotationIndex(particle.rotation, rotationFrames.length)],
      centerX - drawSize / 2,
      centerY - drawSize / 2,
      drawSize,
      drawSize,
    )
  }

  context.globalAlpha = 1
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleRenderer.test.ts`
Expected: PASS — 10 tests.

- [ ] **Step 9: Validate and commit**

```bash
node_modules/.bin/tsc --pretty --noEmit
node_modules/.bin/eslint .
node_modules/.bin/prettier --check .
node_modules/.bin/vitest run
git add src/home-sections/Home/helpers/sparkleSprites.ts src/home-sections/Home/helpers/sparkleSprites.test.ts src/home-sections/Home/helpers/sparkleRenderer.ts src/home-sections/Home/helpers/sparkleRenderer.test.ts
git commit -m "feat: added sparkle sprite atlas and frame renderer"
```

---

### Task 5: Frame loop engine

**Files:**

- Create: `src/home-sections/Home/helpers/sparkleEngine.ts`
- Create: `src/home-sections/Home/helpers/sparkleEngine.test.ts`

**Interfaces:**

- Consumes: everything from Tasks 1–4.
- Produces:
  - `ISparkleEngineOptions<TImage = CanvasImageSource>` — `{ context: ISparkleDrawContext<TImage>; atlas: ISparkleSpriteAtlas<TImage>; particles: ISparkleParticle[]; view: ISparkleViewport; config: ISparkleFieldConfig; governor: ISparkleGovernorState; thresholds: ISparkleGovernorThresholds; requestFrame: (callback: (timestamp: number) => void) => number; cancelFrame: (handle: number) => void; onTierChange: (tier: ESparkleTier) => void }`
  - `ISparkleEngine<TImage = CanvasImageSource>` — `{ start(): void; stop(): void; renderOnce(): void; setPointerTarget(target: IPointerPosition | null): void; setAtlas(atlas: ISparkleSpriteAtlas<TImage>): void; readonly isRunning: boolean }`
  - `createSparkleEngine<TImage = CanvasImageSource>(options: ISparkleEngineOptions<TImage>): ISparkleEngine<TImage>`

The engine measures frame duration from consecutive `requestFrame` timestamps — that is the true frame time, and it costs nothing extra. Deltas above `config.maxFrameDelta` are simulated as a clamped step but excluded from the governor's sample, so returning from a background tab can never trigger a downgrade.

- [ ] **Step 1: Write the failing test**

Create `src/home-sections/Home/helpers/sparkleEngine.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

import { SPARKLE_FIELD_CONFIG, SPARKLE_GOVERNOR_THRESHOLDS } from '@/constants/home.constants'
import { createSparkleEngine, ISparkleEngine } from '@/home-sections/Home/helpers/sparkleEngine'
import { createSparkleParticles } from '@/home-sections/Home/helpers/sparkleField'
import { createSparkleGovernorState } from '@/home-sections/Home/helpers/sparkleGovernor'
import {
  ESparkleTier,
  ISparkleDrawContext,
  ISparkleSpriteAtlas,
} from '@/home-sections/Home/types/home.type'

/** Hand-driven frame scheduler, so the loop can be stepped deterministically. */
const createManualScheduler = () => {
  const pending = new Map<number, (timestamp: number) => void>()
  let nextHandle = 1

  return {
    requestFrame: (callback: (timestamp: number) => void): number => {
      const handle = nextHandle
      nextHandle += 1
      pending.set(handle, callback)

      return handle
    },
    cancelFrame: (handle: number): void => {
      pending.delete(handle)
    },
    get pendingCount(): number {
      return pending.size
    },
    step: (timestamp: number): void => {
      const entries = [...pending.entries()]
      pending.clear()

      for (const [, callback] of entries) {
        callback(timestamp)
      }
    },
  }
}

const createCountingContext = () => {
  let drawCount = 0
  let clearCount = 0

  const context: ISparkleDrawContext<string> = {
    globalAlpha: 1,
    clearRect: () => {
      clearCount += 1
    },
    drawImage: () => {
      drawCount += 1
    },
  }

  return {
    context,
    get drawCount(): number {
      return drawCount
    },
    get clearCount(): number {
      return clearCount
    },
  }
}

const createTestAtlas = (): ISparkleSpriteAtlas<string> => ({
  frames: [['a-0', 'a-1']],
  bucketSizes: [8],
  paddingFactor: 1.5,
})

const createEngineHarness = (tier: ESparkleTier = ESparkleTier.high) => {
  const scheduler = createManualScheduler()
  const painter = createCountingContext()
  const particles = createSparkleParticles(600, 400, 10, SPARKLE_FIELD_CONFIG)
  const onTierChange = vi.fn()
  const engine = createSparkleEngine({
    context: painter.context,
    atlas: createTestAtlas(),
    particles,
    view: { width: 600, height: 400, devicePixelRatio: 1 },
    config: SPARKLE_FIELD_CONFIG,
    governor: createSparkleGovernorState(tier),
    thresholds: SPARKLE_GOVERNOR_THRESHOLDS,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    onTierChange,
  })

  return { scheduler, painter, particles, engine, onTierChange }
}

describe('createSparkleEngine', () => {
  it('paints a frame once started', () => {
    const { scheduler, painter, engine } = createEngineHarness()

    engine.start()
    scheduler.step(0)
    scheduler.step(16)

    expect(painter.clearCount).toBeGreaterThan(0)
    expect(painter.drawCount).toBeGreaterThan(0)
  })

  it('moves particles between frames', () => {
    const { scheduler, particles, engine } = createEngineHarness()
    const before = particles[0].x

    engine.start()
    scheduler.step(0)
    scheduler.step(500)

    expect(particles[0].x).not.toBe(before)
  })

  it('reports itself as running only between start and stop', () => {
    const { engine } = createEngineHarness()

    expect(engine.isRunning).toBe(false)
    engine.start()
    expect(engine.isRunning).toBe(true)
    engine.stop()
    expect(engine.isRunning).toBe(false)
  })

  it('ignores a repeated start rather than scheduling two loops', () => {
    const { scheduler, engine } = createEngineHarness()

    engine.start()
    engine.start()
    engine.start()

    expect(scheduler.pendingCount).toBe(1)
  })

  it('schedules nothing further once stopped', () => {
    const { scheduler, engine } = createEngineHarness()

    engine.start()
    scheduler.step(0)
    engine.stop()

    expect(scheduler.pendingCount).toBe(0)
  })

  it('tolerates a stop before it ever started', () => {
    const { engine } = createEngineHarness()

    expect(() => engine.stop()).not.toThrow()
    expect(engine.isRunning).toBe(false)
  })

  it('paints a single frame on demand without starting the loop', () => {
    const { scheduler, painter, engine } = createEngineHarness()

    engine.renderOnce()

    expect(painter.clearCount).toBe(1)
    expect(scheduler.pendingCount).toBe(0)
    expect(engine.isRunning).toBe(false)
  })

  it('reports a tier change once frames are consistently slow', () => {
    const { scheduler, engine, onTierChange } = createEngineHarness()

    engine.start()

    let timestamp = 0

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.windowSize + 1; frame += 1) {
      scheduler.step(timestamp)
      timestamp += 30
    }

    expect(onTierChange).toHaveBeenCalledWith(ESparkleTier.medium)
  })

  it('does not blame a backgrounded tab for a slow frame', () => {
    const { scheduler, engine, onTierChange } = createEngineHarness()

    engine.start()

    let timestamp = 0

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.windowSize + 1; frame += 1) {
      scheduler.step(timestamp)
      timestamp += 5000
    }

    expect(onTierChange).not.toHaveBeenCalled()
  })

  it('accepts a replacement atlas after a tier change', () => {
    const { scheduler, painter, engine } = createEngineHarness()

    engine.setAtlas({ frames: [], bucketSizes: [], paddingFactor: 1.5 })
    engine.start()
    scheduler.step(0)
    scheduler.step(16)

    expect(painter.drawCount).toBe(0)
    expect(painter.clearCount).toBeGreaterThan(0)
  })

  it('does not stack a second loop when its tier-change handler restarts it mid-frame', () => {
    const scheduler = createManualScheduler()
    const painter = createCountingContext()

    let engine: ISparkleEngine<string> | null = null

    const created = createSparkleEngine<string>({
      context: painter.context,
      atlas: createTestAtlas(),
      particles: createSparkleParticles(600, 400, 4, SPARKLE_FIELD_CONFIG),
      view: { width: 600, height: 400, devicePixelRatio: 1 },
      config: SPARKLE_FIELD_CONFIG,
      governor: createSparkleGovernorState(ESparkleTier.high),
      thresholds: SPARKLE_GOVERNOR_THRESHOLDS,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame,
      onTierChange: () => {
        engine?.stop()
        engine?.start()
      },
    })

    engine = created
    created.start()

    let timestamp = 0

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.windowSize + 1; frame += 1) {
      scheduler.step(timestamp)
      timestamp += 30
    }

    expect(scheduler.pendingCount).toBe(1)
  })

  it('lets go of the pointer when it is cleared', () => {
    const { scheduler, engine } = createEngineHarness()

    engine.start()
    engine.setPointerTarget({ x: 100, y: 100 })
    scheduler.step(0)
    scheduler.step(16)
    engine.setPointerTarget(null)

    for (let frame = 0; frame < 120; frame += 1) {
      scheduler.step(32 + frame * 16)
    }

    expect(() => engine.stop()).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleEngine.test.ts`
Expected: FAIL — `Failed to resolve import "@/home-sections/Home/helpers/sparkleEngine"`.

- [ ] **Step 3: Write the engine**

Create `src/home-sections/Home/helpers/sparkleEngine.ts`:

```ts
import {
  advanceSparkleParticle,
  advanceSparklePointer,
  clampSparkleFrameDelta,
  createSparkleInfluence,
  createSparklePointer,
} from '@/home-sections/Home/helpers/sparkleField'
import { recordSparkleFrame } from '@/home-sections/Home/helpers/sparkleGovernor'
import { renderSparkleField } from '@/home-sections/Home/helpers/sparkleRenderer'
import {
  ESparkleTier,
  IPointerPosition,
  ISparkleDrawContext,
  ISparkleFieldConfig,
  ISparkleGovernorState,
  ISparkleGovernorThresholds,
  ISparkleParticle,
  ISparkleSpriteAtlas,
  ISparkleViewport,
} from '@/home-sections/Home/types/home.type'

export interface ISparkleEngineOptions<TImage = CanvasImageSource> {
  /** Context the field is painted into. */
  context: ISparkleDrawContext<TImage>
  /** Sprite frames the renderer blits; replaced wholesale when the tier changes. */
  atlas: ISparkleSpriteAtlas<TImage>
  /** Live particle population, mutated in place by the loop. */
  particles: ISparkleParticle[]
  /** Field size and backing-store scale; mutated by the controller on resize. */
  view: ISparkleViewport
  /** Motion and interaction tuning. */
  config: ISparkleFieldConfig
  /** Governor state graded against every usable frame. */
  governor: ISparkleGovernorState
  /** Frame budgets the governor grades against. */
  thresholds: ISparkleGovernorThresholds
  /** Schedules the next frame; injected so the loop can be driven deterministically in tests. */
  requestFrame: (callback: (timestamp: number) => void) => number
  /** Cancels a scheduled frame. */
  cancelFrame: (handle: number) => void
  /** Announces a tier the governor decided on, so the host can rebuild the atlas and population. */
  onTierChange: (tier: ESparkleTier) => void
}

export interface ISparkleEngine<TImage = CanvasImageSource> {
  /** Whether a frame is currently scheduled. */
  readonly isRunning: boolean
  /** Begins the loop; repeated calls are ignored so a double start cannot double the frame rate. */
  start(): void
  /** Cancels any scheduled frame and resets the timing baseline. */
  stop(): void
  /** Paints exactly one frame without scheduling another; used for the still tier and first paint. */
  renderOnce(): void
  /** Points the field at a new raw pointer position, or `null` once the pointer leaves. */
  setPointerTarget(target: IPointerPosition | null): void
  /** Swaps in sprites rasterised for a new tier or device pixel ratio. */
  setAtlas(atlas: ISparkleSpriteAtlas<TImage>): void
}

/**
 * Owns the frame loop: advance, paint, and grade. Everything it needs is
 * injected, so the same engine runs on the main thread and inside the worker,
 * and can be stepped by hand under test.
 *
 * The tail of each frame reschedules only when the handle is still the one that
 * frame began with. `onTierChange` runs synchronously inside the callback and
 * may stop or restart the loop from there; a nullness check could not tell
 * "nothing changed" from "the handler already re-armed us", and would leave a
 * second, orphaned frame chain running forever alongside the first.
 */
export const createSparkleEngine = <TImage = CanvasImageSource>(
  options: ISparkleEngineOptions<TImage>,
): ISparkleEngine<TImage> => {
  const pointer = createSparklePointer()
  const influence = createSparkleInfluence()

  let atlas = options.atlas
  let pointerTarget: IPointerPosition | null = null
  let frameHandle: number | null = null
  let lastTimestamp: number | null = null

  const paint = (): void => {
    renderSparkleField(
      options.context,
      atlas,
      options.particles,
      pointer,
      options.view,
      options.config,
      influence,
    )
  }

  const onFrame = (timestamp: number): void => {
    const handleAtEntry = frameHandle

    if (handleAtEntry === null) {
      return
    }

    const rawDelta = lastTimestamp === null ? 0 : timestamp - lastTimestamp

    lastTimestamp = timestamp

    const delta = clampSparkleFrameDelta(rawDelta, options.config.maxFrameDelta)

    advanceSparklePointer(pointer, pointerTarget, options.config.pointerLerp)

    for (const particle of options.particles) {
      advanceSparkleParticle(
        particle,
        delta,
        options.view.width,
        options.view.height,
        options.config,
      )
    }

    paint()

    if (rawDelta > 0 && rawDelta <= options.config.maxFrameDelta) {
      const nextTier = recordSparkleFrame(options.governor, rawDelta, options.thresholds)

      if (nextTier) {
        options.onTierChange(nextTier)
      }
    }

    if (frameHandle === handleAtEntry) {
      frameHandle = options.requestFrame(onFrame)
    }
  }

  return {
    get isRunning(): boolean {
      return frameHandle !== null
    },
    start: (): void => {
      if (frameHandle !== null) {
        return
      }

      lastTimestamp = null
      frameHandle = options.requestFrame(onFrame)
    },
    stop: (): void => {
      if (frameHandle === null) {
        return
      }

      options.cancelFrame(frameHandle)
      frameHandle = null
      lastTimestamp = null
    },
    renderOnce: paint,
    setPointerTarget: (target: IPointerPosition | null): void => {
      pointerTarget = target
    },
    setAtlas: (next: ISparkleSpriteAtlas<TImage>): void => {
      atlas = next
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleEngine.test.ts`
Expected: PASS — 12 tests.

- [ ] **Step 5: Validate and commit**

```bash
node_modules/.bin/tsc --pretty --noEmit
node_modules/.bin/eslint .
node_modules/.bin/prettier --check .
git add src/home-sections/Home/helpers/sparkleEngine.ts src/home-sections/Home/helpers/sparkleEngine.test.ts
git commit -m "feat: added sparkle frame loop engine"
```

---

### Task 6: Surface controller

**Files:**

- Create: `src/home-sections/Home/helpers/sparkleController.ts`
- Create: `src/home-sections/Home/helpers/sparkleController.test.ts`

**Interfaces:**

- Consumes: everything from Tasks 1–5.
- Produces:
  - `ISparkleControllerOptions<TImage>` — `{ context: ISparkleDrawContext<TImage>; buildAtlas: (tier: ISparkleTierConfig, devicePixelRatio: number) => ISparkleSpriteAtlas<TImage> | null; resizeSurface: (widthPx: number, heightPx: number) => void; requestFrame: (callback: (timestamp: number) => void) => number; cancelFrame: (handle: number) => void; initialTier: ESparkleTier; onTierChange?: (tier: ESparkleTier) => void; random?: () => number }`
  - `ISparkleController` — `{ readonly tier: ESparkleTier; readonly isRunning: boolean; setViewport(width: number, height: number, devicePixelRatio: number): void; setPointerTarget(target: IPointerPosition | null): void; start(): void; stop(): void; destroy(): void }`
  - `createSparkleController<TImage>(options: ISparkleControllerOptions<TImage>): ISparkleController`

The controller is the piece both transports share: it owns viewport changes, particle refits, atlas rebuilds, and the tier-change reaction. `start()` on the still tier paints one frame instead of running a loop.

- [ ] **Step 1: Write the failing test**

Create `src/home-sections/Home/helpers/sparkleController.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

import { SPARKLE_GOVERNOR_THRESHOLDS, SPARKLE_TIERS } from '@/constants/home.constants'
import { createSparkleController } from '@/home-sections/Home/helpers/sparkleController'
import {
  ESparkleTier,
  ISparkleDrawContext,
  ISparkleSpriteAtlas,
  ISparkleTierConfig,
} from '@/home-sections/Home/types/home.type'

/**
 * Hand-driven frame scheduler. Each callback re-registers itself, so the pending
 * set is drained into a snapshot before it is invoked — iterating the live list
 * would never terminate.
 */
const createManualScheduler = () => {
  const pending = new Map<number, (timestamp: number) => void>()
  let nextHandle = 1

  return {
    requestFrame: (callback: (timestamp: number) => void): number => {
      const handle = nextHandle
      nextHandle += 1
      pending.set(handle, callback)

      return handle
    },
    cancelFrame: (handle: number): void => {
      pending.delete(handle)
    },
    step: (timestamp: number): void => {
      const entries = [...pending.values()]
      pending.clear()

      for (const callback of entries) {
        callback(timestamp)
      }
    },
  }
}

const createHarness = (initialTier: ESparkleTier = ESparkleTier.high) => {
  const scheduler = createManualScheduler()
  const resizes: Array<{ width: number; height: number }> = []
  const atlasRequests: Array<{ tier: ISparkleTierConfig; devicePixelRatio: number }> = []
  const onTierChange = vi.fn()

  let drawCount = 0

  const context: ISparkleDrawContext<string> = {
    globalAlpha: 1,
    clearRect: () => {},
    drawImage: () => {
      drawCount += 1
    },
  }

  const buildAtlas = (
    tier: ISparkleTierConfig,
    devicePixelRatio: number,
  ): ISparkleSpriteAtlas<string> | null => {
    atlasRequests.push({ tier, devicePixelRatio })

    return { frames: [['frame-0', 'frame-1']], bucketSizes: [8], paddingFactor: 1.5 }
  }

  const controller = createSparkleController<string>({
    context,
    buildAtlas,
    resizeSurface: (width, height) => {
      resizes.push({ width, height })
    },
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    initialTier,
    onTierChange,
  })

  return {
    controller,
    resizes,
    atlasRequests,
    onTierChange,
    scheduler,
    get drawCount(): number {
      return drawCount
    },
  }
}

describe('createSparkleController', () => {
  it('sizes the backing store by the tier-capped pixel ratio', () => {
    const harness = createHarness(ESparkleTier.low)

    harness.controller.setViewport(600, 400, 3)

    expect(harness.resizes.at(-1)).toEqual({
      width: 600 * SPARKLE_TIERS[ESparkleTier.low].maxDevicePixelRatio,
      height: 400 * SPARKLE_TIERS[ESparkleTier.low].maxDevicePixelRatio,
    })
  })

  it('honours a device pixel ratio below the tier cap', () => {
    const harness = createHarness(ESparkleTier.high)

    harness.controller.setViewport(600, 400, 1)

    expect(harness.resizes.at(-1)).toEqual({ width: 600, height: 400 })
  })

  it('paints once as soon as it has a viewport', () => {
    const harness = createHarness()

    harness.controller.setViewport(600, 400, 1)

    expect(harness.drawCount).toBeGreaterThan(0)
  })

  it('does nothing at all for a collapsed container', () => {
    const harness = createHarness()

    harness.controller.setViewport(0, 0, 1)
    harness.controller.start()

    expect(harness.resizes).toHaveLength(0)
    expect(harness.controller.isRunning).toBe(false)
  })

  it('rebuilds the atlas only when the pixel ratio actually changes', () => {
    const harness = createHarness()

    harness.controller.setViewport(600, 400, 2)
    const afterFirst = harness.atlasRequests.length

    harness.controller.setViewport(800, 500, 2)

    expect(harness.atlasRequests).toHaveLength(afterFirst)

    harness.controller.setViewport(800, 500, 1)

    expect(harness.atlasRequests.length).toBeGreaterThan(afterFirst)
  })

  it('runs a loop on an animated tier', () => {
    const harness = createHarness(ESparkleTier.high)

    harness.controller.setViewport(600, 400, 1)
    harness.controller.start()

    expect(harness.controller.isRunning).toBe(true)
  })

  it('paints a still frame instead of looping on the terminal tier', () => {
    const harness = createHarness(ESparkleTier.static)

    harness.controller.setViewport(600, 400, 1)
    harness.controller.start()

    expect(harness.controller.isRunning).toBe(false)
    expect(harness.drawCount).toBeGreaterThan(0)
  })

  it('drops a tier and tells its host once frames are consistently slow', () => {
    const harness = createHarness(ESparkleTier.high)

    harness.controller.setViewport(600, 400, 2)
    harness.controller.start()

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.windowSize + 1; frame += 1) {
      harness.scheduler.step(frame * 30)
    }

    expect(harness.controller.tier).toBe(ESparkleTier.medium)
    expect(harness.onTierChange).toHaveBeenCalledWith(ESparkleTier.medium)
  })

  it('recaps the pixel ratio when a tier change tightens the cap', () => {
    const harness = createHarness(ESparkleTier.high)

    harness.controller.setViewport(600, 400, 3)

    expect(harness.resizes.at(-1)).toEqual({ width: 1200, height: 800 })

    harness.controller.start()

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.windowSize + 1; frame += 1) {
      harness.scheduler.step(frame * 30)
    }

    expect(harness.resizes.at(-1)).toEqual({ width: 900, height: 600 })
  })

  it('restores the physical pixel ratio when the tier recovers', () => {
    const harness = createHarness(ESparkleTier.low)

    harness.controller.setViewport(600, 400, 2)

    expect(harness.resizes.at(-1)).toEqual({ width: 600, height: 400 })

    harness.controller.start()

    for (let frame = 0; frame <= SPARKLE_GOVERNOR_THRESHOLDS.upgradeAfterFrames + 1; frame += 1) {
      harness.scheduler.step(frame * 5)
    }

    expect(harness.controller.tier).toBe(ESparkleTier.medium)
    expect(harness.resizes.at(-1)).toEqual({ width: 900, height: 600 })
  })

  it('stops cleanly and stays stopped after destroy', () => {
    const harness = createHarness()

    harness.controller.setViewport(600, 400, 1)
    harness.controller.start()
    harness.controller.destroy()

    expect(harness.controller.isRunning).toBe(false)

    harness.controller.start()

    expect(harness.controller.isRunning).toBe(false)
  })

  it('ignores a viewport update after destroy', () => {
    const harness = createHarness()

    harness.controller.setViewport(600, 400, 1)
    harness.controller.destroy()

    const afterDestroy = harness.resizes.length

    harness.controller.setViewport(900, 700, 1)

    expect(harness.resizes).toHaveLength(afterDestroy)
  })

  it('tolerates a pointer update before the first viewport arrives', () => {
    const harness = createHarness()

    expect(() => harness.controller.setPointerTarget({ x: 10, y: 10 })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleController.test.ts`
Expected: FAIL — `Failed to resolve import "@/home-sections/Home/helpers/sparkleController"`.

- [ ] **Step 3: Write the controller**

Create `src/home-sections/Home/helpers/sparkleController.ts`:

```ts
import {
  SPARKLE_FIELD_CONFIG,
  SPARKLE_GOVERNOR_THRESHOLDS,
  SPARKLE_TIERS,
} from '@/constants/home.constants'
import { createSparkleEngine, ISparkleEngine } from '@/home-sections/Home/helpers/sparkleEngine'
import {
  createSparkleParticles,
  refitSparkleParticles,
  resolveSparkleParticleCount,
} from '@/home-sections/Home/helpers/sparkleField'
import { createSparkleGovernorState } from '@/home-sections/Home/helpers/sparkleGovernor'
import {
  ESparkleTier,
  IPointerPosition,
  ISparkleDrawContext,
  ISparkleParticle,
  ISparkleSpriteAtlas,
  ISparkleTierConfig,
  ISparkleViewport,
} from '@/home-sections/Home/types/home.type'

export interface ISparkleControllerOptions<TImage = CanvasImageSource> {
  /** Context the field is painted into. */
  context: ISparkleDrawContext<TImage>
  /** Rasterises an atlas for a tier and pixel ratio; platform-specific. */
  buildAtlas: (
    tier: ISparkleTierConfig,
    devicePixelRatio: number,
  ) => ISparkleSpriteAtlas<TImage> | null
  /** Resizes the backing store, in device pixels; platform-specific. */
  resizeSurface: (widthPx: number, heightPx: number) => void
  /** Schedules the next frame. */
  requestFrame: (callback: (timestamp: number) => void) => number
  /** Cancels a scheduled frame. */
  cancelFrame: (handle: number) => void
  /** Tier the field starts on, seeded from device signals. */
  initialTier: ESparkleTier
  /** Announces the active tier so the host can mirror it, for example in a DOM attribute. */
  onTierChange?: (tier: ESparkleTier) => void
  /** Random source for particle placement; injected so a field can be reproduced in tests. */
  random?: () => number
}

export interface ISparkleController {
  /** Tier currently in force. */
  readonly tier: ESparkleTier
  /** Whether an animation loop is currently scheduled. */
  readonly isRunning: boolean
  /** Adopts a new field size and pixel ratio, refitting the population and the backing store. */
  setViewport(width: number, height: number, devicePixelRatio: number): void
  /** Forwards the raw pointer position, or `null` once it leaves the field. */
  setPointerTarget(target: IPointerPosition | null): void
  /** Runs the loop, or paints one still frame when the tier is terminal. */
  start(): void
  /** Halts the loop but keeps the field ready to resume. */
  stop(): void
  /** Halts permanently and refuses all further work. */
  destroy(): void
}

/**
 * Owns everything around the frame loop that both transports need: viewport
 * changes, atlas rebuilds, particle refits, and the reaction to a tier decision.
 * The main thread and the worker instantiate this identically; only how they
 * receive their inputs differs.
 */
export const createSparkleController = <TImage = CanvasImageSource>(
  options: ISparkleControllerOptions<TImage>,
): ISparkleController => {
  const view: ISparkleViewport = { width: 0, height: 0, devicePixelRatio: 1 }
  const particles: ISparkleParticle[] = []
  const governor = createSparkleGovernorState(options.initialTier)

  let engine: ISparkleEngine<TImage> | null = null
  let atlas: ISparkleSpriteAtlas<TImage> | null = null
  let atlasPixelRatio = 0
  let atlasTier: ESparkleTier | null = null
  let isDestroyed = false
  let isStartRequested = false
  let physicalPixelRatio = 1

  const readTier = (): ISparkleTierConfig => SPARKLE_TIERS[governor.tier]

  const ensureAtlas = (): void => {
    const tier = readTier()

    if (atlas && atlasTier === governor.tier && atlasPixelRatio === view.devicePixelRatio) {
      return
    }

    atlas = options.buildAtlas(tier, view.devicePixelRatio)
    atlasTier = governor.tier
    atlasPixelRatio = view.devicePixelRatio

    if (atlas) {
      engine?.setAtlas(atlas)
    }
  }

  const applyTier = (tier: ESparkleTier): void => {
    if (isDestroyed) {
      return
    }

    governor.tier = tier
    view.devicePixelRatio = Math.min(physicalPixelRatio, readTier().maxDevicePixelRatio)

    options.resizeSurface(view.width * view.devicePixelRatio, view.height * view.devicePixelRatio)
    ensureAtlas()

    refitSparkleParticles(
      particles,
      { width: view.width, height: view.height },
      view.width,
      view.height,
      resolveSparkleParticleCount(view.width, view.height, readTier(), SPARKLE_FIELD_CONFIG),
      SPARKLE_FIELD_CONFIG,
      options.random,
    )

    options.onTierChange?.(tier)

    if (!readTier().isAnimated) {
      engine?.stop()
      engine?.renderOnce()
    }
  }

  const ensureEngine = (): void => {
    if (engine || !atlas) {
      return
    }

    engine = createSparkleEngine<TImage>({
      context: options.context,
      atlas,
      particles,
      view,
      config: SPARKLE_FIELD_CONFIG,
      governor,
      thresholds: SPARKLE_GOVERNOR_THRESHOLDS,
      requestFrame: options.requestFrame,
      cancelFrame: options.cancelFrame,
      onTierChange: applyTier,
    })
  }

  return {
    get tier(): ESparkleTier {
      return governor.tier
    },
    get isRunning(): boolean {
      return engine?.isRunning ?? false
    },
    setViewport: (width: number, height: number, devicePixelRatio: number): void => {
      if (isDestroyed || width <= 0 || height <= 0) {
        return
      }

      const previous = { width: view.width, height: view.height }

      physicalPixelRatio = devicePixelRatio

      const scale = Math.min(devicePixelRatio, readTier().maxDevicePixelRatio)

      view.width = width
      view.height = height
      view.devicePixelRatio = scale

      options.resizeSurface(width * scale, height * scale)
      ensureAtlas()

      const count = resolveSparkleParticleCount(width, height, readTier(), SPARKLE_FIELD_CONFIG)

      if (particles.length === 0) {
        particles.push(
          ...createSparkleParticles(width, height, count, SPARKLE_FIELD_CONFIG, options.random),
        )
      } else {
        refitSparkleParticles(
          particles,
          previous,
          width,
          height,
          count,
          SPARKLE_FIELD_CONFIG,
          options.random,
        )
      }

      ensureEngine()
      engine?.renderOnce()

      if (isStartRequested && readTier().isAnimated) {
        engine?.start()
      }
    },
    setPointerTarget: (target: IPointerPosition | null): void => {
      if (isDestroyed) {
        return
      }

      engine?.setPointerTarget(target)
    },
    start: (): void => {
      if (isDestroyed) {
        return
      }

      isStartRequested = true

      if (!engine) {
        return
      }

      if (readTier().isAnimated) {
        engine.start()

        return
      }

      engine.renderOnce()
    },
    stop: (): void => {
      isStartRequested = false
      engine?.stop()
    },
    destroy: (): void => {
      isDestroyed = true
      isStartRequested = false
      engine?.stop()
      engine = null
      atlas = null
      particles.length = 0
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleController.test.ts`
Expected: PASS — 13 tests.

- [ ] **Step 5: Validate and commit**

```bash
node_modules/.bin/tsc --pretty --noEmit
node_modules/.bin/eslint .
node_modules/.bin/prettier --check .
node_modules/.bin/vitest run
git add src/home-sections/Home/helpers/sparkleController.ts src/home-sections/Home/helpers/sparkleController.test.ts
git commit -m "feat: added sparkle surface controller"
```

---

### Task 7: React component, hero integration, and end-to-end coverage

**Files:**

- Create: `src/helpers/idleCallback.ts`
- Create: `src/helpers/idleCallback.dom.test.ts`
- Create: `src/home-sections/Home/components/SparkleField/SparkleField.tsx`
- Create: `src/home-sections/Home/components/SparkleField/SparkleField.module.css`
- Create: `e2e/home-sparkle-field.spec.ts`
- Modify: `src/home-sections/Home/Home.tsx`
- Modify: `src/home-sections/Home/Home.module.css:1-9`
- Modify: `README.md`

**Interfaces:**

- Consumes: `createSparkleController`, `buildSparkleAtlas`, `resolveInitialSparkleTier`, and the types from Tasks 1–6.
- Produces: `requestIdle(callback: () => void): number`, `cancelIdle(handle: number): void`, the `SparkleField` component, and the DOM contract the e2e suite asserts: `data-testid="home-sparkle-field"`, `data-motion`, `data-running`, `data-ready`.

- [ ] **Step 1: Write the failing idle-callback test**

Create `src/helpers/idleCallback.dom.test.ts`. The `.dom.test.ts` suffix routes it to the jsdom project — jsdom has no `requestIdleCallback`, which is exactly the fallback path worth covering.

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import { cancelIdle, requestIdle } from '@/helpers/idleCallback'

afterEach(() => {
  vi.useRealTimers()
})

describe('requestIdle', () => {
  it('falls back to a timer where the browser has no idle callback', () => {
    vi.useFakeTimers()

    const callback = vi.fn()

    requestIdle(callback)

    expect(callback).not.toHaveBeenCalled()

    vi.runAllTimers()

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does not fire a cancelled callback', () => {
    vi.useFakeTimers()

    const callback = vi.fn()

    cancelIdle(requestIdle(callback))
    vi.runAllTimers()

    expect(callback).not.toHaveBeenCalled()
  })

  it('prefers the native idle callback where the browser provides one', () => {
    const native = vi.fn().mockReturnValue(42)

    vi.stubGlobal('requestIdleCallback', native)

    const callback = vi.fn()
    const handle = requestIdle(callback)

    expect(native).toHaveBeenCalledTimes(1)
    expect(handle).toBe(42)

    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/helpers/idleCallback.dom.test.ts`
Expected: FAIL — `Failed to resolve import "@/helpers/idleCallback"`.

- [ ] **Step 3: Write the idle-callback helper**

Create `src/helpers/idleCallback.ts`:

```ts
/** Delay in milliseconds used where `requestIdleCallback` is unavailable, long enough to clear hydration. */
const IDLE_FALLBACK_DELAY_MS = 200

/** Narrows the optional `requestIdleCallback` global without assuming it exists. */
const readRequestIdleCallback = (): typeof requestIdleCallback | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const candidate = Reflect.get(window, 'requestIdleCallback')

  return typeof candidate === 'function' ? candidate.bind(window) : null
}

/** Narrows the optional `cancelIdleCallback` global without assuming it exists. */
const readCancelIdleCallback = (): typeof cancelIdleCallback | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const candidate = Reflect.get(window, 'cancelIdleCallback')

  return typeof candidate === 'function' ? candidate.bind(window) : null
}

/**
 * Defers work until the browser is idle, falling back to a short timer in
 * engines that never shipped `requestIdleCallback`. Returns a handle whose
 * meaning depends on which path was taken, so it must only be passed to
 * `cancelIdle`.
 */
export const requestIdle = (callback: () => void): number => {
  const native = readRequestIdleCallback()

  if (native) {
    return native(() => callback())
  }

  return window.setTimeout(callback, IDLE_FALLBACK_DELAY_MS)
}

/** Cancels a deferral created by `requestIdle`, whichever path it took. */
export const cancelIdle = (handle: number): void => {
  const native = readCancelIdleCallback()

  if (native) {
    native(handle)

    return
  }

  if (typeof window !== 'undefined') {
    window.clearTimeout(handle)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/helpers/idleCallback.dom.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Write the component styles**

Create `src/home-sections/Home/components/SparkleField/SparkleField.module.css`. The layer sits at `z-index: -1` inside the section's isolated stacking context, so no existing child needs a z-index of its own.

```css
.field {
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0;
  transition: opacity 800ms ease-out;
  pointer-events: none;
}

.field[data-ready='true'] {
  opacity: 1;
}

.canvas {
  display: block;
  width: 100%;
  height: 100%;
  color: var(--g-color-line-brand);
  mask-image: linear-gradient(
    to bottom,
    rgb(0 0 0 / 100%) 0%,
    rgb(0 0 0 / 100%) 55%,
    rgb(0 0 0 / 0%) 88%
  );
}

@media (prefers-reduced-motion: reduce) {
  .field {
    transition: none;
  }
}
```

- [ ] **Step 6: Write the component**

Create `src/home-sections/Home/components/SparkleField/SparkleField.tsx`:

```tsx
'use client'

import styles from './SparkleField.module.css'

import { useCallback, useEffect, useRef, useState } from 'react'

import { buildSparkleAtlas } from '@/home-sections/Home/helpers/sparkleSprites'
import {
  createSparkleController,
  ISparkleController,
} from '@/home-sections/Home/helpers/sparkleController'
import { resolveInitialSparkleTier } from '@/home-sections/Home/helpers/sparkleGovernor'
import { prefersReducedMotion } from '@/helpers/prefersReducedMotion'
import {
  ESparkleTier,
  ISparkleRasterContext,
  ISpriteSurface,
} from '@/home-sections/Home/types/home.type'

/** Media query whose match means the visitor has a precise pointer worth reacting to. */
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

/** Media query used to keep the field in step with the OS reduced-motion setting. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Media query whose match means the primary input is coarse, which correlates with weaker GPUs. */
const COARSE_POINTER_QUERY = '(pointer: coarse)'

/** Reads the optional `navigator.deviceMemory` signal without assuming the browser exposes it. */
const readDeviceMemory = (): number | undefined => {
  const candidate = Reflect.get(navigator, 'deviceMemory')

  return typeof candidate === 'number' ? candidate : undefined
}

/** Allocates a detached canvas to bake one sprite frame into, on the main thread. */
const createDomSpriteSurface = (size: number): ISpriteSurface | null => {
  const canvas = document.createElement('canvas')

  canvas.width = size
  canvas.height = size

  const context: ISparkleRasterContext | null = canvas.getContext('2d')

  return context ? { image: canvas, context } : null
}

export const SparkleField = () => {
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controllerRef = useRef<ISparkleController | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const isRectStaleRef = useRef(true)

  const [isReducedMotion, setIsReducedMotion] = useState(prefersReducedMotion)
  const [isRunning, setIsRunning] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const readFieldRect = useCallback((): DOMRect | null => {
    const field = fieldRef.current

    if (!field) {
      return null
    }

    if (isRectStaleRef.current || !rectRef.current) {
      rectRef.current = field.getBoundingClientRect()
      isRectStaleRef.current = false
    }

    return rectRef.current
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const onChange = () => setIsReducedMotion(query.matches)

    query.addEventListener('change', onChange)

    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const field = fieldRef.current
    const canvas = canvasRef.current

    if (!field || !canvas) {
      return
    }

    const context = canvas.getContext('2d', { alpha: true, desynchronized: true })

    if (!context) {
      return
    }

    const initialTier = isReducedMotion
      ? ESparkleTier.static
      : resolveInitialSparkleTier({
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: readDeviceMemory(),
          devicePixelRatio: window.devicePixelRatio,
          isCoarsePointer: window.matchMedia(COARSE_POINTER_QUERY).matches,
        })

    const controller = createSparkleController({
      context,
      buildAtlas: (tier, devicePixelRatio) =>
        buildSparkleAtlas(createDomSpriteSurface, {
          devicePixelRatio,
          color: window.getComputedStyle(canvas).color,
          hasGlow: tier.hasGlow,
        }),
      resizeSurface: (widthPx, heightPx) => {
        canvas.width = Math.max(1, Math.round(widthPx))
        canvas.height = Math.max(1, Math.round(heightPx))
      },
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (handle) => window.cancelAnimationFrame(handle),
      initialTier,
    })

    controllerRef.current = controller

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (!entry) {
        return
      }

      isRectStaleRef.current = true
      controller.setViewport(
        entry.contentRect.width,
        entry.contentRect.height,
        window.devicePixelRatio,
      )
      setIsReady(true)
    })

    resizeObserver.observe(field)

    const intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0]

      if (!entry) {
        return
      }

      isRectStaleRef.current = true

      if (entry.isIntersecting && !document.hidden) {
        controller.start()
      } else {
        controller.stop()
      }

      setIsRunning(controller.isRunning)
    })

    intersectionObserver.observe(field)

    const onVisibilityChange = () => {
      if (document.hidden) {
        controller.stop()
      } else {
        controller.start()
      }

      setIsRunning(controller.isRunning)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    const onScroll = () => {
      isRectStaleRef.current = true
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    const hasFinePointer = window.matchMedia(FINE_POINTER_QUERY).matches
    const section = field.parentElement

    const onPointerMove = (event: PointerEvent) => {
      const rect = readFieldRect()

      if (!rect) {
        return
      }

      controller.setPointerTarget({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    }

    const onPointerLeave = () => controller.setPointerTarget(null)

    if (hasFinePointer && section && !isReducedMotion) {
      section.addEventListener('pointermove', onPointerMove, { passive: true })
      section.addEventListener('pointerleave', onPointerLeave, { passive: true })
    }

    return () => {
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('scroll', onScroll)

      if (hasFinePointer && section && !isReducedMotion) {
        section.removeEventListener('pointermove', onPointerMove)
        section.removeEventListener('pointerleave', onPointerLeave)
      }

      controller.destroy()
      controllerRef.current = null
    }
  }, [isReducedMotion, readFieldRect])

  return (
    <div
      ref={fieldRef}
      className={styles.field}
      aria-hidden="true"
      data-motion={isReducedMotion ? 'static' : 'animated'}
      data-running={isRunning ? 'true' : 'false'}
      data-ready={isReady ? 'true' : 'false'}
    >
      <canvas ref={canvasRef} className={styles.canvas} data-testid="home-sparkle-field" />
    </div>
  )
}

export default SparkleField
```

- [ ] **Step 7: Mount the field in the hero**

Modify `src/home-sections/Home/Home.tsx` — add the dynamic import, the idle gate, and the field itself:

```tsx
'use client'

import styles from './Home.module.css'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'

import { ETabID } from '@/constants/header.constants'
import { Tag } from '@/components/Tag/Tag'
import { Sparkle } from '@/home-sections/Home/components/Sparkle/Sparkle'
import { cancelIdle, requestIdle } from '@/helpers/idleCallback'

/**
 * Decorative only, so it is kept out of the server payload and off the hero's
 * LCP path entirely; it is requested once the browser reports itself idle.
 */
const SparkleField = dynamic(
  () =>
    import('@/home-sections/Home/components/SparkleField/SparkleField').then(
      (module) => module.SparkleField,
    ),
  { ssr: false },
)

export const Home = () => {
  const { t } = useTranslation()

  const [isFieldEnabled, setIsFieldEnabled] = useState(false)

  const lastName = t('lastName')
  const lastNameChars = Array.from(lastName)
  const lastGlyph = lastNameChars.at(-1) ?? ''
  const lastNameHead = lastNameChars.slice(0, -1).join('')

  useEffect(() => {
    const handle = requestIdle(() => setIsFieldEnabled(true))

    return () => cancelIdle(handle)
  }, [])

  return (
    <section id={ETabID.home} className={styles.section}>
      {isFieldEnabled && <SparkleField />}

      <Tag title={t('headerTabs.home')} />

      <h2 className={styles.header}>
        {t('Im')} {t('firstName')}{' '}
        <span className={styles.lastName}>
          {lastNameHead}
          {lastGlyph && (
            <span className={styles.lastGlyph}>
              {lastGlyph}
              <span className={styles.sparkle}>
                <Sparkle />
              </span>
            </span>
          )}
        </span>
      </h2>

      <h3 className={styles.profession}>Software Engineer</h3>
    </section>
  )
}

export default Home
```

- [ ] **Step 8: Give the section its own stacking context**

Modify the `.section` rule at the top of `src/home-sections/Home/Home.module.css`. `isolation: isolate` is what lets the field sit at `z-index: -1` behind the text without falling behind the page itself — and it means no existing child rule has to change.

```css
.section {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: var(--min-height-section);
  margin-top: 25px;
  margin-bottom: calc(2 * var(--body-padding));
  text-align: start;
  isolation: isolate;
}
```

- [ ] **Step 9: Write the end-to-end coverage**

Create `e2e/home-sparkle-field.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

import { ETabID } from '@/constants/header.constants'
import en from '@public/locales/en.json'

test.describe('home sparkle field', () => {
  test('fades the field in behind the hero', async ({ page }) => {
    await page.goto('/')

    const canvas = page.getByTestId('home-sparkle-field')

    await expect(canvas).toBeAttached()

    const field = page.locator('[data-testid="home-sparkle-field"]').locator('..')

    await expect(field).toHaveAttribute('data-ready', 'true')
    await expect(field).toHaveAttribute('data-motion', 'animated')
  })

  test('leaves the headline fully readable', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('home-sparkle-field')).toBeAttached()
    await expect(page.locator(`section#${ETabID.home} h2`)).toBeVisible()
    await expect(page.locator(`section#${ETabID.home} h3`)).toBeVisible()
  })

  test('holds a still frame when the visitor prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const field = page.locator('[data-testid="home-sparkle-field"]').locator('..')

    await expect(field).toBeAttached()
    await expect(field).toHaveAttribute('data-motion', 'static')
  })

  test('stops animating once the hero is scrolled away', async ({ page }) => {
    await page.goto('/')

    const field = page.locator('[data-testid="home-sparkle-field"]').locator('..')

    await expect(field).toHaveAttribute('data-ready', 'true')

    await page.getByRole('tab', { name: en.headerTabs.resume }).click()
    await expect(page.locator(`section#${ETabID.resume}`)).toBeInViewport({ timeout: 10_000 })

    await expect(field).toHaveAttribute('data-running', 'false', { timeout: 10_000 })
  })

  test('never blocks the pointer from reaching the hero', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('home-sparkle-field')).toBeAttached()

    const isTransparentToPointer = await page
      .locator('[data-testid="home-sparkle-field"]')
      .locator('..')
      .evaluate((node) => getComputedStyle(node).pointerEvents === 'none')

    expect(isTransparentToPointer).toBe(true)
  })
})
```

- [ ] **Step 10: Run the end-to-end suite**

Run: `node_modules/.bin/next build && node_modules/.bin/playwright test home-sparkle-field`
Expected: PASS across all six projects. The field must reach `data-ready="true"` even on mobile projects, where the pointer listeners are never attached.

- [ ] **Step 11: Confirm nothing regressed**

Run: `node_modules/.bin/playwright test`
Expected: PASS — in particular `smoke.spec.ts`'s "loads without uncaught errors", which fails if any code path logs an error.

- [ ] **Step 12: Update the README**

Modify `README.md` with these two exact edits.

First, extend the section-based SPA bullet. Replace:

```markdown
- **Single route, section-based SPA.** The home page (`/`) composes independent sections — `Home`, `Portfolio`, `About Me` (with the embedded contact form), `Resume` (with a downloadable CV), and `Writing` (articles & talks, revealed once populated) — behind a persistent layout shell rendered inside a `<Suspense>` boundary.
```

with:

```markdown
- **Single route, section-based SPA.** The home page (`/`) composes independent sections — `Home` (a hero backed by a decorative, pointer-reactive sparkle field on Canvas 2D), `Portfolio`, `About Me` (with the embedded contact form), `Resume` (with a downloadable CV), and `Writing` (articles & talks, revealed once populated) — behind a persistent layout shell rendered inside a `<Suspense>` boundary.
```

Second, record the Home-local helpers directory in the tree. Replace:

```
│     ├─ components/    #   section-local sub-components
│     ├─ actions/       #   'use server' server actions
│     ├─ schemas/       #   Zod schemas
│     └─ types/         #   section-local types
```

with:

```
│     ├─ components/    #   section-local sub-components
│     ├─ actions/       #   'use server' server actions
│     ├─ schemas/       #   Zod schemas
│     ├─ helpers/       #   section-local pure helpers
│     └─ types/         #   section-local types
```

Then run `node_modules/.bin/prettier --write README.md`.

- [ ] **Step 13: Validate and commit**

```bash
node_modules/.bin/tsc --pretty --noEmit
node_modules/.bin/eslint .
node_modules/.bin/stylelint "src/**/*.css"
node_modules/.bin/prettier --check .
node_modules/.bin/vitest run
git add src/helpers/idleCallback.ts src/helpers/idleCallback.dom.test.ts src/home-sections/Home/components/SparkleField src/home-sections/Home/Home.tsx src/home-sections/Home/Home.module.css e2e/home-sparkle-field.spec.ts README.md
git commit -m "feat: added sparkle field to the home hero"
```

Note: `stylelint` reports three pre-existing errors in `src/styles/globals.css`. Confirm no new error names a file from this task.

---

### Task 8: OffscreenCanvas worker transport

**Files:**

- Create: `src/home-sections/Home/workers/sparkleField.worker.ts`
- Create: `src/home-sections/Home/helpers/sparkleTransport.ts`
- Create: `src/home-sections/Home/helpers/sparkleTransport.test.ts`
- Modify: `src/home-sections/Home/types/home.type.ts`
- Modify: `src/home-sections/Home/components/SparkleField/SparkleField.tsx`
- Modify: `README.md`

**Interfaces:**

- Consumes: `createSparkleController`, `buildSparkleAtlas`, and everything from Tasks 1–7.
- Produces:
  - `TSparkleWorkerInbound` / `TSparkleWorkerOutbound` discriminated unions
  - `canUseSparkleWorker(scope: { hasWorker: boolean; hasOffscreenCanvas: boolean; isReducedMotion: boolean }): boolean`
  - `isSparkleWorkerMessage(value: unknown): value is TSparkleWorkerOutbound`

The worker buys jank isolation, not throughput: the field keeps animating while the main thread is busy hydrating and mounting the lazily-loaded sections below. It is strictly additive — every path in Task 7 remains the fallback.

- [ ] **Step 1: Add the message contract to the types module**

Append to `src/home-sections/Home/types/home.type.ts`:

```ts
export type TSparkleWorkerInbound =
  | {
      /** Hands the transferred surface over and starts the controller. */
      type: 'init'
      /** Canvas detached from the host element via `transferControlToOffscreen`. */
      canvas: OffscreenCanvas
      /** Field width in CSS pixels at hand-off time. */
      width: number
      /** Field height in CSS pixels at hand-off time. */
      height: number
      /** Physical device pixel ratio, before any tier cap. */
      devicePixelRatio: number
      /** Tier seeded on the main thread, where the device signals live. */
      tier: ESparkleTier
      /** Resolved brand colour, since the worker cannot read computed styles. */
      color: string
    }
  | {
      /** Reports a new field size after a resize. */
      type: 'viewport'
      /** Field width in CSS pixels. */
      width: number
      /** Field height in CSS pixels. */
      height: number
      /** Physical device pixel ratio, before any tier cap. */
      devicePixelRatio: number
    }
  | {
      /** Forwards the pointer, coalesced to at most one message per frame. */
      type: 'pointer'
      /** Latest position in CSS pixels relative to the field, or `null` once it leaves. */
      position: IPointerPosition | null
    }
  | {
      /** Starts or stops the loop as visibility and intersection change. */
      type: 'run'
      /** Whether the field should currently be animating. */
      isRunning: boolean
    }
  | {
      /** Releases every resource before the host drops the worker. */
      type: 'destroy'
    }

export type TSparkleWorkerOutbound =
  | {
      /** Signals that the worker booted, so the host may safely transfer the canvas. */
      type: 'ready'
    }
  | {
      /** Reports the tier the governor settled on, so the host can mirror it in the DOM. */
      type: 'tier'
      /** Tier now in force. */
      tier: ESparkleTier
    }
```

- [ ] **Step 2: Write the failing transport test**

Create `src/home-sections/Home/helpers/sparkleTransport.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  canUseSparkleWorker,
  isSparkleWorkerMessage,
} from '@/home-sections/Home/helpers/sparkleTransport'
import { ESparkleTier } from '@/home-sections/Home/types/home.type'

describe('canUseSparkleWorker', () => {
  it('accepts a browser with both capabilities and no motion preference', () => {
    expect(
      canUseSparkleWorker({ hasWorker: true, hasOffscreenCanvas: true, isReducedMotion: false }),
    ).toBe(true)
  })

  it('declines where workers are unavailable', () => {
    expect(
      canUseSparkleWorker({ hasWorker: false, hasOffscreenCanvas: true, isReducedMotion: false }),
    ).toBe(false)
  })

  it('declines where the canvas cannot be transferred', () => {
    expect(
      canUseSparkleWorker({ hasWorker: true, hasOffscreenCanvas: false, isReducedMotion: false }),
    ).toBe(false)
  })

  it('declines for a visitor who prefers reduced motion, since one still frame needs no worker', () => {
    expect(
      canUseSparkleWorker({ hasWorker: true, hasOffscreenCanvas: true, isReducedMotion: true }),
    ).toBe(false)
  })
})

describe('isSparkleWorkerMessage', () => {
  it('accepts the ready handshake', () => {
    expect(isSparkleWorkerMessage({ type: 'ready' })).toBe(true)
  })

  it('accepts a tier report', () => {
    expect(isSparkleWorkerMessage({ type: 'tier', tier: ESparkleTier.low })).toBe(true)
  })

  it('rejects a tier report carrying an unknown tier', () => {
    expect(isSparkleWorkerMessage({ type: 'tier', tier: 'turbo' })).toBe(false)
  })

  it('rejects anything that is not a tagged object', () => {
    expect(isSparkleWorkerMessage(null)).toBe(false)
    expect(isSparkleWorkerMessage('ready')).toBe(false)
    expect(isSparkleWorkerMessage({ kind: 'ready' })).toBe(false)
    expect(isSparkleWorkerMessage({ type: 'exploded' })).toBe(false)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleTransport.test.ts`
Expected: FAIL — `Failed to resolve import "@/home-sections/Home/helpers/sparkleTransport"`.

- [ ] **Step 4: Write the transport helpers**

Create `src/home-sections/Home/helpers/sparkleTransport.ts`:

```ts
import { ESparkleTier, TSparkleWorkerOutbound } from '@/home-sections/Home/types/home.type'

/** Every tier the worker is allowed to report back, used to validate untrusted messages. */
const KNOWN_TIERS: string[] = [
  ESparkleTier.high,
  ESparkleTier.medium,
  ESparkleTier.low,
  ESparkleTier.static,
]

export interface ISparkleWorkerCapabilities {
  /** Whether the environment can construct a `Worker` at all. */
  hasWorker: boolean
  /** Whether the canvas can be detached with `transferControlToOffscreen`. */
  hasOffscreenCanvas: boolean
  /** Whether the visitor asked for reduced motion, which needs no loop and therefore no worker. */
  isReducedMotion: boolean
}

/**
 * Decides whether the worker transport is worth attempting. It is a pure
 * enhancement: a `false` here simply leaves the main-thread path in charge.
 */
export const canUseSparkleWorker = (capabilities: ISparkleWorkerCapabilities): boolean =>
  capabilities.hasWorker && capabilities.hasOffscreenCanvas && !capabilities.isReducedMotion

/**
 * Narrows a message that arrived over `postMessage`. Worker payloads cross a
 * structured-clone boundary and are untyped on arrival, so they are validated
 * rather than trusted.
 */
export const isSparkleWorkerMessage = (value: unknown): value is TSparkleWorkerOutbound => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const type = Reflect.get(value, 'type')

  if (type === 'ready') {
    return true
  }

  if (type !== 'tier') {
    return false
  }

  const tier = Reflect.get(value, 'tier')

  return typeof tier === 'string' && KNOWN_TIERS.includes(tier)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/home-sections/Home/helpers/sparkleTransport.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 6: Write the worker**

Create `src/home-sections/Home/workers/sparkleField.worker.ts`. It uses only globals that exist in both the DOM and worker lib definitions — the project's `tsconfig.json` has no `webworker` lib, and adding one conflicts with `dom`.

```ts
import {
  createSparkleController,
  ISparkleController,
} from '@/home-sections/Home/helpers/sparkleController'
import { buildSparkleAtlas } from '@/home-sections/Home/helpers/sparkleSprites'
import {
  ISparkleRasterContext,
  ISpriteSurface,
  TSparkleWorkerInbound,
} from '@/home-sections/Home/types/home.type'

/** Allocates an offscreen surface to bake one sprite frame into. */
const createOffscreenSpriteSurface = (size: number): ISpriteSurface | null => {
  const canvas = new OffscreenCanvas(size, size)
  const context: ISparkleRasterContext | null = canvas.getContext('2d')

  return context ? { image: canvas, context } : null
}

let controller: ISparkleController | null = null
let surface: OffscreenCanvas | null = null

const onInit = (message: Extract<TSparkleWorkerInbound, { type: 'init' }>): void => {
  surface = message.canvas

  const context = surface.getContext('2d', { alpha: true, desynchronized: true })

  if (!context) {
    return
  }

  const target = surface

  controller = createSparkleController({
    context,
    buildAtlas: (tier, devicePixelRatio) =>
      buildSparkleAtlas(createOffscreenSpriteSurface, {
        devicePixelRatio,
        color: message.color,
        hasGlow: tier.hasGlow,
      }),
    resizeSurface: (widthPx, heightPx) => {
      target.width = Math.max(1, Math.round(widthPx))
      target.height = Math.max(1, Math.round(heightPx))
    },
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (handle) => cancelAnimationFrame(handle),
    initialTier: message.tier,
    onTierChange: (tier) => postMessage({ type: 'tier', tier }),
  })

  controller.setViewport(message.width, message.height, message.devicePixelRatio)
}

addEventListener('message', (event: MessageEvent<TSparkleWorkerInbound>) => {
  const message = event.data

  switch (message.type) {
    case 'init':
      onInit(message)

      return
    case 'viewport':
      controller?.setViewport(message.width, message.height, message.devicePixelRatio)

      return
    case 'pointer':
      controller?.setPointerTarget(message.position)

      return
    case 'run':
      if (message.isRunning) {
        controller?.start()
      } else {
        controller?.stop()
      }

      return
    case 'destroy':
      controller?.destroy()
      controller = null
      surface = null
  }
})

postMessage({ type: 'ready' })
```

- [ ] **Step 7: Wire the transport into the component**

Modify `src/home-sections/Home/components/SparkleField/SparkleField.tsx`. The main-thread branch from Task 7 stays exactly as written and becomes the fallback. Add the worker branch around it, following this order strictly — the canvas is only transferred after the worker proves it booted, because `transferControlToOffscreen` cannot be undone:

1. Add a `canvasKey` piece of state, initialised to `0`, and pass it as `key={canvasKey}` on the `<canvas>`. Incrementing it discards a detached element and remounts a fresh one.
2. Inside the main effect, before creating the main-thread controller, evaluate:

```tsx
const isWorkerViable = canUseSparkleWorker({
  hasWorker: typeof Worker === 'function',
  hasOffscreenCanvas: typeof canvas.transferControlToOffscreen === 'function',
  isReducedMotion,
})
```

3. When `isWorkerViable` is false, run the Task 7 main-thread path unchanged.
4. When it is true, construct the worker and wait for its handshake before transferring:

```tsx
const worker = new Worker(new URL('../../workers/sparkleField.worker.ts', import.meta.url))

let isTransferred = false

const onWorkerMessage = (event: MessageEvent) => {
  if (!isSparkleWorkerMessage(event.data)) {
    return
  }

  if (event.data.type === 'ready' && !isTransferred) {
    isTransferred = true

    const offscreen = canvas.transferControlToOffscreen()
    const rect = field.getBoundingClientRect()

    worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        width: rect.width,
        height: rect.height,
        devicePixelRatio: window.devicePixelRatio,
        tier: initialTier,
        color: window.getComputedStyle(canvas).color,
      },
      [offscreen],
    )

    setIsReady(true)
  }
}

const onWorkerError = (event: Event) => {
  event.preventDefault()
  worker.terminate()

  if (isTransferred) {
    setCanvasKey((current) => current + 1)
  }

  setUseWorker(false)
}

worker.addEventListener('message', onWorkerMessage)
worker.addEventListener('error', onWorkerError)
```

5. Add a `useState` boolean `useWorker`, initialised to `true`, and include it in the effect's dependency array. `onWorkerError` flipping it to `false` re-runs the effect on a fresh canvas in main-thread mode.
6. In the worker branch, `ResizeObserver`, `IntersectionObserver`, `visibilitychange`, and the pointer listeners post `viewport`, `run`, and `pointer` messages instead of calling a local controller. Coalesce pointer messages with a `requestAnimationFrame` guard so at most one is posted per frame:

```tsx
let pointerFrame: number | null = null
let latestPointer: IPointerPosition | null = null

const flushPointer = () => {
  pointerFrame = null
  worker.postMessage({ type: 'pointer', position: latestPointer })
}

const onPointerMove = (event: PointerEvent) => {
  const rect = readFieldRect()

  if (!rect) {
    return
  }

  latestPointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }

  if (pointerFrame === null) {
    pointerFrame = window.requestAnimationFrame(flushPointer)
  }
}
```

7. `data-running` in worker mode reflects the last `run` message the component sent, held in the existing `isRunning` state.
8. The cleanup must `worker.postMessage({ type: 'destroy' })`, `worker.terminate()`, remove both worker listeners, and cancel any pending `pointerFrame`.

Note: `onWorkerError` calls `event.preventDefault()` because an unhandled worker error surfaces as a console error, and `e2e/smoke.spec.ts` fails the build on any console error.

- [ ] **Step 8: Verify both transports behave identically**

Run: `node_modules/.bin/next build && node_modules/.bin/playwright test`
Expected: PASS across all six projects. Chromium and Firefox exercise the worker path; older Safari device profiles exercise the fallback. The assertions from Task 7 are unchanged, which is the point — the transport must be invisible from the outside.

- [ ] **Step 9: Confirm the fallback really recovers**

Temporarily add `throw new Error('forced')` as the first statement of `src/home-sections/Home/workers/sparkleField.worker.ts`, then run:

`node_modules/.bin/next build && node_modules/.bin/playwright test home-sparkle-field --project=chromium`

Expected: PASS — the field still reaches `data-ready="true"` through the main-thread fallback, and no console error escapes. Remove the thrown error afterwards and re-run to confirm the normal path is restored.

- [ ] **Step 10: Update the README**

Two exact edits, both extending what Task 7 wrote.

First, replace the sparkle-field clause added in Task 7:

```markdown
- **Single route, section-based SPA.** The home page (`/`) composes independent sections — `Home` (a hero backed by a decorative, pointer-reactive sparkle field on Canvas 2D), `Portfolio`, ...
```

with the same bullet whose parenthetical reads:

```markdown
`Home` (a hero backed by a decorative, pointer-reactive sparkle field on Canvas 2D, rendered in an OffscreenCanvas worker where supported and on the main thread otherwise, with a runtime governor scaling particle count and pixel ratio to the device)
```

Second, add the worker directory to the tree, right after the `helpers/` line added in Task 7:

```
│     ├─ helpers/       #   section-local pure helpers
│     ├─ workers/       #   section-local web workers
```

Then run `node_modules/.bin/prettier --write README.md`.

- [ ] **Step 11: Validate and commit**

```bash
node_modules/.bin/tsc --pretty --noEmit
node_modules/.bin/eslint .
node_modules/.bin/stylelint "src/**/*.css"
node_modules/.bin/prettier --check .
node_modules/.bin/vitest run
git add src/home-sections/Home/workers src/home-sections/Home/helpers/sparkleTransport.ts src/home-sections/Home/helpers/sparkleTransport.test.ts src/home-sections/Home/types/home.type.ts src/home-sections/Home/components/SparkleField/SparkleField.tsx README.md
git commit -m "feat: added offscreen worker transport for the sparkle field"
```

---

## Coverage against the spec

| Spec section                     | Task    |
| -------------------------------- | ------- |
| §5 File layout                   | 1–8     |
| §5 Glyph deduplication           | 1       |
| §6 Types                         | 1, 8    |
| §7 Rendering pipeline            | 4       |
| §7.5 Sizing and refit            | 2, 6    |
| §7.6 Area-derived particle count | 2       |
| §7.7 Delta-time motion and clamp | 2, 5    |
| §8 Pointer interaction           | 2, 5, 7 |
| §8 Coalesced pointer messages    | 8       |
| §9 Worker, handoff, recovery     | 8       |
| §10 Adaptive quality governor    | 3, 6    |
| §11 Lifecycle and pausing        | 7       |
| §12 Seamless mount               | 7       |
| §13 Layout and accessibility     | 7       |
| §14 Edge cases                   | 2–8     |
| §15 Constants                    | 1       |
| §16 Testing                      | 2–8     |
| §17 Documentation impact         | 7, 8    |
| §18 Validation                   | every   |

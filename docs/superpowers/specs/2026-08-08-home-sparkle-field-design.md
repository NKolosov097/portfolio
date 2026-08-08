# Home Sparkle Field — Design

**Date:** 2026-08-08
**Status:** Approved (design), pending implementation plan
**Area:** `src/home-sections/Home/`

---

## 1. Context

The `Home` section (`src/home-sections/Home/Home.tsx`) is a full-viewport hero
(`min-height: var(--min-height-section)`) whose content is pinned to the bottom
via `justify-content: flex-end`. It renders only three elements — `Tag`, the
`I'm Nikita Kolosov` headline, and the `Software Engineer` subtitle — leaving
roughly the top 60% of the first screen visually empty.

The goal chosen for that space is **atmosphere**, not conversion, navigation, or
extra information: a living background layer behind the existing text.

Everything informational is already placed elsewhere and must not be duplicated
here:

| Content                                   | Where it already lives |
| ----------------------------------------- | ---------------------- |
| Avatar, specialization, age, availability | `Aside`                |
| Metrics (×1.4, 87%, ×1.37, AA), e-mail    | `AboutMe`              |
| Education, experience, tools, CV download | `Resume`               |
| Projects, articles                        | `Portfolio`, `Writing` |

## 2. Goals

- Fill the empty hero area with a decorative field of drifting, twinkling
  sparkle glyphs rendered behind the existing headline.
- React to the pointer **per particle**: sparkles near the cursor grow brighter
  and larger and are gently pushed outward.
- Reuse the existing brand vocabulary — the same 4-point glyph already used by
  `Sparkle`, the same white core with a `--g-color-line-brand` glow.
- Stay smooth on low-end devices, degrading measurably rather than optimistically.
- Add zero new runtime dependencies.

## 3. Non-goals

- No new user-facing copy. The field is decorative and `aria-hidden`, so
  `public/locales/en.json` and `public/locales/ru.json` are untouched.
- No WebGL / `three.js`. Hundreds of KB of bundle for a field of sparks violates
  YAGNI for this task.
- No change to the headline, its typography, or the section's layout rules
  beyond establishing a stacking context.
- No configuration UI, theme switch, or user-tunable density.

## 4. Chosen approach

**Canvas 2D + `requestAnimationFrame`**, with an OffscreenCanvas worker as a
progressive-enhancement transport and a measurement-driven quality governor.

### Rejected alternatives

| Alternative                     | Why rejected                                                                                                                                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOM `<span>` + CSS `@keyframes` | Per-particle distance-to-cursor response cannot be expressed in CSS; it degrades to a single radial-gradient spotlight, which loses the core of the chosen concept. Also 60+ animated nodes.                                                       |
| WebGL / `three.js`              | Bundle cost disproportionate to a decorative layer.                                                                                                                                                                                                |
| Typed arrays (SoA) for state    | At 60–220 particles there is no measurable win, and it costs readability and type precision. The property that actually matters — **zero allocation inside the frame loop** — is achieved by allocating particles once and mutating them in place. |

## 5. File layout

```
src/home-sections/Home/
  components/
    Sparkle/
      Sparkle.tsx                 (existing — glyph path moves to a constant)
      Sparkle.module.css          (existing)
    SparkleField/
      SparkleField.tsx            client component: mode selection, lifecycle
      SparkleField.module.css     layer positioning, mask, brand colour, fade-in
  helpers/
    sparkleField.ts               pure particle maths (no DOM)
    sparkleField.test.ts
    sparkleSprites.ts             sprite atlas builder (context-agnostic)
    sparkleRenderer.ts            draw routine, accepts either 2D context type
    sparkleGovernor.ts            frame-time sampling and tier decisions (pure)
    sparkleGovernor.test.ts
    sparkleLoop.ts                rAF loop wiring renderer + governor
  workers/
    sparkleField.worker.ts        transport shell only (~40 lines)
  types/
    home.type.ts                  particle, pointer, tier, config types
src/constants/
  home.constants.ts               field configuration and tier table
```

`sparkleRenderer`, `sparkleLoop`, `sparkleGovernor`, `sparkleSprites` and
`sparkleField` are shared verbatim between the worker and main-thread paths.
Only the transport shell differs.

### Glyph deduplication

The glyph path is currently hard-coded inside `Sparkle.tsx`:

```
M12 0Q13 11 24 12 13 13 12 24 11 13 0 12 11 11 12 0Z
```

It is extracted into an exported constant in `src/constants/home.constants.ts`
and consumed by both `Sparkle.tsx` (as the SVG `d` attribute) and the sprite
builder (as a `Path2D`). One source of truth.

## 6. Types

Declared in `src/home-sections/Home/types/home.type.ts`, every field carrying
JSDoc that explains intent:

- `ISparkleParticle` — position, base size, base opacity, twinkle phase and
  speed, drift velocity, and a depth factor used for parallax. Mutated in place.
- `IPointerPosition` — smoothed pointer coordinates in CSS pixels relative to
  the field, plus whether the pointer is currently inside the section.
- `ESparkleTier` — `high | medium | low | static` (enum, matching the project's
  `ETabID` / `ELanguage` convention).
- `ISparkleTierConfig` — max particle count, DPR ceiling, glow on/off.
- `ISparkleFieldConfig` — density, size range, drift and twinkle speed ranges,
  influence radius, size/alpha boosts, fade-in duration.
- `ISparkleGovernorState` — rolling frame-time window, current tier, and whether
  the one permitted upgrade has been spent.

## 7. Rendering pipeline

1. **Sprite atlas.** The glyph is rasterised once into an `OffscreenCanvas`
   (falling back to a detached `<canvas>` where unavailable) as
   `4 size buckets × 8 rotation steps`. The glyph has 4-fold rotational
   symmetry, so 8 steps across 90° cover a full visual rotation cycle. Each
   sprite bakes the white core **and** the brand-coloured glow, so no
   `shadowBlur` is ever executed at frame time. Peak atlas footprint is ~32
   sprites of ≤32 px — negligible.
2. **Frame draw.** One `clearRect`, then one `drawImage` per particle. Continuous
   scaling between buckets is handled by `drawImage`'s destination size;
   rotation is handled by selecting an atlas frame. No `save`/`restore`,
   `rotate`, `filter`, or `shadowBlur` in the loop.
3. **Context creation.** `getContext('2d', { alpha: true, desynchronized: true })`.
4. **Colour.** The canvas element carries `color: var(--g-color-line-brand)` in
   CSS; the sprite builder reads it once via `getComputedStyle`. The colour stays
   in the design system rather than in JS. The theme is fixed to `dark`
   application-wide, so one read at initialisation is sufficient; the atlas is
   rebuilt on tier or DPR change anyway.
5. **Sizing.** A `ResizeObserver` on the host reports CSS size; backing-store
   size is `cssSize × min(devicePixelRatio, tier.dprCeiling)`. Resize triggers a
   debounced re-layout: particle count is recomputed, particles are repositioned
   proportionally rather than regenerated, and the atlas is rebuilt only when the
   effective DPR bucket changes.
6. **Particle count.** `clamp(round(area / DENSITY_AREA_PER_PARTICLE), MIN, tier.maxCount)`
   — density is derived from area, so a 4K display does not receive a thousand
   sparks and a phone does not receive a dozen.
7. **Motion.** Drift and twinkle advance on delta time, clamped to a maximum
   step (50 ms) so a tab returning from the background does not teleport the
   field. Particles wrap around the field edges.

## 8. Pointer interaction

- A single `pointermove` listener with `{ passive: true }` is attached to the
  section, writing raw coordinates into a ref. **No React state**, so pointer
  motion never triggers a re-render.
- Listeners are attached only when `matchMedia('(hover: hover) and (pointer: fine)')`
  matches. Touch devices get drift and twinkle only.
- The raw position is lerped toward each frame, so movement stays smooth under
  coarse or bursty `pointermove` delivery.
- Per particle: `influence = ease(max(0, 1 - distance / INFLUENCE_RADIUS))`.
  Influence scales size and alpha upward and applies a small outward
  displacement.
- `pointerleave` clears the target; the field relaxes back to its resting state
  through the same lerp, so there is no snap.
- On the worker path, pointer events are coalesced to **at most one
  `postMessage` per frame**.

## 9. Execution model

### Why a worker

An OffscreenCanvas worker does not buy throughput here — the particle maths is
sub-millisecond. It buys **jank isolation**: the animation keeps running while
the main thread is busy with hydration, i18n initialisation, and the mounting of
the lazily-loaded sections below. On low-end devices, main-thread contention is
precisely the failure mode.

Support: Chrome/Edge, Firefox 105+, Safari 16.4+. Everything else silently uses
the main-thread path.

### Handoff and failure recovery

`transferControlToOffscreen()` permanently detaches the element, so a naive
"transfer then hope" sequence has no recovery path. The sequence is therefore:

1. Feature-detect `HTMLCanvasElement.prototype.transferControlToOffscreen` and
   `Worker`. If absent → main-thread path.
2. Construct the worker. If construction throws → main-thread path, canvas
   untouched.
3. Wait for the worker's `ready` message. If it errors before `ready`, or does
   not report within a timeout → terminate, main-thread path, canvas untouched.
4. Only then transfer the canvas and post the initial config.
5. If the worker errors **after** transfer, the component discards the detached
   element by remounting the canvas under a new React `key` and runs the
   main-thread path on the fresh element.

The worker is terminated on unmount.

## 10. Adaptive quality governor

The initial tier is seeded from device signals, but every subsequent decision is
driven by **measurement**, not by guessing. Seeding is deliberately conservative,
since the governor can only grant one upgrade:

- `low` when `navigator.hardwareConcurrency <= 2`, or `navigator.deviceMemory <= 2`.
- `medium` when `navigator.hardwareConcurrency <= 4`, or `navigator.deviceMemory <= 4`,
  or `matchMedia('(pointer: coarse)')` matches, or `devicePixelRatio > 2`.
- `high` otherwise.

Both `hardwareConcurrency` and `deviceMemory` are optional in some browsers;
a missing signal is simply skipped rather than treated as a low value.

| Tier     | Max particles | DPR ceiling | Glow | Loop         |
| -------- | ------------- | ----------- | ---- | ------------ |
| `high`   | 220           | 2           | yes  | rAF          |
| `medium` | 120           | 1.5         | yes  | rAF          |
| `low`    | 60            | 1           | no   | rAF          |
| `static` | 60            | 1           | no   | single frame |

Windows are **non-overlapping**, not rolling. A decision consumes a full window
of samples and starts the next one empty, whatever the outcome — including "no
change needed". This matters twice over: a superseded regime's samples can never
contaminate the next decision (a sliding window lets a handful of fresh frames
flip a p90 that is still dominated by stale ones, which at the lowest animated
tier could trip the irreversible drop to `static` off frames that were actually
healthy), and the percentile sort then runs once per window rather than once per
frame, keeping it out of the very budget it measures.

Rules over each 60-frame window:

- p90 frame time worse than **20 ms** → drop one tier.
- p90 frame time better than **11 ms**, sustained for 240 frames → raise one
  tier, **at most once for the lifetime of the field**. The single-upgrade cap
  plus the gap between thresholds provides hysteresis; without it the field
  would oscillate between tiers.
- Already at `low` and p90 still worse than **24 ms** → `static`. A device that
  cannot hold the animation gets a quiet still field instead of a stuttering one.
- `static` is terminal for the session.

`sparkleGovernor.ts` is pure: it consumes a sequence of frame durations and its
own state, and returns the next state plus a tier decision. No DOM, no timers.
This makes the most safety-critical logic in the feature fully unit-testable —
including the window-reset property, which is asserted directly rather than
inferred from a tier sequence.

## 11. Lifecycle and pausing

The loop must not run when nobody can see it:

- `IntersectionObserver` on the section — scrolling down to `Portfolio` stops
  the loop entirely (the hero is at the top of the page, so this fires
  constantly in real use).
- `visibilitychange` — a hidden tab stops the loop.
- `prefers-reduced-motion` — resolved through the existing
  `src/helpers/prefersReducedMotion.ts` helper, with a live `change`
  subscription so toggling the OS setting takes effect without a reload. When
  reduced motion is requested the field renders a single static frame, attaches
  no pointer listeners, and starts no worker.
- Unmount — cancel rAF, disconnect both observers, remove listeners, terminate
  the worker. No callback may touch a canvas after unmount.

## 12. Seamless mount

The field must not compete with the hero's LCP or with hydration, and must not
pop into existence:

1. `next/dynamic` with `ssr: false` — the field is absent from the SSR payload,
   so the headline's LCP is unaffected.
2. The chunk is requested inside `requestIdleCallback` (with a `setTimeout`
   fallback for Safari), i.e. after hydration has settled.
3. The sprite atlas is built during that same idle window, so the first rendered
   frame is not a spike.
4. The canvas mounts at `opacity: 0`. After the first frame is painted, a CSS
   `opacity` transition of ~800 ms `ease-out` brings it to its working
   opacity — GPU-composited, no layout work.
5. Under `prefers-reduced-motion`, the fade is skipped and the static frame is
   shown at its final opacity immediately.

## 13. Layout and accessibility

- The `Home` section gains `position: relative`; the canvas is
  `position: absolute; inset: 0; z-index: 0; pointer-events: none`, and the
  existing content is raised to `z-index: 1`.
- The canvas carries `aria-hidden="true"` and is not focusable — it conveys no
  information.
- Text readability is preserved by a CSS `mask-image` that fades the canvas out
  toward the bottom of the section, where the headline sits.
- QA hooks, matching the project's existing conventions:
  - `data-testid="home-sparkle-field"` on the canvas.
  - `data-motion="animated" | "static"` on the host.
  - `data-running="true" | "false"` on the host, reflecting the loop state.

## 14. Edge cases

| Case                                                | Handling                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| SSR / no `window`                                   | Component is `ssr: false`; helpers guard `typeof window`.                                  |
| `prefers-reduced-motion` set, or toggled at runtime | Static frame, no rAF, no pointer listeners; live `change` subscription.                    |
| Touch / coarse pointer                              | No pointer listeners; drift and twinkle only.                                              |
| Canvas 2D context unavailable                       | Component renders nothing and logs nothing user-visible.                                   |
| `OffscreenCanvas` unsupported                       | Main-thread path.                                                                          |
| Worker fails before transfer                        | Terminate, main-thread path on the untouched canvas.                                       |
| Worker fails after transfer                         | Remount canvas under a new `key`, main-thread path.                                        |
| Tab hidden / section scrolled out                   | Loop stopped; `data-running="false"`.                                                      |
| Return from background (huge delta)                 | Delta clamped to 50 ms; no teleport.                                                       |
| Resize / orientation change                         | Debounced; particles repositioned proportionally, atlas rebuilt only on DPR bucket change. |
| Zero-size container (display none, 0×0)             | Loop not started until a non-zero size is observed.                                        |
| Extreme viewport (4K desktop / 320 px phone)        | Area-derived count with `MIN` floor and per-tier ceiling.                                  |
| Unmount during idle callback or worker handshake    | Cancellation flag checked before touching refs; idle callback cancelled.                   |
| Sustained low FPS                                   | Governor steps down, ultimately to `static`.                                               |
| Repeated fast mode switches                         | Single-upgrade cap and threshold gap prevent oscillation.                                  |

## 15. Constants

All field tuning lives in `src/constants/home.constants.ts` as exported
`SCREAMING_SNAKE_CASE` constants with JSDoc: the glyph path, density area per
particle, min particle count, size range, drift and twinkle speed ranges,
influence radius, size and alpha boosts, pointer lerp factor, fade-in duration
and target opacity, delta clamp, the tier table, the device-signal seeding
thresholds, and the governor thresholds and window sizes.

No magic numbers in component or helper bodies.

## 16. Testing

**vitest (unit, no DOM):**

- `sparkleField.test.ts` — particle creation with an injected RNG (deterministic),
  count resolution across viewport sizes and tiers, drift/wrap behaviour under a
  given delta, delta clamping, and pointer influence falloff (zero beyond the
  radius, monotonic within it).
- `sparkleGovernor.test.ts` — tier stays put on healthy frame times; steps down
  on a degraded window; steps up at most once; never oscillates given an
  alternating sequence; reaches `static` from `low` under sustained overrun;
  `static` is terminal.

**Playwright (e2e):** the canvas is present with its `data-testid`;
`data-motion="static"` under an emulated `prefers-reduced-motion: reduce`;
`data-running="false"` after scrolling past the hero; the headline remains
visible and unobstructed.

The canvas raster itself is not asserted pixel-by-pixel — the valuable logic is
in the pure modules, which are covered directly.

## 17. Documentation impact

`README.md` requires an update in the same change:

- The `Home` section's description gains the sparkle field.
- The component-structure section gains `SparkleField`, the Home-local
  `helpers/` and `workers/` directories.
- If the README documents the tech stack's runtime characteristics, note that
  the field uses Canvas 2D with an optional OffscreenCanvas worker and no new
  dependencies.

No changes to `.env.example`, `prisma/schema.prisma`, `package.json` scripts, or
the locale files.

## 18. Validation

The task is complete only when all of the following pass:

```bash
pnpm check-types
pnpm lint
```

plus the vitest and Playwright suites. Per project tooling notes, test binaries
are invoked directly rather than through `pnpm` scripts.

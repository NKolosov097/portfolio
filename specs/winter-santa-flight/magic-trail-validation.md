# Santa magic trail validation

## Implementation

- One transparent additive Points draw, 192 retained particles, fixed births at 128 per second, approximately 1.5 seconds of lifetime.
- Exact shared flying sleigh pose and authored timing-to-arc conversion keep both rear runner emitters attached in both directions.
- Historical anchors are reconstructed on the current pass; previews, resize, and pause/resume require no additional history or scheduling.
- Model, turnaround, and rest hide the trail. Normal teardown and failed renderer initialization dispose its geometry and shader.

## Automated checks

- Focused Vitest run: 4 files, 41 tests passed (`santaMagicTrail`, `santaTrajectory`, `santaModel`, `santaRenderer.dom`).
- Coverage includes scaled rear attachment across desktop/portrait/landscape aspects, old world positions, fading/spread, deterministic seeking, hidden phases, cycle boundaries, finite extreme seeks, buffer identity, and normal/failed-initialization cleanup.
- Prettier passed for all touched source files, task artifact, and this validation report.
- Complete Santa test folder: 9 files, 68 tests passed (`node node_modules/vitest/vitest.mjs run src/home-sections/Home/components/SantaFlight`).
- TypeScript (`node node_modules/typescript/bin/tsc --noEmit --pretty false`) exited 2 with 11 existing diagnostics in untouched test files: `santaModel.test.ts` lines 372, 375, 406, 473, 474, 570, 571, 602, 605 and `santaSleighModel.test.ts` line 322 (two diagnostics). No diagnostics reference the trail changes.
- Scoped ESLint passed for `santaMagicTrail.ts`, `santaMagicTrail.test.ts`, `santaSleighPose.ts`, `santaTrajectory.ts`, `santaModel.ts`, `santaRenderer.ts`, and `santaRenderer.dom.test.ts`.
- After appearance refinement, the focused trail and renderer suites passed again: 2 files, 12 tests. Scoped ESLint and Prettier passed again for the refined files and reports.

## Visual checks

Initial actual desktop/mobile Distant and Near previews confirmed attachment and curve history, but the wake looked like a thin orange line. Appearance refinement widens age-based transverse spread, uses paler warm gold, enlarges dust by 1.4 times and sparse glints by 1.5 times, and retains a two CSS-pixel minimum point diameter independent of device pixel ratio. Attachment, lifetime, fixed births, scheduling, and resource ownership are unchanged.

Final screenshots of the actual renderer confirm a wider pale gold magical wake and correct rear attachment in both directions: desktop Near at 20 seconds and Distant at 6 seconds, plus 393-by-851 mobile Near at 18 seconds and Distant at 6 seconds. Live resume retained one canvas with no page errors. Model, turnaround, rest, and Near transitions behaved correctly; repeated disposal left zero canvases and no page errors. The temporary QA server was stopped after inspection.

The actual renderer was bundled with esbuild and served at `127.0.0.1:4322`. The existing Next app server at port 4321 stalled, so full application E2E was not rerun. Visual evidence:

- `.playwright-mcp/magic-trail-desktop-final.png`
- `.playwright-mcp/magic-trail-desktop-distant-final.png`
- `.playwright-mcp/magic-trail-mobile-near-final.png`
- `.playwright-mcp/magic-trail-mobile-distant-final.png`

Full project lint exited 1 because existing generated build output and older QA scripts under `.playwright-mcp` are included in repository lint, producing 134,056 diagnostics (119,361 errors and 14,695 warnings), alongside existing `MobileAside` hook warnings. No unrelated cleanup was performed. `git diff --check` also flags existing CRLF whitespace in `Resume.module.css`.

No dependencies, timers, animation loops, model assets, commits, or deployment added.

## Living stardust refinement

The approved refinement adds stable birth-based brightness phases and frequencies, brief smooth pulses for rare stars, and small curved eddies beneath the existing broad spread. Most particles remain fine subdued dust; fewer medium sparks and rare pearl-white star cores provide contrast over the warm gold halo. Shader highlight mixing is clamped. Count, cadence, lifetime, draw count, exact newborn attachment, minimum screen diameter, and lifecycle remain unchanged. The two touched source files were backed up outside the repository before editing.

Matching-birth tests follow the same particles over three timestamps, remove the lifetime fade envelope to verify independent brightness rises and falls, and establish changing transverse direction independently of existing vertical settling. Focused trail and renderer regression suites passed: 2 files, 14 tests. The six trail tests passed again after strengthening the curved-motion assertion. Scoped ESLint and Prettier passed. TypeScript reproduced the same 11 existing diagnostics listed above, with none in the refinement files.

The actual renderer was visually accepted at desktop 1440-by-900 Near times 19.5, 19.75, 20, and 20.25 seconds and Distant time 6 seconds, plus mobile 393-by-851 Near time 18 seconds and Distant time 6 seconds. Sequential frames show a rare star brightening independently among subdued fine dust and pearl highlights. A short advancing Near sequence produced no page errors; repeated disposal left zero canvases. The temporary QA server was stopped.

Visual evidence: `.playwright-mcp/living-trail-{19.5,19.75,20,20.25,distant,mobile,mobile-distant}.png`. These checks establish appearance and behavior, without a performance benchmark or a frame-rate claim; the software QA browser renders the full 3D scene slowly.

Full project lint was not repeated because its existing generated-artifact failures are documented above.

## Twin runner attachment

The former center origin is replaced with the actual rear runner-tip coordinates: sleigh-local `(-1.98, -0.29, -0.68)` and `(-1.98, -0.29, 0.68)`. Fixed birth parity alternates between runners, so each particle retains its original side as buffer indices shift. The existing total 128 births per second is split evenly between them. Count, shader, twinkle, eddies, lifetime, size, broad spread, and lifecycle are unchanged. Source and tests were backed up outside the repository before editing.

Focused trail and renderer suites passed: 2 files, 15 tests. The seven trail tests cover consecutive newborn attachment to both runner tips in both passes and three viewport aspects, plus both matching births retaining their runner identity after their buffer indices change parity. Scoped ESLint and Prettier passed. TypeScript reproduced the same 11 existing diagnostics listed above, with none in the changed files.

Actual renderer inspection passed for desktop 1440-by-900 Near time 18 seconds and Distant time 6 seconds, and mobile 393-by-851 in both passes. A rear close crop clearly shows separate origins at both metal runner ends, no center origin, and the later shared scattered wake. There were no page errors and one active canvas; repeated disposal left zero canvases. The temporary QA server was stopped.

Visual evidence: `.playwright-mcp/runner-trail-{near,rear-close,distant,mobile,mobile-distant}.png`. Production diff review confirmed only the emitter anchor and its intent comment changed.

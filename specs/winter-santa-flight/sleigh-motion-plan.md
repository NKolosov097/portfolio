# Sleigh motion implementation plan

## Suspended towing refinement plan

This supersedes earlier body-only load bias. Scope: `santaTrajectory.ts`, `santaModel.ts`, their existing tests and these SDD notes. Renderer/frame API, assets and attachment deformation stay unchanged.

1. In `sampleSantaFormation`, retain the historical normalized tow direction, including its existing degenerate fallback. Obtain the rear frame's +X world heading using one reusable vector. Let `leveling = Math.max(0, rearHeading.y - tangent.y)`. Add `0.12 + 1.25 * leveling` to the tow direction's Y component and normalize again. Place the sleigh one spacing behind the rear pair on this adjusted direction, and use that same direction for its upright heading. Gravity therefore lowers the whole sleigh while the fixed-length tow constraint redirects it inward; recovering from descent adds extra sag. No frame integration, stateful spring, per-frame allocation or new API is needed.
2. Remove the now-redundant local load-pitch calculation and its three scratch objects from `santaModel.ts`. Keep the current flight bob, pitch waves and roll exactly as authored; compose them with the adjusted formation frame through `place`. Model mode remains unchanged. The existing post-pose trace deformation keeps all endpoints attached.
3. Update trajectory straight-line assertions: deer retain their original arc positions/headings, sleigh retains fixed gap and points toward the rear pair but hangs below the previous straight tow chord. Preserve extrapolated entry, zero-spacing finiteness, deterministic seeking and curve checks. Add a towing comparison using a `CurvePath<Vector3>` composed of descending then horizontal `LineCurve3` segments. Sample with the rear pair 0.5 units into the horizontal segment and historical tow point still descending (spacing 2). Against a horizontal line at equal spacing, require a lower relative sleigh center and a greater upward tow angle. Use this controlled corner only to test history response; the actual routes remain smooth.
4. Replace the old synthetic model local-load-pitch assertions with actual formation integration for the same horizontal and leveling paths. Across several timestamps assert the sleigh center is below the rear pair center and a local +X nose point is above a local -X tail point; leveling adds sag at the same timestamp. Keep independent yaw coverage using a rotated path if needed. Other harmonic tests retain their existing bounds; remove the obsolete loaded-bias bound and leave the 0.075 local pitch-wave bound. Preserve attachment, finite/extreme-seek, Model restoration and projected boundary tests.
5. Run model/trajectory suites with one worker and no file parallelism, then scoped ESLint/format. Inspect live leveling frames. Run checks sequentially to avoid the observed memory contention. Existing unrelated type errors and generated-artifact lint pollution remain out of scope. Record fresh evidence without overwriting history.

### Suspended towing refinement evidence

- Added the specified upward tow-direction bias in the formation sampler, using one retained rear-heading vector. The sleigh center and heading now share the adjusted fixed-length towing arrangement; descending history adds sag during recovery. Removed the redundant model load-pitch calculation and its three scratch objects. Existing flight waves and Model animation remain unchanged.
- Updated straight-route assertions and added a descending-to-horizontal history comparison. The synthetic corner's cached arc lookup places its rear sample about 0.0027 model units from the comparison line; its X-position check uses 0.005 tolerance while fixed tow distance and heading checks retain their strict tolerances. Replaced synthetic local-load assertions with actual model/formation integration at five timestamps and two yaw angles, checking lower centers, nose-up orientation and additional leveling sag.
- Fresh serial validation passed: `pnpm.cmd exec vitest run src/home-sections/Home/components/SantaFlight/santaModel.test.ts src/home-sections/Home/components/SantaFlight/santaTrajectory.test.ts --maxWorkers=1 --no-file-parallelism`. Output: `Test Files 2 passed (2)`, `Tests 29 passed (29)`; exit 0. This includes attachment endpoints, projected boundaries, deterministic/extreme seeks and Model restoration.
- Fresh `pnpm.cmd check-types` reported the same 11 existing diagnostics: nine in unchanged model-test logic at `santaModel.test.ts:372,375,406,473,474,570,571,602,605`, shifted by the import update, and two at `santaSleighModel.test.ts:322`. No new diagnostics appeared. The script wrapper exited 1 after reporting TypeScript exit 2.
- Fresh scoped ESLint passed for the four trajectory/model source and test files with no diagnostics (exit 0). Scoped Prettier passed for those four files and both SDD documents (exit 0). Checks ran sequentially; repository-wide lint and production build were not repeated.
- Visual review accepted the same-time distant before/after comparison, distant live frames around 6, 6.65 and 7.3 seconds, and near frames around 18.3 and 18.65 seconds. The whole sleigh hangs lower with a clear nose-up pose and attached harness. Portrait had no overflow; the browser was restored to desktop Live. Screenshots: `test-results/sleigh-suspension-before.png`, `test-results/sleigh-suspension-after.png`, `test-results/sleigh-suspension-live-{1,2,3}.png`, `test-results/sleigh-suspension-near-{1,2}.png` and `test-results/sleigh-suspension-portrait.png`.

## Leveling tail-drop refinement plan

Use the existing relative towing inclination. Increase its positive gain from 0.45 to 0.55 by adding `0.1 * Math.max(0, pullInclination)` to the pitch bias, and raise only the positive bias limit from 0.12 to 0.14 radians. Keep the negative limit at -0.12 and all harmonic motion unchanged. This gives a slightly stronger nose-up/tail-down response while the deer pull upward relative to the delayed sleigh, naturally returning to the existing pose when headings align.

Update the existing local-pitch test: for sleigh inclination -0.3 and rear inclination 0, the pitch increase over matched descent must be between 0.15 and 0.18 radians; at sleigh -0.01 and rear 0 it must be below 0.006; a downward relative inclination of -0.2 must still produce the existing -0.09 response. Update the loaded pitch bound from 0.195 to 0.215. Run model/trajectory tests serially, scoped ESLint/formatting, and inspect a live leveling sequence. No new helper, API, animation state or dependency is required.

### Leveling tail-drop refinement evidence

- Added the specified positive-only pull gain and raised the positive pitch-bias limit to 0.14; the negative limit remains -0.12. Existing flight waves, Model pose and attachment deformation are unchanged. The existing local-pitch test now covers the specified leveling range, fade near alignment, unchanged downward response and 0.215 loaded bound.
- Fresh serial model/trajectory validation passed 27 of 28 tests; the unrelated first anatomical-head test exceeded its 5-second limit at 5.836 seconds. Rerunning only that test with the same serial worker flags passed in 665 ms (exit 0). All motion, attachment, route and determinism assertions passed in the initial run.
- Fresh scoped ESLint passed for both TypeScript files with no diagnostics (exit 0). Scoped Prettier passed for both TypeScript files and both SDD documents, including a final check of this evidence update (exit 0).
- Visual review accepted desktop leveling frames at approximately 4.5, 5.15 and 5.8 seconds: the tail response stayed modest and towing traces stayed attached. Screenshots: `test-results/sleigh-leveling-tail-{1,2,3}.png`.
- Fresh type checking exited 2 with the same 11 existing errors: nine at `santaModel.test.ts:371,374,405,472,473,569,570,601,604` and two at `santaSleighModel.test.ts:322`. No new diagnostics were reported. Repository-wide lint was not repeated because its generated-artifact scan failure is recorded below.

## Stronger flight refinement plan

This refinement supersedes the original amplitudes in step 4. Existing validation below remains historical evidence.

- Change flight-only vertical motion to `-0.1 + 0.22 * wave(seconds, 2.4, -1.1) + 0.065 * wave(seconds, 4.3, 0.6)` to combine broad floating motion with smaller bounces.
- Increase accompanying pitch waves to `0.055 * wave(seconds, 2.4, -0.65) + 0.02 * wave(seconds, 4.3, 1.05)` and roll to `0.022 * wave(seconds, 1.7, 0.3)`. Keep the existing load-response bias and Model pose unchanged.
- Update the existing motion test limits to pitch 0.075, roll 0.022, vertical offset 0.285, total loaded pitch 0.195. Assert normalized vertical peak-to-peak travel exceeds 0.4 to prevent returning to imperceptible movement. Use a 0.00003 matrix tolerance across the 0.00002-second continuity interval to account for increased velocity; retain a tight continuity assertion.
- Run model and trajectory suites serially, scoped ESLint and formatting, then inspect live frames. Reuse the previous scope and avoid generated build directories during lint. Record fresh results separately from historical evidence.

### Stronger flight refinement evidence

- Applied the specified broad and quicker vertical waves, accompanying pitch waves and stronger roll only in the formation branch. Load response, Model pose, route placement and attachment deformation remain unchanged.
- Updated the existing bounded-motion test to the specified limits and normalized peak-to-peak travel above 0.4 model units. The same test retains continuity across a 0.00002-second interval with a 0.00003 matrix tolerance.
- Fresh serial validation passed: `pnpm.cmd exec vitest run src/home-sections/Home/components/SantaFlight/santaModel.test.ts src/home-sections/Home/components/SantaFlight/santaTrajectory.test.ts --maxWorkers=1 --no-file-parallelism`. Output: `Test Files 2 passed (2)`, `Tests 28 passed (28)`; exit 0. This includes 21 model and seven trajectory tests covering attachments, route boundaries, deterministic seeking, extreme timestamps and Model restoration.
- Fresh scoped ESLint passed for `santaModel.ts` and `santaModel.test.ts`, with no diagnostics; exit 0. Scoped Prettier passed for both TypeScript files and both SDD documents after correcting one source line wrap; exit 0.
- Visual review accepted three controlled desktop live frames at approximately 18.2, 18.55 and 18.9 seconds: the larger body motion remained coherent and traces stayed attached. Portrait Near had no horizontal overflow. Screenshots: `test-results/sleigh-bounce-stronger-{1,2,3}.png` and `test-results/sleigh-bounce-stronger-portrait.png`. The browser was restored to desktop Live.
- Fresh `pnpm.cmd check-types` exited 2 with the same 11 existing errors: nine at `santaModel.test.ts:371,374,405,472,473,569,570,601,604` and two at `santaSleighModel.test.ts:322`. No refinement diagnostics were reported. Repository-wide lint was not repeated because the generated-artifact scan failure is recorded below.

## Scope

Change only `santaModel.ts`, its existing `santaModel.test.ts`, and these SDD notes. The renderer already supplies independent rear-pair and sleigh quaternions; `sampleSantaFormation` already provides the delayed towing heading. Its callers and frame contract remain unchanged. Existing attachment deformation runs after all body transforms and therefore follows the new pose without changes. No fixture, asset, CSS, export or configuration changes are required.

## Implementation

1. Retain reusable direction vectors and an inverse quaternion within `createSantaTeam`; allocate no objects per animation frame.
2. Only when a formation is present, derive the sleigh forward world direction from local +X and its frame quaternion. Derive the rear-pair forward direction and transform it by the inverse sleigh quaternion. Its local `atan2(y, x)` gives the pull inclination ahead of the delayed sleigh.
3. Use a bounded local pitch bias: clamp `0.10 * sleighForward.y + 0.45 * pullInclination` to +/-0.12 radians. Positive local Z rotation lifts the +X-facing nose. This composes climb/descent load and delayed towing response without frame-integrated state.
4. Add flight pitch waves `0.025 * wave(seconds, 2.4, -0.65) + 0.01 * wave(seconds, 3.8, 0.4)` and roll `0.015 * wave(seconds, 1.7, 0.3)`. Flight bob is `-0.1 + 0.055 * wave(seconds, 2.4, -1.1)`. Reuse the overflow-safe `wave` helper. Keep the existing non-formation bob and pitch exactly as authored. Apply these local transforms before `place`, preserving the current pivot and all child ownership.
5. Cover actual model transforms at identical timestamps using level, climbing, descending and leveling frame inputs; remove the frame quaternion to inspect local body pitch. Assert directional differences, bounded pitch/roll, timestamp variation, deterministic out-of-order seeking, continuity around 22 seconds and finite extreme times. Retain existing trace attachment, route-boundary, disposal and Model tests.

## Validation

Run focused model/trajectory/renderer/host tests serially, `pnpm check-types`, `pnpm lint`, and scoped formatting. Inspect the existing `/santa-preview` on desktop and portrait, including several live frames. Preserve the running development server and unrelated working-tree changes. No commit, push or deployment.

## Tasks

- [x] Implement flight-only load response and rocking.
- [x] Add focused model assertions and run relevant tests.
- [x] Review behavior against the specification and inspect browser frames.
- [x] Record type, lint and visual verification results and limitations.

## Implementation evidence

- Added flight-only local pitch from sleigh elevation and the rear pair's inclination in the sleigh frame, clamped to +/-0.12 radians, with the specified continuous pitch, roll and bob waves. The existing Model pose calculations remain unchanged. Two vectors and one inverse quaternion are retained per team; animation adds no per-frame objects.
- Added three model integration tests for opposing load responses, rear-pair anticipation, constant-heading rocking, bounds, continuity around 22 seconds, deterministic out-of-order seeks through both real passes, extreme finite times and Model restoration. Existing trace attachment, projected-boundary and ownership checks passed.
- Focused Vitest validation used `--maxWorkers=1 --no-file-parallelism`: model 21/21, trajectory 7/7 and renderer 7/7 passed. The grouped command encountered a host-worker startup timeout; rerunning the host suite alone passed 7/7. No assertion failed.
- Scoped ESLint passed for `santaModel.ts` and `santaModel.test.ts`. Scoped Prettier passed for both source files and this plan. Repository-wide type and lint checks are handled in the final review.
- Browser review accepted three desktop live near-pass frames with coherent nose movement and attached traces, a static distant pass, and portrait Near/Model views. Mode changes reused the canvas, portrait views had no overflow, and reduced-motion reload created no canvas. No page or console errors appeared; only development warnings were present. Screenshots: `test-results/sleigh-motion-live-controlled-{1,2,3}.png`, `test-results/sleigh-motion-distant-desktop.png`, `test-results/sleigh-motion-near-portrait.png` and `test-results/sleigh-motion-model-portrait.png`.

### Focused validation commands

```powershell
pnpm.cmd exec vitest run src/home-sections/Home/components/SantaFlight/santaModel.test.ts src/home-sections/Home/components/SantaFlight/santaTrajectory.test.ts src/home-sections/Home/components/SantaFlight/santaRenderer.dom.test.ts src/home-sections/Home/components/SantaFlight/SantaFlight.dom.test.ts --maxWorkers=1 --no-file-parallelism
```

Output: `Test Files 3 passed (3)`, `Tests 35 passed (35)`, `Errors 1 error`; exit 1 due to the host worker startup timeout, before its tests ran.

```powershell
pnpm.cmd exec vitest run src/home-sections/Home/components/SantaFlight/SantaFlight.dom.test.ts --maxWorkers=1 --no-file-parallelism
```

Output: `Test Files 1 passed (1)`, `Tests 7 passed (7)`; exit 0.

```powershell
pnpm.cmd exec eslint src/home-sections/Home/components/SantaFlight/santaModel.ts src/home-sections/Home/components/SantaFlight/santaModel.test.ts
pnpm.cmd exec prettier --check src/home-sections/Home/components/SantaFlight/santaModel.ts src/home-sections/Home/components/SantaFlight/santaModel.test.ts specs/winter-santa-flight/sleigh-motion-plan.md
```

ESLint exited 0 with no diagnostics. Prettier output: `All matched files use Prettier code style!`; exit 0.

## Final review

The implementation matches the specified scope and behavior. Runtime changes are confined to the sleigh's local flight transform, with existing route placement and attachment deformation preserved.

`pnpm.cmd check-types` was rerun after correcting the two new test helper narrowing errors. It reports 11 existing errors in unchanged portions of model tests: nine in `santaModel.test.ts` (Group narrowing and optional morph attributes), and two in `santaSleighModel.test.ts:322` (unknown texture image data). No new motion implementation or test diagnostics remain. These unrelated errors were left unchanged.

No production build or physical-device performance measurement was performed. The existing development server on port 4321 was preserved; no commit, push or deployment was performed.

`pnpm.cmd lint` exited 1 during ESLint: its repository scan includes pre-existing `.playwright-mcp` scripts and the nested `.playwright-mcp/pr-build/.next` generated build, producing 119,361 errors and 14,695 warnings. The subsequent style and Markdown stages did not run. This unrelated configuration/artifact issue was not changed. Scoped ESLint passed for both modified TypeScript files, and scoped Prettier passed for both TypeScript files and both SDD documents.

# Tasks

## Readable sleeves and reclining cargo sack

- [x] Add diagonal upper-sleeve crests and forearm/cuff gathers with visible lateral relief, preserving the three inside-elbow creases, fixed endpoint rings and independent cuff/glove/rein motion.
- [x] Enlarge the existing sack, change its linen base to warm ochre `0x9a6a32`, recline it onto a broad deck contact patch and press the lower cloth clear of the curved rear board and seat back.
- [x] Move the cord and bow with the gathered neck using an affine pose that preserves their analytic UV-seam normals; recompute the compressed sack body normals and bounds.
- [x] Preserve factory budgets of 21,840 garment triangles and 21,400 sleigh triangles, existing maps/material counts, exact nine/eighteen texture disposal ownership, source GLBs, production model integration, routes and lifecycle.
- [x] Pass all 59 tests across eight focused files with one worker in 32.60 seconds (18.89 seconds of tests), all 28 affected factory/model tests and scoped five-file ESLint/Prettier, without increasing timeouts.
- [x] Complete independent source review after the rear-board clearance and analytic tie-normal corrections, with no actionable findings.
- [x] Accept actual front/profile/three-quarter sleeve views, hand extrema and rear/overhead/side sack views with zero page errors, aligned neck ties and no rear-board penetration. Measure the unchanged 170,075 triangles, 58 draws, 37 geometries and 19 renderer textures.
- [x] Accept the final close garment/sleigh, rear/overhead sack, hand-extrema and six motion-pose renders plus the 60-frame, 5,000 ms GIF with verified metadata. Repeat the final GPU measurement at 170,075 triangles, 58 draws, 37 geometries and 19 renderer textures, with zero page errors. Artifacts: `test-results/santa-cargo-*.png` and `test-results/santa-cargo-motion.gif`.
- [x] Complete the final isolated production build against the final source: compilation 20.8 seconds, strict TypeScript 40.0 seconds and all 14 static pages generated; only the existing i18next notice remains.
- [x] Pass all six final desktop/mobile production browser cases in 43.7 seconds. Accept production Home desktop frames at 6 seconds (distant) and 20 seconds (near) in a 1857 x 994 host, plus the portrait frame at 17.5 seconds (near) in a 390 x 844 host, with zero page errors. Artifacts: `test-results/santa-cargo-home-desktop-distant.png`, `test-results/santa-cargo-home-desktop-near.png` and `test-results/santa-cargo-home-mobile-near.png`.
- [x] Match all six model/factory source/test files against the compiled verification copy and confirm unchanged original Santa/deer GLB hashes. Confirm test port 3300 stopped, development port 4321 listening and root build output preserved; close the report and specification.

Physical-device FPS remains unmeasured. No commit, push or deployment was performed.
The completed sections below are historical evidence from earlier revisions.

## Prior sculpted coat and crafted sleigh

- [x] Replace the shallow coat with an authored 97-row/64-segment sculpted mesh, shaped 48-interval/32-segment sleeves, thick closed fur trim and raised cloth seams.
- [x] Preserve the exact classic-red coat/cap wool material and maps, static face, fixed seated hips, head/cap movement and independent hand/cuff/rein attachment motion.
- [x] Replace the primitive sleigh with a hollow curved hull, layered panels and edging, flat curled runners, connected supports, fitted leather seating, folded sack and structured lanterns.
- [x] Integrate both owned factories into the existing resource Sets and material batching without changing source assets, dependencies, route, deer, lighting, camera or lifecycle contracts.
- [x] Verify factory budgets of 21,840 garment triangles and 21,400 sleigh triangles, each below 22,000; measure the actual integrated scene at 170,075 triangles, 58 draws, 37 geometries and 19 renderer textures.
- [x] Pass the final 57/57 tests across the eight focused files with one worker in 27.25 seconds (17.33 seconds of tests), after the belt contact adjustment; all 21 affected garment/model tests and scoped ESLint/Prettier also pass.
- [x] Verify actual garment front/profile/three-quarter views, all four natural hand extrema, bare sleigh front/side/rear/interior, seated/full-team views and six motion poses under unchanged lighting against saved prior renders.
- [x] Complete independent source/delta review with no actionable findings.
- [x] Accept the final 60-frame, 5,000 ms motion GIF and repeat final GPU measurements after the belt contact adjustment: 170,075 triangles, 58 draws, 37 geometries and 19 renderer textures, with zero page errors.
- [x] Complete final isolated strict TypeScript and production build against all six final model/factory source and test files: compilation 21.6 seconds, TypeScript 75 seconds and all 14 static pages generated. Only the existing i18next initialization notice remains.
- [x] Pass all six final desktop/mobile production browser cases with one worker in 42.0 seconds. Accept production Home desktop frames at 6 seconds (distant) and 20 seconds (near), plus the 390 x 844 portrait frame at 17.5 seconds (near), with zero page errors in 1857 x 994 and 390 x 844 hosts.
- [x] Confirm all six source/test files match the isolated verification copy and both original GLB hashes remain unchanged. Confirm test-owned port 3300 stopped, development port 4321 listening and root build output preserved; close current report/spec evidence.

Physical-device FPS remains unmeasured. No commit, push or deployment was performed.
Earlier measurements and production results below are retained as historical evidence.

## Prior completed work

- [x] Implement and verify the original detailed team, including the red Santa cap.
- [x] Implement and verify the 48-second flight, lazy lifecycle, home integration and actual-model preview.
- [x] Refine the deer into a seamless organic body with a more natural neck and blended fur coloration.
- [x] Review actual rendered desktop/mobile appearance and refine it where needed.
- [x] Complete scoped checks and production build; document measured results and remaining limits.

## Decisions

- The initial study used original geometry because its selected free-model downloads required an unavailable authenticated session. The later verified CC0 deer/head/cap sources are documented below; no access controls are bypassed.
- Work in the current feature checkout to preserve the existing winter changes. No commit or deployment.

## Evidence

- Initial model: 6 focused checks passed, scoped strict TypeScript passed. Actual Chromium render measured 90,064 triangles and 103 draw calls. A descending-loft winding defect was corrected after rendered review; its regression check now passes.
- Existing sparkle-governor baseline: 21 tests passed.
- Current app on its existing development port 4321 loaded without page errors. The user-owned server is left running; production verification will use a separate temporary source copy to avoid its `.next` lock.
- The final continuous deer body removes the large torso/neck seams. Actual rendering measures 93,840 triangles, 107 draws, 32 rendered geometries and three small textures. The model remains stylized; no film-quality realism claim is made.
- Windows filename correction: the pure sampler is santaTrajectory.ts so it cannot collide with SantaFlight.tsx during extensionless resolution; exported APIs remain unchanged.
- Runtime checks passed: 9 unit/DOM cases, 6 desktop/mobile browser cases, strict TypeScript and scoped ESLint/Stylelint/Prettier. Two preview browser cases were repeated successfully after the scale/heading adjustment and again after final organic body refinement.
- Final model and lifecycle suite: 16/16 checks passed. Organic body precomputation preserves bit-identical vertex, normal, color and UV buffers; its seven model checks were repeated after optimization.
- Deterministic actual Home screenshots confirm the distant pass hides behind the aside and the near pass crosses the name/profession. Captured phases were distant/distant/near with no page errors. Final desktop/mobile preview checks passed after body refinement; close desktop framing required an additional margin correction.
- Browser-only model construction measured 342.4/220.5/140.3 ms across three local samples. Idle loading defers this work but does not split its main-thread cost; no real-device or sub-100 ms initialization claim is made.
- Independent final code review found no actionable introduced P1/P2 issues. It does not establish visual realism or real-device GPU performance.
- Final desktop Model framing has been rendered and inspected with the whole team inside the stage. The last framing-only edit changes the width margin from 0.9 to 0.76; it leaves route sizing unchanged.
- The final repository TypeScript check passed. Manifest comparison against the pre-task baseline shows only the exact Three/types additions; Home differs from its baseline by the import and winter-only mount.
- Under concurrent build/browser memory pressure, later focused test retries could not start fork workers (no assertions ran), and an additional actual mobile Home navigation timed out. Earlier completed mobile preview checks remain valid; no full mobile Home pixel acceptance is claimed.
- Final scoped ESLint passed across the entire Santa change, Home integration and browser spec. Source formatting passed; the three documentation formatting warnings were corrected.
- Isolated `next build --webpack` passed, including its TypeScript and static-page generation steps. Existing `react-i18next` initialization and Browserslist-age notices remain. The verification source matches the final model/renderer files and includes the final framing correction.
- All six production browser cases passed in Chromium desktop and mobile Chrome using one worker and a 90-second timeout. They cover the final model/route, canvas reuse, reduced motion, original appearance, portal layering, offscreen pause/resume, usable controls and theme cleanup. The isolated test server used port 3300 and was shut down by its lifecycle hook; the user development server at 4321 was preserved.

## Motion refinement

- [x] Replace independent leg sines with a periodic collected/extended stride, anatomical knee/hock bends, small lead offsets and coordinated body motion.
- [x] Project genuinely curved routes through the shared camera; retain three reusable upright frames with constant arc spacing and tangent extension before entry.
- [x] Let individual pairs and sleigh follow their own frames; preserve the centered Model fit and mount the warm light on the sleigh.
- [x] Deform all six existing trace buffers through actual attachment-owner matrices, including local bob and pitch, with zero endpoint sag and retained normals.
- [x] Move one preview host/canvas between the inline Model stage and the full-window body layer, observing the actual preview section.
- [x] Extend route, model, renderer, host and browser regression coverage for the changed contracts.
- [x] Complete serial targeted tests and scoped lint/style/format verification.
- [x] Complete TypeScript, desktop/mobile browser and isolated production-build verification.
- [x] Inspect actual animated stride, delayed turning, horizontal entry/exit, shell occlusion and Home heading overlap.

### Motion evidence

- The extended model API exposes normalized `spacing`, `animate(seconds, formation?)`, and precise `SantaFormationFrame`/`SantaFormation` types. Omitting formation restores the authored Model arrangement.
- Route arc lengths rebuild only on viewport changes. Frames reuse their position/quaternion objects; traces reuse their original position/normal buffers and scratch transforms.
- Stride interpolation uses periodic monotone cubic Hermite curves so intermediate sweep keys retain velocity while knee/hock angles stay within the authored ranges.
- All 21 focused checks executed and passed: 10 model, five trajectory, three renderer and three host lifecycle cases. The first combined run completed 18 cases but one host worker timed out before executing; its isolated elevated retry passed all three cases.
- The model checks project the complete animated geometry beyond the horizontal screen edges at both pass boundaries for desktop, portrait and landscape viewports, verify all six trace endpoints through Model/flight restores, and retain the original geometry/disposal budgets.
- Host and browser regressions require the same canvas after Model/flight switches and full usable-viewport bounds for the flight host and canvas, accounting for desktop scrollbar width.
- Actual viewport review required preserving cubic leader timing: the renderer now interpolates the cached arc-length table at phase progress, retaining fixed arc-distance following without exhausting the close pass too early.
- The near route scales normalized Y by 0.72 on portrait viewports, consistently in point and analytic tangent sampling, to bring the flight toward the centered Home heading. X and depth controls are preserved.
- After the timing/portrait correction, all 15 model/trajectory checks passed again. Both renderer DOM attempts timed out during worker startup before assertions; the new leader-timing renderer assertion remains unexecuted and is not reported as passing.
- Actual rendering and physical-device performance remain separate acceptance checks; a software GPU capture cannot establish real-device frame rate or anatomical realism.

### Final motion acceptance

- All 22 focused cases passed across scoped runs: 10 model, 5 trajectory, 4 renderer and 3 host lifecycle cases. Final renderer checks ran serially with a thread worker after build/lint/browser processes finished; this resolved the earlier worker-startup timeouts. The authored timing assertion executed and passed.
- Final scoped ESLint, Stylelint and source formatting passed. The final production build (`next build --webpack`) passed compilation, TypeScript and static-page generation in the isolated copy. Model, renderer, trajectory and host source hashes match that copy. Existing i18next/Browserslist notices remain.
- Actual final six-phase gait contact sheet was inspected. Deterministic Home captures confirm curved following, heading overlap on desktop and portrait mobile, aside occlusion and full-window host bounds, with no page errors. Artifacts: `test-results/santa-gallop-contact-sheet.png` and `test-results/santa-motion-*.png`.
- All six production desktop/mobile browser cases passed across two runs. The first run passed five cases; the desktop preview assertion needed the root's rendered width instead of clientWidth because stable scrollbar gutters reserve 15 px even when clientWidth reports the full window. Controlled measurement confirmed the fixed canvas and root both fill the 1265 px CSS viewport in a 1280 px browser. The corrected desktop case passed on its focused repeat.
- Browser tests verify full-window flight host/canvas sizing, retained canvas identity through Model/flight moves, lazy/reduced-motion behavior, theme cleanup, scroll suspension and usable shell controls. The temporary production server on port 3300 was stopped by its lifecycle hooks; the development server on 4321 was preserved.
- Remaining limits: procedural gait has no motion-capture/anatomical fidelity claim; physical devices and their GPU frame rate have not been measured.

## Individual gait and festive finish

- [x] Give each deer its own deterministic period, phase, amplitude and side lead while retaining anatomical Hermite joint curves.
- [x] Add eight shared colored antler-tip cores and matching additive radial point halos per deer with owned shared resources.
- [x] Upgrade only fur relief to 256px and add shared bounded short combed fibers without changing the named continuous body.
- [x] Change the first distant pass to top-left nose-down entry and smooth rightward levelling; preserve the near pass and all timings.
- [x] Extend model/trajectory coverage for independent periods, named light/fur buffers, complete bounds and common material disposal.
- [x] Complete serial focused checks and scoped lint/format verification.
- [x] Inspect actual close fur/glow and upper-entry frames; complete integrated desktop/mobile lifecycle checks and isolated production build.

### Finish evidence

- Shared light cores use a vertex-colored basic material; eight radial-alpha points per deer supply restrained halos without per-bulb lights or postprocessing. Nested named groups preserve inspectable light and fur parts through existing rigid batching.
- Short fur uses 384 deterministic body-surface samples, crossed back-wound opaque triangles, existing body colors/UVs and the body material. Original continuous body generation remains unchanged.
- Each animal derives bounded stride phase directly from seconds and its own fixed period; local bob/pitch share that phase. The sleigh retains its separate motion.
- The first route uses the prepared top/right cubic controls and the existing analytic depth-aware tangent and upright frame basis. The near route, portrait adjustment and 48-second cadence remain unchanged.
- Initial actual Model/entry captures showed subtle short fur and distinct leg poses. The halo base size was increased to 0.65 times its world scale because the initial points were hidden by their cores; the far X controls moved left so the first visible entry is clearly top-left. Final actual close and flight captures were inspected and accepted.
- All 19 focused model/trajectory checks passed serially with one thread worker: 13 model cases and six trajectory cases. Coverage includes repeatable distinct periods, proportionally scaled halos, shared finite fur, the unchanged closed body, top-entry/right-exit complete bounds on three viewport aspects, attachment restores and common material disposal.
- Scoped ESLint and source/document formatting passed. No physical-device performance or photorealistic appearance claim is made.
- Final actual Chromium model rendering measured 105,360 triangles and 119 draw calls, within the existing scene budgets. Initial posed bounds are 14 × 5.022 × 3.162 world units.
- Final Model, desktop top-entry/descending/level/near and portrait entry/level captures completed without page errors. Artifacts are `test-results/santa-finish-*.png`; the new fur stays short and restrained, the cores have scale-proportional soft halos, and the front/rear pairs visibly use different leg poses.
- Isolated `next build --webpack` passed compilation, TypeScript and static generation; modified model/trajectory source hashes match the verified copy. The existing i18next initialization notice remains.
- All six final production browser cases passed in one desktop/mobile run, covering preview modes/canvas reuse, full usable-window flight, reduced motion, original appearance, offscreen suspension and theme cleanup. The test-owned server at port 3300 was stopped by its lifecycle hooks; the user development server at 4321 was preserved.

## Distant direction correction

- [x] Mirror only the distant X controls to `[.98,.85,.30,-.45]` for top-right entry, leftward levelling through the center and complete left exit before the existing left-to-right near return.
- [x] Update regression assertions for opposite pass directions, coherent far-left exit/near-left entry and complete projected bounds on three viewport aspects.
- [x] Run the 19 focused model/trajectory cases serially and complete scoped lint/format verification.
- [x] Inspect corrected actual desktop/portrait entry and level frames.

### Direction correction evidence

- This correction changes only the distant X control literal in production. Y/depth controls, analytic tangents, phase timings, near route and model details remain unchanged; the existing route frames supply orientation without manual mesh flipping.
- All 19 focused model/trajectory cases passed serially with one thread worker. The tests assert negative distant/positive near headings throughout both routes, matching far-left exit/near-left entry, finite upright analytic frames and complete top/left/right projected boundaries on desktop, portrait and landscape.
- Scoped ESLint and formatting passed for the corrected source/tests and task evidence. The earlier successful production build covers the structural finish changes; it was not repeated for this literal-only correction.
- Actual desktop frames at 3.2/6/9/18.5 seconds confirm top-right downward entry, leftward travel through the center, exit behind the aside on the left and the later rightward foreground return. Portrait entry was also inspected. Captured phases match distant/distant/distant/near; both pages reported no errors. Artifacts: `test-results/santa-direction-*.png`.

## Natural textured deer replacement

- [x] Compile the verified Grab3D CC0 source to a self-contained compact WebP/skinned GLB; retain source/hash/license and reproducible preparation.
- [x] Replace procedural deer anatomy and fur fins with four independent cloned skins sharing team-owned geometry/coat texture.
- [x] Keep independent Hermite gaits, current far-right-to-left/near-left-to-right routes, Santa, cap, sleigh and six moving traces.
- [x] Load the CPU template lazily before GPU allocation; retain eligibility checks around asynchronous preparation.
- [x] Place smaller warm/pale lights on actual rack nodes and refit the muzzle bridle/reins.
- [x] Verify real skin deformation and stable belly/torso through actual rendered poses.
- [x] Complete focused actual-asset, model, host/renderer and trajectory tests; scoped lint/format.
- [x] Complete actual desktop/portrait Model and flight review, isolated production build and production browser regressions.

The earlier procedural-body/fur evidence above is historical. This replacement initially shipped a 1,344,412-byte asset with 19,999 triangles, 17,294 compact vertices, nine bones and eight rack nodes. Its historical visual and verification evidence follows; the locomotion refinement below describes the current rig.

### Natural-deer verification evidence

- The compact asset retains real coat/face UV detail, one continuous SkinnedMesh, nine bones and eight actual rack attachment nodes. Four animals share one team-owned geometry/coat texture and keep separate skeletons/material tints. The cached CPU template is never rendered or disposed by a team.
- Actual six-pose review accepted the textured face, ears, antlers and hooves, restrained night coat and smaller rack lights. Rendered weight defects were corrected at their cause: central belly vertices remain rooted, and inner shin surfaces retain the full limb influence instead of stretching back toward the torso. Named Hermite curves, independent cadences and both current routes remain unchanged.
- The actual final scene measured 123,052 triangles, 43 draw calls and 26 geometries. The self-contained asset is 1,344,412 bytes. Actual Model and six-pose artifacts are `test-results/santa-natural-model.png` and `test-results/santa-natural-deer-poses.png`.
- All 30 focused cases passed in five files with one thread worker (12.34 seconds): 11 real-asset model, three template/asset, six host, four renderer and six trajectory cases. Coverage includes normalized bounded skin weights, stable lower belly, full inner shin influence, posed limb motion, exact-once geometry/material/Texture/Skeleton disposal, preserved template resources, pending loading races, canvas reuse and complete offscreen boundaries.
- Scoped lint/format, reproducibility, isolated production build and final production browser results are recorded after their completion below. Physical-device frame rate and full photographic realism are not claimed.
- Scoped ESLint passed for the Santa source/tests, preview, browser spec and compiler; the existing Browserslist age notice remains. Scoped Prettier passed for source, documentation, package metadata and the explicitly checked CommonJS compiler. `node --check` passed. A fresh compiler run reproduced the shipped GLB byte-for-byte with SHA-256 `f3d57bbbeee146c6c3ffed83b16031ea8f4b5c962dcee28aa3d841894308ed12`.
- The isolated production `next build --webpack` exited successfully: compilation completed in 25.2 seconds, TypeScript in 31.0 seconds, and all 14 static pages generated. The existing i18next initialization notice remains. The four runtime source files and final GLB hashes match the verified copy.
- All six production Playwright cases passed in desktop Chromium and mobile Chrome in 34.6 seconds using one worker. The test-owned server on port 3300 was stopped by teardown; the user-owned development server on 4321 was preserved.
- Final actual production Home frames were inspected at desktop 6, 9, 17.5 and 20 seconds, showing the distant pass, aside occlusion, foreground heading overlap and rightward recession; the 390 × 844 portrait frame at 17.5 seconds was also accepted. The observed phases were distant, distant, near and near, with near on mobile; the flight filled the 1857 × 994 desktop and 390 × 844 mobile windows without page errors. Production Model screenshots on both viewports show the entire team fitting the stage with the accepted detailed deer appearance. Artifacts: `test-results/santa-natural-home-*.png`.
- Final static review found no important issues in the change. Port checks confirmed the test server on 3300 stopped and the user's development server on 4321 remained running. No commit, push or deployment was performed; physical-device frame rate remains unmeasured.

## Towing and living deer refinement

- [x] Prepare the eleven-joint `natural-deer-v2.glb` with the existing lower-body weights, soft neck/head weights and head-local rack markers.
- [x] Tow the sleigh at a fixed distance behind the rear pair along its recent travel chord; preserve pure deterministic seeking and straight entry.
- [x] Coordinate modest body lift/surge/pitch and neck/head motion with each existing independent stride; attach rack lights, bridle and hand reins to the moving head.
- [x] Complete focused geometry, attachment, trajectory and lifecycle checks; scoped lint/format and byte-for-byte compiler reproduction.
- [x] Review actual six-pose head/body/Model motion and complete the isolated production build and browser checks.
- [x] Accept final actual production Home frames for both passes on desktop/portrait.

Current asset: 1,344,712 bytes, 19,999 triangles, 17,294 vertices, eleven bones and eight head-local light markers. SHA-256: `bad2a6573d20b274b66eec126ce07386a57167246124473f8f1370451ca13556`. Compiler assertions verify bounded normalized nonnegative weights and fully head-weighted actual rack/muzzle regions. The prior nine-bone verification remains historical evidence.

### Locomotion verification evidence

- All 32 focused cases passed in five files with one thread worker (15.14 seconds). Coverage adds fixed-distance tow direction, a distinct curved sleigh track, straight/extrapolated entry and deterministic seeking; actual rest-shape preservation, fully head-weighted rack/muzzle vertices, independent coordinated head cadence, head-attached lights/bridle and hand-rein endpoint ownership. Stable belly/shins, finite exact posed bounds, complete offscreen boundaries, eligibility/pause/seek behavior and exact-once teardown remain covered.
- The existing six-pose full-skin test exceeded its old five-second default once under host contention. Only that expensive case now has a fifteen-second allowance, retaining every assertion; its normal-command focused rerun passed in 4.323 seconds. The bound-budget assertion now uses exact posed vertices, matching model normalization and the existing offscreen checks.
- Scoped ESLint and Prettier passed for changed Santa source/tests, compiler and documentation. `node --check scripts/prepare-natural-deer.cjs` passed. Re-running the compiler from the original verified source reproduced the shipped v2 GLB byte-for-byte with the SHA-256 above.
- Actual six-pose head/body/Model review accepted the modest neck/counter-pitch, coherent face/rack/bridle motion and preserved surface shape. The actual scene measured 123,052 triangles, 47 draw calls and 26 geometries; body lift/surge/pitch and head/neck amplitudes remain at the specified starting values.
- The isolated production `next build --webpack` exited successfully: compilation completed in 20.4 seconds, TypeScript in 28.3 seconds and all 14 static pages generated. The existing i18next initialization notice remains. The verified copy matches the runtime/model/trajectory/loader source and v2 GLB hashes.
- All six production Playwright cases passed in desktop Chromium and mobile Chrome in 34.3 seconds using one worker. Teardown stopped the test-owned server on port 3300 and preserved the user-owned development server on 4321. Final static review found no introduced bug.
- Final actual production Home review accepted desktop frames at 3.2, 6, 9, 17.5 and 20 seconds and the 390 × 844 portrait frame at 17.5 seconds. Observed phases were distant/distant/distant/near/near and mobile near, with no page errors in the 1857 × 994 desktop and 390 × 844 mobile hosts. Towing, connected traces, head/body detail, original layering and complete entry/exit remain coherent. Both production Model views fit the entire team. Artifacts: `test-results/santa-towing-home-*.png`.
- A fresh final probe confirmed port 3300 stopped, port 4321 still running and the v2 GLB hash unchanged. No commit, push or deployment was performed; physical-device frame rate remains unmeasured.

## Natural Santa and classic matching costume (historical)

This section records the Santa appearance before the later performance and coat refinements; its measurements and verification are historical.

- [x] Prepare the verified CC0 head/beard and split compact cap as `natural-santa-v2.glb`, retaining source licenses/manifests and reproducible provenance.
- [x] Preserve the accepted face, continuous textured nape, sleeve sweep, seated body/hand anchors and all deer/gait/towing/route/light behavior.
- [x] Give the smaller cap and suit the same classic-red matte wool Material object, and cap fur and figure trim the same white-fur Material object.
- [x] Validate the three-surface/one-head-map contract, lazy dual-asset preparation, per-team ownership, exact-once disposal and original/reduced-motion no-download behavior.
- [x] Complete 45 focused cases, scoped lint/format, byte-identical asset reproduction and rejection of both invalid source hashes.
- [x] Complete isolated strict TypeScript and the final isolated production build and six desktop/mobile production browser cases.
- [x] Accept final actual production Home frames for both passes on desktop and portrait.

### Natural-Santa verification evidence

- `natural-santa-v2.glb` is 974,432 bytes, 24,527 triangles and 16,531 referenced vertices: head 19,999 triangles, cap cloth 2,336 and cap fur/lining 2,192. It contains three named static meshes and one embedded 1024px head map. Donor cap PBR maps are removed; the runtime cap shares the suit's classic-red wool (`0xb51b23`, roughness 1, metalness 0) and white trim materials. SHA-256: `01d8a110e06d6bec8a75262b13352556e38185b409df7567d9efe6484808eee1`.
- Actual front/profile/rear-three-quarter/rear, seated and full-team review accepted the natural face/beard, continuous cap-to-collar hair closure, compact snug cap, matching bright-red matte cloth, white trim and buried sleeve roots. The current scene measures 141,707 triangles, 45 draws, 25 geometries and 14 renderer textures including bones/environment, below the 180,000/125 scene budgets. Physical-device performance remains unmeasured.
- All 45 focused tests passed in six files with one worker in 15.66 seconds. Scoped ESLint/Prettier and byte-identical compiler reproduction passed; both corrupted source hashes were rejected before output. Resource identity checks use boolean identities and disposed-context Sets to avoid Vitest's eager deep-equality diagnostics; ownership/exact-once assertions remain intact with no timeout relaxation.
- The precise `BufferGeometry` source binding resolved the isolated build's TypeScript error without assertions or behavior changes. Isolated `tsc --noEmit --pretty false --incremental false` passed, followed by 14/14 model checks and affected-file lint/format. The final source hash matches the verified copy.
- The final isolated production rebuild exited successfully: compilation 13.4 seconds, TypeScript 13.4 seconds and all 14 static pages generated. Only the existing i18next initialization notice remains. All six production browser cases passed in desktop Chromium and mobile Chrome in 36.2 seconds with one worker. The test-owned server on port 3300 was stopped by teardown; user development port 4321 and root `.next` were preserved.
- Final actual production Home review accepted desktop frames at 3.2, 6, 9, 17.5 and 20 seconds (distant/distant/distant/near/near), plus the 390 x 844 portrait frame at 17.5 seconds (near), with no page errors. The full-window hosts measured 1857 x 994 and 390 x 844; aside occlusion and title crossing remain intact. Production Model desktop/mobile views fit the complete team and retain the accepted compact matte matching-red cap/suit and new face. Artifacts: `test-results/santa-natural-character-home-*.png` and `test-results/santa-natural-character-*.png`.
- A fresh final probe confirmed port 3300 stopped, user development port 4321 running, and the Santa/deer asset hashes unchanged. Physical-device frame rate remains unmeasured; no commit, push or deployment was performed.

## Santa performance and costume (historical)

- [x] Keep the hip frame, thighs, boots and hem seated while articulating the torso, head and independently phased hands.
- [x] Move cuffs, gloves and mirrored thumbs with their sleeve wrist targets; attach both hand reins to the actual hand groups and retain all six trace buffers.
- [x] Replace repeated coat ripples with localized torso/lap compression and asymmetric elbow folds; retain identical matching-red wool and white-fur materials.
- [x] Prepare owned relative sleeve, free-cap-tip/pompom and cheek-only GPU targets with preserved source positions, UVs and authored split normals.
- [x] Verify signed target bounds using the stored Float32 deltas, triangle-local normal support, 74 cheek vertices, 440 pompom vertices and 1,167 fixed brim/lining vertices.
- [x] Pass all 48 focused cases in six files with one worker, including deterministic negative/extreme finite seeks, route restores, fixed lower-body transforms, sleeve/hand agreement, mirrored hand geometry and exact-once teardown. Scoped source ESLint and Prettier passed without new dependencies or timeout changes.
- [x] Complete final isolated strict TypeScript, production build/browser checks and actual production Home/portrait acceptance; record final scene measurements.

Final scene: 141,707 triangles, 54 draws, 31 geometries and 19 renderer textures, within the existing 180,000/125 limits. Isolated strict TypeScript passed; the final production build compiled in 19.9 seconds, completed TypeScript in 23.5 seconds and generated all 14 static pages. All six desktop/mobile production browser cases passed in 45.4 seconds. The existing i18next initialization notice remains.

Actual close signed cap extremes and the full cheek target, six seated poses and a verified 60-frame/five-second motion GIF were accepted. Final production Home frames at desktop 6, 17.5 and 20 seconds and portrait 17.5 seconds retained the full-window hosts, driver contact, connected reins, heading overlap and original layering without page errors. Artifacts: `test-results/santa-performance-home-*.png`, `test-results/santa-performance-*.png` and `test-results/santa-performance-motion.gif`.

Final probes confirmed port 3300 stopped, user development port 4321 running, source Santa/deer hashes unchanged and root `.next` preserved. Final source SHA-256: `c46a4bff7cc13789f1b5d4e938677cd9e24b7195642a9272a8de4b17ffabae0d`. Physical-device frame rate remains unmeasured; no commit, push or deployment was performed.

## Tailored Santa coat and readable reins (current)

- [x] Increase independent hand and matching sleeve-wrist pulls to `[-0.10, 0.06, 0]` times the existing phase weights, retaining cuffs, mirrored gloves and actual rein owners.
- [x] Remove cheek morph construction and animation while preserving the static anatomical head, its source buffers, existing head pivot and two cap targets.
- [x] Prepare the 49-ring/48-segment smooth coat, 40-interval/24-segment sleeves, localized folds and matching procedural seam normals at construction.
- [x] Calibrate the exact shared coat/cap/sleeve/trouser wool material to `0xa20b0e` and bump scale 0.008, retaining the existing maps and white-fur material.
- [x] Add a closed, conforming white-fur front opening, tuck its lower end behind the belt and replace the exposed deep buckle with a flat rounded rectangular brass frame according to actual front/profile inspection.
- [x] Pass 49 focused tests in six files with one worker, then 18 affected model cases after the final opening/buckle correction; pass scoped ESLint and formatting without new dependencies or timeout changes.
- [x] Complete final actual garment, seated, hand-extreme and motion-sequence review under unchanged scene lights.
- [x] Complete isolated strict TypeScript, production build, six desktop/mobile production browser cases and final production Home review; confirm source hashes and server preservation.

The final scene measures 147,819 triangles, 55 draws, 33 geometries and 18 renderer textures, below the existing 180,000-triangle/125-draw limits. Focused verification covers signed finite morph bounds, continuous procedural normals/UV seams, static source head buffers, shared wool/fur ownership, closed/tucked trim and actual buckle hole/dimensions, visible independent hand travel, cuff overlap at all four natural pull extrema and all six trace endpoints. The six-file run took 74.22 seconds (10.20 seconds of tests); the final affected model rerun took 11.83 seconds (10.87 seconds of tests). Actual front/profile/three-quarter views accepted the rich red cloth/cap match, tucked fur opening, flat buckle and continuous garment shading. Four natural hand extrema, six seated poses and a 60-frame, 5,000 ms motion GIF retain coherent garment/hand/rein/seat contact with zero page errors. Artifacts: `test-results/santa-coat-*.png` and `test-results/santa-coat-motion.gif`. Public source asset bytes remain unchanged. The final isolated production build passed: compilation 17.6 seconds, strict TypeScript 81 seconds and all 14 static pages generated; only the existing i18next initialization notice remains. All six production browser cases passed in desktop Chromium/mobile Chrome with one worker in 41.3 seconds; the final source hash matches the isolated verification copy. Final actual production Home views at desktop 6 seconds (distant), desktop 20 seconds (near) and portrait 17.5 seconds (near) were accepted with no page errors in 1857 x 994 and 390 x 844 hosts. Color, driver pose, rein contact, heading overlap and original layering remain coherent. Artifacts: `test-results/santa-coat-home-desktop-distant.png`, `test-results/santa-coat-home-desktop-near.png` and `test-results/santa-coat-home-mobile-near.png`. Final probes confirmed test-owned port 3300 stopped, user development port 4321 running, original source GLB hashes unchanged and root build output preserved. Final model source SHA-256: `bc653759f938a47593021d866aa7618d7bf902e5798e4c121ea61b60a9712c43`. Physical-device frame rate is unmeasured; no commit, push or deployment was performed.

# Santa coat and rein gesture implementation plan

**Spec:** `santa-coat-spec.md`.

**Goal:** Give the existing Santa a better tailored red-wool coat and readable independent driving gestures, using the current Three.js scene.

## Scope

Implement the measured garment recipe in `santa-coat-design.md` inside `src/home-sections/Home/components/SantaFlight/santaModel.ts`, with focused assertions in `santaModel.test.ts`. Keep the two-template model API and all callers unchanged. A small private garment helper is allowed if it avoids burying the model assembly in geometry/texture formulas; no configurable framework or runtime dependency. Update this plan, its spec and current report/task evidence. Preserve unrelated changes, source GLBs, scene lighting, user development server and root build output; production checks use the existing temporary verification copy. No commit, push or deployment.

## Task 1: Readable hands and simpler face

- [x] Replace both sleeve wrist targets with `[-.10,.06,0]` times the existing smooth shoulder-to-wrist weight, and move each corresponding hand group by exactly the same displacement times its independent current phase weight. This increases the gesture about threefold without adding a scheduler or new joints. Keep rest coordinates `[.85,.66,side*.34]`, fixed hips, head/cap motion, mirrored glove geometry and actual hand-owned rein anchors. Retain cuff overlap at both signed extremes; adjust only if actual rendered extrema reveal a gap.
- [x] Remove the cheek-only target construction, expression-array guard/capture and per-frame facial influence assignment. Keep the original head mesh, materials, UVs, authored normals and head pivot unchanged. Four moving garment targets remain: two sleeves and two cap surfaces. Explicitly assert that the anatomical head has no morph buffers and that its source buffers remain unchanged through animation.
- [x] Update wrist magnitude assertions and actual sleeve/cuff/rein agreement tests. Retain deterministic finite-time seeking, invalid/disposed guards, source ownership and all six endpoint tests. Remove the obsolete cheek-mask assertions rather than keeping dead expectations or weakening unrelated cap/bounds checks.

## Task 2: Tailored coat and calibrated wool

- Use the selected shared material color `0xa20b0e`, roughness 1, metalness 0, environment intensity .1 and bump scale .008. Retain the existing owned wool/fur maps. Use 49 coat rings/48 angular intervals and 40 sleeve longitudinal/24 angular intervals. Catmull-Rom profile interpolation is uniform with tension .5; ring heights must remain increasing and radii positive.
- Resolve fold-mask details as follows: `front=max(0,cos(a))`, `sides=sin(a)^2`, `support=.65*front+.35*sides`. Belt ridges/troughs use amplitudes `.016,-.008,.009,-.0045`, centers `.43,.465,.49,.525` and widths `.035,.035,.045,.045`, multiplied by support and a window that rises over Y .35-.40 and falls over .58-.64. Diagonal ridge/trough amplitudes are `.014,-.009`, width .045, centers `.77-.18*abs(sin(a))+.008*sin(a)` and .045 below, with the same support and a window rising .48-.55/falling .86-.91. Lap compression is `.012*Gaussian(Y-(.19+.012*sin(a)),.05)*front*(.6+.4*cos(3*a))`, window rising .10-.13/falling .26-.29. Clamp the total radial offset to +/-.028. Gaussian is `exp(-(distance/width)^2)`; each window uses smoothstep at its stated endpoints. These decisions avoid arbitrary recurring rings or ambiguous fold weights.
- Select the conforming white-fur front opening in the design note, replacing the earlier considered red ridge: 25 elliptical sections, 16 angular intervals, Y .35-1.01, center Z 0, half-width Z .045, half-depth X .018, center X equal to the actual coat front plus .006. Derive front X from the same dense profile and fold function at angle zero (interpolate adjacent increasing-height rings). Pinch both endpoints closed under collar/behind belt. Below Y .43, let `press=smoothstep(.35,.43,Y)`, subtract `.02*(1-press)` from the center X and multiply the X half-depth by press; this tucks the fur under the belt. Put this single shared-white mesh inside `santa-coat-details` under moving upper-body contents so batching preserves the actual named coat/collar. Replace the newly exposed thick torus buckle with one flat rectangular gold frame: outer width .18 and height .13, inner opening width .14 and height .09, extrusion depth .012, bevel size/thickness .002 and one bevel segment. Use existing Shape/ExtrudeGeometry with a Path hole, the same brass material and the same mesh name; orient extrusion along +X and place it at coat-front X at Y .35 plus .016, with Y .35 and Z 0. No added buttons, separate material or texture.
- [x] Follow `santa-coat-design.md` for the smooth coat profile, local compression folds, sleeve topology, seam/placket construction, calibrated red wool and any prepared roughness detail. Preserve exact shared coat/cap wool and figure/cap fur Material identities. Keep named actual coat and collar inspectable so material assertions cannot accidentally select the cap itself.
- [x] Match coincident procedural UV-seam normals without welding UVs. Apply the same seam convention when computing neutral/deformed sleeve morph normal deltas; preserve the donor cap's authored split normals. Derive signed bounds from the actual stored Float32 target deltas, as in the accepted implementation.
- [x] Prepare added maps/geometry only at construction. Register every owned resource once, preserve cross-team independence and exact-once disposal, and avoid changing shared sleigh/deer textures or uniforms. Keep silhouette detail below the existing 180,000-triangle/125-draw budgets.

## Task 3: Verification and acceptance

- [x] Add meaningful actual-geometry checks for smooth procedural seams, garment detail/topology, prepared map ranges/material slots, matched cloth/trim materials, independent ownership and the four signed targets. Retain the actual source/loader/lifecycle/route tests. Run all six focused files with one worker and scoped lint/format; no global timeout relaxation.
- [x] Inspect real front/profile/three-quarter garment, seated pose, signed hand-pull extremes and a short motion sequence under unchanged lighting. Compare against the saved baseline and accepted color calibration; reject ribbing, seam cracks, pink/plastic highlights, cuff gaps or hidden hand movement. Measure the actual final scene.
- [x] Synchronize final sources to the existing temporary verification tree. Run an isolated production build including strict TypeScript and six desktop/mobile browser cases; inspect actual Home near/distant views. Confirm original GLB hashes and that the test server stops while user development remains running. Record only verified evidence and leave physical-device FPS explicitly unmeasured.

## Review focus

- Increasing the gesture must not separate sleeve/cuff/rein anchors at either sign.
- Smoothed seam normals must also survive GPU sleeve morphing, without rewriting authored donor normals.
- A shared wool map/material change affects the cap and trousers as well as the coat; inspect them together.
- Added construction details must follow the moving torso and remain clear of beard, belt, thighs and collar.
- Removing facial targets must update guards/tests without dropping actual head ownership or teardown coverage.

## Visual ruling

The first actual front render showed the opening's Y .42 endpoint hanging above the belt like a tie, while the existing buckle was mostly buried by the smoother coat. Extend the opening to belt-center Y .35 and compress/tuck it as specified above. The next side view exposed the original torus buckle's excessive depth, so replace that same single mesh with the flat beveled frame specified above. These are garment-construction corrections without added material or draw calls. Inspect the final front and three-quarter views before acceptance.

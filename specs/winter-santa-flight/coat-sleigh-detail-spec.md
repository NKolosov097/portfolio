# Sculpted Santa coat and crafted sleigh

## Intent

The current coat still reads as a simple inflated surface, and the sleigh looks assembled from primitive shapes. Give each a more convincing three-dimensional form and construction. Keep coat and sleigh construction in separate factory modules.

## Requirements

- Give the coat an authored, higher-detail polygon mesh: substantial asymmetric fabric folds, shoulder/arm shaping, compressed elbows, visible construction seams and thickness at exposed garment edges. Added triangles must support actual shape and shading detail.
- Preserve the accepted classic-red matte coat/cap match, white trim, static face, independent rein pulls, head/cap movement and fixed seated hips. Keep sleeve/cuff/hand/rein attachments coherent at all movement extrema.
- Give the sleigh a dimensional curved hull, layered carved panels and trim, flat curved metal runners, convincing supports and crossmembers, fitted leather seating, structured lanterns and a folded fabric cargo sack. Keep a traditional dark-crimson, warm wood and restrained brass palette suited to the existing night scene.
- Keep Santa visibly supported by the seat and his boots above the interior floor. Preserve the sleigh coordinate frame and towing attachment locations, with no route, deer, lighting, camera, layering or lifecycle change.
- Use only existing dependencies and freely licensed existing assets. Keep both GLB files unchanged. Retain lazy loading, one canvas, reduced-motion behavior, suspension, deterministic seeking and exact-once disposal.
- Keep the assembled scene below 180,000 triangles and 125 draws, and avoid runtime cloth/physics simulation or per-frame geometry construction.

## Acceptance

- [x] Inspect the actual coat from front, profile and three-quarter views against the saved prior renders; accept the sculpted folds, shaped elbows, continuous seams and thick trim under unchanged lighting.
- [x] Inspect the actual sleigh from front, side and rear, with and without the driver; accept the hollow hull, layered panels, flat runners, supported seat, floor clearance, folded sack and lantern construction.
- [x] Inspect all four hand extrema and six seated motion poses; preserve sleeve/cuff/hand/rein contact, fixed hips, static face and the accepted red coat/cap material match.
- [x] Verify geometry, signed morph bounds, independent resources, exact-once disposal, deterministic seeking and all six trace attachments. Keep both source GLBs, dependencies, scene lights, route and lifecycle contracts unchanged.
- [x] Pass the final eight-file integrated suite after the belt contact adjustment: 57/57 tests with one worker in 27.25 seconds (17.33 seconds of tests). The affected garment/model checks also passed 21/21 tests; scoped ESLint and Prettier passed.
- [x] Measure the actual integrated render at 170,075 triangles, 58 draws, 37 geometries and 19 renderer textures, below the 180,000-triangle/125-draw/45-geometry limits. Garment and sleigh factories use 21,840 and 21,400 triangles respectively, each below 22,000.
- [x] Complete independent source and delta review with no actionable findings.
- [x] Accept the final 60-frame, 5,000 ms motion GIF and repeat the actual GPU measurement after the belt contact adjustment: 170,075 triangles, 58 draws, 37 geometries and 19 renderer textures, with zero page errors.
- [x] Pass isolated strict TypeScript and production build against all six final model/factory source and test files: compilation 21.6 seconds, TypeScript 75 seconds and all 14 static pages generated. Only the existing i18next initialization notice remains.
- [x] Pass all six desktop/mobile production browser cases with one worker in 42.0 seconds. Accept actual production Home desktop frames at 6 seconds (distant) and 20 seconds (near) in a 1857 x 994 host, plus the 390 x 844 portrait frame at 17.5 seconds (near), with zero page errors.
- [x] Confirm all six final model/factory source and test files match the isolated verification copy and both original GLB hashes remain unchanged. Confirm test-owned port 3300 stopped, user development port 4321 listening and root build output preserved; close the final report and task evidence.

Physical-device FPS remains unmeasured. No commit, push or deployment is part of this work.

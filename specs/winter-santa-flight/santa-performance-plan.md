# Santa performance implementation plan

**Goal:** Make the existing seated Santa act like a driver, with restrained secondary cloth and facial movement.

**Spec:** `santa-performance-spec.md`.

**Architecture:** Keep `createSantaTeam(template, santaTemplate)` and the renderer API unchanged. Use a seated lower body, an upper-body pivot, a head pivot and two hand anchors. Prepare owned geometry morph targets once; animate transforms and scalar weights in the existing `animate(seconds, formation?)` call. Use the existing Three.js dependency and source assets.

## Scope and constraints

Modify `santaModel.ts` and its model tests. Add a small adjacent private helper only if it materially keeps morph construction readable; do not introduce a configurable animation framework. Update this plan, its spec and the existing tasks/model report with verified results. No loader/fixture contract, route, deer, lighting, source GLB, dependency or renderer scheduler change is planned. Preserve unrelated working-tree changes, the existing development server and root build output; use the existing temporary verification tree for production checks. No commit, push or deployment.

## Task 1: Articulated seated performance

- [x] Keep `santa` at `[-.25,.7,0]` as the fixed seated hip frame. Leave seated thighs, boots and hem under this frame. Add `santa-upper-body` at `[0,.25,0]` and an inner content group offset by `[0,-.25,0]`, so all authored upper-body coordinates remain unchanged at rest. Put coat, belt, collar, sleeves, hands and head under this content group. Batch rigid parts within each articulated group, never across pivots or morph meshes.
- [x] Add `santa-head-pivot` at `[-.04,1.13,0]` within upper-body contents; offset its authored-surface group by the negative pivot. Include the anatomical head, nape and cap together so no seam separates them when the head moves. Use only small head yaw and counterpitch, with beard/collar overlap inspected at both extremes.
- [x] Add independent `santa-hand-left` and `santa-hand-right` groups at `[.85,.66,side*.34]`. Preserve the cuff, glove and thumb rest positions by converting them to hand-local coordinates. Use those exact groups as the start owners of the two hand reins. Keep all six trace buffers and the existing endpoint deformation path.
- [x] Add one relative GPU morph target to each sleeve, moving its wrist by `[-.03,.018,0]` with a smooth cubic weight from zero at shoulder to one at wrist. Recompute target normals once. Animate each hand by that same displacement times its independent scalar weight, so the cuff remains joined to the sleeve. Exclude morph geometry from rigid batching.
- [x] Derive bounded deterministic motion from seconds only. Use the existing sleigh bounce frequency `w=PI/1.1`: torso pitch `.045*sin(w*t-.35)+.015*sin(1.13*t+.4)`, lateral roll `.018*sin(1.39*t+.3)`, yaw `.012*sin(.83*t)`. Subtract each term's value at zero where needed to retain the authored initial pose. Keep translation at the hip pivot, without lifting Santa off the seat. Head counterpitch about `.018*sin(w*t-.8)` and yaw about `.035*sin(.79*t)`; hand weights use separate phases/frequencies and maximum absolute one. Keep exact pose reproducibility for arbitrary seeks, negative finite time, and paused/resumed rendering; no temporal integration or per-frame allocation/geometry rebuild. Preserve invalid-time/disposed guards.

## Task 2: Costume and expression

- [x] Replace evenly repeated torso corrugations with shallow localized compression folds above the belt and lap, smoother shoulders and small asymmetric elbow creases. Keep the same silhouette envelope and shared classic-red matte cloth/white trim materials, including object identity between coat/cap and fur trim. Do not add a glossy skin or cloth shader.
- [x] Prepare cap-tip and facial-expression morph targets using the verified component masks and anatomical landmarks in `santa-performance-design.md`. Keep cap brim and crown seating fixed and animate only the free cloth end/pompom with a delayed small deflection. Facial motion must be subtle cheek/moustache expression, never a whole-face squash or painted-iris blink.
- [x] Keep all new target buffers/material resources owned by each team, source templates unchanged, and teardown exact-once. Compute source-derived masks, normals and target bounds once during construction. Check that the renderer's bounding-volume behavior covers all morph extremes.

## Task 3: Verification and convergence

- [x] Update tests to assert the new articulated hierarchy and material identities. Test fixed hip/boot contact, bounded changing independent head/hands, sleeve/hand agreement, fixed brim versus moving cap tip, localized face movement excluding eyes/nose/beard, finite positions/normals, unchanged source buffers and repeated-seek identity. Retain the six trace endpoint checks with the new hand owners, route/model restore, ownership and budget assertions. Do not relax checks or raise global timeouts.
- [x] Run all six focused Santa test files with one worker, scoped lint/format and strict TypeScript. Inspect actual rendered close and seated motion extrema and a short animated sequence; record actual scene triangles/draws and check the existing limits.
- [x] Synchronize only changed source files into the existing temporary verification tree, run an isolated production build and the six desktop/mobile winter browser cases. Inspect actual Home near/distant views. Preserve source asset hashes and user development server. Record measurements and any physical-device limitations without claiming unmeasured performance.

## Review focus

- A head pivot can reveal the cropped neck or push the beard through the collar: inspect extrema and constrain rotations rather than exposing a support shape.
- A fur mesh contains both fixed brim and detached moving pompom: use component membership, not a simple height mask.
- Newly articulated gloves can leave reins behind: assert endpoints against actual hand owners through route and Model switches.
- GPU morphs can be culled or merged away: retain targets, valid normals and conservative bounds and inspect actual rendered motion.
- Painted eyes must remain intact: expression masks explicitly exclude eye/nose/long-beard regions and preserve the original UVs.

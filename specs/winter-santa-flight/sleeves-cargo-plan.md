# Sleeve and cargo refinement plan

**Spec:** `sleeves-cargo-spec.md`.

## Scope

Limit implementation to `santaGarmentGeometry.ts`, `santaSleighModel.ts` and their tests. Keep `santaModel.ts`, loaders, renderer, routes and source assets unchanged unless a concrete integration defect requires a specified correction. Preserve existing resource names, API contracts, texture counts, triangle resolution and hand/cap animation. Use the current shared red/fur materials and existing linen material/map. Preserve unrelated work, user development server 4321 and root build output; use the existing temporary production verification tree. No commit, push or deployment.

## Task 1: Visible sleeve cloth

- [x] Keep the existing inside-elbow compression and shaped sleeve volumes. Add one diagonal upper-sleeve crest/trough near `t=.31+.04*sin(angle)+side*.01`, width .035, amplitude .025. Fade in over t .12-.22 and out over .42-.50. Add two forearm/cuff gathers centered at `t=.81+.028*sin(angle+side*.4)` and `.90-.02*sin(angle)`, widths .025/.022 and amplitudes .035/.028. Fade these in over .72-.77 and out over .94-.985.
- [x] Weight the added folds by `.6+.4*sin(angle)^2` so they read on the visible lateral arm surfaces, retaining the existing asymmetric crest/trough function. Avoid uniform circumferential ribs. Both endpoints must receive exactly zero added displacement, so the established shoulder/wrist centers and signed morph/cuff/rein attachments remain unchanged. Do not add triangles or change sleeve material.
- [x] Add actual-vertex tests for upper and lateral forearm crests/valleys and unchanged endpoint rings. Retain the three inside-elbow peak checks, seam continuity, finite normals, independent buffers, budgets and integrated motion tests.

## Task 2: Larger reclining sack

- [x] Change only `sleigh-woven-linen` base color to `0x9a6a32`, retaining roughness 1, existing weave map/bump and the same resource identity/count. Inspect its warm ochre appearance under unchanged lighting.
- [x] Reuse the existing sack topology, profile and angular folds, applying the following authored settling transform to its old sleigh-local positions. Let `x=(oldX+1.43)*1.10`, `y=(oldY-.44)*.95`, `z=(oldZ-.12)*1.25`, and lean angle `.65` radians. New coordinates are `X=-1.47+x`, `Y=max(.44,.44+y*cos(.65)-z*sin(.65))`, `Z=-.32+y*sin(.65)+z*cos(.65)`. For points within the rear board span `abs(Z)<=.685`, prevent board penetration: `rearLimit=-1.88+.05*(1-(Z/.685)^2)+.08+.015`; increase X by `max(0,rearLimit-X)*(1-smoothstep(1.14,1.24,Y))`. This enlarges and reclines the uncompressed bag, with soft compression onto the deck and against the rear board. Recompute normals on the final body vertices, match the angular UV seam and refresh both bounding volumes.
- [x] Apply the same affine pose to the existing neck cord and bow after their old local orientation/scale/position; these attachments remain above the compression regions. Use an affine Matrix4/inverse-transpose normal transform for them, preserving the original analytic normals at both torus UV seams and the bow's radial UV seam. Do not leave a vertical cord hovering above the bag or introduce a recomputed seam crease. Keep the existing names and material ownership; do not add a second bag or texture.
- [x] Verify final sack bounds within approximately X [-1.86,-1.06], Z [-.72,.72], bottom Y .44 and top below 1.8; keep its front clear of the seat-back minimum X. Confirm multiple bottom vertices form a nonzero contact footprint on the rear deck rather than a single floating tip. Check changed color, broader lateral span (at least 1.0), closed/finite surface, tied-neck alignment, unchanged borrowed resources and the existing 22,000-triangle sleigh budget.

## Task 3: Verification and convergence

- [x] Run both changed factory tests and the integrated model tests with one worker, then all eight focused files on final code and scoped lint/format: 28/28 affected cases and 59/59 full cases passed; five-file ESLint/Prettier passed. Retain ownership/attachment assertions and global timeouts.
- [x] Inspect actual sleeve/front/profile/three-quarter and hand extrema, plus rear/side/overhead sack contact. Accept stronger sleeve relief, the larger ochre reclining sack, rear-board clearance and aligned ties with zero page errors. Actual counts remain 170,075 triangles, 58 draws, 37 geometries and 19 renderer textures.
- [x] Complete independent source review after the analytic tie-normal and rear-board contact corrections, with no actionable findings.
- [x] Accept all six final motion poses and the 60-frame, 5,000 ms GIF with verified metadata; repeat final GPU measurements at 170,075 triangles, 58 draws, 37 geometries and 19 renderer textures, with zero page errors.
- [x] Complete the isolated production build against the final source: compilation 20.8 seconds, strict TypeScript 40.0 seconds and all 14 static pages generated; only the existing i18next notice remains.
- [x] Pass all six desktop/mobile production browser cases in 43.7 seconds and accept Home desktop distant/near and portrait near views with zero page errors. Match all six model/factory source/test files against the compiled copy and confirm unchanged original GLB hashes. Confirm test port 3300 stopped, development port 4321 listening and root build output preserved; close current report/task evidence. Physical-device FPS remains unmeasured.

## Visual and source review rulings

The first close render showed that the larger bag penetrated the existing rear board and that the initial added sleeve relief was too faint. Use the rear-board contact compression and stronger fold amplitudes above. The source review also requires preserved analytic tie normals after the affine pose. These corrections preserve topology, materials, motion and resource counts; acceptance requires the final actual close renders.

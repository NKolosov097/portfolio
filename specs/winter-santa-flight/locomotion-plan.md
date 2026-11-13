# Towing and living deer implementation

## Scope and approach

Use the existing pure arc sampler, standard GLB skin, independent Hermite strides and deforming trace buffers. Avoid a physics engine or frame-integrated spring state: deterministic seeking and pause/resume must remain exact. Preserve unrelated working-tree changes, the development server on 4321 and its `.next`. No commit, push or deployment.

Callers: `sampleSantaFormation` is used by the renderer and model/trajectory tests. `createSantaTeam` consumes the prepared template through the renderer; the actual-asset fixture parses its GLB. The compiler, loader URL/validation, provenance, focused tests and current model documentation must agree on the new rig.

## Sleigh path

1. Keep front/rear pair frames at travelled arc distance and travelled minus spacing.
2. Sample a history point at travelled minus three spacings, extrapolating along the start tangent for negative distance as before. Reuse scratch vectors and a small distance-sampling helper.
3. Tow direction is the normalized vector from this history point to the rear-pair center. Place the sleigh center exactly one spacing behind that center along this direction, and orient its +X along the tow direction using the existing upright basis. A straight segment exactly retains the prior arrangement; a curve yields a coherent inward-cutting trailer track and different heading. If the chord degenerates, use the rear frame's forward vector.
4. Keep the authored leader time-to-arc mapping, routes, spacing API and three output frames unchanged. Update the old test assumption that all three frames sit on the same arc: pair arc spacing stays fixed, sleigh Euclidean tow gap stays fixed, sleigh track/heading differs on curves and seeking is deterministic.

## Articulated head asset

Extend the reproducible compiler without changing simplified topology, textures or existing leg weights.

- Preserve root and eight leg joints at their current indices 0..8. Add `deer-neck` joint 9 at absolute canonical [.65, 1, 0], parent root; add `deer-head` joint 10 at absolute [1.20, 1.65, 0], parent neck. Derive local translations and inverse bind translations from those rest positions. Store an eleven-joint standard glTF skin.
- Let neck weight `n = max(smooth(y,.85,1.25) * smooth(x,.25,.72), h)`, where `h = max(smooth(y,1.65,1.95), smooth(x + .65*y,1.95,2.35))`. This roots the torso, softly articulates the rising neck, keeps the muzzle and high rack fully on the head, and avoids leg overlap (leg fade already reaches zero below .85).
- For n>0, indices are [0,9,10,0], weights [1-n,n*(1-h),n*h,0]. Otherwise preserve current root/upper/lower limb weights exactly. All values finite, normalized and nonnegative. Check actual rack and muzzle vertices are fully head-weighted before runtime integration; if source regions contradict these masks, return the issue for specification refinement.
- Parent all eight existing antler marker nodes under `deer-head`, converting canonical marker positions to head-local rest coordinates. Keep the same named nodes and surface offsets.
- Generate `natural-deer-v2.glb` and update loader URL, fixture and provenance/hash. Remove the superseded v1 binary from the current shipped assets after successful preparation; original source and existing temp reproduction remain available. Target <1.5 MB, same 19,999 triangles and 17,294 vertices.
- Loader validates eleven bones including both named new Bone objects. Keep its existing promise cache and eligibility contract.

## Runtime pose and attachments

- Retain per-animal periods, phases and amplitudes. Store references to its cloned neck/head Bones in the existing Animal record.
- Starting art values, tune only after actual pose inspection: vertical body lift .10*cos(pulse-.35), longitudinal surge .035*sin(pulse-.2), body pitch .045*sin(pulse-.6), neck pitch .065*sin(pulse-.45), head counter-pitch -.045\*sin(pulse-.9), all scaled by individual amplitude. Keep rotations modest; no extra free-running random timers. Local motion composes with the route frame as before.
- Parent the shared rack core/halo group to the cloned head Bone; build its geometry from the now-head-local markers. The existing world-scale halo callback remains valid.
- Add a named `deer-head-tack` Group under the head at [-1.20,-1.65,0] so its rest transform recovers canonical coordinates. Build the existing bridle under this group at the current canonical muzzle position. Do not rigid-batch it into the torso.
- Change only the hand-rein endpoint owner from rear body to its head-tack group. The existing original-anchor delta deformation then follows the moving muzzle without new per-frame buffers. Pair/pull traces keep their current chest/body owners. Update actual-owner endpoint tests.
- Keep geometry/texture sharing, independent skeletons, exact-once disposal and the red cap/Santa/sleigh appearance intact. No host lifecycle changes are needed.

## Tasks and validation

- [x] Prepare the eleven-joint asset; verify rest shape, normalized weights, unchanged lower belly/shin influences and head/rack/muzzle weighting.
- [x] Implement pure towed-sleigh frames and coordinated body/neck/head pose; refit moving attachments.
- [x] Update affected actual-asset/model/trajectory tests: distinct trailer path, fixed tow distance and orientation, straight/extrapolated entry, deterministic seeking; actual head/antler vertices move relative to torso and lights/bridle/reins follow; independent cadence, finite posed bounds and resource teardown remain.
- [x] Run focused suites serially with one worker, scoped lint/format and compiler reproducibility. Return stable source for actual visual review before heavy build/browser work.
- [x] Inspect actual multi-pose motion and desktop/mobile Model/flight; tune only bounded pose values if needed.
- [x] Complete isolated production build and six production browser cases, preserve port 4321 and stop only test-owned port 3300; record current asset/stats and remaining hardware limits.

The existing natural-deer plan/evidence describes the prior nine-bone rig. This refinement supersedes its current rig count and filename; preserve historical verification as history rather than reporting it as new evidence.

Actual six-pose head/body/Model review accepted the specified amplitudes and coherent moving attachments. Current measurements: 123,052 rendered triangles, 47 draw calls, 26 geometries and a 1,344,712-byte GLB. All 32 focused cases and scoped lint/format/reproducibility checks passed. The isolated production `next build --webpack` passed compilation, TypeScript and all 14 static pages; all six desktop/mobile production browser cases passed. Actual production Home desktop/portrait frames and both Model views were accepted: towing and connected traces remain coherent, posed detail and original layering/entry/exit are preserved, and no page errors occurred. Artifacts are `test-results/santa-towing-home-*.png`. Port 3300 is stopped, port 4321 remains running, and the v2 hash is unchanged. Physical-device frame rate remains unmeasured; no commit, push or deployment was performed.

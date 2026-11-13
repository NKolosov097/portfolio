# Santa team: current model report

## Current readable sleeves and reclining cargo sack

Santa's upper sleeves now have visible diagonal crests and valleys, with two
uneven forearm/cuff gathers and stronger relief on the exposed arm surfaces.
The existing three inside-elbow creases remain. Endpoint rings, independent
hand pulls, cuff/glove/rein contacts, classic-red coat/cap material and all
source head/deer geometry remain unchanged. The garment factory still uses
21,840 triangles at the existing sleeve resolution.

The existing linen sack is larger, warm ochre `0x9a6a32` and reclined behind the
seat. Its weighted bottom forms a broad contact patch on the rear deck; the
lower cloth is compressed clear of the curved rear board and remains behind
the backrest. The same gathered neck carries the cord and bow. Their affine
pose preserves analytic normals at both torus UV seams and the bow radial
seam; the compressed sack body has recomputed normals, matched angular seam
normals and refreshed bounds. The sleigh factory remains at 21,400 triangles.
Existing linen maps, roughness, materials and resource names are preserved.

All 59 tests across eight focused files passed with one worker in 32.60 seconds
(18.89 seconds of tests). All 28 affected factory/model tests and scoped
five-file ESLint/Prettier passed. Checks cover actual lateral sleeve crests
and valleys, unchanged endpoint rings, three elbow peaks, sack topology,
deck contact area, rear-board/backrest clearance, neck alignment, tie normal
seams, budgets, deterministic motion and exact ownership. Texture disposal
remains exactly nine per team and eighteen across two independent teams.
The integration test's geometry-identity assertion uses a boolean comparison
to avoid expensive object inspection; its proof and all source-buffer checks
are retained. Global timeouts are unchanged. Independent source review found
no actionable issues after the contact and normal corrections.

Actual front/profile/three-quarter sleeves, hand extrema and rear/overhead/side
sack views were accepted under unchanged lighting, with zero page errors,
aligned ties and no visible rear-board penetration. The actual integrated
scene retains 170,075 triangles, 58 draws, 37 geometries and 19 renderer
textures, within the existing 180,000-triangle/125-draw budgets. Current close
artifacts include `test-results/santa-cargo-garment-threequarter.png`,
`test-results/santa-cargo-bag-rear.png`,
`test-results/santa-cargo-bag-overhead.png` and
`test-results/santa-cargo-sleigh-side.png` and
`test-results/santa-cargo-team.png`. Final close garment/sleigh, rear/overhead
sack, hand-extrema and all six motion-pose renders were accepted. The final
`test-results/santa-cargo-motion.gif` was inspected and accepted, with its
60-frame, 5,000 ms metadata verified. Repeated final GPU measurement confirms
the same 170,075 triangles, 58 draws, 37 geometries and 19 renderer textures,
with zero page errors.

The final isolated production build passed compilation in 20.8 seconds, strict
TypeScript in 40.0 seconds and generation of all 14 static pages. Only the
existing i18next initialization notice remains. All six final desktop/mobile
production browser cases passed in 43.7 seconds. Actual production Home review
accepted desktop frames at 6 seconds (distant) and 20 seconds (near) in a
1857 x 994 host, plus the portrait frame at 17.5 seconds (near) in a 390 x 844
host, with zero page errors. Artifacts:
`test-results/santa-cargo-home-desktop-distant.png`,
`test-results/santa-cargo-home-desktop-near.png` and
`test-results/santa-cargo-home-mobile-near.png`.

All six model/factory source and test files match the compiled isolated
verification copy. Final factory source SHA-256 values are:

- `santaGarmentGeometry.ts`: `2a55f381395966a33142a20fec1ceba792b5511c81cc171f6fb64901cc14077b`.
- `santaSleighModel.ts`: `c58527642c199672a41ca51132a698d9351b54bec3e27ffe62e5c252e7b7ff3f`.

Original GLB SHA-256 values remain Santa
`01d8a110e06d6bec8a75262b13352556e38185b409df7567d9efe6484808eee1` and deer
`bad2a6573d20b274b66eec126ce07386a57167246124473f8f1370451ca13556`.
Final probes confirmed test-owned port 3300 stopped and user development port
4321 listening; root build output and the development server were preserved.
All current acceptance checks are complete. Earlier sections below are
historical evidence. No dependency, source GLB or production model integration
change was needed. Physical-device frame rate remains unmeasured. No commit,
push or deployment was performed.

## Prior sculpted coat and crafted sleigh

The garment now uses a 97-row, 64-segment Catmull-Rom coat with asymmetric
shoulder tension channels, distinct ridge/trough compression and seated lap
bunching. Two 48-interval, 32-segment sleeves have shaped upper-arm, elbow and
forearm volumes with three inside-elbow creases. Raised red construction seams
follow the actual folded surface; the collar and tapered front opening are
closed, rounded volumes with short irregular pile relief. The contact band
beneath the belt remains quiet so fold crests do not cut through the leather.
The complete garment factory uses 21,840 triangles.

The crafted sleigh uses 21,400 triangles. Its hollow curved hull has closed wall
thickness, layered inset panels, rounded edging and restrained brass fittings.
Flat curled metal runners connect through supports and crossmembers. Structured
leather seating supports the unchanged seated body, the boots clear the interior
floor, and the folded linen sack and caged lanterns have actual dimensional
construction. Two deterministic, independently owned maps provide subtle wood
grain and linen weave; existing borrowed brass, steel, leather and amber surfaces
remain under the original resource registry.

Coat, cap and sleeves preserve the same owned classic-red wool material
`0xa20b0e` and existing wool map. White trim retains the shared fur material.
The anatomical face remains static; fixed seated hips, independent
`[-0.10, 0.06, 0]` hand pulls, head/cap motion, all six trace owners and signed
Float32 GPU targets remain unchanged. Both factories register their resources
in the existing exact-once ownership Sets. Scene lighting, deer, routes, camera,
one-canvas lifecycle, suspension and deterministic seeking are preserved.
Neither source GLB nor any dependency changed.

The final eight-file integrated suite passed 57/57 tests with one worker in
27.25 seconds (17.33 seconds of tests), after the belt contact adjustment. All
21 affected garment/model tests also passed, including actual front and side
vertex checks beneath the strap. Scoped ESLint and Prettier passed. New factory checks
cover physical trim closure and thickness, substantial asymmetric crest/trough
shape, three actual elbow compression peaks, hull/panel thickness, flat runner
cross-sections, fitted seat/floor/tow dimensions, deterministic maps and
independent ownership. The shared integration case verifies both new sleigh
maps through actual rendered material slots and exact disposal counts of nine
textures per team. Independent source/delta review found no actionable issues.

The actual integrated GPU render measured 170,075 triangles, 58 draws, 37
geometries and 19 renderer textures, within the existing scene budgets. Actual
front/profile/three-quarter garment views, all four hand extrema, bare sleigh
front/side/rear/interior, seated/full-team views and six motion poses were
accepted under unchanged lighting against the saved prior renders. The final
60-frame, 5,000 ms motion GIF was accepted, and the repeated GPU measurement
after the belt contact adjustment confirms the same counts with zero page
errors. Primary artifacts: `test-results/santa-detailed-garment-threequarter.png`,
`test-results/santa-detailed-sleigh-side.png`,
`test-results/santa-detailed-sleigh-interior.png`,
`test-results/santa-detailed-team.png` and
`test-results/santa-detailed-motion.gif`.

The final isolated production build passed against all six model/factory source
and test files: compilation 21.6 seconds, strict TypeScript 75 seconds and all
14 static pages generated. Only the existing i18next initialization notice
remains. Final production source SHA-256 values are:

- `santaModel.ts`: `54f48f675464129a6b36e4e96dff918e311eb11bfd4ca33909b763516bc6619c`.
- `santaGarmentGeometry.ts`: `86b7026cb76cd3b7232aa38d399f22ce16b03f5474a39517f739cdd262b94fa7`.
- `santaSleighModel.ts`: `ae5867b148a779d2117b20bc4b3442eef6920fb10f0a5049cd374fb02d6b400e`.

All six final desktop Chromium/mobile Chrome production browser cases passed
with one worker in 42.0 seconds. Actual production Home review accepted desktop
frames at 6 seconds (distant) and 20 seconds (near), plus the 390 x 844 portrait
frame at 17.5 seconds (near), with zero page errors. The hosts measured
1857 x 994 and 390 x 844. Artifacts:
`test-results/santa-detailed-home-desktop-distant.png`,
`test-results/santa-detailed-home-desktop-near.png` and
`test-results/santa-detailed-home-mobile-near.png`.

All six final model/factory source and test files match the isolated verification
copy. Final probes confirmed test-owned port 3300 stopped, user development port
4321 listening and root build output preserved. Original GLB SHA-256 values
remain Santa `01d8a110e06d6bec8a75262b13352556e38185b409df7567d9efe6484808eee1`
and deer `bad2a6573d20b274b66eec126ce07386a57167246124473f8f1370451ca13556`.
All acceptance checks for that sculpted-coat revision were complete. Production
evidence below belongs to still earlier models.
Physical-device frame rate remains unmeasured. No commit, push or deployment
was performed.

## Prior tailored coat and readable reins (before sculpted garment and crafted sleigh)

Santa now has a smooth 49-ring, 48-segment Catmull-Rom coat profile with localized
belt, underarm and seated-lap folds. Two 40-interval, 24-segment sleeves have
restrained inner-elbow creases. Procedural UV seams share matching normals,
including the neutral and deformed sleeve normals used for GPU morph deltas.
The donor head and cap retain their authored split normals and UVs.

Coat, sleeves, trousers and cap use the same owned matte wool material:
`0xa20b0e`, roughness 1, metalness 0, environment intensity 0.1 and bump scale
0.008. The existing 256-pixel wool map and repeat of 4 remain unchanged.
A conforming white-fur front opening shares the collar/cap trim material,
closes at both ends and tucks behind the belt. A rounded rectangular buckle
frame uses the existing brass material and measures 0.18 wide, 0.13 high and
0.016 deep including bevels. Its back meets the belt instead of projecting
forward as a deep ring.

Independent hands now pull by `[-0.10, 0.06, 0]` times their existing phase
weights, with the complete sleeve wrists, cuffs, gloves and hand-owned reins
following the same displacement. Shoulders and seated hips remain fixed.
The anatomical face is static under the existing moving head pivot; the cheek
target was removed. Four owned garment targets remain: two sleeves, cap cloth
and pompom. Source head positions, normals and UVs remain unchanged.

The six focused files passed all 49 tests with one worker in 74.22 seconds
(10.20 seconds of tests). After actual rendered inspection tucked the opening
behind the belt and replaced the deep buckle with a flat frame, all 18 affected
model cases passed again in 11.83 seconds (10.87 seconds of tests). Scoped ESLint and Prettier passed on the final
source/tests. Coverage includes finite topology and increasing coat heights,
matched signed seam normals, closed/tucked trim, material/map identities and
ranges, static source head buffers, visible independent pull ranges, cuff
overlap at all four natural hand extrema, all six trace endpoint owners,
deterministic seeking and exact-once disposal. No dependency or timeout change
was added.

The final actual rendered scene measures 147,819 triangles, 55 draws, 33 geometries
and 18 renderer textures including bones/environment, within the existing
180,000-triangle/125-draw budgets. Actual front, profile and three-quarter views
accepted the classic red cloth/cap match, continuous garment shading, tucked
fur opening and flat brass buckle. The four natural hand extrema, six seated
poses and a 60-frame, 5,000 ms motion GIF retain coherent sleeve/cuff/glove/rein and seat
contact, with zero page errors. Artifacts: `test-results/santa-coat-*.png` and
`test-results/santa-coat-motion.gif`.

The final model source SHA-256 is
`bc653759f938a47593021d866aa7618d7bf902e5798e4c121ea61b60a9712c43`.
The public source asset bytes remain unchanged. The isolated production build
passed against the final source: compilation 17.6 seconds, strict TypeScript
81 seconds and all 14 static pages generated. Only the existing i18next
initialization notice remains. All six production browser cases passed in
desktop Chromium and mobile Chrome with one worker in 41.3 seconds. The final
source hash matches the isolated verification copy.

Final actual production Home review accepted desktop frames at 6 seconds
(distant) and 20 seconds (near), plus the 390 x 844 portrait frame at 17.5 seconds
(near). The hosts measured 1857 x 994 and 390 x 844. Color, driver pose, connected
reins, heading overlap and original layering remain coherent, with no page
errors. Artifacts: `test-results/santa-coat-home-desktop-distant.png`,
`test-results/santa-coat-home-desktop-near.png` and
`test-results/santa-coat-home-mobile-near.png`.

Final probes confirmed test-owned port 3300 stopped, user development port
4321 running and root build output preserved. Source asset SHA-256 hashes remain
Santa `01d8a110e06d6bec8a75262b13352556e38185b409df7567d9efe6484808eee1`
and deer `bad2a6573d20b274b66eec126ce07386a57167246124473f8f1370451ca13556`.
The prior completed performance evidence below is historical. Physical-device
frame rate remains unmeasured; no commit, push or deployment was performed.

## Prior natural Santa performance (before coat refinement)

The seated hip frame remains at `[-0.25, 0.7, 0]`; thighs, boots and hem stay
under it. Separate rest-preserving torso and head pivots add restrained sway,
counterpitch and gaze. Independently phased hand groups retain their cuffs,
gloves and mirrored thumbs, with each sleeve wrist and rein following the same
hand displacement. Static batches stay within each pivot and each hand keeps
its own mirrored geometry.

The coat now has localized broad compression above the belt and over the lap,
with smaller asymmetric elbow creases. The cap keeps the same exact matte-red
wool material as the coat and the same white-fur material as the collar. Five
owned relative GPU targets move two sleeve wrists, the free cap cloth end,
its pompom and the cheeks. The brim and lining are fixed relative to the head;
the facial target moves exactly 74 cheek vertices and leaves eyes, nose,
moustache and long-beard positions unchanged. It is a subtle cheek expression,
not an articulated smile or blink.

Construction preserves source positions, normals, UVs and topology. Morph normal
deltas subtract recomputed neutral topology normals from deformed topology
normals, retaining authored split normals and limiting changes to triangles
touching moved vertices. Signed culling bounds use the actual stored Float32
deltas, covering both full negative and positive target extremes without
per-frame vertex rebuilding. Motion is deterministic for arbitrary finite
timestamps, including negative values; invalid timestamps and disposed teams
remain guarded.

All 48 focused cases passed in six files with one worker in 24.41 seconds
(13.51 seconds of tests). Coverage includes fixed lower-body transforms,
independent bounded joints, sleeve/hand agreement, mirrored glove geometry,
all six trace endpoint owners, fixed brim versus moving pompom, localized
cheeks and triangle-local normal support, exact signed bounds, unchanged source
buffers, repeated seeks/route restores, budgets and exact-once owned teardown.
Scoped ESLint and Prettier passed. No dependency or timeout change was added.

The final isolated strict TypeScript check and production build passed against
the final source: compilation 19.9 seconds, build TypeScript 23.5 seconds and
all 14 static pages generated. Only the existing i18next initialization notice
remains. All six desktop Chromium/mobile Chrome production browser cases passed
in 45.4 seconds with one worker. Source Santa/deer GLB hashes remain unchanged.

The final actual rendered scene measures 141,707 triangles, 54 draws,
31 geometries and 19 renderer textures including bones/environment, within the
180,000-triangle/125-draw budgets. Actual close cap targets at both signed
extremes and the full cheek target were accepted. Six seated poses and a
60-frame, five-second animated sequence retain coherent seat contact,
neck/collar overlap, cuff/sleeve joins and cap/pompom contact, with no page
errors. Artifact: `test-results/santa-performance-motion.gif`.
Final actual production Home review accepted desktop frames at 6 seconds
(distant), 17.5 seconds (near, heading/aside crossing) and 20 seconds (near,
with the full driver visible), plus the 390 x 844 portrait frame at 17.5 seconds
(near). The hosts measured 1857 x 994 and 390 x 844; original layering and
heading overlap remain coherent, with no page errors. Artifacts:
`test-results/santa-performance-home-*.png`, `test-results/santa-performance-*.png`
and the verified 60-frame, 5,000 ms `test-results/santa-performance-motion.gif`.

The final verified model source SHA-256 is
`c46a4bff7cc13789f1b5d4e938677cd9e24b7195642a9272a8de4b17ffabae0d`.
Final probes confirmed the test-owned port 3300 stopped, user development
port 4321 running and both source asset hashes unchanged. Root `.next` and
unrelated work were preserved. No commit, push or deployment was performed;
physical-device frame rate remains unmeasured.

## Prior natural Santa appearance (before performance)

Santa now uses the verified CC0 textured Wizard head/beard, a continuous grooved/strand-textured nape, compact Santa Hat geometry and matte folded clothing with continuous sleeves. The cap cloth and suit share the exact same classic-red wool Material object; cap fur and figure trim share the exact same white-fur Material object. The accepted deer, motion, towing, route timings, lights and hand/rein anchors remain unchanged.

- Shipped `natural-santa-v2.glb`: three static surfaces, one embedded 1024px head map, 24,527 triangles, 16,531 referenced vertices and 974,432 bytes. Head/cap-cloth/cap-fur triangle counts are 19,999/2,336/2,192. No donor cap PBR maps remain. SHA-256: `01d8a110e06d6bec8a75262b13352556e38185b409df7567d9efe6484808eee1`; sources/licenses/transforms are recorded in `public/assets/models/winter/natural-santa-SOURCE.md`.
- Actual front/profile/rear-three-quarter/rear and seated/full-team inspection accepted the continuous hair closure, compact fitted cap, matching bright-red soft cloth and white trim. Prior measured scene: 141,707 triangles, 45 draws, 25 geometries and 14 renderer textures including bones/environment.
- All 45 focused tests, scoped lint/format, byte-identical reproduction and both source-hash rejection checks passed. Isolated strict TypeScript passed after the precise geometry-source binding; 14/14 model tests and affected lint/format then passed again.
- The final isolated production rebuild passed compilation (13.4 seconds), TypeScript (13.4 seconds) and all 14 static pages; only the existing i18next initialization notice remains. All six production browser cases passed in desktop Chromium/mobile Chrome in 36.2 seconds with one worker. The test-owned server on 3300 stopped through teardown; user development 4321 and root `.next` were preserved.
- Final actual production Home review accepted desktop frames at 3.2, 6, 9, 17.5 and 20 seconds (distant/distant/distant/near/near), plus the 390 x 844 portrait frame at 17.5 seconds (near), with no page errors. The full-window hosts measured 1857 x 994 and 390 x 844; aside occlusion and title crossing remain intact. Production Model desktop/mobile views fit the complete team and retain the accepted compact matte matching-red cap/suit and new face. Artifacts: `test-results/santa-natural-character-home-*.png` and `test-results/santa-natural-character-*.png`.
- Final probes confirmed 3300 stopped, 4321 running and unchanged Santa/deer asset hashes. Physical-device frame rate and photographic realism are not established; no commit, push or deployment was performed.

## Historical model evidence

The procedural deer and Santa-face surfaces below are superseded by the natural-deer and natural-Santa specifications/plans and their sections in `tasks.md`. These earlier measurements are retained as historical evidence.

The original textured replacement passed 30 focused tests, the isolated production build including TypeScript and 14 static pages, and all six desktop/mobile production browser cases. That evidence describes the prior nine-bone rig. The current eleven-bone head/neck rig and chord-towed sleigh are specified in `locomotion-spec.md` and `locomotion-plan.md`; that refinement's measurements and verification are recorded in the locomotion section of `tasks.md`.

The preceding locomotion refinement passed 32 focused cases, scoped lint/format/reproducibility, an isolated production build including TypeScript and 14 static pages, and all six desktop/mobile production browser cases. Actual six-pose head/body/Model review accepted the motion and attached tack/lights. At that stage measurements were 123,052 rendered triangles, 47 draw calls, 26 geometries and a 1,344,712-byte GLB. Final actual production Home desktop/portrait frames and both Model views were accepted, preserving coherent towing, connected traces, posed detail and original layering/entry/exit without page errors. Artifacts are `test-results/santa-towing-home-*.png`; physical-device frame rate remains unmeasured.

Tasks 1 and 3 implement the pure `createSantaTeam()` model with the specified
`group`, `animate(seconds)` and idempotent `dispose()` interface. The team faces
+X, retains the prescribed local sleigh/deer arrangement, and has initial posed
bounds centered around the origin at 14 world units long.

## Earlier procedural model

The four reindeer share one continuous, closed body surface generated once from
a deterministic 56-cell MarchingCubes field. A smooth union joins the torso,
shoulders, haunch, forward-sloping neck, skull and elongated muzzle. Generated
buffers are trimmed to the actual vertex count, and temporary polygonizer
geometry is released. The former separate torso/neck/head and pale-throat
ellipsoids are removed.

Linear vertex colors supply warm brown fur, restrained dorsal variation and
softly blended pale throat/underjaw coloration. A white base material avoids
multiplying the brown color twice. The existing small fur bump texture remains.
Smaller almond-shaped eyes, ears, bridle, antler roots and hand-rein endpoints
follow the revised skull. Four articulated legs per animal, cloven hooves,
curved tapered asymmetric antlers, tack and staggered gallop phases remain.

Santa retains his seated clothed body, bent arms, gloves, boots, face, moustache,
beard locks and named red bent hat, white brim and pompom. The sleigh retains
curved bevelled sides, open seating, upholstery, metal runners, brass decoration,
sack and emissive lantern glass. Static details are merged by material, while
animation reuses existing transforms and rein attributes.

Three deterministic 64 × 64 DataTextures supply surface relief without DOM,
downloaded images or runtime network calls. All owned materials, textures and
geometry are disposed once, including repeated teardown and independent teams.

## Measured budget and verification

- 93,840 rendered triangles and 107 mesh draws, measured in actual Chromium
  rendering; the earlier separate-volume study used 90,064 triangles/103 draws.
- 32 distinct rendered geometries, 18 materials and three small textures.
- Shared continuous body: 3,824 triangles, reused by all four animals.
- Initial bounds: 14 × 5.078 × 3.039 world units, center approximately `[0, 0, 0]`.
- Focused Vitest: 7/7 passed. Checks cover actual cap material/trim/pompom,
  quadruped rigs and staggered poses, outward leg winding, welded body edges
  incident to exactly two faces, positive signed volume and outward normals,
  finite normals/colors/vertices, trimmed body buffers, shared body geometry,
  finite animated bounds, resource budgets, responsive reused reins and disposal.
- Scoped strict TypeScript and scoped ESLint for both model files passed.
- Repository Prettier check passed for both model files.
- Fresh actual-model close render: `test-results/santa-model-study.png`.
  Inspection confirms a continuous shoulder/neck/head transition, forward neck
  slope and smaller facial details. The integration review also confirmed
  distant flight, aside occlusion and near-flight heading overlap on the actual
  Home page; final production validation remains part of that broader review.

## Construction performance refinement

The deterministic field sampler now prepares each anatomical volume's sine,
cosine, reciprocal radii and minimum radius before the 56-cubed sampling loop.
It no longer destructures volume tuples or recomputes those fixed transforms
per voxel. The fixed neck-color slope is also prepared once.

A three-sample direct Node measurement changed from 587.6/347.3/487.0 ms to
525.5/229.9/202.1 ms for complete team creation. A temporary instrumented bundle
measured a best warmed sample of 172.3 ms: body generation 68.3 ms (field sampling
39.3 ms, polygonization 19.8 ms, remaining trimming/color work about 9.2 ms),
static mesh merging 43.0 ms and other construction about 61.0 ms.

Five instrumented total samples ranged from 172.3 to 542.5 ms, with substantial
variance while other work and software GPU rendering contended on this machine.
These are local observations, not a real-device performance budget or a claim
that initialization meets 100 ms. No worker, baked asset or persistent global
geometry cache was added. A before/after comparison confirmed bit-identical
body position, normal, color and UV buffers, with unchanged topology and rendered
triangle/draw counts.

Task 1 added exact `three` and `@types/three` versions `0.187.0`, preserving
existing manifest changes. Task 3 changes only the model, its focused tests and
this report; it adds no dependency or runtime/API change.

This remains an original authored game-scale study. The large torso/neck seams
are removed, but limb attachment transitions, schematic fur relief and Santa's
stylized face remain artistic limits. No cinematic or photorealism claim is made.
No commit, branch operation, push or deployment was made.

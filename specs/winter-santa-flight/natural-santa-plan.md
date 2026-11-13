# Natural Santa implementation plan

## Decision and scope

Implement `natural-santa-spec.md` with the verified textured head/beard from Grab3D Wizard, the compact bent Grab3D Santa Hat geometry, a continuous textured nape, and restrained improvements to the existing seated coat/sleeves. The donor retains authored eyes, eyelids, nose, cheeks, mouth, moustache and sculpted white beard. No wizard costume or props survive extraction.

Preserve the accepted deer assets/materials/rig/gait, sleigh/sack/upholstery, traces, route sampling/timings, scene lighting, portal and lifecycle. Retain the Santa parent at sleigh-local `[-.25,.7,0]`, facing +X, its rocking, and the existing glove/rein coordinates. No new runtime dependency, skeleton, renderer or physics is required. Preserve unrelated changes, the user-owned development server and root build output; no commit, push or deployment.

## Verified sources and provenance

Both publisher downloads are CC0 1.0 and publicly available without an account. Preserve their original licenses/manifests beside concise provenance notes in `public/assets/models/winter/`.

| Part             | Publisher                                    | Direct source                                 | Source SHA-256                                                     |
| ---------------- | -------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| Head/beard donor | https://grab3d.com/models/characters/wizard/ | https://grab3d.com/dl/wizard/wizard-light.glb | `6a8242b2eda14a3611d3bca09ddeee120cc4cedb19c8f0741535aa9e220e2df6` |
| Bent cap         | https://grab3d.com/models/props/santa-hat/   | https://grab3d.com/dl/santa-hat/santa-hat.glb | `9af195ed9b898256abc836ce0ac4b206d9192d86edc04acdc44df42f19d1c5fb` |

Original license and manifest URLs use `LICENSE.txt` and `manifest.json` in each direct-download directory. Store them as `natural-santa-wizard-LICENSE.txt`, `natural-santa-wizard-manifest.json`, `natural-santa-hat-LICENSE.txt`, and `natural-santa-hat-manifest.json`; record adaptations in `natural-santa-SOURCE.md`.

Wizard light is 12,448,612 bytes, one static indexed 400,000-triangle primitive with POSITION/NORMAL/TEXCOORD_0. Its face points +Z, with +Y up. Santa Hat is 674,492 bytes, one static 4,528-triangle textured primitive with albedo/normal/metallic-roughness maps. Its source node translation is `[-.03291893005371094,0,.000012703239917755127]`; the tip bends toward source +X.

## Deterministic asset preparation

`scripts/prepare-natural-santa.cjs` accepts both verified local source files and an optional output path. Follow the existing deer compiler pattern: pinned meshoptimizer .25 and Next's installed Sharp, source SHA checks, strict bounded GLB/accessor/index validation, deterministic standard output, and assert-based artifact checks. Do not fetch or execute source content or add a generic pipeline.

The head mask operates in original Wizard coordinates. Average each triangle's POSITION and UV values, sample the original sRGB albedo at clamped `floor(u*width),floor(v*height)` without a vertical flip, and define:

- `white = min(r,g,b)>80 && min(r,g,b)/max(r,g,b)>.70`.
- `face = (x/.115)^2 + ((y-1.645)/.087)^2 + ((z-.12)/.095)^2 < 1`.
- Provisionally retain triangles with `1.16<y<1.715`, `abs(x)<.22`, `z>-.15`, and `(white || face)`.
- Connect provisional triangle vertices by source position rounded with `toFixed(5)` and retain only the largest connected component. Use connectivity only for index selection; preserve actual UV seams and source normals.

The verified component contains 46,669 triangles. Compact retained vertices, simplify with normal weights .1 and UV weights .5, target 20,000 triangles and error .005, then compact again. The shipped head has 19,999 triangles and 13,412 referenced vertices. Preserve original normals/UVs; bake positions as `X=(z-.12)*1.35+.10`, `Y=(y-1.645)*1.35+1.40`, `Z=-x*1.20`, using the correct inverse-transpose normal transform. Head bounds are X `[-.268383,.344158]`, Y `[.742138,1.505005]`, Z `[-.226987,.244913]`.

Split the cap by position-rounded connectivity before baking: the verified source has four disconnected components with triangle counts 128, 624, 1,440 and 2,336. The unique component reaching source Y>.25 is the 2,336-triangle red textile; combine the other three as white lining/brim/pompom (2,192 triangles). Preserve original indices/UV seams and compact each surface. Bake the source translation, rotate 180 degrees about Y, scale by 1.60 and translate by `[-.04,1.47,0]`, retaining the -X bent tip. Combined cap bounds are X `[-.294934,.214934]`, Y `[1.470000,1.905092]`, Z `[-.201191,.201191]`; keep all 4,528 triangles/3,119 referenced cap vertices.

Remove all donor cap PBR maps; retain only the 1024px head albedo as embedded WebP. Head material has roughness .9 and zero metalness. Standalone cap defaults use red/white color factors, roughness 1 and zero metalness, and runtime clones replace those materials with the figure's exact shared wool/fur materials. This prevents a baked pink or shiny cap from diverging from the classic bright-red suit.

Write one self-contained standard GLB, `public/assets/models/winter/natural-santa-v2.glb`, containing three static named meshes `santa-natural-head`, `santa-hat-cloth`, `santa-hat-fur`, one embedded head map, no skeleton/animations/custom geometry decoder. Final artifact: 974,432 bytes, 24,527 triangles, 16,531 referenced vertices; SHA-256 `01d8a110e06d6bec8a75262b13352556e38185b409df7567d9efe6484808eee1`.

## Continuous nape and costume

Remove the former primitive face, facial features, tube-lock beard and procedural cap. Clone the prepared surfaces under a subgroup of the original Santa parent so rigid batching preserves their names and material/UV contracts. Tint only the cloned head material with linear `[.55,.52,.49]` and environment intensity .18, retaining its actual map.

Close the cropped head from cap to collar with a single closed `SphereGeometry(1,32,24)` shaped around `[-.05,1.29,0]`, radii `[.22,.23,.18]`. For unit-sphere coordinates `nx,ny,nz`, let `phi=atan2(nz,nx)` and perturb the X/Z radii by `(.004*sin(phi*13+ny*2)+.002*sin(phi*27-ny*3))*(1-ny*ny)`, leaving Y radius fixed; recompute normals. Its bottom overlaps the collar and its top overlaps the cap. It adds 1,472 triangles. The textured donor remains the actual face.

Give the nape its own deterministic 256px opaque grayscale texture as both albedo and bump, repeating `[2,1]`. Let `phase=x/size*2PI`; brightness is around 164, with broad term `18*sin(phase*38+2*sin(y*.018)+.5*sin(y*.045+phase*3))`, fine term `4*sin(phase*118+sin(y*.03))`, and at most two byte units of seeded grain. Integer X frequencies keep RepeatWrapping continuous. Material linear color is `[.68,.65,.60]`, roughness .96, environment intensity .18 and bump scale .012. Own its geometry/material/texture per team; no per-frame generation or transparency.

Use a compact fur collar loft with sections `[-.05,1.02,0,.26,.29]`, `[-.06,1.08,0,.25,.28]`, `[-.06,1.13,0,.20,.21]`, `[-.07,1.17,0,.14,.15]` and restrained radial irregularity. Santa-only fur uses the existing fiber texture for albedo and bump, linear color `[.68,.65,.60]`, roughness .96 and bump scale .008.

Keep seated proportions, thighs, mittens, boots and hand anchors. Densify the coat loft to 26 rings/24 sides with restrained radial folds. Santa-only wool is classic bright red sRGB `0xb51b23`, roughness 1, zero metalness, environment intensity .10 and a private 256px woven map used as albedo/bump. Its noise contrast is .18 around the existing mean, with bump scale .025; default contrast 1 preserves other shared 64px prop textures exactly. The cap textile reuses this exact wool Material object, and cap lining/brim/pompom reuse the figure's exact white-fur Material object. Clone their geometry without allocating unused donor cap material clones.

Replace each pair of cone sleeves with one continuous 28-ring/16-side swept sleeve through `[-.10,.80,side*.17]`, `[-.06,.88,side*.34]`, `[.30,.54,side*.49]`, `[.76,.65,side*.35]`. Use a stable perpendicular frame, taper radius .19 to .135 and restrained elbow folds. Bury the start ring in the torso; preserve cuff/glove centers and rein fit.

## Loading and ownership

`naturalSantaAsset.ts` follows `naturalDeerAsset.ts`: export preparation/getter, cache only a CPU template, deduplicate requests, and clear failed preparation for retry. Validate exactly the expected three static Mesh surfaces, finite indexed position/normal/UV attributes and bounded indices, the required head map/names, and no skin or animations. Cap defaults have no donor maps.

`prepareSantaAssets` awaits `Promise.all([prepareNaturalDeer(),prepareNaturalSanta()])`. Require both ready templates before constructing WebGLRenderer and pass both to `createSantaTeam`. For every team clone geometry/materials/all referenced textures once; share decoded image data only. Deduplicate repeated texture references, register ownership in the existing Sets and dispose exactly once. Preserve lazy eligibility, teardown guards, reduced-motion/offscreen suspension and one canvas.

## Verification and acceptance

The actual final geometry/maps were inspected under the renderer's existing night lights from front three-quarter, profile, rear three-quarter and rear, then seated and in the full team. The accepted closure joins cap/collar without a horizontal gap, dangling fragment or exposed support; the face/eyes remain visible, the smaller cap fits snugly and matches the suit's classic bright red, white trim matches, sleeve roots are buried, clothing is matte and hands still meet reins. Final measured scene: 141,707 triangles, 45 draws, 25 geometries and 14 renderer textures including bones/environment, below 180,000 triangles/125 draws. These software-rendered checks do not establish physical-device performance.

Run focused one-worker tests for actual shipped GLB/maps/bounds/budgets, cache/retry/validation, both-assets-before-GPU behavior, host pending-resolution/failure races, independent per-team geometry/material/all-map texture ownership, exact-once disposal, and object-identical suit/cap cloth and fur materials. Retain trace attachments, rocking, deer/gait and route tests. Extend reduced-motion/original-appearance browser checks to both optional GLBs. Complete scoped lint/format and deterministic artifact reproduction, then isolated production build and desktop/mobile browser checks. Preserve the user development server and root `.next` throughout.

### Completed verification and acceptance

- [x] Final focused suite: 45 tests across six files, one worker, 15.66 seconds; actual asset/material identity, ownership, lifecycle, trace and route coverage passed.
- [x] Scoped lint/format, byte-identical final v2 reproduction and both invalid source-hash rejection checks passed.
- [x] Isolated strict TypeScript passed after the precise `BufferGeometry` source binding; 14/14 model tests and affected lint/format passed again. The source hash matches the verification copy.
- [x] Final isolated production rebuild passed compilation (13.4 seconds), TypeScript (13.4 seconds) and all 14 static pages; only the existing i18next initialization notice remains.
- [x] All six production browser cases passed in desktop Chromium/mobile Chrome in 36.2 seconds using one worker. Teardown stopped test server 3300; user development 4321 and root `.next` were preserved.
- [x] Inspect and accept final actual production Home desktop and portrait frames for both passes, plus production Model views on both viewports.

Final actual production Home review accepted desktop frames at 3.2, 6, 9, 17.5 and 20 seconds (distant/distant/distant/near/near), plus the 390 x 844 portrait frame at 17.5 seconds (near), with no page errors. The full-window hosts measured 1857 x 994 and 390 x 844; aside occlusion and title crossing remain intact. Production Model desktop/mobile views fit the complete team and retain the accepted compact matte matching-red cap/suit and new face. Artifacts: `test-results/santa-natural-character-home-*.png` and `test-results/santa-natural-character-*.png`. Final probes confirmed test port 3300 stopped, user development 4321 running and unchanged Santa/deer hashes. Physical-device performance remains unmeasured.

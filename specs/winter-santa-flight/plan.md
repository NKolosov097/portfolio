# Winter Santa flight implementation plan

## Architecture

Keep the current checkout: it contains the approved winter appearance and substantial uncommitted work; a clean worktree would omit those changes. Work only on the new Santa files, one small Home integration, dependency manifests and this spec. Save copies of the existing touched files before modifying them. User SDD and model-routing rules override generic TDD, worktree, commit and additional approval steps.

Use `three` and matching `@types/three` as the only necessary new runtime/type dependencies. An imperative renderer fits the existing decorative-controller pattern and keeps React out of animation frames. Construct original, smooth, detailed meshes in a pure model module, with deterministic small DataTextures for surface detail; no downloaded paid model, image dependency, server work or external runtime network calls. If the artistic result fails review, refine geometry and lighting before expanding infrastructure.

## Task 1 — original 3D team

Files: create `src/home-sections/Home/components/SantaFlight/santaModel.ts`, `santaModel.test.ts`; add exact dependency versions to `package.json` and `pnpm-lock.yaml` using `pnpm.cmd` (PowerShell scripts are disabled).

Interface: `createSantaTeam(): { group: Group; animate: (seconds: number) => void; dispose: () => void }`. Model faces +X, Y is up, reindeer paired along Z. Center team around the origin, expose meaningful object names, and target approximately 14 world units total length. Sleigh at X=-4, two deer pairs ahead at X=0 and X=4, Z=+/-0.65. Santa sits facing +X. Geometry allocation happens once, animation only updates transforms/attributes. Keep the entire visible team under 180,000 triangles and 45 distinct geometries where practical; reuse animal parts and materials.

Use curved Extrude/Shape sleigh side panels, open seating cavity and bent tubular runners. Add brass scroll detail and upholstered seat. Build anatomically tapered deer torso/neck/muzzle/ears and branching tapered antlers, four articulated legs per deer with hooves; joints overlap naturally without obvious spherical pivots. Shared textured rough brown material and pale throat contrast make deer read under cool light. Gallop is a coordinated upper/lower leg cycle, staggered among animals. Santa includes a detailed face, nose, eyes, moustache and tapered beard locks, clothed torso, bent arms and boots. Hat uses a bent tapered mesh, named `santa-hat-red`, red material, white brim and white pompom, rather than an upright cone. Use deterministic baked microdetail textures, no random allocations each frame. Reins connect hands, sleigh and harnesses. Make all functions and complex logic carry concise intent comments, use strict types, no `any`, `React.*`, double casts or `!important`.

Checks: test named hat/color/white trim/pompom, four animals, finite vertex positions, nonzero finite bounds, articulated pose changes, resource ownership/disposal. Run scoped Vitest and TypeScript. Do not fabricate an asset or photorealism claim.

## Task 2 — renderer, flight and integration

Files: create `santaTrajectory.ts`, `santaTrajectory.test.ts`, `santaRenderer.ts`, `SantaFlight.tsx`, `SantaFlight.module.css` in the same folder; minimally modify `src/home-sections/Home/Home.tsx`; create `src/app/santa-preview/page.tsx` and its CSS module; add `e2e/winter-santa-flight.spec.ts`.

Interfaces: `sampleSantaFlight(seconds: number)` returns typed normalized x/y coordinates, depth, yaw/bank, visibility and phase for the spec's 48-second cycle. Keep endpoints outside the frame, using cubic curves and hidden turnaround. Provide a still model pose for preview through renderer `seek(seconds: number | null)` (`null` resumes live). `createSantaRenderer(container: HTMLDivElement): { setRunning: (running: boolean) => void; seek: (seconds: number | null) => void; dispose: () => void }`. `SantaFlight({ previewTime?: number | null })` is the small React lifecycle host. Undefined means production, explicit null means live preview, finite number seeks a preview pose.

Renderer: use perspective with a slightly elevated three-quarter view, cool key/rim plus warm small lantern lights. Use PMREM/RoomEnvironment from the installed Three addons for metal reflections, disposing temporary and final resources. One transparent fixed portal scene at a carefully checked stacking level must draw above heading but behind aside/header. Do not blindly raise z-index or change global stacking; check existing isolated Home, sticky main and fixed aside. One RAF loop only during visible flight, one cancellable timeout during rest; no per-frame React state. Track elapsed active time with a fresh timestamp on resume; remeasure on resize. Handle WebGL creation and context loss safely. Reuse `requestIdle`/`cancelIdle`, IntersectionObserver and visibility listeners. Never import `santaRenderer` or `three` before all eligibility conditions. Guard asynchronous resolution after unmount and release resources exactly once.

Home mounts the host only in winter. Preview displays actual model on the existing navy background, scoped stage and house Button controls: Model, Distant, Near, Live. Provide a large inspectable model view without obstructing preview controls. No authentication or source-model download required for this original study.

Checks: pure flight tests for phases, loop, finite positions, offscreen boundaries; scoped host/browser coverage for winter-only lazy mount, reduced-motion no renderer, appearance cleanup, no horizontal overflow, aside occlusion and near heading overlap, preview poses, runtime WebGL errors and pause/resume. Verify portrait mobile and desktop screenshots of actual model/near flight. Run TypeScript, scoped ESLint/Stylelint/Prettier, targeted Vitest, focused Playwright and production build. Preserve all existing diff hunks. No commits/pushes.

## Review focus

- The model may be technically valid yet too toy-like; inspect it at its actual screen size before accepting.
- An isolated Home or sticky main can hide a canvas despite a high child z-index; inspect actual painting order.
- Returning from a hidden tab must not skip through an entire flight.
- Idle/observer callbacks resolving after a theme switch must not resurrect a renderer.
- A sleeping scene must not keep requesting frames; reduced-motion must avoid loading Three entirely.

## Task 3 — organic body refinement after rendered review

The first rendered study exposed a real winding defect in descending leg lofts (now fixed and tested) and a remaining artistic problem: the separate deer torso/neck/haunch/head volumes produce visible seams and a long, vertical toy-like neck. This task refines the model only after Task 2, without changing its interface or runtime.

Replace the main deer body volumes with one smooth, closed original surface. Use the installed Three `MarchingCubes` addon to polygonize a deterministic smooth union of anatomically placed ellipsoids, once at creation; keep it pure and usable in Node tests. Sample a bounded grid (start at resolution 56), trim unused geometry attributes to the actual generated draw count and discard temporary buffers. Preserve the existing four articulated leg rigs, ears, tail, harnesses and improved curved antlers. Reuse the resulting body geometry for all four animals. Stay below the spec's total triangle budget.

Author the union around these local anatomical landmarks: torso center approximately (-0.05,0.9,0), radii (1.02,0.45,0.36); shoulders (0.58,0.95,0), radii (0.4,0.5,0.35); haunch (-0.64,0.88,0), radii (0.43,0.44,0.34). Neck slopes forward about 30 degrees from vertical, center around (0.95,1.35,0), radii (0.27,0.68,0.25), rather than a tall upright column. Skull around (1.3,1.9,0), radii (0.26,0.25,0.18); elongated muzzle around (1.58,1.78,0), radii (0.3,0.14,0.15). Smooth the junctions without making a bloated neck or losing the shoulder silhouette. Adjust facial details, ears, bridle and antler roots to the revised skull; make eyes and rims smaller and almond-like. Keep existing natural antler asymmetry and tapered curves.

Use per-vertex warm brown fur coloration with restrained dorsal variation, a softly blended pale throat/underjaw and subtle existing surface bump. Avoid the separate white throat ellipsoid and abrupt cream patch; do not double-multiply a brown material with brown vertex colors. This is still original game-scale geometry, not a promise of cinematic fur.

Extend model checks to require a closed, finite main body with outward normals, actual generated triangle bounds and finite animated poses. Re-render close model and actual near-flight view; compare with the first study for reduced seams, more natural neck slope and less toy-like facial proportions. Leave the red hat, white trim/pompom, lifecycle and routes intact. Report actual measured geometry/draw counts and artistic limits.

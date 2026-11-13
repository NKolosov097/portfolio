# Natural deer appearance

## Intent

The user finds the current deer visibly artificial and too conspicuous. Replace their actual appearance: anatomically believable bodies, necks, faces, ears, limbs, hooves and antlers, a detailed natural coat and a quieter night-time palette. Adjusting the old procedural surface or adding more decorative fur is insufficient.

Use a freely downloadable, appropriately licensed textured deer asset as the visual foundation. Its anatomy and coat must remain convincing under the portfolio's lighting and within the scene budget. Preserve source, license and provenance information; use no paid model or authenticated extraction.

## Required behavior

- The body and legs form a continuous deforming surface, without the current intersecting leg cones and hard shoulder joints. Real coat and facial detail must remain visible in the close Model view.
- Four animals retain independent stride periods and their existing trajectory-following frames. The appearance may vary subtly in coat tone. Movement, first top-right/leftward pass, near left-to-right return and timings remain intact.
- Existing Santa, red cap and sleigh remain intact. Harnesses must fit the new chest/muzzle and stay connected during animation.
- Retain antler lights as smaller, restrained fairy lights on the actual rack, rather than large brightly colored beads.
- Load the asset only through the existing winter/idle/visibility/motion gates and before creating a GPU context. A delayed asset must not create a renderer after unmount or lost eligibility. Keep one canvas, reduced-motion behavior, full viewport and suspension.
- Each renderer owns and disposes its geometries, materials, textures and skeleton resources. A finite shared CPU template may be cached to avoid repeated downloads; one team's cleanup must not damage another team or that template.
- Remain below 180,000 actual scene triangles and 125 draw calls. Target a single self-contained web asset below 1.5 MB, with shared geometry/texture across the four animals. No full-screen fur or bloom simulation.

## Acceptance

Inspect actual Model and live desktop/portrait frames and compare with the prior toy-like appearance. Check continuous deformation through extended/collected poses, muted readable coat, face/hooves/antler detail and fitted harness/light placement. Verify skin weights, bones, finite posed bounds, independent cadences, shared resources and teardown, lazy asset loading/races, preview switching and offscreen boundaries. Run appropriate unit/DOM/browser checks, scoped lint/format and isolated production build. Do not claim physical-device frame rate or full photographic realism from a software-GPU capture.

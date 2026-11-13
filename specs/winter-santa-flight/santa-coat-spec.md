# Santa coat detail and readable reins

## Intent

Make Santa's driving hands readable in flight and improve the coat's natural shape, craftsmanship and red color under the existing portfolio lighting. Hand movement takes priority over facial animation.

## Requirements

- Strengthen independent rein-pulling gestures, including visible forearm movement. Keep shoulders joined, wrists inside cuffs, gloves attached and both reins connected to the actual hand owners. Avoid detached sleeves, waving or simultaneous robotic pulls.
- Remove the subtle cheek animation and retain the existing anatomical face, head movement and cap motion. Spend the visual detail on hands and clothing.
- Improve the actual seated coat silhouette and folds: smooth shoulders and chest, compression near belt/lap and elbow bends, plus restrained construction details such as a front placket and seams.
- Make the garment read as rich classic-red matte wool, with subtle fiber/roughness detail and coherent light/shadow color. Avoid uniform pink, plastic shine, coarse noise, evenly ribbed folds and dark burgundy. Keep the cap consistent with the coat and existing white trim.
- Keep the accepted deer, sleigh, route/timing, layers, screen coverage, scene lighting and camera unchanged. Preserve the public GLB assets, lazy eligibility, reduced-motion behavior, one canvas, suspended animation, deterministic seeking and exact-once resource disposal.
- Use existing dependencies and procedural detail within the current 180,000-triangle/125-draw budgets. Prepare geometry/textures once; no per-frame cloth generation, new scheduler or expensive cloth simulation.

## Acceptance

Compare actual close, seated and flight renders under unchanged scene lights against the prior coat. Inspect front, profile and three-quarter views, hand-pull extremes and a short motion sequence. Check material color, fabric scale, continuous normals/seams, no collar/seat/hand intersections, and joined sleeve/cuff/rein motion. Verify actual material/map ownership, deterministic poses, source immutability, geometry/draw budgets, focused tests, lint/format, strict types and isolated production/browser checks. Physical-device FPS remains a separate measurement.

## Verification status

Acceptance is complete. The coat, shared red wool, tucked front opening, flat brass buckle frame and stronger independent wrist pulls are implemented. The face retains its static source buffers under the moving head pivot; four garment morph targets remain. All 49 tests in the six focused files passed with one worker; the final opening/buckle correction then passed all 18 affected model cases. Scoped ESLint and formatting passed. Actual front/profile/three-quarter garment views, all four natural hand extrema, six seated poses and a 60-frame, 5,000 ms motion GIF were accepted with zero page errors. The final scene measures 147,819 triangles and 55 draws. The isolated production build passed strict TypeScript and generated all 14 static pages. All six desktop/mobile production browser cases passed with one worker. Final production Home views at desktop 6 seconds (distant), 20 seconds (near) and portrait 17.5 seconds (near) were accepted without page errors. Both public source asset hashes and root build output remain unchanged; the test server stopped while user development stayed running. Physical-device FPS is unmeasured; no commit, push or deployment was performed.

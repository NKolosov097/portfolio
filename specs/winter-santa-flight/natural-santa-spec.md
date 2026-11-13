# Natural Santa appearance

## Intent

The deer now meet the desired visual quality. Santa looks too cartoon-like and artificial beside them. Give him a more convincing human appearance and a coherent traditional winter costume, suitable for the existing night flight.

## Requirements

- Improve actual silhouette, anatomy and surface detail: believable seated proportions, an older face, natural white beard/moustache, fabric folds, fur trim, gloves and boots. A color change to the current primitive face/beard is insufficient.
- Use matching classic bright-red soft cloth for the suit and a compact, snug winter cap, with white trim/pompom and the recognizable Santa image. Avoid a dark burgundy suit, oversized cap, or shiny pink cap. Keep a warm, restrained expression and matte materials suited to the existing cool night light.
- Seat him convincingly in the current sleigh, with coherent hand/rein placement. Preserve his subtle current rocking motion.
- Preserve the accepted deer models, head/body gallop, towing behavior, both routes/timings, layering, screen boundaries and working controls.
- Use only freely licensed assets. Preserve source/license/provenance for any third-party content and do not bypass download access controls.
- Retain lazy loading, reduced-motion/offscreen suspension, one canvas and safe asynchronous teardown. Share and dispose renderer-owned resources predictably.
- Remain within the existing scene budgets of 180,000 triangles and 125 draw calls; avoid expensive fur simulation or a second rendering engine. Keep optional asset downloads compact.

## Acceptance

Inspect the actual replacement close-up and in the full team under the existing portfolio light, including side and three-quarter views. Check face/beard/cap detail, non-plastic clothing, seated anatomy, hand/rein fit, no intersections and visual agreement with the accepted deer. Verify actual shipped geometry/textures, resource ownership/disposal, lazy-loading races and complete entry/exit. Run appropriate focused tests, scoped lint/format, isolated build and desktop/mobile browser checks. Keep physical-device performance claims separate from software-rendered inspection.

## Completed acceptance

- [x] Actual close front/profile/rear-three-quarter/rear, seated and full-team review accepted the new face/beard, continuous nape, compact fitted cap, matching classic-red matte suit and cap, white trim and continuous sleeves.
- [x] Focused actual-asset/model/lifecycle checks, strict TypeScript, scoped lint/format, reproducible source-verified preparation, isolated production build and six desktop/mobile production browser cases passed.
- [x] Final production Home desktop/portrait and production Model views were inspected and accepted.

Final actual production Home review accepted desktop frames at 3.2, 6, 9, 17.5 and 20 seconds (distant/distant/distant/near/near), plus the 390 x 844 portrait frame at 17.5 seconds (near), with no page errors. The full-window hosts measured 1857 x 994 and 390 x 844; aside occlusion and title crossing remain intact. Production Model desktop/mobile views fit the complete team and retain the accepted compact matte matching-red cap/suit and new face. Artifacts: `test-results/santa-natural-character-home-*.png` and `test-results/santa-natural-character-*.png`. Current scene: 141,707 triangles and 45 draws; Santa asset: 974,432 bytes, three static surfaces and one head map. Final probes confirmed 3300 stopped, 4321 running and unchanged Santa/deer asset hashes. Software-rendered acceptance does not establish physical-device frame rate or photographic realism.

# Readable sleeve folds and settled cargo sack

## Intent

Make Santa's sleeve folds visible in normal views and make the rear cargo sack larger, a different color and naturally resting on the sleigh.

## Requirements

- Add dimensional cloth creases to the visible upper sleeves and forearms, including gathering near the cuffs. Preserve natural unevenness rather than evenly spaced tube rings.
- Preserve the established shoulders/wrist centers, independent hand motion, cuff/glove/rein contact, existing coat/cap colors and all source head/deer geometry.
- Give the sack a warm ochre/caramel textile color distinct from the red clothing and sleigh. Increase its bulk and rear-deck footprint, tilt it into a supported reclining position, flatten its weighted bottom and keep its cord/bow attached to the new gathered neck.
- Keep the sack behind the seat without intersecting the backrest or hanging unsupported beyond the hull. Preserve hull, runners, driver, lanterns, tow anchors, route, camera and lighting.
- Reuse current geometry resolution, materials and maps; keep the current 180,000-triangle/125-draw budgets, lazy lifecycle, deterministic seeks and exact-once ownership. No new dependency or asset download.

## Acceptance

Review actual front/profile/three-quarter sleeves, all hand extrema and motion. Inspect the larger sack from rear, side and overhead, including deck contact, seat clearance and tie placement. Verify geometry, bounds, deformation, ownership and budgets with focused tests, scoped lint/format and strict isolated production/browser checks. Physical-device FPS remains a separate measurement.

## Verification status

- [x] Implement visible diagonal upper-sleeve crests and forearm/cuff gathering with fixed endpoint rings and unchanged hand attachments.
- [x] Enlarge and recline the warm ochre sack onto the rear deck, clear of the backrest and curved rear board, with the cord/bow following its gathered neck.
- [x] Preserve factory topology, maps/material counts and exact ownership, including nine disposed textures per team and eighteen across two independent teams.
- [x] Pass all 59 tests across eight focused files with one worker in 32.60 seconds (18.89 seconds of tests), all 28 affected factory/model tests and scoped five-file ESLint/Prettier.
- [x] Accept actual front/profile/three-quarter sleeve views, hand extrema and rear/overhead/side sack views with zero page errors; independent source review has no actionable findings.
- [x] Measure the actual scene at the unchanged 170,075 triangles, 58 draws, 37 geometries and 19 renderer textures.
- [x] Accept the final six motion poses and 60-frame, 5,000 ms GIF, verify its metadata and repeat the final GPU measurement: 170,075 triangles, 58 draws, 37 geometries and 19 renderer textures, with zero page errors.
- [x] Complete the isolated production build: compilation 20.8 seconds, strict TypeScript 40.0 seconds and all 14 static pages generated, with only the existing i18next notice.
- [x] Pass all six desktop/mobile production browser cases in 43.7 seconds and accept actual Home desktop distant/near and portrait near views with zero page errors.
- [x] Match all six model/factory source/test files against the compiled verification copy, confirm unchanged original GLB hashes, stop test port 3300 and preserve development port 4321 and root build output.

No dependency, source GLB or production model integration change was needed. The integration test retains its geometry-identity proof using a boolean assertion to avoid inspecting large geometry objects. No commit, push or deployment was performed.

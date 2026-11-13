# Task 2 runtime report

Implemented the typed 48-second route, one imperative transparent Three renderer, winter-only Home host, `/santa-preview`, and focused lifecycle/browser coverage. Home has exactly two added lines (import and conditional mount); existing changes and the development server on port 4321 were preserved.

## Approved specification correction

Renamed the pure sampler from `santaFlight.ts` to `santaTrajectory.ts` and its test accordingly. On Windows, extensionless imports of `SantaFlight.tsx` otherwise resolve the lower-case `.ts` file first and fail with TS1149/export errors. The exported `sampleSantaFlight` and `SANTA_CYCLE_SECONDS` APIs are unchanged. This correction was approved before implementation.

## Behavior

- Renderer import waits for idle, section intersection, visible document and no reduced motion. A pending import cannot create a renderer after unmount or loss of eligibility.
- Production canvas is in a body-level fixed, pointer-transparent portal at z-index 0. Header/aside remain at 1. Ineligible hosts become hidden immediately and suspend the retained timeline.
- One RAF exists only during live visible flight. Hidden turnaround/rest use one cancellable timer. Resuming resets the timestamp and preserves active elapsed time.
- Preview changes seek without recreating the renderer. `-1` is the model view; `null` is live. Projection-based scale preserves comparable model fractions between the short preview stage and fullscreen scene, with a smaller mobile fraction.
- Constructor failure, context loss and repeated cleanup are nonfatal. Model, environment target, temporary RoomEnvironment/PMREM resources, observers, canvas and GPU context have explicit ownership and disposal.

## Verification

All commands ran from the repository root using `pnpm.cmd`.

1. `pnpm.cmd exec vitest run src/home-sections/Home/components/SantaFlight/santaTrajectory.test.ts src/home-sections/Home/components/SantaFlight/SantaFlight.dom.test.ts src/home-sections/Home/components/SantaFlight/santaRenderer.dom.test.ts` — **3 files / 9 tests passed** on final source. Includes loop/finite/continuity checks, all lazy-import gates, pending-import unmount race, preview seek reuse, offscreen hiding, no RAF/render calls during rest, retained timer duration, long hidden-tab resume, context-loss cancellation, exact-once disposal and partial-constructor failure cleanup.
2. `pnpm.cmd exec tsc --noEmit --pretty false` — **passed** on final source.
3. `pnpm.cmd exec eslint` with the Task 2 TS/TSX files and Home explicitly listed — **passed**. Existing Browserslist age notice only.
4. `pnpm.cmd exec stylelint src/home-sections/Home/components/SantaFlight/SantaFlight.module.css src/app/santa-preview/preview.module.css` — **passed**.
5. `pnpm.cmd exec prettier --check` with all Task 2 files and Home explicitly listed — **passed**.
6. `pnpm.cmd exec playwright test --config "$env:TEMP/santa-flight-playwright.config.cjs"` — **6 checks passed** against the existing development server, desktop 1440×900 and portrait mobile 390×844. The temporary config uses only this spec and no server lifecycle hooks. Covers actual model/route/canvas reuse, WebGL errors, reduced-motion no implementation payload/canvas, original appearance absence, portal layering contract, offscreen pause/hide/resume, appearance cleanup and horizontal bounds.
7. After the final perspective-scale/preview-heading adjustment: `pnpm.cmd exec playwright test --config "$env:TEMP/santa-flight-playwright.config.cjs" --grep 'previews the actual'` — **2 checks passed** and screenshots refreshed.

Inspected actual desktop/mobile `model.png` and `near.png` on the navy site. Near poses overlap the name/profession; mobile near remains smaller. Screenshot paths relative to the browser artifact output directory:

- `winter-santa-flight-winter-a474e-te-in-one-decorative-canvas-santa-desktop/`
- `winter-santa-flight-winter-a474e-te-in-one-decorative-canvas-santa-mobile/`

Organic model refinement subsequently exposed clipping at the right edge of the close Model pose. Reduced only its horizontal fit fraction from 0.9 to 0.76 to leave perspective/yaw breathing room. Height fit, flight sizes and layout remain unchanged. Repeating the three focused renderer tests after this correction was blocked twice by Vitest fork-worker startup timeouts under machine memory pressure (zero tests executed). Scoped lint/format retries were stopped to avoid competing with integrated verification. The earlier nine-test pass remains the latest completed focused run; final browser framing and integrated checks follow separately.

## Limits and follow-up

The first cold software-WebGL desktop attempt exceeded the 45-second test budget once; the warm full six-check run and both final preview checks passed. Turbopack eagerly requests a 908-byte async-loader metadata stub even under reduced motion; inspected response contains no Three/model/renderer implementation. Browser assertions distinguish that stub from actual implementation payloads, while DOM tests directly verify that the import expression is never reached before eligibility.

Production build and broader browser matrix remain part of integrated review after model refinement, to avoid disturbing the running `.next` development server. Browser checks validate layering CSS and pointer behavior; final pixel-level production flight/aside occlusion inspection remains for integrated review. The authored model's visual seams/anatomy are Task 3, not changed here. No commit, push, deployment, model edits or manifest changes were made.

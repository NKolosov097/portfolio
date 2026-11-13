# Santa runtime optimization validation

Completed on 2026-11-13 against the [specification](runtime-optimization-spec.md) and [plan](runtime-optimization-plan.md).

## Delivered behavior

Supported browsers load, construct and render the scene in an OffscreenCanvas worker. A lightweight controller owns visibility and DOM state, with one fallback attempt using the same scene on the main thread. Particle birth positions use a bounded cache. `compileAsync` warms shaders before the first requested pose; a local AbortSignal cancels pending preparation and immediately releases resources, including when compilation never resolves.

Live drawing uses accumulated 60/30 Hz deadlines independently of the unchanged 48-second timeline. Resolution drops before cadence reaches 30 FPS, respects desktop/mobile and device DPR caps, and recovers conservatively. Static previews retain their original resolution. Hidden phases sleep. The complete model, materials, routes and 192 particles are preserved.

## Final verification

| Check                                  | Result                                                                                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused Santa tests                    | 116 tests across 12 files passed                                                                                                                           |
| Strict TypeScript and production build | Passed; 14 static pages generated                                                                                                                          |
| Production browser matrix              | 8 cases passed: four Santa scenarios on Chromium and mobile Chrome                                                                                         |
| Browser coverage                       | Actual worker, forced unsupported fallback, preview/canvas reuse, reduced motion without worker/model loading, Home offscreen pause and appearance cleanup |
| Lint and formatting                    | Scoped ESLint/Prettier, repository ESLint excluding `.playwright-mcp` scratch output, and stylelint passed                                                 |
| Independent source review              | Both P2 findings fixed; scoped rereview passed                                                                                                             |

The final production copy matched all Santa source hashes. Its `test-results/.last-run.json` recorded `passed` with zero failed tests at 09:30:08 on 2026-11-13. Production verification used an isolated temporary copy; a temporary Turbopack root adjustment accommodated the dependency junction without changing product configuration. The test server was stopped and the user's development server remained running.

A real forced-main browser probe held shader compilation unresolved, then enabled reduced motion: resources disposed once, the canvas disappeared and no errors occurred before compilation resolved. Tests also cover warmup context loss, late completion and idempotent cleanup. The other review fix replaced the worker scope's double assertion with one documented structural assertion.

Literal full-repository ESLint remains blocked by 119,361 errors in preexisting untracked generated `.playwright-mcp` artifacts. Those artifacts were not modified.

## Measurements and visual preservation

Twelve batches of 300 sequential frames compared the HEAD trail with the working trail: median CPU update time fell from **0.927598 ms to 0.088961 ms**, about **10.4x faster for trail updates only**. Maximum Float32 output difference was zero.

Six scene regions were pixel-exact at identical Model, Distant and Near poses across desktop 1440x900 and portrait 390x844 captures. This compares the scene regions, not the full animated page. Actual worker instrumentation recorded **170,075 triangles, 59 draw calls, 38 geometries and 19 textures**. The worker rendered 13 frames during a 400 ms main-thread busy loop.

These CPU and software-GPU observations do not guarantee physical-device GPU throughput or FPS. No dependencies or model simplification were introduced. Deployment was not performed.

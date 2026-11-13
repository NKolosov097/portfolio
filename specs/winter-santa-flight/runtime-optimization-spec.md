# Santa runtime optimization

## Request and scope

Implement the performance audit recommendations except model simplification. Preserve the complete Santa, deer, sleigh, clothing, lights, reins, route, timing, particles, layering and preview controls. Do not introduce LOD, reduce triangle counts, replace the scene with sprites/video, or add dependencies.

## Required behavior

- Reuse each particle's historical birth position across frames without changing its drift, brightness, lifetime, runner attachment or deterministic seeking. Memory remains bounded by the existing 192 particles.
- Move normal supported-browser scene loading, model construction, animation and rendering away from the UI thread. Keep visibility, reduced-motion, intersection and DOM ownership on the UI thread. Unsupported or failed worker rendering falls back to the same scene on the main thread, at most once per controller lifetime.
- Reduce first-frame stalls through asynchronous shader preparation. The requested initial preview pose must be the first presented scene, without redundant startup draws.
- Limit live rendering to 60 frames per second on high-refresh displays. Lower drawing resolution under sustained load; permit 30 FPS only after lowering resolution. Restore quality conservatively after sustained recovery. Never change the animation's speed or its 48-second cadence.
- Preserve the maximum pixel ratios of 1.5 desktop and 1 on viewports at most 600 CSS pixels wide. Never exceed device pixel ratio. Keep static preview poses at their original resolution and do not run adaptive sampling while paused, hidden, at rest or seeking.
- Preserve zero recurring animation work during the 2-second turnaround and 25-second rest, outside the section, in hidden documents, and under reduced motion. No worker, Three.js implementation or GLB loading before eligibility.
- Suspend without timeline jumps. Handle resize, rapid preview changes, unmount, reduced-motion changes and errors while importing/loading/compiling. Late asynchronous work must not resurrect a disposed scene. Allocate no GPU context when prepared assets finish loading while ineligible.
- Keep one displayed canvas and one active rendering backend. Replacing a transferred canvas is allowed only for fallback. Recover from worker startup failure without an infinite retry loop. A missing WebGL context must leave navigation usable.
- Free listeners, timers, worker and rendering resources on cleanup. Retain existing CPU asset caching only within a live backend's lifetime/module, as appropriate.
- Keep types strict, authored files English, comments above functions, and use VoidFunction for parameterless void callbacks. Use existing project helpers and conventions.

## Acceptance

1. Cached and fresh direct-seek particle outputs match within Float32 tolerance across normal frames, forward/backward seeks, route/cycle switches, changed viewports/spacing/scale and repeated timestamps. A call-count test proves an ordinary next frame samples only new births.
2. Synthetic high-refresh timestamps prove the cap and unchanged elapsed time. Sustained load/recovery tests prove bounded resolution, hysteresis and the optional 30 FPS tier. Suspensions and seeks do not contaminate measurements.
3. Lifecycle tests cover worker handshake, loading suspension, missing support, constructor/transfer/postMessage/error/messageerror failures, timeout, fallback failure and disposal during asynchronous preparation. Preview changes reuse the healthy canvas.
4. Focused Santa tests, type checking, scoped lint/format and production build pass, or unrelated existing blockers are documented precisely. Browser checks cover actual worker rendering, forced fallback, reduced motion, preview changes, Home visibility/appearance teardown, desktop and portrait layouts.
5. Compare representative before/after images at identical poses. Verify the full geometry remains 170,075 triangles. Record CPU benchmark results without presenting software-GPU FPS as physical-device evidence.

## Explicit decisions

The approved audit offers several startup techniques. This implementation moves procedural construction and reflection preparation into the worker and warms shaders asynchronously; it does not introduce a second baked geometry format. CSS cannot reproduce this articulated 3D scene, so the canvas CSS and visual design remain unchanged. Worker rendering improves UI responsiveness, not GPU triangle cost.

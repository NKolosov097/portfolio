# Santa magic trail

## Intent

Add a clearly visible magical trail behind the flying Santa's sleigh in both flight directions. Preserve the existing models, routes, cadence, page layering, and current workspace edits.

## Requirements

- Emit warm golden stardust from the rear tips of both sleigh runners, with small bright star glints and a soft glow. Two distinct origins gradually spread into a shared wake along the recent curved flight path and fade within about 1.5 seconds.
- Keep the effect behind the sleigh rather than behind the reindeer or fixed on one screen side. Perspective and viewport resizing must remain coherent.
- Show the same populated trail in Distant and Near static previews. Hide it in Model, turnaround, and rest phases; never join different passes.
- Preserve reduced-motion, hidden-tab, offscreen, and theme cleanup behavior. No new timers, animation loops, React frame updates, dependencies, downloads, or postprocessing.
- Reuse the existing renderer with bounded buffers and at most two additional draws; dispose all owned resources, including failed initialization.
- Verify attachment/history/fade/phase boundaries and resource cleanup with focused tests, then inspect actual desktop and mobile rendering.

## Acceptance

Golden sparks visibly linger behind the curved sleigh path, shrink and fade, and do not obscure the team or controls. Existing Santa tests, TypeScript, and relevant lint pass; report unrelated existing failures accurately.

## Living stardust refinement

- Give individual particles independent, gentle brightness changes; rare star glints briefly brighten at different times without synchronized flashing.
- Add small curved eddies to the aging dust while preserving its historical world-space origin, exact newborn attachment, and restrained downward drift.
- Keep most dust fine and subdued, with fewer medium golden sparks and rare pearl-white four-point highlights. Retain a warm gold halo.
- Preserve the current 192-particle budget, 128 births per second, 1.5-second lifetime, overall trail length and spread, one draw, deterministic seeking, and existing lifecycle behavior.
- Verify the same particles across successive timestamps to establish independent twinkle and curved motion, then inspect the actual moving renderer at desktop and mobile sizes.

## Twin runner attachment

Attach the two emission origins to the actual rear ends of the left and right metal runners. Preserve their position relative to the animated sleigh through bobbing, rotation, scale, and both flight passes. Remove the former center origin. Preserve the existing total particle budget, lifetime, twinkle, color, and broad spread.

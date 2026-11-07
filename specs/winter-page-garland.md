# Winter page garland

## Specification

- Display one winter garland at the very top of every public HTML document, spanning the viewport and remaining fixed while scrolling. Include home, article list, both published articles, both not-found views, loading/error states, and the separate global error document. API responses and generated metadata/images are outside scope.
- Use hanging dark evergreen cable swags with larger pure-white lights and soft steady glow. No icicles, flashing, audio, or perpetual animation.
- Switching to winter brings the garland down into place, then only the hanging sections rebound with decaying inertia. After arrival, cable attachment points remain fixed. Switching to original lifts the garland above the viewport before hiding it.
- Initial winter loads render the settled artwork immediately; initial original loads show none. Rapid reversals continue from the displayed placement and sag and settle to the latest appearance. Reduced motion uses immediate endpoints.
- Preserve header/content geometry, navigation, controls, focus indicators, accessible content, and overlays. The decoration must add no overflow, intercept no interaction, and contribute no accessible announcements.
- Preserve unrelated work. Add no dependencies, settings, providers, state, timers, routes, or deployment.

## Plan

Render the static `WinterGarland` component once directly inside `src/app/layout.tsx`'s body before Providers, outside Header. Render the same component inside the separate body in `src/app/global-error.tsx`, retaining that document's existing winter appearance policy. Other HTML views inherit RootLayout.

Use an `aria-hidden="true"` root div with `data-testid="winter-page-garland"` and one empty span with `data-testid="winter-page-garland-artwork"`. The root is fixed at `top: 0; inset-inline: 0`, height 24px, z-index 2, and `pointer-events: none`. It has no width limit, viewport-width units, clipping, header offset, or added page padding. Header/aside remain below it; focused skip navigation and portal overlays remain above it.

The child is absolutely positioned with `inset: 0` and a repeating 240 by 24px SVG background. Use cable path `M0 1 Q120 31 240 1`, no fill, and a 1px `#344840` stroke. Bulbs sit at `(24,6.4)`, `(72,13.6)`, `(120,16)`, `(168,13.6)`, and `(216,6.4)`. Each has a pure-white radius-2 core and concentric white halos of radius 3.8/opacity .18 and radius 6/opacity .08. Keep the natural tile size and approximately 48px bulb spacing at every viewport width.

Select appearance using the existing root `data-appearance` attribute. Split movement into two CSS transforms:

- Root placement: original `translateY(-100%)` and opacity zero; winter `translateY(0)` and opacity one. Winter entry uses `transform 320ms ease-out, opacity 0s linear 0s`; exit uses `transform 360ms ease-in, opacity 0s linear 360ms`. Placement descends monotonically and opacity stays visible until exit finishes.
- Child sag: original `scaleY(0.7)`, winter `scaleY(1)`, and `transform-origin: 0 1px`, matching the cable peaks exactly. Entry uses `transform 900ms linear(0, 0.3 15%, 0.7 30%, 1 40%, 1.3 52%, 0.88 70%, 1.05 85%, 1)`. Exit uses `transform 360ms ease-in`.

After root arrival at 320ms, the attachment height remains 1px. Sag first reaches rest at 360ms and rebounds at scales 1.09, 0.964, and 1.015 before settling. This accepts at most 9% transient vertical bulb stretch to keep the treatment small and CSS-only; horizontal geometry remains unchanged. Native transition retargeting preserves continuity. Reduced-motion rules disable transitions on both root and child in both appearances, including the delayed hide.

Keep focused coverage in `e2e/winter-page-garland.spec.ts`. Test the six public route variants, exactly one direct-body garland, none in Header, appearance cookies, initial no-animation endpoints, real control interactions, unchanged navigation geometry, narrow overflow, reduced motion, and 1920px viewport coverage while scrolling. Measure available width using the document root's rendered rectangle so stable scrollbar gutters are handled consistently. Verify the exceptional global-error integration by source review and production build without introducing a crash route. Review README wording and update only if inaccurate.

For deterministic motion checks, capture and pause only owned subtree transitions after real toggle activation and a style flush. Seek root placement, child sag, and any owned opacity delay on one elapsed-time axis. At 468ms, 630ms, 765ms, and 900ms, check scales 1.09, 0.964, 1.015, and 1. Compute actual transformed points from the child matrix and computed pivot plus root placement: `rootY + originY + scaleY * (localY - originY)`. Assert fixed peaks at local y=1 and decaying center displacement at local y=16, visible upward exit, continuity of both transforms on reversal, and no stale hide. Resume owned tracks before checking live endpoints; leave unrelated animations untouched.

## Tasks

- [x] Add the shared static component and integrate both document shells, keeping Header unchanged.
- [x] Implement the specified white hanging artwork and anchored two-layer seasonal motion.
- [x] Add route, viewport, appearance, interaction, accessibility, reduced-motion, and deterministic anchored-motion coverage.
- [x] Complete required/scoped checks, production build, focused browser coverage, and visual inspection; record actual results.

## Verification

- Latest production build, `pnpm check-types`, and scoped ESLint, Stylelint, and Prettier passed.
- All 84 focused scenarios were verified across desktop/mobile Chromium, Firefox, and WebKit: 74 passed initially; the remaining 10 Firefox cases passed on targeted rerun after using five-decimal tolerance for serialized scale endpoints. This was an initial run plus a targeted rerun, not a single green 84-test run.
- Deterministic samples confirm root y=0 and attachment y=1 throughout 468ms, 630ms, 765ms, and 900ms. Sag coordinates are 17.35, 15.46, 16.225, and 16 respectively, demonstrating decaying hanging motion with fixed peaks. Initial appearance, upward exit, reversal, reduced motion, route coverage, navigation geometry, and real controls passed focused checks.
- Manual mobile 393px and desktop views up to 1920px confirmed anchored movement, readable navigation, white glow, and viewport-top placement. Global-error integration was checked by source review and production build; no runtime crash was forced. README wording was reviewed and remains unchanged.
- Headless overflow checks passed at 320px and 393px. A visible-scrollbar manual browser at 320px retains an existing 15px overflow from the global minimum width; disabling the decoration leaves the same overflow.
- Full `pnpm lint` failed earlier in this session on preexisting generated `.playwright-mcp` artifacts (134056 problems); it was not rerun and no unrelated cleanup was performed. The full repository test matrix and deployment were not run.

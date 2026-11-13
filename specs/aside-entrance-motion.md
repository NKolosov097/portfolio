# Smooth aside rounding and first-paint frost

## Specification

The desktop aside Card and its glow must interpolate between original 8px and winter 22px corners when appearance changes, including rapid reversals. A first winter render must begin with 8px corners and settle at 22px. Winter frost must visibly fade and grow in after its first painted component frame, on both initial desktop loading and each mobile Drawer opening. Preserve original appearance, the existing 700ms opacity and 1400ms inward growth, mobile close-control clearance, all artwork, dimensions, focus and input behavior. Reduced motion must show the final theme state immediately without corner or frost transitions.

## Diagnosis

The Card transitions only border color and shadow, so changing its public radius token snaps. Its starting style also lacks an original-radius value. Frost already has CSS transitions and starting styles, but those are initiated while server HTML/CSS is first rendered rather than after the hydrated component has painted. Browser probes observe those early transitions before navigation completion. Give frost an explicit painted-frame readiness state instead of relying on its server-render starting style.

## Plan and scope

1. `src/layout/Aside/aside.module.css`: add `border-radius 700ms ease-out` to the existing Card transition list. Add `border-radius: 8px` to the existing winter Card `@starting-style` block. Retain the public winter radius token and all other values. Existing reduced-motion transition:none already covers the Card.
2. `src/layout/Aside/components/AsideFrost/AsideFrost.tsx`: add a boolean readiness state initially false. In a documented mount effect, schedule two nested requestAnimationFrame callbacks, setting readiness true in the second. Keep the pending frame ID and cancel it in cleanup, including StrictMode/unmount. Append the CSS-module ready class only after readiness. Keep useId, props, mobile modifier, drawing and IDs unchanged. Use existing React imports and concise intent comments, with no helper abstraction, timers or animation loop.
3. `AsideFrost.module.css`: replace the frost `@starting-style` block with a `prefers-reduced-motion: no-preference` block. Using the existing winter/not-Off selector, keep `.inward:not(.ready)` at opacity 0 and its descendant `.growth` at stroke-width 0. The existing winter selectors remain final opacity 1/stroke-width 40px; adding ready removes the initial override and triggers normal transitions. Reduced motion bypasses readiness gating and retains transition:none, so the server-rendered final state is immediate. Preserve responsive visibility, mobile close-button mask and reversal behavior.
4. In existing `e2e/appearance-switch.spec.ts`, add one focused desktop test that explicitly sets no-preference motion and a desktop viewport. Navigate, wait for winter Card radius 22px, then use the real appearance switch to test both directions. In the same browser evaluate as its DOM click, flush the Card styles, find its native CSSTransition for border-top-left-radius, pause it at 350ms and assert the computed radius is strictly between 8px and 22px. Finish the Card corner transitions and assert each target endpoint. Preserve existing appearance tests. This guards interpolation without timing races. Independent browser checks cover cold first-paint and Drawer entrance.

Only these four implementation/test files and this specification are in scope. Preserve unrelated dirty work. Reuse localhost:4321; add no dependencies, worktree, server, commit or new permanent test file.

## Tasks and acceptance

- [x] Inspect the actual first render and define the bounded fix.
- [x] Implement corner interpolation and frost readiness with cleanup.
- [x] Run installed TypeScript, focused ESLint/Stylelint and touched-file Prettier checks.
- [x] Run the focused appearance regression.
- [x] Capture cold first-frame native animations before navigation completion in Chromium and WebKit. Assert initial/mid/final corner radius 8 / intermediate / 22, frost opacity 0 / intermediate / 1 and growth width 0 / intermediate / 40. Confirm real theme exit/re-entry, rapid reversals, fresh mobile Drawer entrance and close-control input pass-through, reduced-motion immediate final states and no geometry changes. Record actual results and limitations.

## Verification

- TypeScript, focused ESLint, nonmutating Stylelint and touched-file Prettier passed. ESLint reported only the installed Browserslist dataset age notice. Scoped `git diff --check` passed.
- All 10 focused browser tests against localhost:4321 passed across Chromium and WebKit, covering the new bidirectional corner regression and existing mobile frost, close, focus, Escape and short-scroll behavior.
- Controlled cold first-frame probes passed in both engines. Native initial/middle/final samples were radius 8 / approximately 17.585 / 22px, frost opacity 0 / 0.684643 / 1 and growth width 0 / approximately 38.4553 / 40px. Desktop first loading, real theme exit/re-entry, rapid reversal, fresh mobile Drawer opening/reopening and close-button clicks passed, with unchanged desktop bounds.
- Reduced motion immediately produced radius 22px, opacity 1 and growth width 40px with zero transition duration in both engines.
- Production build, full test suite and physical-device checks were outside this bounded verification.

# Winter frost in the mobile profile drawer

## Specification

Show the existing winter feather frost along the mobile profile drawer edges at widths up to 1024px. Keep the top-right close control visually clear, reachable and clickable before and after scrolling. Preserve the profile layout, scrolling, focus order, Escape behavior, swipe dismissal, original appearance and desktop frost. The decoration must stay attached to the drawer viewport rather than scroll with its content, remain hidden from accessibility APIs and never intercept input. Preserve the existing winter entrance and reduced-motion behavior.

This supersedes the mobile-hiding requirement in earlier frost specifications for the mobile drawer only. The desktop aside's frost remains hidden on narrow viewports. Reusing the drawing must not introduce duplicate SVG definition IDs.

## Plan and bounded scope

1. In `AsideFrost.tsx`, add an optional typed `isMobile` boolean prop, defaulting to false. Apply the existing frost classes plus a mobile modifier and use `aside-frost-mobile` as the mobile root test ID, retaining the desktop test ID. Use React `useId` to namespace every SVG definition and all its `url(...)` and `href` references per mounted instance. Preserve the drawing, radii, growth animation and existing desktop API.
2. In `AsideFrost.module.css`, hide the mobile modifier by default. At widths up to 1024px, hide ordinary frost and display the mobile modifier with an explicit `.frost.mobile` selector. On the mobile modifier only, apply a CSS radial mask centered 22px from the top and right: transparent within 24px, fading to opaque at 32px. This leaves clearance around the existing 24px close button at top/right 10px, including space for its focus ring, without introducing layout or JavaScript measurements. Retain pointer pass-through and reduced-motion rules.
3. In `MobileAside.tsx`, import and mount `<AsideFrost isMobile />` inside the existing positioned `drawerItemContent`, after `drawerScrollContent`. Keep the close button first in keyboard order and preserve its DOM, position and handlers. Do not put the frost inside the scrolling content or change the drawer styles, size or close button stacking.
4. In existing `e2e/mobile-drawer.spec.ts`, add one focused regression test at a mobile viewport. Set a winter appearance cookie, open the real drawer and assert mobile frost is visible with opacity 1, accessibility hiding and pointer-events none; its CSS mask is active; the close control is the hit target at its center; all mounted SVG definition IDs remain unique. Switch appearance via the real toggle after closing, reopen and confirm original frost opacity 0. Retain existing short-viewport scrolling/focus tests.

Only these four implementation/test files and this specification are in scope. Reuse the running server at `http://localhost:4321`, preserve unrelated dirty changes, and add no dependencies, worktree, server or commit.

## Tasks and acceptance

- [x] Diagnose the separate mobile drawer and specify the close-button clearance.
- [x] Implement reuse, unique SVG IDs, responsive visibility and the mobile mask.
- [x] Add the focused regression and run installed TypeScript, focused ESLint, non-mutating Stylelint and touched-file Prettier checks.
- [x] Verify the real drawer at 390x844, 390x480, 834x480 and the 1024px breakpoint. Inspect screenshots for visible feather frost and a clean close-button area; confirm no overflow or layout shift, working close/focus/Escape and scrolling, original/winter visibility, reduced motion and unchanged desktop frost at 1440x1000. Exercise the existing mobile drawer and swipe regressions against the running app without replacing its server. Record actual results and any limits.

## Verification results

- `pnpm.cmd check-types`, focused non-mutating Stylelint, touched-file Prettier and `git diff --check` passed. Focused ESLint exited 0 with two existing `setIsOpenDrawer` dependency warnings in `MobileAside.tsx`; its stale Browserslist data advisory requires no change for this task.
- A namespace self-check confirmed eight prefixed SVG definitions, no static SVG references and the retained growth test ID.
- Chromium and WebKit exercised the existing mobile-drawer and aside-swipe specs against the running server: 11 passed, 3 skipped because WebKit does not support the existing synthetic Touch setup. The new winter/original frost regression passed in both engines, alongside close, keyboard focus, Escape and short-viewport scrolling checks. Chromium swipe checks passed.
- Browser geometry and screenshot inspection passed at 390x844, 390x480, 834x480, 1024x768 and desktop 1440x1000: unchanged drawer dimensions and scroller heights, fixed frost after scrolling, a clear close-button area, no horizontal overflow and no page errors. Chromium and WebKit screenshots were accepted.
- Both engines retained the 700ms opacity and 1400ms growth transitions, settling at opacity 1 and stroke width 40px. Reduced motion disabled those transitions and left no running frost animation.
- Limits: no build, full suite or real hardware checks; the existing server, dependencies and unrelated work were preserved.

## Follow-up: rectangular mobile corners

The mobile frost contour must follow the rectangular Drawer with radius 0. Desktop keeps its 22-unit outer contour and growth-mask radius and 21.2-unit inset fade radius. Preserve the close-control radial clearance, all paths, CSS, readiness behavior and animations.

Plan: change only the three SVG rectangle `rx` attributes in `AsideFrost.tsx` to select 0 for mobile and the existing radius for desktop. Extend the existing mobile frost regression with Drawer `border-radius: 0px` and scoped `clipPath rect` `rx="0"` assertions. Run focused Prettier and ESLint; inspect the real mobile corners and desktop preservation before committing.

- [x] Apply the three mobile-only SVG radius values and extend the existing regression.
- [x] Run focused Prettier and ESLint on the changed component/test and format-check this specification.
- [x] Verify mobile corners and unchanged desktop appearance in the running browser.

Follow-up verification: focused Prettier passed on the component, existing test and specification. Focused ESLint exited 0 with no code warnings or errors, emitting only the existing stale Browserslist data advisory. The extended regression passed in Chromium and WebKit (2 passed). Additional browser checks confirmed mobile Drawer radius 0 and all three SVG rectangle radii 0, preserved close-control masking and working dismissal, and unchanged desktop Card radius 22 and SVG radii 22/22/21.2. Screenshots in both engines showed straight mobile corners and were accepted. No build, broad suite, repeated typecheck or real hardware checks were run for this numeric attribute correction.

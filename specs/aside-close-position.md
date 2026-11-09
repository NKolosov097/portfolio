# Persistent mobile aside close button

## Specification

- On viewports that use the profile drawer, its close button stays in the same upper-right position while the profile content scrolls, including at the bottom.
- Preserve its accessible name, activation, existing position in sequential keyboard navigation, focus trapping and focus return. Keep a single close button.
- Preserve the profile layout, desktop aside, drawer transitions, swipe-to-close and avatar dialog behavior.

## Diagnosis

The close button is absolutely positioned inside `drawerItemContent`, which also owns vertical scrolling. Its position therefore scrolls with the content. Making it fixed inside that element would become scroll-relative again while swipe-to-close applies a transform to the same element.

## Plan and scope

1. Keep the existing drawer root, ID, test selector and swipe ref. Keep the close button first in the same DOM order. Add one inner scrolling container around the existing profile provider/content. Give the inner container `tabIndex={-1}`: Firefox otherwise inserts the scroll region between the close button and the existing controls during sequential navigation.
2. Retain positioning, viewport dimensions, background and touch behavior on the root. Move the existing flex layout, padding, scrolling and overscroll containment to the inner container with `height: 100%`. Keep the button absolutely positioned at 10px from the top/right and above scrolling content. Use a scoped selector for position and Gravity's `--g-button-height` token for its existing 24px height, removing the button's old important overrides.
3. Extend `e2e/mobile-drawer.spec.ts` with short phone/tablet viewport coverage. Check the existing close/ghost/home/avatar keyboard sequence in both directions, fixed geometry after actual overflow scrolling, pointer hit testing, keyboard activation and return focus. The installed WebKit's native Tab navigation skips links; check its existing close/ghost/avatar sequence instead, preserving browser behavior. Run existing drawer/swipe and related focus regressions where practical. The ghost is already an interactive button in the current working tree and must retain its place.

Scope: `MobileAside.tsx`, `aside.module.css`, the existing drawer browser tests and this document. No changes to callers, fixtures, exports, configuration or dependencies. Preserve unrelated working-tree edits.

## Tasks

- [x] Separate scrolling content from the close button without changing interactive DOM order.
- [x] Add focused scroll and keyboard regression coverage.
- [x] Run browser and scoped static checks; review the resulting diff against this specification.

## Verification

- All 28 focused scenarios passed across desktop/mobile Chromium, Firefox and WebKit using the existing development server. Coverage includes both short viewport sizes, actual overflow scrolling, fixed 10px offsets and 24px size, pointer hit testing, native forward/backward keyboard order, accessible naming, Enter/Escape, focus return, focus-ring styling in both appearances and nested avatar dialogs.
- Existing drawer open/close and swipe checks also passed where supported (nine passing scenarios). Six synthetic-touch scenarios are unsupported in the installed Firefox/WebKit environments, and the desktop drawer-only scenario is intentionally skipped.
- TypeScript, scoped Stylelint, Prettier and CRLF-aware diff checks passed. Scoped ESLint has no errors and retains two pre-existing hook dependency warnings in `MobileAside`.
- Visually inspected the short phone drawer after scrolling to the bottom. Reviewed the change against the specification; unrelated working-tree changes remain intact.
- Production build, full test suite, deployment and physical-device testing were not run. Temporary browser configuration and screenshot were removed after verification.

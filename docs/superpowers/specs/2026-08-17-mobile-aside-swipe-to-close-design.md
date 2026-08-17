# Mobile aside swipe-to-close — design

## Problem

On narrow viewports the aside profile panel opens as a Gravity UI `Drawer`
(`src/layout/Aside/components/MobileAside/MobileAside.tsx`), sliding in from
the left (`placement` defaults to `left`, unset in this codebase). The only
way to close it today is the explicit close button or clicking the veil.
Mobile users expect to also close it with a horizontal swipe gesture.

## Goals

- Swiping left on the open drawer closes it, mirroring the direction it
  opened from.
- The panel visually follows the finger during the drag (`transform:
translateX()`), snapping either fully closed or back to rest depending on
  how far/fast the gesture went.
- The gesture works anywhere on the panel, not just an edge/handle, and
  coexists with the panel's internal vertical scroll (`AsideContent` can be
  taller than the viewport).
- No new dependencies.

## Non-goals

- Swipe-to-open (opening is still via the existing header button).
- Changing `Drawer` placement, veil behavior, or the desktop `Aside`.

## Architecture

A new hook, `useSwipeToClose`, encapsulates the touch handling:

```
src/layout/Aside/hooks/useSwipeToClose.ts
```

Signature: `useSwipeToClose({ ref, onClose, isEnabled }): void`

- `ref`: `RefObject<HTMLElement>` — the draggable surface. `MobileAside`
  passes the ref it already attaches to `#aside-card`
  (`.drawerItemContent`).
- `onClose`: callback invoked when a swipe crosses the close threshold.
  `MobileAside` passes `handleCloseDrawer`.
- `isEnabled`: gate the listeners to when the drawer is actually open
  (`isOpenDrawer`), so no touch handlers are attached while closed.

The hook attaches `touchstart` / `touchmove` / `touchend` / `touchcancel`
listeners via `useEffect` directly on the DOM node (not React synthetic
events), and writes `element.style.transform` / `element.style.transition`
imperatively during the gesture — no React state updates per `touchmove`,
so dragging stays smooth (60fps, no re-render churn).

`MobileAside` change: create `const cardRef = useRef<HTMLDivElement>(null)`,
attach it to the existing `#aside-card` div, and call
`useSwipeToClose({ ref: cardRef, onClose: handleCloseDrawer, isEnabled:
isOpenDrawer })`.

## Gesture logic

State kept in refs inside the hook (not component state):
`startX`, `startY`, `direction: 'horizontal' | 'vertical' | null`,
`startTime`.

- **`touchstart`**: record `startX`/`startY`/`startTime` from
  `touches[0]`. Reset `direction` to `null`. Ignore if more than one touch
  is active.
- **`touchmove`**:
  - While `direction` is still `null`: once total movement exceeds ~8px,
    decide direction by comparing `|dx|` vs `|dy|`. `|dy| >= |dx|` ⇒
    `'vertical'` — stop handling this touch for the rest of the gesture
    (let the browser's native scroll take over). `|dx| > |dy|` ⇒
    `'horizontal'`.
  - While `direction === 'horizontal'`: call `preventDefault()` (need
    `{ passive: false }` on `touchmove`) and set
    `transform: translateX(${Math.min(0, dx)}px)` on the element — swiping
    right beyond the resting position is clamped to `0`, since the panel
    is already flush with the left edge.
- **`touchend` / `touchcancel`**:
  - If `direction !== 'horizontal'`: no-op (nothing was moved).
  - Compute `dx` (negative = moved left) and `velocity = |dx| /
(Date.now() - startTime)`.
  - Close if `|dx| > element.offsetWidth * 0.25` **or**
    `velocity > 0.5` (px/ms) — the second clause catches fast short
    flicks that would miss the distance threshold.
  - If closing: call `onClose()`. Leave the inline `transform` as-is; the
    `Drawer` unmounts/animates out via its own `open` prop transition, so
    the dragged element disappears with it.
  - If not closing: snap back — add a transient `transition:
transform 0.2s ease` inline style, set `transform: translateX(0)`,
    then remove the inline `transition` after the transitionend (or a
    matching timeout fallback) so it doesn't fight future drags. Skip the
    animated snap-back (jump straight to `translateX(0)` with no
    transition) when `window.matchMedia('(prefers-reduced-motion:
reduce)').matches`.

## Edge cases

- **Multi-touch**: only `touches[0]` is tracked; a second finger touching
  down does not start a second gesture or interfere with the first.
- **Drawer closed by other means mid-gesture** (✕ button, veil click,
  resize above 1024px collapsing the drawer): the hook's `isEnabled`
  (`isOpenDrawer`) flips to `false`, its `useEffect` cleanup removes the
  listeners and clears any inline `transform`/`transition` left on the
  node, so the panel isn't visually offset the next time it opens.
- **`touchcancel`** (e.g. OS gesture takes over) is treated the same as
  `touchend` with the current `dx` — either completes the close or snaps
  back.
- **Reduced motion**: snap-back is instant, no transition, per above.

## Testing

Extend `e2e/mobile-drawer.spec.ts` (or a new `e2e/aside-swipe.spec.ts`) with
Playwright touch-event dispatch against the drawer content
(`page.getByTestId('aside-drawer')` inner element):

1. Open the drawer (`revealAside`), dispatch a horizontal swipe left past
   the 25%-width threshold → drawer becomes hidden.
2. Open the drawer, dispatch a horizontal swipe left under the threshold at
   low speed → drawer stays visible (snap-back).
3. Open the drawer, dispatch a vertical swipe (scroll gesture) inside the
   content list → drawer stays visible, list scroll is unaffected.

These tests only run where the drawer is actually rendered (same
`test.skip` guard already used in `mobile-drawer.spec.ts` for viewports
that render the desktop sidebar instead).

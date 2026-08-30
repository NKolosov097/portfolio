# Adoption stats chart - tooltip tap & positioning

## Problem

In `AdoptionStatsChart` (article: ai-boilerplate-senior-engineers):

1. On touch devices, the bar tooltip only shows while the finger is held down. `onPointerEnter`/`onPointerLeave` fire on touchstart/touchend, so `pointerleave` hides the tooltip the instant the tap releases - a normal quick tap never shows it.
2. The tooltip sits at a fixed offset (`bottom: calc(100% + 28px)`) from the top of the `.track` container, which has a fixed height (140px) regardless of the bar's actual value. For low bars (e.g. 29%), the tooltip appears far above the bar's visual peak.

## Solution

### 1. Tap-to-toggle on touch, unchanged hover on desktop

In `AdoptionStatsChart.tsx`, on the `hitArea` button:

- `onPointerEnter` / `onPointerLeave`: only act when `event.pointerType !== 'touch'` - preserves current mouse-hover behavior untouched.
- New `onPointerUp`: when `event.pointerType === 'touch'`, toggle the tooltip for that bar (`setHoveredId((prev) => (prev === bar.id ? null : bar.id))`). Tapping a different bar switches directly to it.
- `onFocus` / `onBlur` unchanged (keyboard accessibility).
- A `document` `pointerdown` listener (active only while a tooltip is open) closes the tooltip when the tap/click target falls outside the `.bars` container (tracked via a ref).

### 2. Position tooltip relative to each bar's own peak

- Remove the fixed `bottom: calc(100% + 28px)` from `.tooltip` in `AdoptionStatsChart.module.css`.
- Set it inline per bar, matching the existing `.valueLabel` pattern: `style={{ bottom: `calc(${bar.value}% + 22px)` }}`. This keeps the tooltip close to the bar's peak instead of a fixed distance from the container top, and clears the percentage label above the bar.

## Scope

Two files only: `AdoptionStatsChart.tsx`, `AdoptionStatsChart.module.css`. No new dependencies, no changes to other components.

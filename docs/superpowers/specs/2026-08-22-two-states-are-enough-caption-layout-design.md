# Revision: move two demo captions beside their controls instead of below them

## Why

User feedback: both `LightDarkDemo`'s closing caption and `PatternGallery`'s "Simulate OS" tile
caption currently sit on their own line below the interactive element they describe, leaving
visibly empty horizontal space beside that element (the mock window in `LightDarkDemo`; the small
icon button in `PatternGallery`'s fourth tile). Moving each caption to sit beside its control
instead of below it fills that dead space - purely a layout change, no copy or logic changes.

## Decision

### `LightDarkDemo`

- `demoCaption` moves from a standalone `<p>` below the `.demo` row into a third flex item inside
  `.demo` itself, to the right of the existing `.windowStack` (button + live-property text + mock
  window). `.demo` is already `display: flex; align-items: center; gap: 1rem`, so adding a third
  child that grows to fill remaining width is a small, additive change.
- `.demoCaption` gains `flex: 1 1 12rem` so it expands into the space to the right of the window
  instead of rendering full-width on its own line.

### `PatternGallery`

- The fourth ("Simulate OS") tile's button and its `controlCaption` move from a vertical stack
  (button, then caption below) into a horizontal row: a new `.simulateRow` wrapper (flex, centered,
  gap) holds both, sitting below the tile's existing label.
- `.controlCaption` gains `flex: 1 1 auto` so it fills the remaining width of the row beside the
  button instead of wrapping full-width beneath it. (`.controlCaption` has only this one consumer,
  so this is a safe, non-breaking addition to the existing rule.)

No copy changes, no new locale keys, no state/handler changes in either component.

## `LightDarkDemo` (modified)

`src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.tsx` (+ `.module.css`).

```tsx
<div className={styles.demo}>
  <button ...>...</button>

  <div className={styles.windowStack}>
    ...
  </div>

  <p className={styles.demoCaption}>
    {t('articleContent.twoStatesAreEnough.lightDarkDemoCaption')}
  </p>
</div>
```

(The standalone `<p className={styles.demoCaption}>` that previously sat after the closing `</div>`
of `.demo` is removed from there and placed inside `.demo` as shown above - same JSX node, same
translation key, new position.)

CSS: `.demoCaption` gains `flex: 1 1 12rem;` (its `margin`/`font-size`/`color` are unchanged).

## `PatternGallery` (modified)

`src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx` (+ `.module.css`).

```tsx
<div className={styles.controlTile}>
  <p className={styles.controlLabel}>
    {t('articleContent.twoStatesAreEnough.demoSimulateOsLabel')}
  </p>
  <div className={styles.simulateRow}>
    <button ...>...</button>
    <p className={styles.controlCaption}>
      {t('articleContent.twoStatesAreEnough.demoSimulateOsCaption')}
    </p>
  </div>
</div>
```

New CSS rule `.simulateRow` (flex row, `align-items: center`, small gap). `.controlCaption` gains
`flex: 1 1 auto;` (its `margin`/`font-size`/`color` are unchanged).

## Files touched

```
src/content/articles/two-states-are-enough/
  LightDarkDemo/
    LightDarkDemo.tsx            move demoCaption's <p> inside .demo, after .windowStack
    LightDarkDemo.module.css     add flex: 1 1 12rem to .demoCaption
  PatternGallery/
    PatternGallery.tsx           wrap the 4th tile's button + controlCaption in a new .simulateRow
    PatternGallery.module.css    add .simulateRow; add flex: 1 1 auto to .controlCaption
```

No changes to `public/locales/en.json`/`ru.json`, `CombinationGrid/`, `PatternsInTheWild/`,
`Content.tsx`, or any heading `id`. No state, handler, or copy changes in either component.

## Testing / validation

`pnpm check-types && pnpm lint`, full `pnpm test` (no locale/logic changes, so the count should be
unchanged), manual browser verification via a real browser engine (not source/HTML inspection):
confirm `demoCaption` renders beside the mock window in `LightDarkDemo` (not below the whole demo
row), and `demoSimulateOsCaption` renders beside the "Simulate OS" button (not below it) in
`PatternGallery`, at a typical article-column width; confirm both still wrap sensibly at narrower
widths (no horizontal overflow).

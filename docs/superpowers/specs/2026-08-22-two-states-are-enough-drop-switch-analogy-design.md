# Revision: drop `SwitchAnalogy`, promote `CombinationGrid` to the opening hook

## Why

User feedback after using the just-shipped brightness-swatch fix for `SwitchAnalogy`:

1. Even with a working swatch, the block itself doesn't land as a hook. The article's actual
   thesis (from its title and `intro1`/`intro2`) is specifically about **light/dark/system theme
   toggles** — three labelled states that force reading vs. two states you can feel. `SwitchAnalogy`
   illustrates that idea with five labelled percentage buttons vs. a **continuous** slider. A
   continuous slider is the wrong shape for the argument: it has infinite positions, while the
   real subject (a theme toggle) has exactly two. The metaphor undercuts the article's own point
   ("two states are enough") by modelling the two-state side as an infinite-state control.
2. A same-shape replacement (three labelled buttons vs. a plain two-position switch) was
   considered and rejected by the user: it would just restate, in the abstract, exactly what
   `PatternGallery` and the article's later sections already show concretely — redundant, not a
   fix.
3. User's own proposed fix, confirmed as the direction: drop `SwitchAnalogy` entirely and promote
   `CombinationGrid` ("Все четыре комбинации" / "All four combinations") to be the page's opening
   interactive hook instead.

`CombinationGrid` is a better fit for this slot on inspection:

- It's a real 2×2 grid of (native OS shade × site-rendered shade), so it demonstrates concretely
  that no matter which of the four combinations you're in, the site only ever renders one of
  exactly two states — the article's thesis, shown directly, not by analogy.
- It already reads one real signal (`matchMedia`, badging whichever tile matches the reader's
  actual OS preference) — more honest than `SwitchAnalogy`, which had zero real state.
- It already uses the same macOS window-chrome visual (titlebar + traffic lights) as
  `LightDarkDemo`, so promoting it doesn't introduce a new visual language — it's consistent with
  what's already below it on the page.
- The paragraph immediately before the hook (`intro2`: "тогглы ниже настоящие, не скриншоты — сначала
  поиграйся с ними" / "the toggles below are real, not screenshots — play with them first") already
  describes `CombinationGrid` more accurately than it described `SwitchAnalogy`.

## Decision

- Delete `SwitchAnalogy/` entirely (`SwitchAnalogy.tsx` + `SwitchAnalogy.module.css`) — it has no
  other consumer.
- Remove its seven now-dead locale keys from both `public/locales/en.json` and
  `public/locales/ru.json`: `switchAnalogyEyebrow`, `switchAnalogyPanelALabel`,
  `switchAnalogyPanelACaption`, `switchAnalogyPanelBLabel`, `switchAnalogyPanelBCaption`,
  `switchAnalogyTakeaway`, `switchAnalogySliderLabel`.
- In `Content.tsx`, remove the `SwitchAnalogy` import and its `<SwitchAnalogy />` usage; move
  `<CombinationGrid />` up to occupy that same slot — immediately after the two intro paragraphs,
  before `<PatternsInTheWild />`. No other component, heading, or paragraph moves; the rest of the
  document order (`PatternsInTheWild` → h2 → `LightDarkDemo` → `PatternGallery` → …) is unchanged.
- `CombinationGrid.tsx`/`.module.css` themselves are not modified — only their position in
  `Content.tsx` changes. No copy changes to `intro1`/`intro2`/`gridEyebrow`/etc. — the existing
  copy already reads correctly in the new position (verified above).

## Files touched

```
src/content/articles/two-states-are-enough/
  Content.tsx                     remove SwitchAnalogy import/usage; move CombinationGrid up
  SwitchAnalogy/                  deleted (SwitchAnalogy.tsx, SwitchAnalogy.module.css)
public/locales/en.json            remove 7 switchAnalogy* keys
public/locales/ru.json            remove 7 switchAnalogy* keys
```

No changes to `CombinationGrid/`, `PatternsInTheWild/`, `LightDarkDemo/`, `PatternGallery/`, or any
heading `id` (URLs/fragments stay stable).

## Testing / validation

`pnpm check-types && pnpm lint`, full `pnpm test` (locale-parity test picks up the 7 removed keys
automatically — both locale files must drop them or the test fails), manual browser check that the
page now opens straight into the four-tile grid right after the intro paragraphs, with everything
below it unchanged.

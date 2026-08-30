# Revision: unify PatternGallery's OS concept, show LightDarkDemo's live CSS property

## Why

User feedback after the "Simulate OS" revision:

1. In `PatternGallery`, setting the site's own control to "System" (`override === null`) and then
   using the new "Simulate OS" tile does **not** change the site preview or the state `<dl>`
   readout - only the chrome moves. That's a real logic gap, not a stylistic one: "System" means
   "follow whatever the OS currently says," so when the demo has a way to say what the OS currently
   says (the simulate control), the site's System-mode resolution must follow it. The previous
   revision built two independent "OS readings" (one for the chrome, one - real-only - for the
   site) instead of one shared concept.
2. `LightDarkDemo`'s mechanism is only explained in prose and a static, generic code sample above
   the interactive part - clicking the toggle repaints the mock window, but nothing on screen shows
   _which_ CSS value is actually driving that repaint at that moment. The user wants the literal
   `color-scheme` value visible and updating live, next to the window it controls.

## Decision

### `PatternGallery`

- Replace `nativeChromeTheme` with a single `effectiveOsTheme: TResolvedTheme = simulatedNative ??
(osPrefersDark ? 'dark' : 'light')` - the one place "what does the OS currently say" is computed,
  real-by-default, simulate-aware when the reader engages the Simulate OS control.
- `resolvedTheme` changes from `override ?? (osPrefersDark ? 'dark' : 'light')` to
  `override ?? effectiveOsTheme`. This is the actual fix: when `override` is `null` ("System"),
  the site preview now follows `effectiveOsTheme`, including simulated values. When `override` is
  explicitly set (Light/Dark via the first three controls), behavior is unchanged - those controls
  still never move the chrome, and simulating the OS still never overrides an explicit site choice.
- The titlebar's `data-native-theme` attribute, the simulate button's icon, and
  `simulateCycleLabel` all switch from reading `nativeChromeTheme` to reading `effectiveOsTheme`
  (same values, renamed source - no behavior change for the chrome itself).
- `osLabel` (the `<dl>`'s "OS preference" row) changes from reading raw `osPrefersDark` to reading
  `effectiveOsTheme`. This is required for internal consistency, not just nicer wording: with the
  fix above, "Resolved theme" already reflects `effectiveOsTheme` when override is "System" - if
  "OS preference" kept showing the unsimulated raw value, the three-row readout could show a
  self-contradiction (e.g. "OS preference: Light," "Your override: None - following system,"
  "Resolved theme: Dark").
- `demoSimulateOsCaption` copy changes, since its current wording ("not... the state below") is no
  longer accurate once the fix above ships. New copy: the simulate control changes the chrome, and
  the site preview too whenever the reader is following System - it still never touches their real
  OS.
- `demoCaption` (the closing "this state is real" caption) is unchanged - `override`/`localStorage`
  persistence and the real `matchMedia` read (`osPrefersDark` itself) are completely untouched by
  this fix; only what downstream values are _derived from_ changes.

### `LightDarkDemo`

- Add a new `<code>` line, directly above the mock `.window`, showing the literal live value:
  `` `color-scheme: ${simulatedNative};` `` - plain monospace text, no new locale key (it's a CSS
  value/keyword, not prose, consistent with the existing non-localized `LIGHT_DARK_CSS` sample).
  Wrapped together with the window in a new column container so the button stays beside both,
  matching the existing flex-row layout of `.demo`.
- No change to the existing static `LIGHT_DARK_CSS` sample, the `mechanism`/`caption`/`demoCaption`
  copy, or the `simulatedNative` state/toggle logic itself - this is a pure addition of a live,
  literal readout next to the effect it's causing.

## `PatternGallery` (modified)

`src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx`.

```tsx
const effectiveOsTheme: TResolvedTheme = simulatedNative ?? (osPrefersDark ? 'dark' : 'light')
const resolvedTheme: TResolvedTheme = override ?? effectiveOsTheme
```

(`effectiveOsTheme` must be computed before `resolvedTheme`, which now depends on it.)

Every prior read of `nativeChromeTheme` (the titlebar's `data-native-theme` attribute, the simulate
button's `<Icon>` selection, `simulateCycleLabel`) switches to `effectiveOsTheme`. `osLabel` switches
from `osPrefersDark ? darkLabel : lightLabel` to `effectiveOsTheme === 'dark' ? darkLabel :
lightLabel`. `handleSimulateNativeCycle`'s internal reference to `nativeChromeTheme` also becomes
`effectiveOsTheme` (same logic, renamed source). No other state, handler, or JSX changes - the three
site controls' handlers (`handleCycle`/`handleSwitchChange`/`handleSegmentChange`) and the `<dl>`'s
`overrideLabel`/`resolvedLabel` derivations are untouched (they already read `override`/
`resolvedTheme`, which flow through automatically).

## `LightDarkDemo` (modified)

`src/content/articles/two-states-are-enough/LightDarkDemo/LightDarkDemo.tsx` (+ `.module.css`).

New markup, wrapping the existing `.window` div:

```tsx
<div className={styles.windowStack}>
  <code className={styles.liveProperty}>{`color-scheme: ${simulatedNative};`}</code>

  {/* existing comment stays here, unchanged */}
  <div className={styles.window} style={{ colorScheme: simulatedNative }}>
    …
  </div>
</div>
```

New CSS: `.windowStack` (flex column, small gap) and `.liveProperty` (same monospace font stack as
`.pre`, small muted text, matching the site's existing "secondary text" visual weight).

## Content changes (`en.json` and `ru.json`)

`demoSimulateOsCaption` value changes (same key, no new key):

- en: "Changes the window chrome below, and the site preview too whenever you're following System
  - never your real OS."
- ru: "Меняет вид окна ниже, а если ты следуешь Системной теме - то и превью сайта. Твою настоящую
  ОС это не трогает."

No other locale key changes. `LightDarkDemo`'s new live property line is a CSS value, not prose -
no locale key needed, consistent with the existing non-localized `LIGHT_DARK_CSS` sample.

## Files touched

```
src/content/articles/two-states-are-enough/
  PatternGallery/
    PatternGallery.tsx           effectiveOsTheme replaces nativeChromeTheme; resolvedTheme/osLabel depend on it
  LightDarkDemo/
    LightDarkDemo.tsx            add live color-scheme property line above the window
    LightDarkDemo.module.css     add .windowStack/.liveProperty
public/locales/en.json            demoSimulateOsCaption value updated (same key)
public/locales/ru.json            demoSimulateOsCaption value updated (same key)
```

No changes to `PatternGallery.module.css` (the CSS already keys off `data-native-theme`, which
still exists - only what feeds its value changes), `CombinationGrid/`, `PatternsInTheWild/`,
`Content.tsx`, or any heading `id`.

## Testing / validation

`pnpm check-types && pnpm lint`, full `pnpm test` (locale-parity test covers the changed value -
same key, so parity already holds - but confirms no blank/duplicate issues), manual browser
verification via a real browser engine (not source/HTML inspection): in `PatternGallery`, with the
segmented control on "System," clicking Simulate OS must now visibly repaint the preview page
content and update all three `<dl>` rows, not just the chrome; with an explicit Light/Dark override
set, clicking Simulate OS must still leave the page content and `<dl>` untouched (chrome-only, as
before). In `LightDarkDemo`, clicking the toggle must visibly flip the new live `color-scheme: …`
text at the same moment the window repaints.

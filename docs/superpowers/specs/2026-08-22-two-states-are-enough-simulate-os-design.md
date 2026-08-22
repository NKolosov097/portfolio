# Revision: decouple PatternGallery's native chrome from the site theme, add a "simulate OS" control

## Why

User feedback after the browser-window preview revision:

1. `PatternGallery`'s new titlebar/URL-bar chrome and its page content were both driven by the
   same `resolvedTheme` (`override ?? osPrefersDark`). That's inaccurate: a real browser's native
   chrome (title bar, URL bar) reflects the **OS/browser's own theme**, not an individual website's
   own dark-mode toggle — setting a site to light mode doesn't turn the OS's dark title bar white.
   These are supposed to be two independent axes, exactly what `CombinationGrid` already
   demonstrates elsewhere in the article (native × site = 4 combinations). `PatternGallery`
   collapsed them into one.
2. Confirmed as a separate, correct question (no fix needed): `LightDarkDemo`'s titlebar mock and
   page mock changing together on one toggle click **does** match real `color-scheme` behavior —
   both are descendants of the same `.window` div that sets `color-scheme`, which is an inherited
   property, so both correctly resolve `light-dark()` to the same branch. That demo has no
   independent native/site axis to begin with (it's one simulated environment, not two), so this
   doesn't apply to it.

## Decision

- Add a fourth control tile to `PatternGallery`: **"Simulate OS"** — an icon toggle (Sun/Moon, same
  visual pattern as the existing icon-button tile), explicitly labeled and captioned as a
  simulation, with its own 2-press cycle (press 1 overrides the chrome to the opposite shade,
  press 2 clears back to following the real OS preference) — mirroring the existing `handleCycle`
  pattern used by the first tile.
- New state `simulatedNative: 'light' | 'dark' | null`, independent of `override`. `override`
  keeps driving the page content exactly as today (unchanged). The titlebar/URL-bar now read a new
  computed value, `nativeChromeTheme = simulatedNative ?? (osPrefersDark ? 'dark' : 'light')`.
- The titlebar/URL-bar switch from reading the shared `.preview[data-theme=...]` attribute to a new,
  independent `data-native-theme` attribute placed on `.previewTitlebar` itself (the URL-bar pill
  is already nested inside the titlebar div, so it styles via a descendant selector off the same
  attribute). The page content (`.previewPage`/`.previewHeading`/`.previewBody`) keeps using
  `data-theme` on the outer `.preview` exactly as before — untouched.
- The state `<dl>` readout (OS preference / your override / resolved theme) is **not** touched —
  it stays 100% real, unaffected by the new simulation. A short caption under the new tile makes
  clear it only changes the chrome shown above, not the reader's real OS or that readout — so the
  rest of the block's "this state is real, not a simulation" claim stays true.
- `simulatedNative` is pure local UI state: no `localStorage`, no tie to `STORAGE_KEY` (which
  remains scoped to `override` only) — reload the page and the simulated chrome resets to
  following the real OS, exactly like `SwitchAnalogy`'s and `CombinationGrid`'s local-only state did.
- Two new locale-key pairs (en/ru): a label + caption for the new tile, and two accessible-label
  strings for the toggle button (`demoSimulateToggleToDark`/`demoSimulateToggleToLight`) — distinct
  from the existing `demoToggleToDark`/`demoToggleToLight` (which describe the real site toggle),
  so a screen-reader user doesn't hear two differently-behaving buttons announced identically.

## `PatternGallery` (modified)

`src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx` (+ `.module.css`).

**New type and state**, alongside the existing ones:

```tsx
/** The simulated native/OS shade shown in the chrome above, or `null` to follow the real OS preference. */
type TNativeSimulation = 'light' | 'dark' | null

const [simulatedNative, setSimulatedNative] = useState<TNativeSimulation>(null)
```

**New computed value**, alongside `resolvedTheme`:

```tsx
const nativeChromeTheme: TResolvedTheme = simulatedNative ?? (osPrefersDark ? 'dark' : 'light')
```

**New handler**, mirroring `handleCycle`:

```tsx
/** Simulates the native/OS theme independently of the site's own override — press 1 flips the chrome to the opposite of what it currently shows, press 2 clears back to following the real OS preference. Never touches osPrefersDark, override, or localStorage. */
const handleSimulateNativeCycle = () => {
  if (simulatedNative === null) {
    setSimulatedNative(nativeChromeTheme === 'dark' ? 'light' : 'dark')
  } else {
    setSimulatedNative(null)
  }
}
```

**New label derivation**, alongside `cycleLabel`:

```tsx
const simulateCycleLabel =
  nativeChromeTheme === 'dark'
    ? t('articleContent.twoStatesAreEnough.demoSimulateToggleToLight')
    : t('articleContent.twoStatesAreEnough.demoSimulateToggleToDark')
```

**New fourth control tile**, appended after the existing Switch tile inside `.controls`:

```tsx
<div className={styles.controlTile}>
  <p className={styles.controlLabel}>
    {t('articleContent.twoStatesAreEnough.demoSimulateOsLabel')}
  </p>
  <button
    type="button"
    className={styles.toggleButton}
    onClick={handleSimulateNativeCycle}
    disabled={!isMounted}
    aria-label={simulateCycleLabel}
    title={simulateCycleLabel}
  >
    <Icon data={nativeChromeTheme === 'dark' ? Sun : Moon} size={20} />
  </button>
  <p className={styles.controlCaption}>
    {t('articleContent.twoStatesAreEnough.demoSimulateOsCaption')}
  </p>
</div>
```

**Titlebar markup** gains the new attribute (URL-bar markup is unchanged — it's already nested
inside the titlebar):

```tsx
<div className={styles.previewTitlebar} data-native-theme={isMounted ? nativeChromeTheme : undefined}>
```

**CSS**: replace the existing `.preview[data-theme='light'|'dark'] .previewTitlebar` and
`.preview[data-theme='light'|'dark'] .previewUrlBar` rules with `.previewTitlebar[data-native-theme='light'|'dark']`
and `.previewTitlebar[data-native-theme='light'|'dark'] .previewUrlBar` respectively — same colors,
new selector root. Add a `.controlCaption` rule (small muted text, matching the visual weight of
the card's other secondary text) for the new tile's clarifying caption.

**Accessibility/testability:** `data-testid="pattern-gallery"` unchanged. New tile's button gets its
own distinct `aria-label`/`title` (not shared with the real toggle's).

## Content changes (`en.json` and `ru.json`)

New keys under `articleContent.twoStatesAreEnough`:

- `demoSimulateOsLabel` — en: "Simulate OS", ru: "Симулировать ОС"
- `demoSimulateOsCaption` — en: "Changes only the window chrome above — not your real OS or the
  state below.", ru: "Меняет только вид окна выше — не твою настоящую ОС и не состояние ниже."
- `demoSimulateToggleToDark` — en: "Simulate dark OS", ru: "Симулировать тёмную ОС"
- `demoSimulateToggleToLight` — en: "Simulate light OS", ru: "Симулировать светлую ОС"

No existing keys change.

## Files touched

```
src/content/articles/two-states-are-enough/PatternGallery/
  PatternGallery.tsx           new state/handler/tile; titlebar gets data-native-theme
  PatternGallery.module.css    retarget titlebar/URL-bar selectors to data-native-theme; add .controlCaption
public/locales/en.json          4 new keys (see above)
public/locales/ru.json          4 new keys (see above)
```

No changes to `LightDarkDemo/`, `CombinationGrid/`, `PatternsInTheWild/`, `Content.tsx`, or any
heading `id`.

## Testing / validation

`pnpm check-types && pnpm lint`, full `pnpm test` (locale-parity test picks up the 4 new keys
automatically), manual browser verification via a real browser engine (not source/HTML inspection):
clicking the new "Simulate OS" tile changes only the titlebar/URL-bar, leaving the page content and
the state `<dl>` readout unaffected; clicking the existing icon/segments/switch controls changes
only the page content and the readout, leaving the titlebar/URL-bar unaffected (unless the real OS
preference happens to already match, in which case both would coincidentally show the same shade —
verify by first simulating the opposite native shade so the two are visibly out of sync, then
confirm the site controls don't move the chrome).

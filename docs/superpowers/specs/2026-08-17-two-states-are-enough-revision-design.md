# Revision: "Two States Are Enough" — more interactive, less text, fact-checked

## Why

User feedback on the shipped v1 article:

1. Fact-check Lea Verou's source article carefully. Re-fetched it: it was
   published **6 August 2026**, not January 2026 as v1's intro claims — that's
   a factual error to fix. No mention of `matchMedia`/`prefers-color-scheme`/
   FOUC in her post (confirmed those are the author's own additions, already
   correctly framed as such, not attributed to her).
2. "No examples from other sites" — clarified with the user: this does **not**
   mean re-adding real screenshots of Tailwind/Ant Design/etc (copyright risk,
   already ruled out once). It means more **custom interactive demo patterns**
   that the reader can click through themselves, standing in for "examples."
3. Show that native (OS) theme and the site's resolved theme are two
   independent axes — all 4 combinations (native light/dark × site
   light/dark) should be visible and explorable, not just implied.
4. Let the reader try multiple **input affordances** for the same underlying
   decision: a button, a switch/toggle, and a dropdown — including the
   tri-state (light/dark/system) dropdown pattern specifically.
5. Shorter prose overall — the demos should carry more of the argument.

## Decisions made with the user

- Two separate demo blocks, not one merged component:
  1. **`PatternGallery`** — replaces `ThemeToggleDemo`. Tabs switch between
     three input patterns (Button / Switch / Dropdown) that all drive one
     shared preview + state readout (`OS preference` / `Your override` /
     `Resolved theme`), reusing the exact real `matchMedia` +
     `localStorage` logic already built and shipped.
  2. **`CombinationGrid`** — new. A 2×2 grid of tiles (native Light/Dark ×
     site Light/Dark). Purely illustrative/simulated state (no
     `localStorage`), decoupled from `PatternGallery`'s real state, so the
     reader can freely explore all 4 combinations without it fighting the
     real toggle. The tile matching the reader's actual OS preference (read
     once via `matchMedia`, read-only) gets a small "This is you" badge that
     never moves, independent of which tile is currently selected.
- No real third-party screenshots — confirmed not what was meant.

## `PatternGallery` (replaces `ThemeToggleDemo`)

Same directory, renamed: `src/content/articles/two-states-are-enough/PatternGallery/`.

**Shared state (unchanged from `ThemeToggleDemo`):**

- `osPrefersDark: boolean | null` — real `matchMedia`, read in a mount effect
  (same justified `react-hooks/set-state-in-effect` override, retargeted to
  the new file path).
- `override: 'light' | 'dark' | null` — real `localStorage`
  (`demo-theme-override`, same key, same file-scoped meaning).
- `resolvedTheme = override ?? (osPrefersDark ? 'dark' : 'light')`.

**New: `activePattern: 'button' | 'switch' | 'dropdown'`** — local UI state,
which tab is showing. Rendered as a small segmented tab control above the
preview.

**Per-pattern interaction (same shared state, different affordance):**

- **Button** (unchanged behavior) — one button, label flips
  ("Switch to dark"/"Switch to light"), 2-press cycle: press 1 → override to
  opposite of resolved; press 2 → clear override.
- **Switch** — a visual toggle switch (checkbox styled as a slider), knob
  position reflects `resolvedTheme`. Clicking it runs the _same_ 2-press
  cycle handler as Button — same underlying model, different look, to show
  the affordance doesn't change the logic.
- **Dropdown** — a native `<select>` with three explicit options: Light /
  Dark / System. This is the tri-state pattern. Unlike Button/Switch, it
  sets state directly instead of cycling: selecting "Light" → `override =
'light'`; "Dark" → `override = 'dark'`; "System" → `override = null`. The
  select's displayed value is derived from `override` (`'system'` when
  `override === null`). This demonstrates the real tradeoff: three named
  options needs no cycling, but costs a third, explicitly-labeled slot.

Preview + state readout below the tabs are shared and unchanged in shape
from v1 (mini site preview that actually renders `resolvedTheme`; three-row
readout: OS preference / Your override / Resolved theme).

## `CombinationGrid` (new)

`src/content/articles/two-states-are-enough/CombinationGrid/`.

**Purpose:** make the "native theme and site theme are independent axes"
point visible in one glance, separately from the toggle-behavior point
`PatternGallery` makes.

**State:**

- `actualOsPrefersDark: boolean | null` — real `matchMedia`, read once in a
  mount effect, **read-only**, never written to. Used only to badge the
  matching tile "This is you." Same hydration-safe null-until-mount pattern,
  needs the same lint override on this file too.
- `selected: { native: 'light' | 'dark'; site: 'light' | 'dark' }` — purely
  local UI state, defaults to `{ native: actualOsPrefersDark ? 'dark' :
'light', site: actualOsPrefersDark ? 'dark' : 'light' }` once mounted (i.e.
  starts on the reader's real combination, unselected/neutral before mount).
  No `localStorage` — this grid is explicitly illustrative, not the real
  toggle.

**Layout:** 2×2 grid, rows = "Native" (Light/Dark), columns = "Site shows"
(Light/Dark). Each tile is a button containing a small color swatch styled
per its column value (what the site would show) plus a caption stating its
row value ("Native: Light"). Clicking a tile sets `selected` to that tile's
`{native, site}` and visually marks it active. The tile whose `{native,
site}` both equal `actualOsPrefersDark`'s corresponding light/dark value AND
whose `site` also equals that same value (i.e., the no-override combination
that matches the reader's real OS) gets a persistent "This is you" badge,
independent of `selected`.

A one-line caption under the grid states plainly that this grid is
illustrative (simulated), unlike the real state in `PatternGallery` above/
below it.

## Content trim (both `en.json` and `ru.json`)

- Fix: "her January 2026 piece" → "her August 2026 piece" (and the Russian
  equivalent "январе 2026 года" → "августе 2026 года").
- Intro: 3 paragraphs → 2, tighter.
- `implementationDriven1`/`implementationDriven2` → merge into one shorter
  paragraph.
- `hardParts1`/`hardParts2`/`hardParts3` → one short lead-in sentence plus
  three short bullet points (still the FOUC / don't-clear-on-OS-change /
  cross-tab-sync content, just terser — no new locale key structure beyond
  turning 3 keys into 1 lead key + 3 short bullet keys).
- `whenThreeEarn1`/`whenThreeEarn2` → one short paragraph, referencing the
  dropdown pattern the reader already tried above.
- Closing: shorter, and incorporates Lea Verou's own actual closing phrase
  ("Respect user effort") now that it's confirmed verbatim from the source —
  a small authenticity upgrade over the paraphrase in v1.

## Document order (updated)

1. Intro (2 paragraphs)
2. `CombinationGrid`
3. H2: The Tri-State Toggle Is Implementation-Driven UI (1 paragraph)
4. `PatternGallery`
5. H2: Where Two-State Actually Gets Hard (1 lead sentence + 3 bullets)
6. H2: When Three States Still Earn Their Keep (1 paragraph, references the
   dropdown tab)
7. Closing (shorter, cites "Respect user effort")

## Files touched

```
src/content/articles/two-states-are-enough/
  Content.tsx                        rewritten body + updated imports
  PatternGallery/                    renamed from ThemeToggleDemo/, extended
    PatternGallery.tsx
    PatternGallery.module.css
  CombinationGrid/                   new
    CombinationGrid.tsx
    CombinationGrid.module.css
public/locales/en.json               revised twoStatesAreEnough.* keys
public/locales/ru.json               revised twoStatesAreEnough.* keys
eslint.config.mjs                    retarget the set-state-in-effect override
                                      to PatternGallery.tsx, add one for
                                      CombinationGrid.tsx
```

`ThemeToggleDemo/` directory is deleted (renamed to `PatternGallery/`).
No changes to `articles.constants.ts` (title/description/date unaffected),
`registry.ts` (still points at the same `Content.tsx` default export and
`HEADINGS`), or the three heading `id`s (URLs/fragments stay stable).

## Testing / validation

Same as v1: `pnpm check-types && pnpm lint`, full `pnpm test` (constants +
locale-parity tests are generic, no changes needed), manual browser
verification of both new demos (all 3 pattern tabs + all 4 grid tiles +
language switch), in an isolated worktree, merged back to `main` the same
way as v1.

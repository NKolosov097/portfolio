# Two States Are Enough — Drop SwitchAnalogy, Promote CombinationGrid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `SwitchAnalogy` component (its brightness-button-vs-slider metaphor doesn't fit the article's actual thesis) and let `CombinationGrid` — already the next component in the document — become the page's opening interactive hook.

**Architecture:** A deletion plus a one-line-removal reorder. `SwitchAnalogy/` is deleted outright (component + styles + its 7 locale keys in both locales); `Content.tsx` drops the `<SwitchAnalogy />` line, which naturally promotes the immediately-following `<CombinationGrid />` to be the first component after the intro paragraphs — no JSX actually needs to move. `CombinationGrid.tsx`/`.module.css` are untouched.

**Tech Stack:** Next.js App Router, React 19, TypeScript (strict), react-i18next, Vitest.

## Global Constraints

- True module-level constants in `UPPER_SNAKE_CASE` (not touched by this plan, but any code left behind must still conform).
- Commits must not include a `Co-Authored-By` trailer.
- Run `pnpm check-types && pnpm lint` before considering the change complete.
- Once a component/locale key has no consumer, delete it completely — don't leave dead code or dead copy behind.
- No changes to `CombinationGrid.tsx`/`.module.css`, `PatternsInTheWild/`, `LightDarkDemo/`, `PatternGallery/`, or any heading `id`.

---

### Task 1: Delete `SwitchAnalogy`, drop its locale keys, promote `CombinationGrid` in `Content.tsx`

**Files:**

- Delete: `src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.tsx`
- Delete: `src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.module.css`
- Modify: `src/content/articles/two-states-are-enough/Content.tsx`
- Modify: `public/locales/en.json`
- Modify: `public/locales/ru.json`
- Test: `src/configs/i18n/locales.test.ts` (already generic — no edits, just re-run)

**Interfaces:**

- Removes: the `SwitchAnalogy` export and every `articleContent.twoStatesAreEnough.switchAnalogy*`
  locale key. Nothing else in the codebase imports `SwitchAnalogy` or reads those keys (confirmed
  by repo-wide search before this plan was written), so no other task or file needs updating.
- `CombinationGrid`'s own props/behavior are unchanged — this task only changes what renders
  immediately before it in `Content.tsx`.

This is one task, not several, because the three edits are only meaningful together: deleting the
component while `Content.tsx` still imports it would break the build, and reordering `Content.tsx`
without removing the locale keys would leave dead copy behind. There's no independently-testable
midpoint.

- [ ] **Step 1: Delete the `SwitchAnalogy` directory**

```bash
git rm -r src/content/articles/two-states-are-enough/SwitchAnalogy
```

- [ ] **Step 2: Remove the `SwitchAnalogy` import and usage in `Content.tsx`**

In `src/content/articles/two-states-are-enough/Content.tsx`, find:

```tsx
import { PatternsInTheWild } from './PatternsInTheWild/PatternsInTheWild'
import { SwitchAnalogy } from './SwitchAnalogy/SwitchAnalogy'
```

Replace with:

```tsx
import { PatternsInTheWild } from './PatternsInTheWild/PatternsInTheWild'
```

Find:

```tsx
      <SwitchAnalogy />

      <CombinationGrid />
```

Replace with:

```tsx
      <CombinationGrid />
```

(`<CombinationGrid />` is now the first component rendered after the two intro paragraphs —
nothing else in the file changes; `PatternsInTheWild`, the `h2`s, `LightDarkDemo`, and
`PatternGallery` all stay exactly where they were.)

- [ ] **Step 3: Remove the seven dead keys from `en.json`**

In `public/locales/en.json`, find:

```json
      "intro2": "I agree, and I'll add an engineering reason of my own: two states aren't just simpler to read, they're harder to get wrong in code. The toggles below are real, not screenshots — play with them first.",
      "switchAnalogyEyebrow": "Before we talk toggles",
      "switchAnalogyPanelALabel": "Five labelled buttons",
      "switchAnalogyPanelACaption": "Read every label, then pick the exact one you meant.",
      "switchAnalogyPanelBLabel": "One slider",
      "switchAnalogyPanelBCaption": "Drag toward brighter or dimmer — no reading required.",
      "switchAnalogyTakeaway": "A tri-state control asks you to read. A two-state one just asks you to feel a direction.",
      "switchAnalogySliderLabel": "Brightness slider",
      "demoEyebrow": "Try it",
```

Replace with:

```json
      "intro2": "I agree, and I'll add an engineering reason of my own: two states aren't just simpler to read, they're harder to get wrong in code. The toggles below are real, not screenshots — play with them first.",
      "demoEyebrow": "Try it",
```

- [ ] **Step 4: Remove the matching seven keys from `ru.json`**

In `public/locales/ru.json`, find:

```json
      "intro2": "Я согласен и добавлю свою инженерную причину: два состояния не только проще читателю — их и сложнее сломать в коде. Тогглы ниже настоящие, не скриншоты — сначала поиграйся с ними.",
      "switchAnalogyEyebrow": "Прежде чем говорить о тогглах",
      "switchAnalogyPanelALabel": "Пять подписанных кнопок",
      "switchAnalogyPanelACaption": "Прочитай каждую подпись и выбери именно то значение, которое имел в виду.",
      "switchAnalogyPanelBLabel": "Один слайдер",
      "switchAnalogyPanelBCaption": "Потяни в сторону ярче или темнее — читать ничего не нужно.",
      "switchAnalogyTakeaway": "Трёхпозиционный контрол просит тебя прочитать. Двухпозиционный — просто почувствовать направление.",
      "switchAnalogySliderLabel": "Ползунок яркости",
      "demoEyebrow": "Попробуй сам",
```

Replace with:

```json
      "intro2": "Я согласен и добавлю свою инженерную причину: два состояния не только проще читателю — их и сложнее сломать в коде. Тогглы ниже настоящие, не скриншоты — сначала поиграйся с ними.",
      "demoEyebrow": "Попробуй сам",
```

- [ ] **Step 5: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS — `check-types` will fail loudly if any stale `SwitchAnalogy` import survives
anywhere.

- [ ] **Step 6: Run the locale parity test**

Run: `pnpm test -- locales`
Expected: PASS — both locale files dropped the same seven keys, so parity holds.

- [ ] **Step 7: Manual verification in the browser**

Run: `pnpm dev`
Visit `http://localhost:3000/articles/two-states-are-enough` and confirm:

- The page opens straight from the two intro paragraphs into the "Все четыре комбинации" / "All
  four combinations" 2×2 grid — no "Прежде чем говорить о тогглах" / "Before we talk toggles" block
  in between.
- Everything from `PatternsInTheWild` onward (segmented-control tile, the `light-dark()` demo, the
  "Попробуй сам" / "Try it" gallery) still renders in the same order as before, unaffected.

Stop the dev server once confirmed.

- [ ] **Step 8: Commit**

```bash
git add src/content/articles/two-states-are-enough/Content.tsx public/locales/en.json public/locales/ru.json
git commit -m "feat: drop SwitchAnalogy and promote CombinationGrid to the opening hook"
```

(The `git rm -r` from Step 1 already staged the `SwitchAnalogy/` deletion — it will be included in
this same commit since it's still staged.)

---

### Task 2: Final validation

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 2: Full unit test suite**

Run: `pnpm test`
Expected: PASS, including `src/configs/i18n/locales.test.ts` covering the removed keys.

- [ ] **Step 3: Confirm no leftover references**

Run: `grep -rn "SwitchAnalogy\|switchAnalogy" src public/locales`
Expected: no output. Any match is a leftover that must be cleaned up before this plan is done.

- [ ] **Step 4: Confirm README still matches reality**

`README.md` describes the article architecture generically (no per-article enumeration or
component count). Skim the "Project structure" and "Architecture" sections to confirm nothing
there references `SwitchAnalogy`; no edit is expected.

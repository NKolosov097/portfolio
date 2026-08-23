# Two States Are Enough — Hook, Real-World Grounding, light-dark() Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three static, unbranded illustrations to `/articles/two-states-are-enough` — an opening hook analogy, a "patterns you'll recognize" grounding section, and a `light-dark()` CSS snippet — matching improvements the user identified by re-reading Lea Verou's source article side by side with ours.

**Architecture:** Follows the exact pattern already established by `CombinationGrid`/`PatternGallery` in this article: each new visual is a self-contained component in its own directory (`.tsx` + `.module.css`), rendered from `Content.tsx`, copy sourced from `public/locales/{en,ru}.json`. Unlike the two existing demos, all three new components are purely presentational — no `useState`/`useEffect`, no browser APIs, no `localStorage` — so no new ESLint override is needed anywhere.

**Tech Stack:** Next.js App Router, React 19, TypeScript (strict), react-i18next, CSS Modules, Vitest.

## Global Constraints

- Strict TypeScript: no `any`, no type assertions (`as`); use type guards/discriminated unions instead. Boolean identifiers prefixed `is`/`has`.
- JSDoc on interface/type fields, component props, and non-`useState` variables — one line, states the non-obvious reason only.
- Comments elsewhere: 1-2 lines max, state the _why_, not the _what_.
- True module-level constants in `UPPER_SNAKE_CASE`.
- Each component in its own directory with a separate `.module.css` file.
- Stable `data-testid` (no random selectors).
- Destructure function params/callback args/object fields over repeated dotted access.
- No real screenshots or branded mockups anywhere — new illustrations are generic/unbranded; real product names appear only as plain caption text, never copied visual branding.
- No new syntax-highlighting dependency — the one CSS snippet is a plain styled `<pre><code>`, matching this codebase's existing convention of hand-built div+CSS illustrations with no code-block component.
- Commits must not include a `Co-Authored-By` trailer (repo owner authors all commits).
- Run `pnpm check-types && pnpm lint` before considering the change complete.

---

### Task 1: Locale copy (EN + RU)

**Files:**

- Modify: `public/locales/en.json`
- Modify: `public/locales/ru.json`
- Test: `src/configs/i18n/locales.test.ts` (already generic — no edits, just re-run)

**Interfaces:**

- Produces: every key under `articleContent.twoStatesAreEnough.switchAnalogy*`,
  `articleContent.twoStatesAreEnough.patternsInTheWild*`, and
  `articleContent.twoStatesAreEnough.lightDark*` — consumed by Task 2 (`SwitchAnalogy`), Task 3
  (`PatternsInTheWild`), Task 4 (`LightDarkSnippet`), and Task 5 (`Content.tsx`) via
  `t('articleContent.twoStatesAreEnough.<key>')`. Also reuses the existing
  `articleContent.twoStatesAreEnough.demoLight` / `demoDark` / `demoSystem` keys — no new keys
  needed for those three labels.

- [ ] **Step 1: Edit `intro2` and add the `switchAnalogy*` keys in `en.json`**

In `public/locales/en.json`, find this line inside the `"twoStatesAreEnough"` object:

```json
      "intro2": "I agree, and I'll add an engineering reason of my own: two states aren't just simpler to read, they're harder to get wrong in code. Everything below is real, not screenshots — play with it first.",
```

Replace it with (tightened wording plus six new keys immediately after):

```json
      "intro2": "I agree, and I'll add an engineering reason of my own: two states aren't just simpler to read, they're harder to get wrong in code. The toggles below are real, not screenshots — play with it first.",
      "switchAnalogyEyebrow": "Before we talk toggles",
      "switchAnalogyPanelALabel": "Five labelled buttons",
      "switchAnalogyPanelACaption": "Read every label, then pick the exact one you meant.",
      "switchAnalogyPanelBLabel": "One slider",
      "switchAnalogyPanelBCaption": "Drag toward warmer or cooler — no reading required.",
      "switchAnalogyTakeaway": "A tri-state control asks you to read. A two-state one just asks you to feel a direction.",
```

- [ ] **Step 2: Add the `patternsInTheWild*` keys in `en.json`**

Find this line (still inside `"twoStatesAreEnough"`):

```json
      "gridCaption": "Simulated — pick any tile. The toggle below is the real one, backed by your actual OS setting and localStorage.",
      "implementationDrivenHeading": "The Tri-State Toggle Is Implementation-Driven UI",
```

Replace it with:

```json
      "gridCaption": "Simulated — pick any tile. The toggle below is the real one, backed by your actual OS setting and localStorage.",
      "patternsInTheWildEyebrow": "A shape you've seen before",
      "patternsInTheWildSettingsLabel": "Appearance",
      "patternsInTheWildTile1Caption": "This exact Light / Dark / System segment shows up in Tailwind's own docs, Ant Design, and Radix Themes.",
      "patternsInTheWildTile2Caption": "A single icon button that flips on click — VitePress and Material Design both ship this shape.",
      "patternsInTheWildTile3Caption": "Bluesky and Google Calendar bury the same three options inside a settings screen instead of a toolbar toggle.",
      "implementationDrivenHeading": "The Tri-State Toggle Is Implementation-Driven UI",
```

- [ ] **Step 3: Add the `lightDark*` keys in `en.json`**

Find this line (still inside `"twoStatesAreEnough"`):

```json
      "implementationDriven": "A theme resolves to exactly one of two values on screen — light or dark; there's no third rendering. The three-state control exists because the value can come from three different sources — an explicit choice or a fallback to the OS — not because the page can look three different ways. Users don't open a toggle to plan ahead; they open it because the screen is too bright right now. A third option for a problem nobody has yet optimizes for the model, not the moment.",
      "hardPartsHeading": "Where Two-State Actually Gets Hard",
```

Replace it with:

```json
      "implementationDriven": "A theme resolves to exactly one of two values on screen — light or dark; there's no third rendering. The three-state control exists because the value can come from three different sources — an explicit choice or a fallback to the OS — not because the page can look three different ways. Users don't open a toggle to plan ahead; they open it because the screen is too bright right now. A third option for a problem nobody has yet optimizes for the model, not the moment.",
      "lightDarkIntro": "CSS agrees with the two-value model too: light-dark() takes exactly two colors — there's no third argument for a system fallback.",
      "lightDarkCaption": "Two arguments, no more — the function is binary by construction, not by convention.",
      "hardPartsHeading": "Where Two-State Actually Gets Hard",
```

- [ ] **Step 4: Make the matching edits in `ru.json`**

In `public/locales/ru.json`, find:

```json
      "intro2": "Я согласен и добавлю свою инженерную причину: два состояния не только проще читателю — их и сложнее сломать в коде. Всё ниже настоящее, не скриншоты — сначала поиграйся с этим.",
```

Replace with:

```json
      "intro2": "Я согласен и добавлю свою инженерную причину: два состояния не только проще читателю — их и сложнее сломать в коде. Тогглы ниже настоящие, не скриншоты — сначала поиграйся с ними.",
      "switchAnalogyEyebrow": "Прежде чем говорить о тогглах",
      "switchAnalogyPanelALabel": "Пять подписанных кнопок",
      "switchAnalogyPanelACaption": "Прочитай каждую подпись и выбери именно то значение, которое имел в виду.",
      "switchAnalogyPanelBLabel": "Один слайдер",
      "switchAnalogyPanelBCaption": "Потяни в сторону теплее или холоднее — читать ничего не нужно.",
      "switchAnalogyTakeaway": "Трёхпозиционный контрол просит тебя прочитать. Двухпозиционный — просто почувствовать направление.",
```

Find:

```json
      "gridCaption": "Симуляция — выбери любую плитку. Тоггл ниже настоящий, завязан на твою реальную настройку ОС и localStorage.",
      "implementationDrivenHeading": "Трёхпозиционный переключатель — это UI, продиктованный реализацией",
```

Replace with:

```json
      "gridCaption": "Симуляция — выбери любую плитку. Тоггл ниже настоящий, завязан на твою реальную настройку ОС и localStorage.",
      "patternsInTheWildEyebrow": "Форма, которую ты уже видел",
      "patternsInTheWildSettingsLabel": "Внешний вид",
      "patternsInTheWildTile1Caption": "Именно такой сегмент Light / Dark / System — в доках самого Tailwind, в Ant Design и в Radix Themes.",
      "patternsInTheWildTile2Caption": "Одна иконка-кнопка, переключающаяся по клику, — так делают и VitePress, и Material Design.",
      "patternsInTheWildTile3Caption": "Bluesky и Google Calendar прячут те же три опции внутри экрана настроек вместо тоггла в тулбаре.",
      "implementationDrivenHeading": "Трёхпозиционный переключатель — это UI, продиктованный реализацией",
```

Find:

```json
      "implementationDriven": "Тема на экране всегда разрешается ровно в одно из двух значений — light или dark, третьего рендера не существует. Трёхпозиционный контрол существует потому, что значение может прийти из трёх разных источников — явный выбор или fallback на ОС, — а не потому, что страница может выглядеть тремя разными способами. Пользователь не открывает переключатель, чтобы спланировать будущее — он открывает его, потому что экран прямо сейчас слишком яркий. Третья опция под проблему, которой ещё ни у кого нет, оптимизирована под модель данных, а не под момент.",
      "hardPartsHeading": "Где два состояния реально усложняют реализацию",
```

Replace with:

```json
      "implementationDriven": "Тема на экране всегда разрешается ровно в одно из двух значений — light или dark, третьего рендера не существует. Трёхпозиционный контрол существует потому, что значение может прийти из трёх разных источников — явный выбор или fallback на ОС, — а не потому, что страница может выглядеть тремя разными способами. Пользователь не открывает переключатель, чтобы спланировать будущее — он открывает его, потому что экран прямо сейчас слишком яркий. Третья опция под проблему, которой ещё ни у кого нет, оптимизирована под модель данных, а не под момент.",
      "lightDarkIntro": "CSS тоже согласен с моделью из двух значений: light-dark() принимает ровно два цвета — третьего аргумента под системный fallback в нём нет.",
      "lightDarkCaption": "Ровно два аргумента — функция бинарна по конструкции, а не по договорённости.",
      "hardPartsHeading": "Где два состояния реально усложняют реализацию",
```

- [ ] **Step 5: Validate JSON and run the locale parity test**

Run: `pnpm test -- locales`
Expected: PASS — every new key added to `en.json` has a Russian counterpart and vice versa, no blank values, no non-string leaves, no duplicate paths.

- [ ] **Step 6: Commit**

```bash
git add public/locales/en.json public/locales/ru.json
git commit -m "feat: add copy for the hook, real-world grounding, and light-dark() sections"
```

---

### Task 2: `SwitchAnalogy` component

**Files:**

- Create: `src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.tsx`
- Create: `src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.module.css`

**Interfaces:**

- Consumes: locale keys from Task 1 (`articleContent.twoStatesAreEnough.switchAnalogy*`).
- Produces: `SwitchAnalogy` (default + named export), a static `'use client'` component with no
  props — consumed by Task 5's `Content.tsx` as `<SwitchAnalogy />`.

- [ ] **Step 1: Write the component**

Create `src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.tsx`:

```tsx
'use client'

import styles from './SwitchAnalogy.module.css'

import { useTranslation } from 'react-i18next'

/** The five labelled dial positions shown in the "read every label" panel. */
const DIAL_PERCENTAGES: number[] = [10, 30, 50, 70, 100]

/** Which dial position renders as pressed — purely decorative, not driven by any interaction. */
const ACTIVE_DIAL_PERCENTAGE = 50

export const SwitchAnalogy = () => {
  const { t } = useTranslation()

  return (
    <div className={styles.card} data-testid="switch-analogy">
      <p className={styles.eyebrow}>
        {t('articleContent.twoStatesAreEnough.switchAnalogyEyebrow')}
      </p>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <p className={styles.panelLabel}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelALabel')}
          </p>
          <div className={styles.dialRow}>
            {DIAL_PERCENTAGES.map((percentage) => (
              <span
                key={percentage}
                className={styles.dialButton}
                data-active={percentage === ACTIVE_DIAL_PERCENTAGE}
              >
                {percentage}%
              </span>
            ))}
          </div>
          <p className={styles.panelCaption}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelACaption')}
          </p>
        </div>

        <div className={styles.panel}>
          <p className={styles.panelLabel}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelBLabel')}
          </p>
          <div className={styles.sliderTrack}>
            <span className={styles.sliderKnob} />
          </div>
          <p className={styles.panelCaption}>
            {t('articleContent.twoStatesAreEnough.switchAnalogyPanelBCaption')}
          </p>
        </div>
      </div>

      <p className={styles.takeaway}>
        {t('articleContent.twoStatesAreEnough.switchAnalogyTakeaway')}
      </p>
    </div>
  )
}

export default SwitchAnalogy
```

- [ ] **Step 2: Write the styles**

Create `src/content/articles/two-states-are-enough/SwitchAnalogy/SwitchAnalogy.module.css`:

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem 1.5rem;
  margin: 2rem 0;
  background: #111;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 1rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 50%);
}

.panels {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.panel {
  display: flex;
  flex: 1 1 12rem;
  flex-direction: column;
  gap: 0.6rem;
}

.panelLabel {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
}

.dialRow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.dialButton {
  padding: 0.35rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgb(255 255 255 / 55%);
  background: rgb(255 255 255 / 6%);
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 999px;
}

.dialButton[data-active='true'] {
  color: #fff;
  background: rgb(255 255 255 / 16%);
  border-color: var(--g-color-line-brand);
}

.sliderTrack {
  position: relative;
  height: 0.35rem;
  margin: 0.5rem 0;
  background: rgb(255 255 255 / 12%);
  border-radius: 999px;
}

.sliderKnob {
  position: absolute;
  top: 50%;
  left: 70%;
  width: 1rem;
  height: 1rem;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--g-color-line-brand);
  transform: translate(-50%, -50%);
}

.panelCaption {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 55%);
}

.takeaway {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgb(255 255 255 / 85%);
}
```

- [ ] **Step 3: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS with no errors. If `lint:styles` or `lint:prettier` flags formatting, run
`pnpm format` and re-run `pnpm lint`.

- [ ] **Step 4: Commit**

```bash
git add src/content/articles/two-states-are-enough/SwitchAnalogy
git commit -m "feat: add the SwitchAnalogy opening hook for the Two States Are Enough article"
```

---

### Task 3: `PatternsInTheWild` component

**Files:**

- Create: `src/content/articles/two-states-are-enough/PatternsInTheWild/PatternsInTheWild.tsx`
- Create: `src/content/articles/two-states-are-enough/PatternsInTheWild/PatternsInTheWild.module.css`

**Interfaces:**

- Consumes: locale keys from Task 1 (`articleContent.twoStatesAreEnough.patternsInTheWild*`), plus
  the already-shipped `articleContent.twoStatesAreEnough.demoLight` / `demoDark` / `demoSystem`
  keys. Also consumes `Icon` from `@gravity-ui/uikit` and `Sun` from `@gravity-ui/icons` — both
  already a project dependency, already imported the same way in
  `src/content/articles/two-states-are-enough/PatternGallery/PatternGallery.tsx`.
- Produces: `PatternsInTheWild` (default + named export), a static `'use client'` component with
  no props — consumed by Task 5's `Content.tsx` as `<PatternsInTheWild />`.

- [ ] **Step 1: Write the component**

Create `src/content/articles/two-states-are-enough/PatternsInTheWild/PatternsInTheWild.tsx`:

```tsx
'use client'

import styles from './PatternsInTheWild.module.css'

import { Icon } from '@gravity-ui/uikit'
import { Sun } from '@gravity-ui/icons'
import { useTranslation } from 'react-i18next'

/** The three generic segment labels for the "segmented control" tile, in display order — reuses the existing Light/Dark/System copy instead of adding new keys for the same three words. */
const SEGMENT_LABEL_KEYS: string[] = [
  'articleContent.twoStatesAreEnough.demoLight',
  'articleContent.twoStatesAreEnough.demoDark',
  'articleContent.twoStatesAreEnough.demoSystem',
]

/** Which segment renders as pressed — purely decorative, matches the middle "Dark" option. */
const ACTIVE_SEGMENT_INDEX = 1

export const PatternsInTheWild = () => {
  const { t } = useTranslation()

  return (
    <div className={styles.card} data-testid="patterns-in-the-wild">
      <p className={styles.eyebrow}>
        {t('articleContent.twoStatesAreEnough.patternsInTheWildEyebrow')}
      </p>

      <div className={styles.tiles}>
        <div className={styles.tile}>
          <div className={styles.segmented}>
            {SEGMENT_LABEL_KEYS.map((labelKey, index) => (
              <span
                key={labelKey}
                className={styles.segment}
                data-active={index === ACTIVE_SEGMENT_INDEX}
              >
                {t(labelKey)}
              </span>
            ))}
          </div>
          <p className={styles.tileCaption}>
            {t('articleContent.twoStatesAreEnough.patternsInTheWildTile1Caption')}
          </p>
        </div>

        <div className={styles.tile}>
          <span className={styles.iconButton}>
            <Icon data={Sun} size={18} />
          </span>
          <p className={styles.tileCaption}>
            {t('articleContent.twoStatesAreEnough.patternsInTheWildTile2Caption')}
          </p>
        </div>

        <div className={styles.tile}>
          <div className={styles.settingsRow}>
            <span className={styles.settingsLabel}>
              {t('articleContent.twoStatesAreEnough.patternsInTheWildSettingsLabel')}
            </span>
            <span className={styles.settingsSwitch}>
              <span className={styles.settingsSwitchKnob} />
            </span>
          </div>
          <p className={styles.tileCaption}>
            {t('articleContent.twoStatesAreEnough.patternsInTheWildTile3Caption')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default PatternsInTheWild
```

- [ ] **Step 2: Write the styles**

Create `src/content/articles/two-states-are-enough/PatternsInTheWild/PatternsInTheWild.module.css`:

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem 1.5rem;
  margin: 2rem 0;
  background: #111;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 1rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 50%);
}

.tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.tile {
  display: flex;
  flex: 1 1 9rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: rgb(255 255 255 / 4%);
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 0.75rem;
}

.segmented {
  display: flex;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 999px;
}

.segment {
  padding: 0.35rem 0.6rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgb(255 255 255 / 55%);
  background: none;
}

.segment[data-active='true'] {
  color: #111;
  background: rgb(255 255 255 / 85%);
}

.iconButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  color: #fff;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 999px;
}

.settingsRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
}

.settingsLabel {
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
}

.settingsSwitch {
  position: relative;
  width: 1.75rem;
  height: 1rem;
  background: rgb(255 255 255 / 20%);
  border-radius: 999px;
}

.settingsSwitchKnob {
  position: absolute;
  top: 50%;
  left: 70%;
  width: 0.75rem;
  height: 0.75rem;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.tileCaption {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 55%);
}
```

- [ ] **Step 3: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/content/articles/two-states-are-enough/PatternsInTheWild
git commit -m "feat: add the PatternsInTheWild grounding section for the Two States Are Enough article"
```

---

### Task 4: `LightDarkSnippet` component

**Files:**

- Create: `src/content/articles/two-states-are-enough/LightDarkSnippet/LightDarkSnippet.tsx`
- Create: `src/content/articles/two-states-are-enough/LightDarkSnippet/LightDarkSnippet.module.css`

**Interfaces:**

- Consumes: the `articleContent.twoStatesAreEnough.lightDarkCaption` key from Task 1. (The
  `lightDarkIntro` key is rendered as a plain `<p>` directly in `Content.tsx` in Task 5, not inside
  this component.)
- Produces: `LightDarkSnippet` (default + named export), a static `'use client'` component with no
  props — consumed by Task 5's `Content.tsx` as `<LightDarkSnippet />`.

- [ ] **Step 1: Write the component**

Create `src/content/articles/two-states-are-enough/LightDarkSnippet/LightDarkSnippet.tsx`:

```tsx
'use client'

import styles from './LightDarkSnippet.module.css'

import { useTranslation } from 'react-i18next'

/** Verbatim CSS — code samples aren't localized elsewhere in this project either. */
const LIGHT_DARK_CSS = `:root {
  color-scheme: light dark;
}

body {
  background: light-dark(#fff, #111);
  color: light-dark(#111, #fff);
}`

export const LightDarkSnippet = () => {
  const { t } = useTranslation()

  return (
    <div className={styles.card} data-testid="light-dark-snippet">
      <pre className={styles.pre}>
        <code>{LIGHT_DARK_CSS}</code>
      </pre>
      <p className={styles.caption}>{t('articleContent.twoStatesAreEnough.lightDarkCaption')}</p>
    </div>
  )
}

export default LightDarkSnippet
```

- [ ] **Step 2: Write the styles**

Create `src/content/articles/two-states-are-enough/LightDarkSnippet/LightDarkSnippet.module.css`:

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  margin: 2rem 0;
  background: #111;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 1rem;
}

.pre {
  margin: 0;
  padding: 1rem 1.25rem;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  line-height: 1.6;
  color: rgb(255 255 255 / 85%);
  background: rgb(255 255 255 / 6%);
  border-radius: 0.75rem;
}

.caption {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 55%);
}
```

- [ ] **Step 3: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/content/articles/two-states-are-enough/LightDarkSnippet
git commit -m "feat: add the LightDarkSnippet component for the Two States Are Enough article"
```

---

### Task 5: Wire the three components into `Content.tsx`

**Files:**

- Modify: `src/content/articles/two-states-are-enough/Content.tsx`

**Interfaces:**

- Consumes: `SwitchAnalogy` (Task 2), `PatternsInTheWild` (Task 3), `LightDarkSnippet` (Task 4),
  locale keys from Task 1 (`intro2` already updated, `lightDarkIntro`).
- Produces: the article's final rendered document order — no exports change (`HEADINGS` and the
  default export stay as they are; the three existing heading `id`s are untouched).

- [ ] **Step 1: Update the imports**

In `src/content/articles/two-states-are-enough/Content.tsx`, replace:

```tsx
import { CombinationGrid } from './CombinationGrid/CombinationGrid'
import { PatternGallery } from './PatternGallery/PatternGallery'
```

with:

```tsx
import { CombinationGrid } from './CombinationGrid/CombinationGrid'
import { LightDarkSnippet } from './LightDarkSnippet/LightDarkSnippet'
import { PatternGallery } from './PatternGallery/PatternGallery'
import { PatternsInTheWild } from './PatternsInTheWild/PatternsInTheWild'
import { SwitchAnalogy } from './SwitchAnalogy/SwitchAnalogy'
```

- [ ] **Step 2: Insert the three components into the body**

Replace:

```tsx
      <p>{t('articleContent.twoStatesAreEnough.intro1')}</p>
      <p>{t('articleContent.twoStatesAreEnough.intro2')}</p>

      <CombinationGrid />

      <h2 id="the-tri-state-toggle-is-implementation-driven-ui">
        {t('articleContent.twoStatesAreEnough.implementationDrivenHeading')}
      </h2>

      <p>{t('articleContent.twoStatesAreEnough.implementationDriven')}</p>

      <PatternGallery />
```

with:

```tsx
      <p>{t('articleContent.twoStatesAreEnough.intro1')}</p>
      <p>{t('articleContent.twoStatesAreEnough.intro2')}</p>

      <SwitchAnalogy />

      <CombinationGrid />

      <PatternsInTheWild />

      <h2 id="the-tri-state-toggle-is-implementation-driven-ui">
        {t('articleContent.twoStatesAreEnough.implementationDrivenHeading')}
      </h2>

      <p>{t('articleContent.twoStatesAreEnough.implementationDriven')}</p>

      <p>{t('articleContent.twoStatesAreEnough.lightDarkIntro')}</p>

      <LightDarkSnippet />

      <PatternGallery />
```

The rest of the file (the `hardParts`/`whenThreeEarn` headings, bullets, and closing paragraph)
stays exactly as it is.

- [ ] **Step 3: Validate types and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 4: Manual verification in the browser**

Run: `pnpm dev`
Visit `http://localhost:3000/articles/two-states-are-enough` and confirm:

- Right after the two intro paragraphs, the `SwitchAnalogy` card renders: five labelled dial
  buttons (10/30/50/70/100%, the 50% one visually pressed) next to a single slider with its knob
  positioned near the right end, with a one-line takeaway underneath.
- `CombinationGrid` still renders and behaves exactly as before, immediately after `SwitchAnalogy`.
- `PatternsInTheWild` renders next: a segmented Light/Dark/System pill (Dark pressed), a round
  sun-icon button, and a mock settings row with a label and switch — each with its caption
  underneath.
- The "implementation-driven" paragraph is followed by the `lightDarkIntro` sentence and then the
  `LightDarkSnippet` card showing the 4-line CSS block and its caption.
- `PatternGallery` still renders and behaves exactly as before, after the snippet.
- The rest of the article (hard-parts bullets, when-three-states, closing) is unchanged.
- Switching the site language (EN ↔ RU via the header switcher) updates all new copy, including
  the CSS snippet's caption (the code itself stays in English/CSS in both languages).
- The reading-progress rail still lists the same three headings and scrolls to each on click.

Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/content/articles/two-states-are-enough/Content.tsx
git commit -m "feat: wire the hook, grounding, and light-dark() sections into the article body"
```

---

### Task 6: Final validation

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 2: Full unit test suite**

Run: `pnpm test`
Expected: PASS, including `src/configs/i18n/locales.test.ts` covering all new copy.

- [ ] **Step 3: Confirm README still matches reality**

`README.md` describes the article architecture generically (no per-article enumeration, no
component count). Skim the "Project structure" and "Architecture" sections to confirm nothing
there references a specific component list for this article; no edit is expected.

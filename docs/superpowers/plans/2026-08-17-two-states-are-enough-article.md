# Two States Are Enough Article Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a new self-hosted article at `/articles/two-states-are-enough` - an opinion piece responding to Lea Verou's post on dark mode toggles, with a live interactive two-state theme toggle demo instead of screenshots.

**Architecture:** Follows the exact pattern of the existing `ai-boilerplate-senior-engineers` article: metadata in `articles.constants.ts`, a body component + heading list registered in `registry.ts`, a self-contained visual sub-component (`ThemeToggleDemo`, mirroring `AdoptionStatsChart`), and copy in `public/locales/{en,ru}.json`. `page.tsx`, the OG image route, JSON-LD, and `articles.constants.test.ts` are already generic over `ARTICLES` and need no changes.

**Tech Stack:** Next.js App Router, React 19, TypeScript (strict), react-i18next, CSS Modules, Vitest.

## Global Constraints

- Strict TypeScript: no `any`, no type assertions (`as`); use type guards/discriminated unions instead. Boolean identifiers prefixed `is`/`has`.
- JSDoc on interface/type fields, component props, and non-`useState` variables - one line, states the non-obvious reason only.
- Comments elsewhere: 1-2 lines max, state the _why_, not the _what_.
- True module-level constants in `UPPER_SNAKE_CASE`.
- Each component in its own directory with a separate `.module.css` file.
- Stable `data-testid` (no random selectors).
- Destructure function params/callback args/object fields over repeated dotted access.
- No hyperlinks/anchor styling added to `ArticleContent` - cite sources as plain prose text, matching the existing `chartSource`/`chartHeroSource` convention.
- No screenshots or photos anywhere in this article - the visual is a self-contained, real (non-simulated) interactive component.
- Run `pnpm check-types && pnpm lint` before considering the change complete.

---

### Task 1: Article metadata

**Files:**

- Modify: `src/constants/articles.constants.ts`
- Test: `src/constants/articles.constants.test.ts` (already generic - no edits, just re-run)

**Interfaces:**

- Consumes: `IArticleMeta`, `ELanguage` (both already defined in this file / `@/constants/header.constants`).
- Produces: `twoStatesAreEnoughArticle: IArticleMeta` - consumed by Task 4 (registry wiring) via its `.slug`.

- [ ] **Step 1: Add the new article constant**

Insert this new export directly after `aiBoilerplateSeniorEngineersArticle` (i.e. right before the existing `export const ARTICLES` line) in `src/constants/articles.constants.ts`:

```ts
/** Exported individually so consumers needing exactly this article skip a runtime `.find()`. */
export const twoStatesAreEnoughArticle: IArticleMeta = {
  slug: 'two-states-are-enough',
  title: {
    [ELanguage.en]: 'Two States Are Enough',
    [ELanguage.ru]: 'Двух состояний достаточно',
  },
  description: {
    [ELanguage.en]:
      "A response to Lea Verou's case against tri-state dark mode toggles - and why two states plus a smart localStorage default aren't just simpler UX, they're the version that's actually easier to implement correctly.",
    [ELanguage.ru]:
      'Отклик на статью Леи Веру против трёхпозиционных переключателей темы - и почему связка «два состояния + localStorage по умолчанию» не только удобнее пользователю, но и проще реализовать без ошибок.',
  },
  publishedDate: '2026-08-17',
  readingTimeMinutes: 4,
}
```

**Step 2: Update the `ARTICLES` array**

Change:

```ts
export const ARTICLES: IArticleMeta[] = [aiBoilerplateSeniorEngineersArticle]
```

to (newest first - this article publishes after the existing one):

```ts
export const ARTICLES: IArticleMeta[] = [
  twoStatesAreEnoughArticle,
  aiBoilerplateSeniorEngineersArticle,
]
```

- [ ] **Step 3: Run the existing constants test**

Run: `pnpm test -- articles.constants`
Expected: PASS - all 4 existing `it` blocks (unique slugs, kebab-case, translated title/description, positive reading time + parsable date) now also cover the new entry.

- [ ] **Step 4: Commit**

```bash
git add src/constants/articles.constants.ts
git commit -m "feat: add Two States Are Enough article metadata"
```

---

### Task 2: Locale copy (EN + RU)

**Files:**

- Modify: `public/locales/en.json`
- Modify: `public/locales/ru.json`
- Test: `src/configs/i18n/locales.test.ts` (already generic - no edits, just re-run)

**Interfaces:**

- Produces: every key under `articleContent.twoStatesAreEnough.*`, consumed by Task 3 (`ThemeToggleDemo`) and Task 4 (`Content.tsx`) via `t('articleContent.twoStatesAreEnough.<key>')`.

- [ ] **Step 1: Add the English keys**

In `public/locales/en.json`, inside the existing `"articleContent"` object, add a new sibling key after `"aiBoilerplateSeniorEngineers": { ... }` (don't forget the comma after the closing `}` of the existing entry):

```json
    "twoStatesAreEnough": {
      "intro1": "Open the settings of almost any modern app and you'll find the same three buttons: Light, Dark, System. It looks like completeness. It's actually a tell - proof that the interface is showing you the data model instead of the decision you actually came to make.",
      "intro2": "Lea Verou made this case in detail in her January 2026 piece on dark mode toggles, and I've been implementing exactly this pattern long enough to agree with her for a second reason she doesn't dwell on: two states aren't just the better UX, they're the version that's harder to get wrong in code.",
      "intro3": "Below is a toggle built the way she describes - one button, a localStorage override, and a fallback to whatever your OS already decided. Play with it before we get into why the three-button version keeps shipping anyway.",
      "demoEyebrow": "Try it",
      "demoPreviewHeading": "Your Site",
      "demoPreviewBody": "This card renders in a real light or dark theme - flip the toggle below.",
      "demoToggleToDark": "Switch to dark",
      "demoToggleToLight": "Switch to light",
      "demoOsPreferenceLabel": "OS preference",
      "demoOverrideLabel": "Your override",
      "demoResolvedLabel": "Resolved theme",
      "demoLight": "Light",
      "demoDark": "Dark",
      "demoOverrideNone": "None - following system",
      "demoCaption": "This state is real - a live matchMedia listener and an actual localStorage entry, not a simulation. Reload the page and your choice persists exactly like Lea Verou describes.",
      "implementationDrivenHeading": "The Tri-State Toggle Is Implementation-Driven UI",
      "implementationDriven1": "A theme has to resolve to exactly one of two values on screen - light or dark. There's no third rendering, no “system” pixels. The three-state control exists because the value can come from three different sources - an explicit choice, or a fallback to the OS - not because there are three ways the page can look. That's a distinction most toggles never bother to make, and it's the whole argument.",
      "implementationDriven2": "Users don't reach for a toggle to plan ahead. They reach for it because the current screen is too bright at 11pm or too dark to read outside. That's a fix, not a preference to configure. A control offering a third option for a problem nobody has yet is optimizing for the model, not the moment.",
      "hardPartsHeading": "Where Two-State Actually Gets Hard",
      "hardParts1": "None of this is free to build correctly, and the two-state version has failure modes of its own - they're just failures of implementation, not design. The first is the flash: if the resolved theme is computed in a React effect instead of before the first paint, every hard refresh shows the wrong theme for one frame. The fix is a tiny inline script in the document head, running before hydration, that reads localStorage and matchMedia and sets the theme attribute synchronously - the one place in this pattern where you can't wait for React.",
      "hardParts2": "The second is more subtle: don't touch localStorage except in response to a click. It's tempting to “clean up” the stored value whenever the OS preference changes - if the user's override now matches the system, why keep it around? Because it's not a coincidence to the user; it's the choice they made. Clear it on its own and the next OS-level theme change silently drags their screen with it, and they never asked for that.",
      "hardParts3": "The third is the one nobody notices until QA finds it: without a storage event listener, flipping the toggle in one tab leaves every other open tab showing the old theme until it's reloaded. It's a two-line fix, and it's the line most tri-state implementations skip, because by the time you're juggling three states across tabs the code stops being obviously correct at a glance.",
      "whenThreeEarnHeading": "When Three States Still Earn Their Keep",
      "whenThreeEarn1": "None of this makes tri-state controls wrong everywhere. A settings panel is a place users already arrive to configure things, not to fix an immediate discomfort - the future-facing framing a “System” option needs actually matches what they're there to do, and there's room to label it properly instead of squeezing a third icon into a header.",
      "whenThreeEarn2": "The line I use: if the control lives next to the content, it gets two states. If it lives in a settings page the user opened specifically to make a decision, three is fine.",
      "closing": "The broader habit worth keeping isn't about dark mode specifically. It's checking, before you ship a third option, whether it answers a problem your users actually have - or just one your data model does."
    }
```

- [ ] **Step 2: Add the matching Russian keys**

In `public/locales/ru.json`, inside its `"articleContent"` object, add the sibling key with the same key names (order doesn't need to match, but every key from Step 1 must be present):

```json
    "twoStatesAreEnough": {
      "intro1": "Загляни в настройки почти любого современного приложения - и увидишь одни и те же три кнопки: Light, Dark, System. Выглядит как полнота реализации. На деле это симптом: интерфейс показывает тебе модель данных вместо решения, ради которого ты сюда пришёл.",
      "intro2": "Именно это в январе 2026 года подробно разобрала Лея Веру в статье про переключатели тёмной темы, и я реализовывал этот паттерн достаточно долго, чтобы согласиться с ней ещё по одной причине, которую она не педалирует: два состояния - это не только более удобный UX, это версия, которую сложнее сломать в коде.",
      "intro3": "Ниже - переключатель, собранный ровно так, как она описывает: одна кнопка, override в localStorage и fallback на то, что уже решила твоя ОС. Поиграйся с ним, прежде чем читать, почему трёхкнопочная версия всё равно продолжает появляться в продакшене.",
      "demoEyebrow": "Попробуй сам",
      "demoPreviewHeading": "Твой сайт",
      "demoPreviewBody": "Эта карточка рендерится в реальной светлой или тёмной теме - переключи тоггл ниже.",
      "demoToggleToDark": "Переключить на тёмную",
      "demoToggleToLight": "Переключить на светлую",
      "demoOsPreferenceLabel": "Системная тема",
      "demoOverrideLabel": "Твой override",
      "demoResolvedLabel": "Итоговая тема",
      "demoLight": "Светлая",
      "demoDark": "Тёмная",
      "demoOverrideNone": "Не задан - следует за системой",
      "demoCaption": "Это состояние настоящее - реальный matchMedia-слушатель и реальная запись в localStorage, а не симуляция. Перезагрузи страницу - выбор сохранится ровно так, как описывает Лея Веру.",
      "implementationDrivenHeading": "Трёхпозиционный переключатель - это UI, продиктованный реализацией",
      "implementationDriven1": "Тема на экране всегда разрешается ровно в одно из двух значений - light или dark. Третьего рендера не существует, «системных» пикселей не бывает. Трёхпозиционный контрол существует потому, что значение может прийти из трёх разных источников - явный выбор или fallback на ОС, - а не потому, что страница может выглядеть тремя разными способами. Это различие, которое большинство переключателей даже не пытается провести, и в этом весь аргумент.",
      "implementationDriven2": "Пользователь не открывает переключатель, чтобы спланировать будущее. Он открывает его, потому что экран слишком яркий в 11 вечера или слишком тёмный, чтобы читать на улице днём. Это починка, а не настройка на будущее. Контрол с третьей опцией под проблему, которой ещё ни у кого нет, оптимизирован под модель данных, а не под момент.",
      "hardPartsHeading": "Где два состояния реально усложняют реализацию",
      "hardParts1": "Ничего из этого не даётся бесплатно, и у двухпозиционной версии есть свои способы сломаться - просто это ошибки реализации, а не дизайна. Первая - вспышка неправильной темы: если resolved-тема считается в React-эффекте, а не до первой отрисовки, при каждой жёсткой перезагрузке на один кадр показывается не та тема. Чинится это маленьким inline-скриптом в `<head>`, который выполняется до гидратации, читает localStorage и matchMedia и синхронно выставляет атрибут темы - единственное место в этом паттерне, где нельзя ждать React.",
      "hardParts2": "Вторая проблема тоньше: не трогай localStorage нигде, кроме реакции на клик. Возникает соблазн «подчистить» сохранённое значение, когда меняется системная тема - раз override пользователя теперь совпадает с системным, зачем его хранить? Затем, что для пользователя это не совпадение, а его собственный выбор. Сними override автоматически - и следующая смена темы на уровне ОС незаметно утащит за собой его экран, хотя он об этом не просил.",
      "hardParts3": "Третья - та, которую никто не замечает, пока не найдёт QA: без слушателя события storage переключение темы в одной вкладке оставляет все остальные открытые вкладки со старой темой до перезагрузки. Чинится в две строчки, и именно эти две строчки чаще всего пропускают в трёхпозиционных реализациях - потому что когда жонглируешь тремя состояниями сразу в нескольких вкладках, код перестаёт быть очевидно правильным с первого взгляда.",
      "whenThreeEarnHeading": "Когда три состояния всё же оправданы",
      "whenThreeEarn1": "Всё это не значит, что трёхпозиционный контрол неуместен всегда. Панель настроек - это место, куда пользователь и так приходит что-то настроить, а не починить сиюминутный дискомфорт: ориентация на будущее, которой требует опция «System», как раз совпадает с тем, зачем он сюда пришёл, и там есть место подписать её нормально, а не втискивать третью иконку в хедер.",
      "whenThreeEarn2": "Граница, которой я пользуюсь: если контрол живёт рядом с контентом - ему хватит двух состояний. Если он живёт на странице настроек, которую пользователь открыл специально, чтобы принять решение, - трёх вполне достаточно.",
      "closing": "Более широкая привычка, которую стоит унести из этой истории, - не про тёмную тему конкретно. Это привычка проверять перед тем, как выкатить третью опцию: отвечает ли она на проблему, которая реально есть у твоих пользователей, - или только на ту, что есть у твоей модели данных."
    }
```

- [ ] **Step 3: Validate JSON and run the locale parity test**

Run: `pnpm test -- locales`
Expected: PASS - every key added to `en.json` has a Russian counterpart and vice versa, no blank values, no non-string leaves, no duplicate paths.

- [ ] **Step 4: Commit**

```bash
git add public/locales/en.json public/locales/ru.json
git commit -m "feat: add Two States Are Enough article copy (en/ru)"
```

---

### Task 3: `ThemeToggleDemo` component

**Files:**

- Create: `src/content/articles/two-states-are-enough/ThemeToggleDemo/ThemeToggleDemo.tsx`
- Create: `src/content/articles/two-states-are-enough/ThemeToggleDemo/ThemeToggleDemo.module.css`
- Modify: `eslint.config.mjs`

**Interfaces:**

- Consumes: locale keys from Task 2 (`articleContent.twoStatesAreEnough.demo*`).
- Produces: `ThemeToggleDemo` (default + named export), a self-contained `'use client'` component with no props - consumed by Task 4's `Content.tsx` as `<ThemeToggleDemo />`.

- [ ] **Step 1: Write the component**

Create `src/content/articles/two-states-are-enough/ThemeToggleDemo/ThemeToggleDemo.tsx`:

```tsx
'use client'

import styles from './ThemeToggleDemo.module.css'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** This demo's own localStorage key - scoped to the demo only, unrelated to the site's own (dark-only) theme. */
const STORAGE_KEY = 'demo-theme-override'

/** The user's explicit choice, or `null` when following the OS preference. */
type TThemeOverride = 'light' | 'dark' | null

/** What's actually rendered - always exactly one of these two. */
type TResolvedTheme = 'light' | 'dark'

const isThemeOverride = (value: string | null): value is Exclude<TThemeOverride, null> =>
  value === 'light' || value === 'dark'

export const ThemeToggleDemo = () => {
  const { t } = useTranslation()
  const [osPrefersDark, setOsPrefersDark] = useState<boolean | null>(null)
  const [override, setOverride] = useState<TThemeOverride>(null)

  // matchMedia and localStorage don't exist during SSR; reading them only after mount
  // keeps the first client render identical to the server-rendered placeholder.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setOsPrefersDark(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => setOsPrefersDark(event.matches)
    mediaQuery.addEventListener('change', handleChange)

    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isThemeOverride(stored)) {
      setOverride(stored)
    }

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  /** Stays neutral for one frame instead of guessing, until the client-only read above resolves. */
  const isMounted = osPrefersDark !== null
  const resolvedTheme: TResolvedTheme = override ?? (osPrefersDark ? 'dark' : 'light')

  const handleToggle = () => {
    if (override === null) {
      // First press: override to the opposite of what's currently shown.
      const next: TResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
      setOverride(next)
      window.localStorage.setItem(STORAGE_KEY, next)
    } else {
      // Second press: drop the override and fall back to the system preference.
      setOverride(null)
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  const lightLabel = t('articleContent.twoStatesAreEnough.demoLight')
  const darkLabel = t('articleContent.twoStatesAreEnough.demoDark')
  const osLabel = osPrefersDark ? darkLabel : lightLabel
  const resolvedLabel = resolvedTheme === 'dark' ? darkLabel : lightLabel
  const overrideLabel =
    override === null
      ? t('articleContent.twoStatesAreEnough.demoOverrideNone')
      : override === 'dark'
        ? darkLabel
        : lightLabel

  return (
    <div className={styles.card} data-testid="theme-toggle-demo">
      <p className={styles.eyebrow}>{t('articleContent.twoStatesAreEnough.demoEyebrow')}</p>

      <div className={styles.preview} data-theme={isMounted ? resolvedTheme : undefined}>
        <p className={styles.previewHeading}>
          {t('articleContent.twoStatesAreEnough.demoPreviewHeading')}
        </p>
        <p className={styles.previewBody}>
          {t('articleContent.twoStatesAreEnough.demoPreviewBody')}
        </p>
      </div>

      <button type="button" className={styles.toggle} onClick={handleToggle} disabled={!isMounted}>
        {resolvedTheme === 'dark'
          ? t('articleContent.twoStatesAreEnough.demoToggleToLight')
          : t('articleContent.twoStatesAreEnough.demoToggleToDark')}
      </button>

      <dl className={styles.state}>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoOsPreferenceLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? osLabel : '-'}</dd>
        </div>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoOverrideLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? overrideLabel : '-'}</dd>
        </div>
        <div className={styles.stateRow}>
          <dt className={styles.stateLabel}>
            {t('articleContent.twoStatesAreEnough.demoResolvedLabel')}
          </dt>
          <dd className={styles.stateValue}>{isMounted ? resolvedLabel : '-'}</dd>
        </div>
      </dl>

      <p className={styles.caption}>{t('articleContent.twoStatesAreEnough.demoCaption')}</p>
    </div>
  )
}

export default ThemeToggleDemo
```

- [ ] **Step 2: Write the styles**

Create `src/content/articles/two-states-are-enough/ThemeToggleDemo/ThemeToggleDemo.module.css`:

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

.preview {
  padding: 1.25rem 1.5rem;
  background: rgb(255 255 255 / 6%);
  border-radius: 0.75rem;
  transition:
    background-color 0.2s ease-out,
    color 0.2s ease-out;
}

.preview[data-theme='light'] {
  background: #f5f5f4;
}

.preview[data-theme='dark'] {
  background: #1a1a19;
}

.previewHeading {
  margin: 0 0 0.4rem;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}

.preview[data-theme='light'] .previewHeading {
  color: #1a1a19;
}

.previewBody {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgb(255 255 255 / 75%);
}

.preview[data-theme='light'] .previewBody {
  color: rgb(26 26 25 / 75%);
}

.toggle {
  align-self: flex-start;
  padding: 0.6rem 1.1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 999px;
  transition: background-color 0.15s ease-out;
}

.toggle:hover:not(:disabled) {
  background: rgb(255 255 255 / 16%);
}

.toggle:focus-visible {
  outline: 2px solid var(--g-color-line-brand);
  outline-offset: 2px;
}

.toggle:disabled {
  cursor: default;
  opacity: 0.5;
}

.state {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
}

.stateRow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.stateLabel {
  margin: 0;
  font-size: 0.8rem;
  color: rgb(255 255 255 / 55%);
}

.stateValue {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
}

.caption {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 45%);
}
```

- [ ] **Step 3: Allow the mount-effect setState in this one file**

`ThemeToggleDemo` must read `matchMedia`/`localStorage` (client-only APIs unavailable during SSR) after mount and `setState` with what it finds, so the initial client render matches the server-rendered placeholder before updating - the same justification already used for `src/providers/I18.provider.tsx` in this file. Add a new override block to `eslint.config.mjs`, directly after the existing `I18.provider.tsx` override block (the one with the `react-hooks/set-state-in-effect` comment):

```js
  {
    // ThemeToggleDemo reads matchMedia/localStorage - client-only APIs - in a mount
    // effect and must setState with what it finds; the initial render has to match
    // the server's placeholder, so this can't be computed during render instead.
    files: ['src/content/articles/two-states-are-enough/ThemeToggleDemo/ThemeToggleDemo.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
```

- [ ] **Step 4: Validate**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS with no errors. If `lint:styles` or `lint:prettier` flags formatting, run `pnpm format` and re-run `pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add src/content/articles/two-states-are-enough/ThemeToggleDemo eslint.config.mjs
git commit -m "feat: add the ThemeToggleDemo component for the Two States Are Enough article"
```

---

### Task 4: Article body + registry wiring

**Files:**

- Create: `src/content/articles/two-states-are-enough/Content.tsx`
- Modify: `src/content/articles/registry.ts`

**Interfaces:**

- Consumes: `twoStatesAreEnoughArticle` (Task 1, for its `.slug`), `ThemeToggleDemo` (Task 3), `IArticleHeadingEntry` (already exported from `registry.ts`), locale keys from Task 2.
- Produces: `TwoStatesAreEnoughContent` (default export) + `HEADINGS` export - consumed by this task's own `registry.ts` edit.

- [ ] **Step 1: Write the article body**

Create `src/content/articles/two-states-are-enough/Content.tsx`:

```tsx
'use client'

import { useTranslation } from 'react-i18next'

import type { IArticleHeadingEntry } from '@/content/articles/registry'

import { ThemeToggleDemo } from './ThemeToggleDemo/ThemeToggleDemo'

/** This article's section headings, in document order, for the reading-progress rail. */
export const HEADINGS: IArticleHeadingEntry[] = [
  {
    id: 'the-tri-state-toggle-is-implementation-driven-ui',
    labelKey: 'articleContent.twoStatesAreEnough.implementationDrivenHeading',
  },
  {
    id: 'where-two-state-actually-gets-hard',
    labelKey: 'articleContent.twoStatesAreEnough.hardPartsHeading',
  },
  {
    id: 'when-three-states-still-earn-their-keep',
    labelKey: 'articleContent.twoStatesAreEnough.whenThreeEarnHeading',
  },
]

export const TwoStatesAreEnoughContent = () => {
  const { t } = useTranslation()

  return (
    <>
      <p>{t('articleContent.twoStatesAreEnough.intro1')}</p>
      <p>{t('articleContent.twoStatesAreEnough.intro2')}</p>
      <p>{t('articleContent.twoStatesAreEnough.intro3')}</p>

      <ThemeToggleDemo />

      <h2 id="the-tri-state-toggle-is-implementation-driven-ui">
        {t('articleContent.twoStatesAreEnough.implementationDrivenHeading')}
      </h2>

      <p>{t('articleContent.twoStatesAreEnough.implementationDriven1')}</p>
      <p>{t('articleContent.twoStatesAreEnough.implementationDriven2')}</p>

      <h2 id="where-two-state-actually-gets-hard">
        {t('articleContent.twoStatesAreEnough.hardPartsHeading')}
      </h2>

      <p>{t('articleContent.twoStatesAreEnough.hardParts1')}</p>
      <p>{t('articleContent.twoStatesAreEnough.hardParts2')}</p>
      <p>{t('articleContent.twoStatesAreEnough.hardParts3')}</p>

      <h2 id="when-three-states-still-earn-their-keep">
        {t('articleContent.twoStatesAreEnough.whenThreeEarnHeading')}
      </h2>

      <p>{t('articleContent.twoStatesAreEnough.whenThreeEarn1')}</p>
      <p>{t('articleContent.twoStatesAreEnough.whenThreeEarn2')}</p>

      <p>{t('articleContent.twoStatesAreEnough.closing')}</p>
    </>
  )
}

export default TwoStatesAreEnoughContent
```

- [ ] **Step 2: Wire the registry**

In `src/content/articles/registry.ts`, add the import (alongside the existing `AiBoilerplateSeniorEngineersContent` import):

```ts
import { twoStatesAreEnoughArticle } from '@/constants/articles.constants'

import TwoStatesAreEnoughContent, {
  HEADINGS as twoStatesAreEnoughHeadings,
} from './two-states-are-enough/Content'
```

Note `aiBoilerplateSeniorEngineersArticle` is already imported from `@/constants/articles.constants` in this file - add `twoStatesAreEnoughArticle` to that same existing import statement rather than a second one:

```ts
import {
  aiBoilerplateSeniorEngineersArticle,
  twoStatesAreEnoughArticle,
} from '@/constants/articles.constants'
```

Then update both registry maps:

```ts
export const articleContentRegistry: Record<string, ComponentType> = {
  [aiBoilerplateSeniorEngineersArticle.slug]: AiBoilerplateSeniorEngineersContent,
  [twoStatesAreEnoughArticle.slug]: TwoStatesAreEnoughContent,
}

export const articleHeadingsRegistry: Record<string, IArticleHeadingEntry[]> = {
  [aiBoilerplateSeniorEngineersArticle.slug]: aiBoilerplateSeniorEngineersHeadings,
  [twoStatesAreEnoughArticle.slug]: twoStatesAreEnoughHeadings,
}
```

- [ ] **Step 3: Validate types and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 4: Manual verification in the browser**

Run: `pnpm dev`
Visit `http://localhost:3000/articles/two-states-are-enough` and confirm:

- The title, all three headings, and the closing paragraph render.
- `ThemeToggleDemo` renders with the mini preview, one toggle button, and the three-row state readout.
- Clicking the toggle flips the preview's background and the "Resolved theme" row; a second click returns "Your override" to "None - following system".
- Reloading the page preserves the override (real `localStorage`, not simulated).
- Switching the site language (EN ↔ RU via the header switcher) updates the article body and demo copy.
- The reading-progress rail on the right lists all three headings and scrolls to each on click.

Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/content/articles/two-states-are-enough/Content.tsx src/content/articles/registry.ts
git commit -m "feat: publish the Two States Are Enough article"
```

---

### Task 5: Final validation

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: both PASS.

- [ ] **Step 2: Full unit test suite**

Run: `pnpm test`
Expected: PASS, including `articles.constants.test.ts` and `src/configs/i18n/locales.test.ts` covering the new article and its copy.

- [ ] **Step 3: Confirm README still matches reality**

`README.md` describes the article architecture generically (no per-article enumeration or count) - already verified accurate during planning; no edit needed. Skim the "Project structure" and "Architecture" sections once more to confirm nothing there references a specific article count or list.

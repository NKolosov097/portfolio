# Aside Avatar Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the aside panel avatar's redundant "back to home" link with a click-to-expand lightbox showing the full-resolution photo.

**Architecture:** Extract the avatar thumbnail + a `@gravity-ui/uikit` `Modal` lightbox into a new `AsideAvatar` component, rendered by `AsideContent` (shared by both the desktop sidebar and the mobile drawer). Because `AsideAvatar` mounts once inside the desktop `Aside`/`Card` and, independently, once inside the mobile `MobileAside`/`Drawer`, the lightbox's open/closed state stays local (`useState`) to each mounted instance - it is never shared globally. A small React Context lets the mobile instance tell its enclosing `Drawer` to stop reacting to `Escape` while the lightbox is open, so `Escape` closes only the top-most layer (verified from `@gravity-ui/uikit`'s `Modal`/`Drawer` source: both call `useDismiss` independently and, without a shared `FloatingTree`, both listeners fire on the same keydown - a real bug, not a hypothetical one).

**Tech Stack:** Next.js 16 / React 19, `@gravity-ui/uikit` 7.38.0 (`Modal`, `Button`), `@gravity-ui/icons` 2.18.0 (`CircleXmark`), `react-i18next`, Playwright.

## Global Constraints

- Strict TypeScript: no `any`, no type assertions, prefer generics/type guards/discriminated unions. Boolean identifiers prefixed `is`/`has`.
- JSDoc on interface/type fields, component props, and non-`useState` variables (1-2 lines, state the non-obvious reason only).
- Module-level true constants in `UPPER_SNAKE_CASE`.
- Each component in its own directory with a separate `.module.css` file.
- Stable `data-testid` values for QA - no random selectors.
- Reuse existing patterns/helpers before adding new abstractions.
- Destructure function params/callback args/object fields over repeated dotted access.
- Hyphen (`-`), not em dash, for parenthetical asides.
- Never disable a linter rule inline.
- Commit subjects follow Conventional Commits (`type: subject`). No `Co-Authored-By` trailer - commits are authored by the repo owner only.
- Before considering any task done: `pnpm check-types && pnpm lint` must pass.

---

## Task 1: `AsideAvatar` component with a working desktop lightbox

**Files:**

- Create: `src/layout/Aside/context/AsideLightbox.context.ts`
- Modify: `src/layout/Aside/types/aside.type.ts`
- Create: `src/layout/Aside/components/AsideAvatar/AsideAvatar.module.css`
- Create: `src/layout/Aside/components/AsideAvatar/AsideAvatar.tsx`
- Modify: `src/layout/Aside/components/AsideContent/AsideContent.tsx`
- Modify: `src/layout/Aside/aside.module.css`
- Modify: `public/locales/ru.json`
- Modify: `public/locales/en.json`
- Test: `e2e/aside-avatar-lightbox.spec.ts`

**Interfaces:**

- Produces `IAsideLightboxContext` (`src/layout/Aside/types/aside.type.ts`): `{ onLightboxOpenChange: (_isOpen: boolean) => void }`.
- Produces `AsideLightboxContext` (`src/layout/Aside/context/AsideLightbox.context.ts`): `React.Context<IAsideLightboxContext>`, default value `{ onLightboxOpenChange: () => {} }` (a no-op, used whenever no ancestor `Drawer` needs to know).
- Produces `AsideAvatar` component (`src/layout/Aside/components/AsideAvatar/AsideAvatar.tsx`), no props, no exported non-default members besides the named export `AsideAvatar`.
- Produces test ids: `aside-avatar-trigger`, `aside-avatar-lightbox`, `aside-avatar-lightbox-close`.
- Produces translation keys `aside.viewPhoto` / `aside.closePhoto` in both locales.
- Consumed by Task 2: `AsideLightboxContext` (to provide a real value from `MobileAside`).

- [ ] **Step 1: Write the failing e2e spec (desktop only)**

Create `e2e/aside-avatar-lightbox.spec.ts`:

```typescript
import { expect, test } from '@playwright/test'

import { revealAside } from './helpers/aside'

test.describe('aside avatar lightbox', () => {
  test('opens on click and closes via the close button', async ({ page }) => {
    await page.goto('/')

    const aside = await revealAside(page)

    await aside.getByTestId('aside-avatar-trigger').click()

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await page.getByTestId('aside-avatar-lightbox-close').click()

    await expect(lightbox).toBeHidden()
  })

  test('closes on Escape', async ({ page }) => {
    await page.goto('/')

    const aside = await revealAside(page)

    await aside.getByTestId('aside-avatar-trigger').click()

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(lightbox).toBeHidden()
  })

  test('closes on outside click', async ({ page }) => {
    await page.goto('/')

    const aside = await revealAside(page)

    await aside.getByTestId('aside-avatar-trigger').click()

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await page.mouse.click(5, 5)

    await expect(lightbox).toBeHidden()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test:e2e -- e2e/aside-avatar-lightbox.spec.ts --project=chromium`
Expected: FAIL - `aside-avatar-trigger` is never found (the button doesn't exist yet).

- [ ] **Step 3: Add the translation keys**

In `public/locales/ru.json`, inside the `"aside"` object, add two keys right after `"backToHome": "На главную"`:

```json
    "backToHome": "На главную",
    "viewPhoto": "Открыть фото крупнее",
    "closePhoto": "Закрыть фото"
```

In `public/locales/en.json`, inside the `"aside"` object, add two keys right after `"backToHome": "Back to home"`:

```json
    "backToHome": "Back to home",
    "viewPhoto": "View larger photo",
    "closePhoto": "Close photo"
```

- [ ] **Step 4: Add `IAsideLightboxContext` to the Aside types file**

Read `src/layout/Aside/types/aside.type.ts` first, then add the new interface below the existing `IAsideSocialLink`:

```typescript
/** Lets a lightbox nested inside an overlay (e.g. the mobile aside drawer) ask that overlay to stop reacting to Escape while it is open, so Escape dismisses only the top-most layer. */
export interface IAsideLightboxContext {
  onLightboxOpenChange: (_isOpen: boolean) => void
}
```

- [ ] **Step 5: Create the lightbox context**

Create `src/layout/Aside/context/AsideLightbox.context.ts`:

```typescript
import { createContext, useContext } from 'react'

import { IAsideLightboxContext } from '@/layout/Aside/types/aside.type'

/** No enclosing overlay to notify by default (e.g. the desktop sidebar, which isn't dismissible). */
const DEFAULT_ASIDE_LIGHTBOX_CONTEXT: IAsideLightboxContext = {
  onLightboxOpenChange: () => {},
}

export const AsideLightboxContext = createContext<IAsideLightboxContext>(
  DEFAULT_ASIDE_LIGHTBOX_CONTEXT,
)

export const useAsideLightboxContext = (): IAsideLightboxContext => useContext(AsideLightboxContext)
```

- [ ] **Step 6: Create `AsideAvatar.module.css`**

Create `src/layout/Aside/components/AsideAvatar/AsideAvatar.module.css`. `.avatar` is copied as-is from `aside.module.css` (unchanged look); `.avatarTrigger` replaces `.avatarLink` (button reset instead of anchor reset); `.lightboxClose` copies the sizing/centering rules `aside.module.css` already uses for `.closeIcon` (kept local per the one-component-one-stylesheet convention rather than importing a sibling component's CSS module):

```css
.avatarTrigger {
  display: flex;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.avatarTrigger:focus-visible {
  outline: 2px solid var(--g-color-line-brand);
  outline-offset: 3px;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 1.2rem;
  box-shadow: 0 0 15px 5px rgb(255 255 255 / 15%);
}

.lightboxContent {
  position: relative;
  display: flex;
  max-width: min(90vw, 1024px);
  max-height: 90vh;
}

.lightboxImage {
  width: 100%;
  height: auto;
  border-radius: 1.2rem;
}

.lightboxClose {
  position: absolute !important;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px !important;
}

.lightboxClose > span {
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightboxClose svg {
  width: 20px;
  height: 20px;
}
```

- [ ] **Step 7: Create `AsideAvatar.tsx`**

Create `src/layout/Aside/components/AsideAvatar/AsideAvatar.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'

import styles from './AsideAvatar.module.css'

import { Button, Modal } from '@gravity-ui/uikit'
import { CircleXmark } from '@gravity-ui/icons'

import { useAsideLightboxContext } from '@/layout/Aside/context/AsideLightbox.context'

/** Absolute path to the 1024x1024 source photo; the aside thumbnail and the lightbox both scale the same file. */
const AVATAR_SRC = '/assets/img/avatar/avatar.webp'

export const AsideAvatar = () => {
  const { t } = useTranslation()
  const { onLightboxOpenChange } = useAsideLightboxContext()

  const [isPhotoOpen, setIsPhotoOpen] = useState(false)

  const handleOpenChange = (isOpen: boolean) => {
    setIsPhotoOpen(isOpen)
    onLightboxOpenChange(isOpen)
  }

  return (
    <>
      <button
        type="button"
        className={styles.avatarTrigger}
        aria-label={t('aside.viewPhoto')}
        onClick={() => handleOpenChange(true)}
        data-testid="aside-avatar-trigger"
      >
        <Image
          width={250}
          height={250}
          priority
          src={AVATAR_SRC}
          alt="Avatar"
          placeholder="blur"
          blurDataURL={AVATAR_SRC}
          className={styles.avatar}
        />
      </button>

      <Modal open={isPhotoOpen} onOpenChange={handleOpenChange} data-testid="aside-avatar-lightbox">
        <div className={styles.lightboxContent}>
          <Button
            view="flat"
            pin="circle-circle"
            size="m"
            aria-label={t('aside.closePhoto')}
            className={styles.lightboxClose}
            onClick={() => handleOpenChange(false)}
            data-testid="aside-avatar-lightbox-close"
          >
            <CircleXmark />
          </Button>

          <Image
            width={1024}
            height={1024}
            src={AVATAR_SRC}
            alt="Avatar"
            className={styles.lightboxImage}
          />
        </div>
      </Modal>
    </>
  )
}
```

- [ ] **Step 8: Wire `AsideAvatar` into `AsideContent`**

Read `src/layout/Aside/components/AsideContent/AsideContent.tsx` first. Remove the `Image` import (line 3 - it becomes unused), add an `AsideAvatar` import, and replace the `Link`-wrapped avatar block:

Remove:

```tsx
import Image from 'next/image'
```

Add, alphabetically between the `AnimatedGhost` and `AsideAvailability` imports:

```tsx
import { AsideAvatar } from '@/layout/Aside/components/AsideAvatar/AsideAvatar'
```

Replace:

```tsx
<Link href="/" className={styles.avatarLink} aria-label={t('aside.backToHome')}>
  <Image
    width={250}
    height={250}
    priority
    src="/assets/img/avatar/avatar.webp"
    alt="Avatar"
    placeholder="blur"
    blurDataURL="/assets/img/avatar/avatar.webp"
    className={styles.avatar}
  />
</Link>
```

with:

```tsx
<AsideAvatar />
```

- [ ] **Step 9: Remove the now-dead CSS from `aside.module.css`**

Read `src/layout/Aside/aside.module.css` first, then delete the `.avatarLink` and `.avatar` rules (they moved into `AsideAvatar.module.css` in Step 6):

```css
.avatarLink {
  display: flex;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 1.2rem;
  box-shadow: 0 0 15px 5px rgb(255 255 255 / 15%);
}
```

- [ ] **Step 10: Type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: PASS. Fix anything that doesn't before moving on.

- [ ] **Step 11: Run the e2e spec again to confirm it passes**

Run: `pnpm test:e2e -- e2e/aside-avatar-lightbox.spec.ts --project=chromium`
Expected: PASS, all 3 tests green.

- [ ] **Step 12: Commit**

```bash
git add e2e/aside-avatar-lightbox.spec.ts public/locales/ru.json public/locales/en.json \
  src/layout/Aside/types/aside.type.ts src/layout/Aside/context/AsideLightbox.context.ts \
  src/layout/Aside/components/AsideAvatar src/layout/Aside/components/AsideContent/AsideContent.tsx \
  src/layout/Aside/aside.module.css
git commit -m "feat: expand aside avatar into a photo lightbox"
```

---

## Task 2: Verify the mobile drawer stays open when the lightbox dismisses

**Files:**

- Test: `e2e/aside-avatar-lightbox.spec.ts` (extend)
- ~~Modify: `src/layout/Aside/components/MobileAside/MobileAside.tsx`~~ - not needed, see Step 2/3 below.

**Interfaces:**

- Would have consumed `AsideLightboxContext` from Task 1 (`src/layout/Aside/context/AsideLightbox.context.ts`) had the fix been necessary. It wasn't - see Step 2.
- Produces: nothing new consumed by later tasks - this is the last task in the plan.

- [ ] **Step 1: Write the failing e2e coverage for the nested-overlay case**

Read `e2e/aside-avatar-lightbox.spec.ts` first, then append a new nested `describe` block at the end, inside the existing outer `test.describe('aside avatar lightbox', ...)`, right after the third test's closing `})`:

```typescript
test.describe('inside the mobile drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('closing via the close button leaves the drawer open', async ({ page }) => {
    await page.goto('/')

    const drawer = await revealAside(page)

    await drawer.getByTestId('aside-avatar-trigger').click()

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await page.getByTestId('aside-avatar-lightbox-close').click()

    await expect(lightbox).toBeHidden()
    await expect(drawer).toBeVisible()
  })

  test('closing via Escape leaves the drawer open', async ({ page }) => {
    await page.goto('/')

    const drawer = await revealAside(page)

    await drawer.getByTestId('aside-avatar-trigger').click()

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(lightbox).toBeHidden()
    await expect(drawer).toBeVisible()
  })

  test('closing via outside click leaves the drawer open', async ({ page }) => {
    await page.goto('/')

    const drawer = await revealAside(page)

    await drawer.getByTestId('aside-avatar-trigger').click()

    const lightbox = page.getByTestId('aside-avatar-lightbox')
    await expect(lightbox).toBeVisible()

    await page.mouse.click(5, 5)

    await expect(lightbox).toBeHidden()
    await expect(drawer).toBeVisible()
  })
})
```

- [x] **Step 2: Run it to confirm the Escape case fails**

Run: `pnpm test:e2e -- e2e/aside-avatar-lightbox.spec.ts --project=mobile-chrome`
Expected: FAIL on "closing via Escape leaves the drawer open".

**Actual result: all 6 tests PASSED, including the Escape case, with no fix applied.** The predicted bug does not reproduce. Re-run 3x in a row (isolated and as part of the full spec) to rule out a fluke - consistently green every time. The source-level analysis in this plan's Architecture section was incomplete: `FloatingFocusManager` traps focus inside the `Modal`'s own portaled DOM subtree while it's open, and the native `Escape` keydown only bubbles up through _that_ subtree to `document` - it never passes through the `Drawer`'s separate portaled subtree at all. Since `Drawer`'s dismiss listener apparently isn't a bare unconditional `document`-level listener (contrary to what the earlier static read of `useDismiss` suggested), it never sees an `Escape` that originated inside the `Modal`'s subtree. The two overlays are already correctly isolated without any extra code.

- [x] ~~Step 3: Disable the drawer's own Escape handling while the lightbox is open~~ **SKIPPED**

Confirmed with the user: since the bug doesn't reproduce, adding `AsideLightboxContext`/`disableEscapeKeyDown` wiring to `MobileAside.tsx` would be unused defensive code for a scenario that can't happen (violates this project's YAGNI convention). Not implemented. `AsideLightboxContext` (Task 1) stays in the codebase unconsumed for now - `AsideAvatar` still calls `onLightboxOpenChange` against its default no-op, so nothing breaks; it's simply not wired to anything yet.

- [x] **Step 4: Type-check and lint**

Run: `pnpm check-types && pnpm lint`
Result: PASS (5 pre-existing `react-hooks/exhaustive-deps` warnings in unrelated files, 0 errors).

- [x] **Step 5: Run the full e2e spec across desktop and mobile projects**

Run: `npx playwright test e2e/aside-avatar-lightbox.spec.ts --project=chromium --project=mobile-chrome --project=firefox --project=mobile-firefox`
Result: PASS, 24/24 across all four projects (headless run; also verified headed per-project). `safari`/`mobile-safari` are not installed in this environment - unrelated to this change, every existing spec fails identically on those two projects here, not just this one.

- [x] **Step 6: Commit**

```bash
git add e2e/aside-avatar-lightbox.spec.ts docs/superpowers/plans/2026-09-01-aside-avatar-lightbox.md
git commit -m "test: cover the avatar lightbox inside the mobile drawer"
```

---

## Self-Review Notes

- **Spec coverage:** trigger button + `aside.viewPhoto` (Task 1 Step 7-8), `Modal` lightbox with veil/Escape/outside-click/close-button (Task 1 Step 7), `aside.closePhoto` (Task 1 Step 7), removed duplicate `backToHome` link (Task 1 Step 8), moved `.avatar`/`.avatarLink` CSS (Task 1 Steps 6 & 9), test ids (Task 1 Steps 7-8) - all covered. The spec's nested-overlay risk was investigated (Task 2) and turned out to already be a non-issue in practice; regression tests lock that in.
- **Placeholder scan:** no TBD/TODO; every step has literal code or an exact command.
- **Type consistency:** `IAsideLightboxContext.onLightboxOpenChange` (Task 1 Step 4) is used consistently in `AsideLightbox.context.ts`'s default value and `AsideAvatar.tsx`'s consumption. It has no other consumer - Task 2 found the `MobileAside.tsx` wiring it was meant for unnecessary (see Task 2 Step 2/3).

## Outcome

Task 2's premise - that `@gravity-ui/uikit`'s `Drawer` and `Modal` would both react to the same `Escape` keypress - did not hold up under actual testing, despite being grounded in a source-level read of `useDismiss`. The two overlays turned out to already be correctly isolated (see Task 2 Step 2 for the corrected explanation). The planned fix (`AsideLightboxContext` wiring into `MobileAside.tsx`, `disableEscapeKeyDown`) was not implemented, by the user's explicit choice, to avoid defensive code for a scenario that doesn't occur. `AsideLightboxContext` (Task 1) remains in the codebase, currently unconsumed beyond its no-op default - `AsideAvatar` calls it, but nothing overrides it. The three extra mobile-drawer e2e tests written for Task 2 stayed in as regression coverage, since they now document and lock in the correct (already-existing) behavior.

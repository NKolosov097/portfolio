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

export const useAsideLightboxContext = (): IAsideLightboxContext =>
  useContext(AsideLightboxContext)
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

      <Modal
        open={isPhotoOpen}
        onOpenChange={handleOpenChange}
        data-testid="aside-avatar-lightbox"
      >
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

## Task 2: Keep the mobile drawer open when the lightbox dismisses

**Files:**
- Modify: `src/layout/Aside/components/MobileAside/MobileAside.tsx`
- Test: `e2e/aside-avatar-lightbox.spec.ts` (extend)

**Interfaces:**
- Consumes: `AsideLightboxContext` from Task 1 (`src/layout/Aside/context/AsideLightbox.context.ts`).
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

- [ ] **Step 2: Run it to confirm the Escape case fails**

Run: `pnpm test:e2e -- e2e/aside-avatar-lightbox.spec.ts --project=mobile-chrome`
Expected: FAIL on "closing via Escape leaves the drawer open" - the drawer closes too, because `Drawer` and `Modal` each register their own independent `Escape` dismiss handler (confirmed by reading `@gravity-ui/uikit`'s `Drawer`/`Modal` source: neither shares a `FloatingTree`, so both fire on the same keydown). The other two mobile tests are expected to already pass, since outside-click dismissal is scoped per-overlay via a `.closest('.g-modal'|'.g-drawer')` check in each component's own `useDismiss` callback.

- [ ] **Step 3: Disable the drawer's own Escape handling while the lightbox is open**

Read `src/layout/Aside/components/MobileAside/MobileAside.tsx` first, then:

Change the React import to add `useState`:
```tsx
import { useCallback, useEffect, useState } from 'react'
```

Add a new import:
```tsx
import { AsideLightboxContext } from '@/layout/Aside/context/AsideLightbox.context'
```

Add a new piece of state alongside the existing `isOpenDrawer`/`setIsOpenDrawer` destructure:
```tsx
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
```

Pass `disableEscapeKeyDown` to the `Drawer`, and wrap the drawer's content in the context provider so `AsideAvatar` (rendered inside `AsideContent`) can reach `setIsLightboxOpen`:

```tsx
    <Drawer
      open={isOpenDrawer}
      onOpenChange={(isOpen) => !isOpen && handleCloseDrawer()}
      disableEscapeKeyDown={isLightboxOpen}
      className={styles.drawer}
      contentClassName={styles.drawerItem}
    >
      <div
        id="aside-card"
        ref={swipeToCloseRef}
        data-testid="aside-drawer"
        className={styles.drawerItemContent}
      >
        <Button
          data-testid="aside-close-profile"
          view="flat"
          pin="circle-circle"
          size="m"
          aria-label={t('aside.closeProfile')}
          className={styles.closeIcon}
          onClick={handleCloseDrawer}
        >
          <CircleXmark />
        </Button>
        <AsideLightboxContext.Provider value={{ onLightboxOpenChange: setIsLightboxOpen }}>
          <AsideContent />
        </AsideLightboxContext.Provider>
      </div>
    </Drawer>
```

- [ ] **Step 4: Type-check and lint**

Run: `pnpm check-types && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Run the full e2e spec across desktop and mobile projects**

Run: `pnpm test:e2e -- e2e/aside-avatar-lightbox.spec.ts`
Expected: PASS, all 6 tests green on every configured project (`chromium`, `mobile-chrome`, `firefox`, `mobile-firefox`, `safari`, `mobile-safari`).

- [ ] **Step 6: Commit**

```bash
git add src/layout/Aside/components/MobileAside/MobileAside.tsx e2e/aside-avatar-lightbox.spec.ts
git commit -m "fix: keep the mobile aside drawer open when the avatar lightbox dismisses"
```

---

## Self-Review Notes

- **Spec coverage:** trigger button + `aside.viewPhoto` (Task 1 Step 7-8), `Modal` lightbox with veil/Escape/outside-click/close-button (Task 1 Step 7), `aside.closePhoto` (Task 1 Step 7), removed duplicate `backToHome` link (Task 1 Step 8), moved `.avatar`/`.avatarLink` CSS (Task 1 Steps 6 & 9), test ids (Task 1 Steps 7-8), nested-overlay risk called out in the spec (Task 2, with the exact library-level cause identified and fixed) - all covered.
- **Placeholder scan:** no TBD/TODO; every step has literal code or an exact command.
- **Type consistency:** `IAsideLightboxContext.onLightboxOpenChange` (Task 1 Step 4) is the single signature used everywhere it appears - `AsideLightbox.context.ts`'s default value, `AsideAvatar.tsx`'s consumption, and `MobileAside.tsx`'s `setIsLightboxOpen` (which structurally matches `(_isOpen: boolean) => void`).

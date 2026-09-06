# Aside avatar lightbox

## Problem

`TODO.md` asked whether a link to a profile photo is worth adding to the aside panel. Investigation showed the avatar image already sits inside a `Link href="/"` (`AsideContent.tsx:35-46`), but that link's only job is "go back home" - it duplicates the adjacent `homeLink` on the name/title (`AsideContent.tsx:28`), which points to the same `href` and shares the same `aria-label` (`aside.backToHome`). Two adjacent links to the same destination with the same accessible name is a redundant-navigation anti-pattern for screen reader users, and it wastes the one interactive slot a photo naturally invites: viewing it larger.

The source asset (`public/assets/img/avatar/avatar.webp`) is already 1024x1024, downscaled to 250x250 for the aside thumbnail - so a "view larger" interaction needs no new asset.

## Design

### Component

Extract a new `AsideAvatar` component (`src/layout/Aside/components/AsideAvatar/AsideAvatar.tsx` + `AsideAvatar.module.css`), mirroring the existing `AsideAvailability` component's directory shape. It owns the avatar thumbnail, the open/closed lightbox state, and the lightbox itself. `AsideContent.tsx` renders `<AsideAvatar />` in place of the current `Link`-wrapped `Image` block (lines 35-46), and drops its now-unused `avatarLink`/`avatar` CSS classes from `aside.module.css` (moved into the new component's own stylesheet).

### Trigger

The 250x250 thumbnail moves from `Link href="/"` to `<button type="button">`, since it no longer navigates. `aria-label` uses a new `aside.viewPhoto` translation key. Clicking (or activating via keyboard) sets local `isPhotoOpen` state to `true`.

The `homeLink` on the name/title is unchanged and remains the sole "back to home" affordance from the aside - no navigation capability is lost.

### Lightbox

Built on `@gravity-ui/uikit`'s `Modal` (already a project dependency, unused elsewhere so far; the project already uses the sibling `Drawer` overlay for `MobileAside`). `Modal` provides, out of the box:

- A dimmed backdrop via the `--g-color-sfx-veil` CSS variable - the same variable `aside.module.css:285` already overrides for the mobile drawer, so the veil color is already consistent with the rest of the aside UI.
- Close on `Escape` and on outside click, via `onOpenChange`.
- Focus trap while open and focus return to the trigger button on close.

`AsideAvatar` renders `<Modal open={isPhotoOpen} onOpenChange={setIsPhotoOpen}>` containing:

- The full-resolution `Image` (up to the source's native 1024x1024, capped by CSS to fit the viewport, e.g. `max-width: min(90vw, 1024px); max-height: 90vh`, preserving aspect ratio).
- A visible close button, matching the existing `CircleXmark` icon + `Button` pattern already used for `MobileAside`'s drawer close button, for users who don't discover Escape or outside-click. `aria-label` uses a new `aside.closePhoto` translation key.

### Localization

Add to `public/locales/ru.json` and `public/locales/en.json` under `aside`:

- `viewPhoto`: "Открыть фото крупнее" / "View larger photo"
- `closePhoto`: "Закрыть фото" / "Close photo"

`backToHome` is unchanged and keeps its existing meaning (used only by the name link going forward).

### Test ids

`aside-avatar-trigger` (button), `aside-avatar-lightbox` (modal content), `aside-avatar-lightbox-close` (close button) - following the existing `aside-*` naming convention (e.g. `aside-social-*`, `aside-close-profile`).

### Risk: nested overlays on mobile

`AsideAvatar` also renders inside `MobileAside`'s `Drawer` on small viewports. Both `Modal` and `Drawer` are part of Gravity UI's floating-ui-based overlay stack, which is designed to dismiss only the top-most layer - but this needs explicit verification rather than an assumption: opening the lightbox from within the drawer, then pressing Escape or clicking outside the photo, must close only the lightbox and leave the drawer open.

### Testing

New `e2e/aside-avatar-lightbox.spec.ts`, following the pattern of `e2e/aside-ghost.spec.ts` / `e2e/aside-swipe.spec.ts`:

1. Desktop: clicking the avatar opens the lightbox with the dimmed backdrop and full-size image visible.
2. `Escape` closes it; clicking outside the image closes it; clicking the close button closes it.
3. Mobile (drawer open): opening the lightbox and dismissing it (Escape, outside click, close button) leaves the drawer open in all three cases.

## Out of scope

- No change to `AUTHOR_IMAGE_URL` / `Person.image` structured data (`seo.constants.ts`) - unrelated to this UI interaction.
- No new avatar asset or resolution beyond the existing 1024x1024 source.

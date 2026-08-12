# Unified Aside Surface Design

## Goal

Restore the original desktop aside color and use it consistently for the desktop aside, mobile aside, and language dropdown menu.

## Color Source

Before the soft-charcoal change, the outlined desktop Card was transparent and showed the root page background. The resulting color was `--root-bg-color: #121212`.

Use `#121212` as the explicit shared aside surface color by setting:

```css
--aside-bg-color: #121212;
```

## Surfaces

The following surfaces must resolve to `rgb(18, 18, 18)`:

- Desktop aside Card.
- Mobile aside drawer content.
- Language dropdown menu inside `.g-dropdown-menu__popup-content`.

All three surfaces continue to consume `var(--aside-bg-color)` so they cannot drift apart.

## Preserved Behavior

- Do not change typography, spacing, borders, shadows, or component dimensions.
- Preserve transparent hover and selected states in the language menu.
- Preserve the branded underline on the selected language.
- Preserve the ghost animation and all aside interactions.

## Verification

- Update browser assertions for desktop and mobile aside surfaces to expect `rgb(18, 18, 18)`.
- Update the opened language-menu assertion to expect the same computed color.
- Run formatting, type checking, lint, unit tests, production build, and the focused Chromium browser suite.

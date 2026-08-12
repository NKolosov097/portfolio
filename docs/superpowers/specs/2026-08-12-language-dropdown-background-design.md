# Language Dropdown Background Design

## Goal

Make the language dropdown visually match the aside panel by using the same soft-charcoal background color.

## Scope

- Change only the menu rendered inside `.g-dropdown-menu__popup-content`.
- Use the existing `--aside-bg-color` custom property rather than duplicating `#252525`.
- Preserve the current transparent hover and selected states.
- Preserve the branded underline on the selected language.
- Do not change other popup components or typography.

## Implementation

Update the existing global override in `src/styles/globals.css`:

```css
.g-dropdown-menu__popup-content .g-menu {
  background-color: var(--aside-bg-color);
}
```

No component or JavaScript changes are required.

## Verification

- Add browser coverage asserting that the opened language menu has the same computed background color as the aside panel: `rgb(37, 37, 37)`.
- Run formatting, type checking, lint, unit tests, production build, and the focused browser test.

# Consistent keyboard focus

## Requirements

- All keyboard-focusable controls on every public page show a visible focus indicator in the active appearance accent: winter cyan and original brand yellow.
- The Aside home/name link and globe language control use the shared focus color. The appearance switch has rounded focus corners on desktop and mobile.
- Include page links, cards, article demonstrations, contact controls, language menu, mobile drawer, avatar/attachment dialogs and arcade controls. Keep keyboard navigation distinguishable from the current-language marker and validation feedback.
- Preserve keyboard order, focus restoration, hover behavior, semantic error colors, established control shapes and appearance persistence. Do not add duplicate rings to controls whose indicator is drawn by a child or pseudo-element.
- Arrow navigation in the language menu must visibly identify the item that activation will choose. Enter or Space selects it and closes the menu once.
- Preserve existing unrelated working-tree edits. Add no dependencies or unrelated behavior changes.

## Acceptance

Inspect the DOM and focused states of `/`, `/articles`, both published article routes, a missing top-level route and a missing article route. Exercise both appearances, desktop and mobile, keyboard navigation and opened overlays. Verify real computed outline targets, including Gravity button pseudo-elements and tab children. Confirm the reported controls visually, plus cards and menu items. Run focused regression tests, type checking and repository lint; record actual results and any limits.

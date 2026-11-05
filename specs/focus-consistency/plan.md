# Focus consistency implementation plan

## Diagnosis

Custom controls use `--g-color-line-brand`; Gravity controls use the stock cool-grey `--g-color-line-focus`. Plain links fall back to the browser outline. AppearanceToggle rounds only its inner track. Three card styles suppress outlines, menu focus feedback is suppressed, and arcade controls hardcode white.

Gravity DropdownMenu keeps DOM focus on its switcher while arrow navigation sets an item `selected` flag. LanguageSwitcher overwrites that flag with the current language, hiding keyboard selection. Forwarding its synthetic keydown callback to a native Button also handles activation twice: list navigation closes the menu, then the synthetic callback reopens it.

## Implementation

1. Alias `--g-color-line-focus` to `--g-color-line-brand` on `html` and `body.g-root` in globals.css. Portals inherit the active accent through the same token. Use existing Gravity APIs; no dependency edits or `!important`.
2. Add a 2px solid semantic outline with 2px offset to `:where(a[href], button):not(.g-button, .g-tab):focus-visible`. Give otherwise unstyled native controls a low-specificity 4px radius. Preserve component-specific geometry and Gravity pseudo-element/child indicators.
3. Give interactive menu items a 4px radius and an inset semantic focus ring for direct `:focus-visible`. Also show it on `body:has(.g-dropdown-menu__switcher-wrapper :focus-visible) .g-dropdown-menu__menu-item.g-menu__item_selected`, which represents arrow navigation while focus stays on the globe.
4. Replace LanguageSwitcher's `selected` prop with `extraProps: { 'aria-current': language === value ? 'true' : undefined }`; move the current-language underline to that attribute. Keep the selected background transparent. Forward only `onClick` to its native Button so native Enter/Space activation and Gravity navigation cooperate without handling a key twice.
5. Give AppearanceToggle's outer button an 8px radius. Remove outline suppression from ArticleListItem, Writing/Article and Portfolio/Project. Replace white focus colors in DoomMachine and TouchControls with the semantic focus token. Existing brand-token outlines already match and remain unchanged.
6. Add `e2e/focus-consistency.spec.ts` and document its coverage in README.

## Scope

Seven stylesheets, LanguageSwitcher, one test file and its README entry implement the change. The already-dirty Aside stylesheet needs no edit: the shared native rule repairs its home link. Existing contact underlines, article-demo outlines, circular controls and canvas inset focus remain intact. Preserve unrelated winter appearance tests, Aside/SparkleField changes and concurrent Header background changes.

## Verification

Inspect `/`, `/articles`, `/articles/ai-boilerplate-senior-engineers`, `/articles/two-states-are-enough`, `/focus-audit-missing`, and `/articles/focus-audit-missing` in both appearances. Include skip navigation, Aside links, header tabs, globe/menu, native links/cards, demos, contact fields/attachments, footer and dialog/drawer close controls. Inspect the separate error document source without forcing a production crash.

Wait for streamed/client-only content and the hydrated form. Establish keyboard modality and inspect the focused element, library pseudo-elements/children and input underline wrappers. Poll actual paint through transitions; contact border-color takes 250ms despite the lower-specificity global reduced-motion rule. Record active element, focus-visible state, connection and painted values on failure. Exclude hidden/disabled controls and intentional non-tabbable placeholders; check roving header tabs separately when using arrows. Mobile not-found pages legitimately have five tabbable controls.

Verify switch radius, winter -> original -> winter, dropdown arrow selection independent of current language, Enter/Space activation, Escape and focus restoration. Cover mobile drawer, avatar and attachment dialogs. Arcade styling can be reviewed without booting the heavy game; preserve existing game behavior tests.

Run focused tests on Chromium, Firefox and WebKit with desktop/mobile coverage, `pnpm check-types`, and `pnpm lint`. Inspect the diff afterward because lint:styles fixes files. Report full-lint limitations separately from targeted checks. Final browser and command results are recorded only after execution completes.

## Source convergence

Source review found the implementation consistent with this plan. Shared native fallback and token inheritance address the common causes; local changes remove suppression, preserve geometry and repair the language menu's navigation indication and activation. All 85 distinct browser scenarios passed across the broad run and corrected overlay reruns; type checking, actual-source ESLint, all-source Stylelint, changed-file formatting and diff checks passed. Full lint remains limited by the existing generated `.playwright-mcp/pr-build` copy. Detailed split-run evidence and the unexecuted heavy-game/forced-error checks are recorded in `tasks.md`.

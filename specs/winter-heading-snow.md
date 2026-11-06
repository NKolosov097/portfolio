# Settled winter snow on the home heading

## Specification

- Apply the approved final fourth snow treatment from `public/snow-lettering.html` to the actual home heading on `feature/winter-theme`.
- Snow appears only in winter appearance. Preserve the live translated heading, existing responsive font sizes/wrapping, surname no-wrap rule, profession, last-letter sparkle and falling-snow field.
- Match the approved English shapes, including the N right-wall correction, k upper-arm cap, N/k/K corner banks, t shoulders, v pocket, all eight hanging lips, matte material and broad downward shadows. The heading remains readable/selectable and has one complete accessible name; decorative SVGs are hidden from assistive technology.
- Both shipped locales work. Generic Cyrillic caps follow the actual Inter contours; special Latin pockets remain limited to the glyphs for which they were approved. Locale and appearance changes must never leave stale letter geometry or duplicate material IDs.
- Keep the heading text in the initial render. Snow preparation must not hide/block it, shift layout, or start an animation loop. Failed/unavailable font/canvas preparation leaves readable plain text.
- Preserve all existing unrelated dirty changes in this checkout. No new dependencies, publication, push, or unrelated cleanup. Keep the approved prototype as the reference.

## Plan

Use the current checkout, already on the requested branch; moving to a clean branch/worktree would omit its in-progress winter behavior. Add a focused `SnowText` component under Home, a CSS module and a typed geometry helper. Reuse the approved prototype algorithms/materials rather than redesigning the snow.

`Home` keeps its existing h2 and surname/last-glyph/sparkle wrappers, replacing only text pieces with `SnowText` (`intro`, `firstName`, `lastName` roles). In original appearance the component returns the original text. In winter it keeps selectable live characters in non-breaking word spans and decorates them with absolutely positioned SVGs after the existing idle helper and loaded Inter font. Set the h2 accessible label to its full translated text once. The surname head and final glyph remain separate to preserve the sparkle anchor; last-name role/index still selects only its first o for the extra lip.

Port only the final deep-snow profile into precise TypeScript types and cached per-character outlines. Keep every approved English path calculation unchanged, including the N floor extension and opaque-stem overlap. React renders path nodes and escaped text directly, without injecting HTML or duplicating the whole heading in SVG. Cache only fixed Inter 700 outlines, prepare them in client effects after font readiness, cancel idle/async work when stale, and do no client raster work for original appearance.

Material definitions render once in the intro fragment with stable `home-` prefixed IDs. Scope all CSS/materials to this component. The calibrated raster uses 200px type, 230px line-height and 24px padding; align the decoration to the real heading line box with `top: calc(0.5lh - 0.695em)` instead of changing the existing 1.0/1.04 line heights. Word/glyph spacing must fit existing heading dimensions; no prototype inspection font sizing enters production.

Add focused browser coverage in `e2e/winter-heading-snow.spec.ts` using existing appearance/language helpers: English decoration and target shapes, original/winter switching, Russian/English changes, complete accessible heading and sparkle preservation, font alignment and mobile no-overflow. Check README's existing test/structure descriptions after adding files; update only if they become inaccurate.

Scope: new SnowText component/helper/CSS, localized Home text integration, focused e2e spec and this document. Do not overwrite the existing modified Home CSS or winter e2e files. No other callers, exports or fixtures require changes.

## Tasks

- [x] Record baseline checks and start the local application preview.
- [x] Port final geometry/materials to strict TypeScript and integrate SnowText with Home.
- [x] Add focused winter/locale/browser regression coverage and run appropriate checks.
- [x] Inspect real application desktop/mobile rendering through Playwright MCP and review the integration.
- [x] Record validation evidence, remaining limits and final branch state.

## Analysis

The prototype is approved, so this task changes integration rather than the design. The main compatibility risks are mismatched heading/raster line heights, translated strings, stale font promises during rapid toggles, filter-ID duplication and character wrappers disturbing surname/sparkle geometry. The scoped component, line-box compensation, original-text fallback and browser checks directly cover these risks. No test-first cycle or new framework is required.

## Verification

- Production build and TypeScript checks pass. Focused ESLint, Stylelint and Prettier checks pass.
- All 12 focused browser tests pass across desktop/mobile Chromium, Firefox and WebKit: English/Russian text, appearance changes, glyph alignment, selectable text, accessible heading, seven pockets, eight shaded lips, N wall overlap, unique materials and sparkle preservation.
- Three existing Chromium regression tests also pass: original headline readability, winter falling snow and immediate seasonal text changes under reduced motion.
- Playwright MCP comparison confirms all 16 English glyph path arrays exactly match the approved prototype. Desktop/mobile inspection at 320, 393, 1024, 1440 and 1920px confirms unchanged heading dimensions/line breaks and no horizontal overflow. Russian mobile rendering also fits; reduced-motion inspection succeeds.
- Fixed Firefox copying extra line breaks between letters by excluding decorative SVGs from text selection. The N regression assertion checks wall structure rather than Chromium-specific raster coordinates.
- Independent final source review has no remaining findings. Letter wrappers change word kerning by less than 4px at 96px type; inspected heading dimensions and wrapping remain unchanged.
- The required full `pnpm lint` remains blocked by pre-existing generated files under `.playwright-mcp` (119,361 errors); its JavaScript stage stops before the global CSS fixer. No unrelated cleanup was attempted.
- Applied in the existing dirty `feature/winter-theme` checkout; unrelated changes and the approved prototype are preserved. No new dependencies, push or publication.

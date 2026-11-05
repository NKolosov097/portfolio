# Focus consistency tasks

- [x] Apply the shared focus token, native fallback and visible menu focus.
- [x] Round AppearanceToggle, restore card outlines and replace arcade white focus colors.
- [x] Separate the current-language marker from Gravity keyboard selection and use native switcher activation.
- [x] Add all-route/overlay regression coverage with transition-aware paint polling and update README.
- [x] Review final source against the specification and preserve unrelated changes.
- [x] Complete the all-route browser matrix and desktop/mobile visual verification, including roving tabs and menu Space activation.
- [x] Record final type checking and full/targeted lint results, with existing repository limitations.
- [x] Record verification evidence and close remaining acceptance items.

## Verification evidence

- All 85 distinct regression scenarios passed across split runs on Chromium, mobile Chrome,
  Firefox, desktop WebKit and mobile WebKit. The broad run passed all 60 route/appearance/profile
  audits, 10 attachment cases and 5 appearance cycles. Its 10 overlay failures exposed test pointer
  modality and asynchronous Modal initial-focus timing; after test-only corrections, the 6
  Chromium/mobile Chrome/Firefox overlay cases and final 4 WebKit overlay cases passed. This was
  not a single all-green full-matrix run.
- Ad hoc keyboard checks passed for menu Space opening/closing and cyan focus on all six header
  tabs. Desktop name, appearance switch and globe, plus the mobile appearance switch, were
  visually reviewed in screenshots.
- `pnpm check-types` passed twice, including after the final LanguageSwitcher source fix.
- Full `pnpm lint` failed because it scanned the existing `.playwright-mcp/pr-build` generated
  copy and reported 134,059 problems. ESLint over actual source excluding `.playwright-mcp/**`
  passed with two pre-existing warnings in `MobileAside.tsx` at lines 27 and 49. All-source
  Stylelint, Prettier over changed files and specifications, and `git diff --check` over changed
  sources passed.
- Heavy DOOM runtime and a forced global error were not executed. Arcade focus styles and the
  separate error document source were reviewed; existing runtime behavior tests remain intact.

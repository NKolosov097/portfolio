# Implementation plan

- [x] Preserve the appearance enum and resolver API; always resolve original, including legacy cookies, and update resolver tests.
- [x] Default the appearance context to original; remove the header switch and reserve only the language control footprint.
- [x] Replace switch tests with SSR, hydration, cookie, reload, navigation, and responsive original-appearance regressions.
- [x] Archive Halloween hero motion and seasonal mascot tests while keeping general mascot, image fallback, reduced-motion, and occlusion checks active.
- [x] Update README architecture and coverage descriptions.

## Verification

- [x] pnpm check-types
- [x] pnpm lint
- [x] pnpm check-format
- [x] pnpm test
- [x] pnpm build
- [x] Focused Playwright appearance-switch, aside-ghost, home-sparkle-field, and header-tabs suites on chromium and mobile-chrome.

Validation passed: 307 unit tests and 58 focused Chromium/mobile Chromium tests. The 32 seasonal mascot cases in this run remain explicitly archived. TypeScript, lint, formatting, and the production build passed. Lint reported only two existing MobileAside hook warnings. Desktop and mobile screenshots were visually checked.

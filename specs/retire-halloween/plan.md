# Implementation plan

> Historical note: the original-only appearance policy below is superseded by the [winter appearance specification](../winter-ghost/spec.md).

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

## E2E stability follow-up

- [x] Safari's Halloween-cookie appearance case exceeded the default 5-second canvas mount wait. Its retry passed, but `failOnFlakyTests` rejected the run.
- [x] Give the two deferred sparkle mount assertions a 15-second wait, leaving room within the 30-second test timeout.
- [x] Verify the bounded wait with delayed chunk loading and repeated Safari runs; check types and lint.

Validation passed: production build, TypeScript `noEmit`, ESLint, stylelint, and Prettier; ESLint reported two existing MobileAside hook warnings. All 24 Safari appearance tests passed with three repeats, no retries, and two workers. All 26 Chromium and mobile Safari appearance and sparkle tests passed. A deterministic WebKit run held the actual sparkle chunk for 6500 ms: the old 5000 ms assertion timed out and the new 15000 ms assertion passed. Full Linux CI remains pending.

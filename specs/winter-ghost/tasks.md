# Tasks

## Completed baseline

- Shaded hat, synchronized crown clipping and red mitten/cuff are implemented.
- Previous build, type check, three tickle tests, scoped lint/format and winter suites on Chromium desktop/mobile, Firefox and WebKit passed.
- Previous pixel probes verified crown coverage. These results do not validate the new motion.
- Full lint previously encountered unrelated `.playwright-mcp/pr-build` scratch output; preserve it.

## Current artwork and motion refinement

- [x] Adapt selected reference №4 with rounded fabric, broad fold/crease, padded band and low screen-right pompom.
- [x] Tilt/drop hat toward screen-right and apply identical pivot/transforms to the crown clip.
- [x] Add downward hidden mitten rest, outward/upward wrist arc, synchronized contact/lift and downward withdrawal.
- [x] Add stationary behind-body reveal clipping and hidden reduced-motion pose.
- [x] Update phase seeking and geometry/visibility/contact/reduced-motion tests for all four tracks.
- [x] Run required checks and inspect native desktop/mobile poses plus the unfrozen loop.

## Reference selection (completed)

- [x] Present one contact sheet of six actual internet Santa-hat references.
- [x] User selected №4, “Округлая складка” by BabyCorn; artwork adaptation is authorized and included above.

## Latest shared-clock refinement

- [x] Add winter-specific idle animation names with bob/breathe 3s, delay -1.5s and sway 6s, delay 0; preserve original idle behavior and existing SVG/WAAPI refs.
- [x] Phase all four 12s winter sequence tracks by delay -0.3s; ensure matching reduced-motion overrides and fresh cohorts on winter re-enable.
- [x] Make cycle-relative seeking delay-aware; verify actual right-side ascent/fall phase across four turns and after original->winter switching.
- [x] Apply confirmed test-only gate-boundary and CTM floating-point fixes, then rerun required checks and inspect synchronized natural motion.

## Final validation

- Selected artwork and [reference board](reference-board.png) delivered.
- Production build and fresh type check passed; scoped ESLint, stylelint and Prettier passed.
- Three tickle DOM tests passed.
- Chromium's initial five scenarios and final four motion/clock/reduced-motion scenarios passed. All 27 mobile Chromium, Firefox and WebKit scenarios passed sequentially: 36 distinct browser scenarios verified.
- Initial WebKit snow failures under load did not recur in sequential runs.
- Live, unpaused first/second right-ascent screenshots confirmed no fall followed by a fall. Hidden mitten rest and the natural arc were visually inspected.
- Full lint was not rerun because of known unrelated `.playwright-mcp/pr-build` scratch errors; those files were preserved.

# TODO

- [ ] Aside panel ghost: make it track the mouse cursor. Figure out under what conditions it should do this (always vs. only on certain sections/breakpoints, idle timeout, etc.) - see the existing ghost animation layers covered by `e2e/aside-ghost.spec.ts`.
- [x] Revisit which features belong in "favourite features" - base the picks on the resume/CV content rather than the current placeholder set.
- [x] Decide whether a link to a profile photo is worth adding to the aside panel - implemented as an avatar photo lightbox in [PR #17](https://github.com/NKolosov097/portfolio/pull/17).
- [x] Doom machine: support native fullscreen and a mobile-friendly viewport fallback when the Fullscreen API is missing or rejected, with keyboard navigation, focus restoration, and safe-area-aware controls - [PR #21](https://github.com/NKolosov097/portfolio/pull/21).
- [ ] Build proper loading skeletons for the home page and other components, instead of the current placeholder/blank loading state.
- [x] Extend E2E coverage to tablet and foldable resolutions and fix timing-sensitive interaction tests - [PR #18](https://github.com/NKolosov097/portfolio/pull/18).
- [x] Prevent header tab size changes during hydration with responsive CSS; cover initial size metrics and the 500px breakpoint without depending on font loading - [PR #20](https://github.com/NKolosov097/portfolio/pull/20).

# TODO

- [ ] Aside panel ghost: make it track the mouse cursor. Figure out under what conditions it
      should do this (always vs. only on certain sections/breakpoints, idle timeout, etc.) - see
      the existing ghost animation layers covered by `e2e/aside-ghost.spec.ts`.
- [ ] Revisit which features belong in "favourite features" - base the picks on the resume/CV
      content rather than the current placeholder set.
- [ ] Decide whether a link to a profile photo is worth adding to the aside panel.
- [ ] Doom machine: add a way to expand the game to full screen on mobile. `canFullscreen`
      (`doomSupport.ts`) gates the existing fullscreen button on `document.documentElement
      .requestFullscreen` support, which iOS Safari lacks for arbitrary elements - so the button
      never shows there today. Needs a mobile-friendly fallback (e.g. a CSS-only "fill the
      viewport" mode) instead of relying on the Fullscreen API.

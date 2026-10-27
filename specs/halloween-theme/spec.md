# Halloween appearance

## Requirements

Provide a reversible seasonal appearance while preserving portfolio content, navigation, contact behavior, typography and layout. Halloween is the release default; an explicit original choice wins. Resolve the `portfolio-appearance` cookie server-side to avoid appearance flashes, then keep context, root data attribute and a one-year SameSite=Lax cookie synchronized on toggle. No calendar automation.

The accessible header switch appears beside the language control on desktop and below it on mobile. It uses a photographic thumbnail of the actual hero pumpkin, uniform 30×30px sizing, margin-bottom:-6px, and a shadow-lifting RGB gamma filter with unchanged alpha. Desktop thumb endpoints move inward by 2px (26px travel); mobile keeps its existing vertical travel. Preserve keyboard operation, translated labels and touch targets.

The Halloween hero contains ground, steady ground illumination and a standalone transparent photographic AVIF pumpkin. Reveal ground, pumpkin, interior light and sparks over approximately 1.2s after decode attempts settle; one failed asset must not block readiness. The shell never moves or flickers after reveal. A clipped duplicate changes only light inside the eyes, nose and mouth. Eighteen small amber/gold SVG sparks rise behind the pumpkin using ordinary CSS, staggered negative delays, varied periods and zero-opacity endpoints. No smoke textures, canvas renderer, background worker or experimental random API remains.

The ghost carries a photographic bronze lantern with brighter frame and localized glass/flame glow. Preserve its gentle idle swing and tickle interaction. Initial Halloween load and enabling Halloween draw the loaded lantern from behind the ghost through its anatomical left side (screen right) with decaying inertial swing; disabling stows it along the same outer-side path behind the back. Keep it mounted during exit, use deliberate occlusion for the outline ghost, and reverse rapidly without pose jumps or stale completion. Initial original appearance shows no lantern flash. Exact gesture and lifecycle plan: [lantern-transition.md](lantern-transition.md).

Switch and lantern use small AVIF images with WebP fallback selected through a guarded mount decode probe, including failures before hydration. Never stretch either image or retry failed fallback indefinitely. Reduced motion shows the final appearance immediately, with static sparks and light, no lantern travel/inertia, and live preference changes canceling finite motion.

Original appearance restores the portrait/colors and existing sparkle field. Both appearances retain identical heading geometry. Seasonal colors remain consistent through navigation, headings and cards without changing semantic status/error colors. Support English/Russian, narrow screens, scrolling and route changes. No cobwebs, spiders, sound, game changes, backend behavior changes or new dependency.

## Plan and tasks

1. Wire appearance resolution through root layout, providers/context, cookie persistence and translated header control. Update all provider fixtures, including Contact Form DOM tests, with the required initialAppearance.
2. Integrate the hero's three image layers, staged reveal, clipped candlelight and 18 CSS spark emissions; preserve responsive crop and original portrait/sparkles.
3. Integrate the 30px photographic switch and photographic lantern, guarded image fallback and static reduced-motion behavior.
4. Add loaded lantern draw/stow transitions with fixed occlusion, reversible travel and separately cancelable inertial rotation; keep existing tickle transforms independent.
5. Verify current UI behavior and include only active assets, code, supporting tests and current SDD records in the feature change.

Active assets under `public/assets/img/halloween/`: `layer-ground.webp`, `layer-ground-glow.webp`, `layer-pumpkin.avif`, `layer-pumpkin.webp`, `switch-pumpkin.avif`, `switch-pumpkin.webp`, `lantern.avif`, `lantern.webp`. Historical smoke/ember textures, alternative pumpkins, source images and local diagnostics are excluded.

## Acceptance

Verify cookie/default resolution, reload/route persistence, keyboard control, translated labeling and both responsive switch layouts. Check exact 30px geometry, desktop 26px travel and unclipped photographic alpha. Verify decode fallback in supported and AVIF-unsupported browsers, including primary failure before hydration and no retry loop.

Check hero reveal order, three active asset references,18 sparks behind the shell, continuous emission coverage, invisible resets, localized candle flicker, fixed shell geometry and static reduced motion. Preserve original heading/sparkle behavior. Test lantern initial appearances, loaded entry, complete masked exit, rapid reversal, tickle overlap, unmount and initial/live reduced motion.

Inspect native-size desktop/mobile screenshots and transition sequences. Run focused unit/browser tests, TypeScript, ESLint, Stylelint, formatting and production validation appropriate to the final change. Report actual outcomes and environment limitations; do not equate planned tests with passing tests. All photographic images, including the hero, retain AVIF primaries and use matching WebP fallbacks when decoding fails; see [hero-compatibility.md](hero-compatibility.md).

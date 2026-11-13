# Retire Halloween appearance

> Historical note: the original-only appearance policy below is superseded by the [winter appearance specification](../winter-ghost/spec.md).

## Intent

Halloween has ended. Restore the original appearance for every visitor and remove the seasonal switch from the public header.

## Requirements

- Server rendering and hydration use original for missing, original, legacy halloween, empty, and unknown appearance cookies.
- Reloading and navigating to articles keep original without a seasonal flash.
- Remove the pumpkin switch; keep the language control and tabs usable at 320px, 390px, and desktop widths.
- Preserve the sparkle field and mascot. Seasonal hero artwork and the visible lantern are absent.
- Archive seasonal assets, components, and tests without a scheduler, flag, dependency, or cookie migration.
- Use a separate branch and worktree from origin/main, preserving other winter work. The global error page already looks original and needs no change.

## Acceptance

Cover all resolver inputs, original SSR and hydrated markup, reload and article navigation, responsive header and hero layout, and active mascot behavior. Retain image fallback, reduced-motion, and lantern occlusion coverage; archive seasonal-only assertions.

- Appearance regression waits for the deferred sparkle field to mount within a bounded budget; strict flaky CI remains enabled.

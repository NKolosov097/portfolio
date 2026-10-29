# Shadowed watcher in the Halloween hero

## Requirements

Add one photographic hairy spider head in the dark area left of the pumpkin. Only the head is visible. Preserve the existing pumpkin, lighting, sparks, heading geometry and original appearance.

The head approaches the viewer slightly, holds, then retreats into shadow. Keep its eye-level center fixed: no vertical drop, stepping legs or pronounced shrinking. Once hidden, it must leave no dark silhouette over the background. Respect reduced motion with a static, restrained pose.

## Implementation

- Reuse the existing SVG asset/decode lifecycle with transparent 960x480 `watching-eyes.avif` (94950 bytes, quality 75, 4:4:4), retaining `watching-eyes.webp` (145164 bytes) as a decode-failure fallback. Preserve dimensions, alpha and animation; verify primary decoding and fallback behavior for both photographic assets.
- Render at 340x170 scene units, positioned at (400,300), behind a stationary feathered mask focused on the eyes.
- Animate around the 50% horizontal / 40% vertical origin. Scale ranges only from 0.88 to 0.94, brightness from 0.72 to 0.95, and opacity from 0 to 0.55.
- Use a 14-second cycle: hidden at 0/10/62/100%, revealed at 22/44%. This gives a 1.68-second approach, 3.08-second hold and 2.52-second retreat.
- Reduced motion disables animation and holds scale 0.94, brightness 0.95 and opacity 0.5.
- Keep the decoration inaccessible to assistive technology and pointer input through the existing scene/container. Failed image decoding must not block scene readiness.

## Acceptance and verification

- Native desktop/mobile captures preserve spacing from the pumpkin and headings.
- Browser checks decode the asset, verify modest scaling and stable eye level, confirm the hidden region matches the background exactly, and cover the static reduced-motion scene.
- The production build, TypeScript phase and scoped lint/style checks pass.
- Run the Halloween-motion and appearance-switch browser suites before publication. Broader browser coverage remains with CI.

No new dependency, cursor interaction, video, web or walking simulation is included.

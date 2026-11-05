# Winter ghost hat

## Current requirements

- Adapt selected reference №4, “Округлая складка”: a rounded red fabric crown, clear curved crease and broad darker fold, low screen-right pompom and padded white/gray brim. Use restrained tones, not a glossy balloon or beanie. Preserve the red mitten and white cuff.
- The hat periodically slips down toward screen-right and tilts clockwise. It obstructs the right eye more than the left; covering both eyes uniformly is no longer required.
- The mitten is invisible at rest. Only after the hat starts falling, it emerges from behind the lower screen-right side of the ghost, initially fingers down, follows an outward/upward arc and rotates its wrist into upward contact with the brim.
- The mitten lifts and straightens the hat, then arcs back, turns fingers down and disappears behind the ghost. It must not remain floating beside the body between corrections.
- The hat starts falling exactly when the ghost begins rising from its lower screen-right turning point, on every second such ascent. Keep a deterministic CSS-only shared phase and the 12-second correction loop; synchronize again when winter is enabled or reduced motion is disabled. The moving head clip must follow the tilted brim so no bare crown protrudes through or above the hat.
- Reduced motion leaves the hat raised and mitten hidden, including when the preference changes live. Original appearance retains its full outline and has neither winter hat nor mitten.
- Preserve existing idle motion, tickling, accessibility and desktop/mobile layout. Use existing SVG/CSS; no dependencies, timers, image assets or new interaction.

## Acceptance

Inspect native-size desktop/mobile rest, emergence, outward arc, slipped/contact, mid-correction and withdrawal poses, plus the unfrozen loop. Verify hidden rest/reduced-motion mitten, downward entering/leaving fingers, screen-right tilt and reach, sustained brim contact, crown coverage, switching and tickling. Reference №4 has been selected; its artwork adaptation and the requested motion are authorized together.

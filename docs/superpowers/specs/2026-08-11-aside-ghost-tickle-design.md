# Aside Panel and Ghost Tickle Design

## Goal

Reduce the visual contrast of the aside panel and add a playful, natural click reaction to the ghost without disrupting its existing idle animation.

## Aside background

- Use the soft charcoal color `#252525` for the desktop aside card and the mobile aside drawer content.
- Keep the existing white text, champagne-gold brand accents, border, and depth effects.
- The panel must remain distinguishable from the root background `#121212`, but it should no longer dominate the page.

## Ghost interaction

The ghost becomes an interactive button while retaining its current rendered size and placement. It must remain keyboard accessible and expose an accessible label describing the playful action.

Each click, tap, Enter press, or Space press restarts one reaction sequence lasting approximately 1.4–1.6 seconds:

1. The left and right boundaries of the ghost body move slightly inward. The ghost does not shake or travel noticeably across the panel.
2. The body repeats this soft inward compression two or three times with decreasing amplitude.
3. The eyes synchronously narrow and reopen two or three times to communicate a quiet giggle.
4. The final body compression is followed by a small, slow settling expansion, like a calming breath.
5. The ghost returns seamlessly to its existing bob, sway, breathe, look-around, and blink idle animations.

The reaction should use smooth easing. Its silhouette deformation and eye movement should feel elastic but restrained, with no abrupt direction changes.

## Animation structure

- Keep the existing idle animation layers intact.
- Add a dedicated interaction state controlled by the `AnimatedGhost` component.
- Apply the tickle deformation to a wrapper around the ghost body so the body and eyes remain spatially coherent.
- Apply the giggling eye animation to the existing eye group.
- Restart the reaction when activated again, including while a previous reaction is still running.
- Remove the interaction state when the reaction animation completes so the idle loop continues normally.

## Reduced motion

When `prefers-reduced-motion: reduce` is active:

- Disable the body deformation and settling movement.
- Use only a brief eye narrowing as feedback.
- Do not start any repeating or displacement animation.

## Testing

Add end-to-end coverage that verifies:

- The aside panel uses the selected soft charcoal background on desktop.
- The ghost is operable by pointer and keyboard.
- Activation starts the tickle animation state.
- A second activation restarts the reaction.
- The reaction state is removed after animation completion and idle animation remains available.
- Reduced-motion mode suppresses body deformation and retains brief eye feedback.

## Scope

This change is limited to the aside background and the ghost interaction. It does not redesign aside content, social buttons, avatar styling, or the ghost SVG artwork.

# Aside Panel and Ghost Tickle Design

## Goal

Reduce the visual contrast of the aside panel and add a playful, natural click reaction to the ghost without disrupting its existing idle animation.

## Aside background

- Use the soft charcoal color `#252525` for the desktop aside card and the mobile aside drawer content.
- Keep the existing white text, champagne-gold brand accents, border, and depth effects.
- The panel must remain distinguishable from the root background `#121212`, but it should no longer dominate the page.

## Ghost interaction

The ghost becomes an interactive button while retaining its current rendered size and placement. It must remain keyboard accessible and expose an accessible label describing the playful action.

Each click, tap, Enter press, or Space press restarts one reaction sequence lasting approximately 1.8 seconds:

1. The left and right boundaries of the ghost body move clearly inward. The ghost does not shake or travel noticeably across the panel.
2. Two or three short curved crease lines appear beside each compressed boundary, making the silhouette look softly folded by the tickle.
3. The body repeats three inward compressions with decreasing amplitude while the crease lines gradually flatten and fade.
4. The eyes synchronously narrow and reopen three times to communicate a quiet giggle.
5. The final body compression is followed by a small, slow settling expansion, like a calming breath.
6. The ghost returns seamlessly to its existing bob, sway, breathe, look-around, and blink idle animations.

The reaction should use smooth easing. Its silhouette deformation and eye movement should feel elastic but restrained, with no abrupt direction changes.

## Animation structure

- Keep the existing idle animation layers intact and keep their DOM nodes mounted throughout the interaction.
- Add a dedicated interaction state controlled by the `AnimatedGhost` component without changing React keys on the idle SVG subtree.
- Restart the reaction on stable SVG elements so repeated activation never resets the current idle animation phase.
- Apply the tickle deformation to a stable wrapper around the ghost body so the body and eyes remain spatially coherent.
- Add dedicated left and right crease groups made from short curved SVG paths. Animate their inward position, curvature impression, and opacity in sync with the body compressions.
- Apply the giggling eye animation to the existing eye group without remounting it.
- Restart the reaction when activated again, including while a previous reaction is still running.
- Remove the interaction state only after the body and crease animations have returned to their exact neutral visual values. Clearing the state must not alter the transform or timing of any idle layer.

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
- The body reaches a clearly narrower horizontal scale during the reaction.
- The crease paths become visible during compression and disappear after settling.
- The reaction state is removed after animation completion and the existing idle animations retain their current nodes and timing rather than restarting from their first frame.
- Reduced-motion mode suppresses body deformation and retains brief eye feedback.

## Scope

This change is limited to the aside background and the ghost interaction. It does not redesign aside content, social buttons, avatar styling, or the ghost SVG artwork.

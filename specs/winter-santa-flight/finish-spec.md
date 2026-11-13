# Individual reindeer and festive finish

## User requirements

- Every deer has its own recognizable leg cadence. A tiny fixed phase offset of an otherwise shared stride is insufficient; the four animals should not repeatedly move together.
- Add visible glowing lights to the antlers, consistent with the winter night palette.
- Make the deer feel less smooth and artificial through short fur detail. This is a lightweight first improvement, not a claim of photorealistic anatomy or simulated hair.
- The first distant pass enters through the top near the right, initially tilted downward, then levels leftward through the center and exits beyond the left edge. This connects logically to the later close pass, which returns from left to right.

Preserve full-viewport flight, lazy loading, reduced motion, suspension, disposal, fixed arc-distance following, connected harnesses, the red cap and usable shell controls. Keep the current 48-second cadence. No paid/downloaded asset, new dependency, unrelated change, commit or deployment.

## Acceptance

Inspect an actual close model render for light placement, soft glow and restrained fur. Inspect several entry frames showing top-border appearance and gradual levelling rather than a sideways appearance or visible flip. Verify distinct deterministic strides, correct joints, finite geometry, resource ownership and model budgets. Entry must be fully outside the upper boundary initially; exits and the close pass retain their horizontal offscreen boundaries. Check desktop and portrait proportions and the existing renderer/lifecycle/browser regressions.

# Towing and living deer motion

## Intent

The deer should visibly pull the sleigh through a turn instead of looking like a rigid formation sliding along one track. Their heads and bodies should participate in the gallop, while the newly accepted detailed appearance remains intact.

## Requirements

- Retain the current two passes, screen entry/exit, timing and foreground/aside layering.
- Let the sleigh follow a slightly different, trailing path through curves, facing the pulling rear pair. Preserve a coherent gap and connected harnesses; straight travel must remain aligned.
- Give every animal modest, smooth head/neck movement and body lift/pitch coordinated with its own existing stride. Avoid synchronized nodding, sharp neck folds and unstable torso deformation.
- Keep the face, antlers, attached lights, bridle and hand reins connected during head motion. Pulling traces remain attached to the chest harnesses.
- Preserve deterministic seeking, pause/resume, reusable resources, lazy/reduced-motion behavior and complete offscreen boundaries.
- Remain within the accepted download and rendering budgets without new runtime dependencies or additional per-frame geometry construction.

## Acceptance

Inspect several actual extended/collected poses and both real flight passes on desktop/portrait. Verify the sleigh differs from the deer track through curves, retains a stable tow gap and points toward the rear pair. Check actual skinned head/antler movement, stable belly/legs, attached lights/reins, independent periods, precise bounds and teardown. Run focused model/trajectory/lifecycle checks, scoped lint/format, isolated production build and desktop/mobile browser checks. Physical-device frame rate is a separate measurement.

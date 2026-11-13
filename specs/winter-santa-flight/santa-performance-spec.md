# Santa performance and costume

## Intent

Santa should look like a living driver responding to the flying team, rather than a rigid seated figurine. Improve his body movement, coat, cap and facial expression while preserving the accepted deer and flight.

## Requirements

- Keep his hips seated and boots supported. Give the upper body visible, restrained sway, with a delayed head response and small independent hand movements that remain attached to the reins.
- Coordinate secondary movement with the sleigh's existing bounce and pitch. Avoid robotic synchronized oscillation, excessive rocking, clipping or a floating driver.
- Keep the face recognizable and anatomical. Add a restrained warmer expression and subtle facial movement where the existing model supports it; do not distort the eyes, nose or beard to simulate a facial rig.
- Give the seated coat convincing compression and elbow folds, and the cap soft secondary movement with a fitted, stationary brim. Preserve matching classic-red matte cloth and white trim.
- Preserve deer assets, anatomy, gait, lights, towing, routes, timings, screen coverage, layering, controls and existing lazy-loading/accessibility behavior.
- Retain one rendering engine/canvas and the current 180,000-triangle/125-draw budgets. Reuse existing dependencies and freely licensed assets. No per-frame geometry rebuilding, new scheduler or background work while suspended.
- Keep team resources independent and dispose each owned resource exactly once. Repeated seeks to the same time must reproduce the same pose, including after Model/flight switching.

## Acceptance

Inspect the actual animated close view, seated driver and full-team flight under current lighting, including contrasting motion extrema and portrait sizing. Check hip/seat contact, head/collar overlap, brim fit, hands/reins and cloth deformation. Verify bounded continuous deterministic poses, attachment endpoints, unchanged source assets, resource ownership and the scene budgets. Run focused tests, scoped lint/format, strict types and isolated production/browser checks without disturbing the existing development server.

Physical-device frame rate and film-quality facial realism require separate evidence and must not be implied by software rendering.

Implementation and acceptance evidence are recorded in the [performance plan](santa-performance-plan.md), the [current model report](model-report.md#current-natural-santa-performance) and the [performance task checklist](tasks.md#santa-performance-and-costume).

Acceptance is complete: 48 focused tests, scoped lint/format, strict types, the isolated production build and six desktop/mobile browser cases passed. Actual close/animated/seated and production Home/portrait views were accepted. The final scene measures 141,707 triangles and 54 draws, within the existing budgets; source assets, the user development server and root build output were preserved. Physical-device frame rate remains unmeasured.

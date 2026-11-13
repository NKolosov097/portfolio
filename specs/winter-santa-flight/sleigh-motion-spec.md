# Sleigh response to flight and towing

## Suspended towing refinement

This requirement supersedes the earlier rotation-only load refinements. The entire sleigh must hang slightly below the rear deer in level flight and drop farther during recovery from descent. The harness must visibly pull upward from the lower sleigh, with the nose above the tail. Translation and heading must describe the same towing arrangement, rather than an independently tilted body on the previous track.

Retain delayed route history, fixed center-to-center towing distance, the existing lively bob/roll, attached reins and harness, deterministic seeking and Model pose. At matched horizontal headings after a descending history, the sleigh must hang lower and point farther upward than after a horizontal history. It must settle continuously on the smooth authored routes. This is a constrained visual towing model, not a claim of a full rigid-body simulation.

## Leveling tail-drop refinement

When the rear deer level out ahead of the still-descending sleigh, the sleigh's tail should drop slightly farther as its nose responds to upward towing. This extra response must fade as their headings align. Preserve the existing downward response, flight bob, roll, route, attachments and Model pose. Keep the additional tilt modest rather than claiming a full rigid-body simulation.

## Stronger flight refinement

The initial vertical motion was too subtle. The sleigh must visibly rise and dip, combining broad floating movement with smaller quicker bounces and accompanying pitch/roll. This supersedes the initial subtle amplitudes below while retaining the route, attachments, Model pose and deterministic seeking.

Over a constant-heading sample, local vertical peak-to-peak travel must exceed 0.4 model units and remain within +/-0.285 around its resting offset. Preserve smooth continuous movement without extra animation state.

## Behavior

The sleigh should feel suspended and pulled by the deer: its nose responds to climbing, descending and leveling, and its body rocks gently during flight. Motion must remain modest and smooth instead of making the whole formation rigid or unstable.

- Retain the current route, delayed sleigh track, cadence, spacing and deer animation.
- Add a visible but restrained body pitch response to climb/descent and to the rear pair changing inclination ahead of the sleigh.
- Add continuous gentle pitch, roll and vertical movement during flight. The seated Santa, cargo, lantern and all sleigh attachments move with the body.
- Reins and towing traces remain attached throughout the movement.
- Seeking a timestamp must reproduce the same pose regardless of earlier frames. Pausing, resuming and switching preview modes must not accumulate motion or introduce discontinuities.
- Preserve the existing subtle Model-mode pose, reduced-motion behavior, resource ownership and allocation profile. Add no dependency or controls.

## Acceptance

At equal timestamps, upward and downward pull produce opposite local pitch offsets relative to level flight. Leveling while the sleigh still descends lifts its nose relative to its towing frame. Flight at a constant heading still has small bounded rocking. Repeated seeks, extreme finite times and both real route passes remain finite and deterministic. Existing attachment and projected-boundary checks continue passing.

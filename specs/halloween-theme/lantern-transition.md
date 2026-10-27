# Lantern behind-back gesture

## Required visual correction

The lantern moves around the ghost's anatomical left side (screen right), then inward behind the actual body silhouette. The lantern must visibly change depth: it is unobstructed in front, travels fully outside the right outline, then disappears progressively under the body as it returns inward behind it. Initial entrance reverses this path. Preserve the final held position, photographic pixels, glow, tickle, reduced motion and continuous rapid reversal. No hand artwork is required for the first visual prototype.

## Visual acceptance

Native-size and 4x entry/exit strips at progress 0%, 25%, 42%, 55%, 72%, 88% and 100% were reviewed and accepted: the lantern turns outside the right outline and returns inward under the body silhouette. Preserve this readable depth change during final checks.

## Exact minimal mechanism

- Delete the rejected fixed right-edge clip and nested lanternArc wrapper/CSS transition. Keep one lantern rendering, its existing registration and inertial/idle-swing wrappers. Do not duplicate its photographic image subtree or fade the complete lantern.
- Wrap its travel group in a fixed userSpaceOnUse luminance mask. Explicit mask bounds x=-12,y=-12,width=48,height=48; white rectangle covers those bounds. A black filled ghost silhouette in this mask occludes only the actual ghost body, including its otherwise transparent interior. This silhouette opacity is the depth track: 0 for front, 1 for rear. No vertical clip curtain remains.
- Use the existing ghost path's OUTER contour as the filled silhouette (exclude the inner cutout subpath). A black copy of the hollow outline is insufficient. Put the mask silhouette under the same sway/breathe CSS classes as the visible body, mounted together, so their idle transforms follow the same phase and transform origin. Both share tickleBody's parent transform. No new timer or per-frame synchronization. The extra mask-only idle animations should be excluded from visible-idle count assertions or counted explicitly; do not disable the ghost's motion to conceal misalignment.
- Use a 900ms native Web Animation for travel, linear global easing with ease-in-out easing on each keyframe segment: progress 0 translate(0,0); .25 translate(3px,-1.2px); .42 translate(5.5px,-2px); .55 translate(5.5px,-2.6px); .72 translate(2px,-3px); 1 translate(-5px,-4.2px). Transform origin stays 0 0. This is front outward arc, short outboard turn, then inward rear leg; final rear bounds lie inside the filled silhouette. Preserve current held registration at progress 0.
- One matching 900ms mask-depth animation: opacity 0 at 0 and .42, opacity 1 at .46 and 1. At the tighter outboard turn, a small portion of glow or frame may begin to pass behind the body during the depth switch. This is acceptable when it reads as local body occlusion: the photographic lantern itself must never fade uniformly. The user's closer-path request supersedes the old requirement that switching depth change no pixels.
- Create these two animations once for mounted nodes, initially paused at their hidden endpoint (currentTime=900), fill:both. When the requested endpoint already equals currentTime, explicitly pause both tracks and set that endpoint, even without reduced motion; otherwise an opposite pending play can survive a same-task reversal. They form one gesture progress and receive identical currentTime/playbackRate/play commands in the same effect. Presence sets direction -1 for entry toward 0, +1 for exit toward 900. On reversal, use their current shared time, update direction and resume; do not recreate from start or discard progress. Initial original remains at hidden endpoint without running an exit. Initial Halloween starts entry only after the existing image-ready gate. Keep separately cancelable inertia inside travel, independent of depth. Remove alternating rotation during travel: it caused an extra left-right shake at the outboard turn. Exit only eases the captured current pose to rotate(0deg) over 90ms, with no overshoot. Entry reads remaining travel milliseconds from the existing gestureTravelRef currentTime, clamped to 0–900, and uses total duration remaining+250ms with linear global easing. Start at the captured pose; when remaining>0, reach zero rotation at min(90,remaining)ms and hold zero through arrival at remaining ms. Then settle gently through +5deg at arrival+70ms, -2deg at arrival+165ms, and zero at arrival+250ms. Normalize these times into keyframe offsets. When remaining is zero, omit the zero-time neutral frames so the captured pose remains continuous. Per-keyframe ease-in-out may soften the small settling motion without moving its timing. No extra state, controller or travel/depth changes. Snapshot current inertia into inline style before detaching completion and canceling on reversal; clear inline transform on normal finish. Pause the underlying gentle idle swing in original appearance rather than removing it, preserving its phase.
- Retain refs to these two owned Animation objects only; no added presentation-state machine. StrictMode cleanup cancels both and clears their refs. Reduced motion immediately pauses and sets both currentTime to the desired endpoint, including a live media change. Re-enabling motion does not replay entry. Cleanup removes the media listener and cancels owned animations. Do not let CSS transitions compete with the travel Web Animation.

## Focused acceptance after visual approval

At progress .42 and .55, the lantern must be visible outside the right outline; at .72 it must be partly occluded by the body as it moves inward; at 1 no lantern pixels remain. Compare final hidden pixels against visibility:hidden on its subtree. The shown frame must match the prior held geometry without clipping. The reverse sequence must draw it from behind the silhouette around the same side, never from the middle of the transparent face. Check mask alignment during idle/tickle, rapid reversal continuity, initial original/Halloween, asset fallback and initial/live reduced motion on Chromium/WebKit desktop/mobile. Run focused Chromium/WebKit desktop/mobile regression checks after the accepted visual prototype; report actual outcomes separately.

## Readiness and lifecycle

Read appearance from the existing context. Keep the lantern subtree mounted throughout entry and exit. Initial presence is false until its AVIF decode succeeds or the matching WebP fallback attempt settles; retain active cleanup guards and key the shared image definition by its resolved URL to avoid stale SVG use renderers. Initial original remains fully masked without running an exit. A failed fallback is not retried. Preserve brightness, clipped glass flicker and image registration.

On initial or live reduced motion, immediately settle both gesture tracks at the desired endpoint, cancel finite inertia and disable idle swing/light motion. Re-enabling motion does not replay entry. Cleanup cancels owned animations and removes media listeners; old completion callbacks cannot affect a newer gesture. Tickle remains on its existing independent parent/eye transforms. Include same-task endpoint reversal, mid-gesture reversal, unmount, fallback, masked hidden-pixel equality and unchanged shown-pixel geometry in focused checks.

## Outboard motion refinement

The accepted path, mask, 900ms travel timing, hidden endpoint and existing gentle idle swing remain unchanged. The large finite alternating rotation was the cause of the unwanted shake: the former alternating inertia occurred during the outboard turn in both directions. Inspect a short native/4x sequence around those phases and around arrival before focused regression tests. The finite inertia wrapper must stay neutral during the turn, then show only the small entry settling motion after reaching the held position. Check one mid-gesture reversal and reduced motion; do not rerun an unrelated full matrix solely for this table change.

## Closer, faster tuning

Prototype the new 5.5px maximum reach first (previously 7px), with 900ms travel (previously 1200ms), and the 250ms entry settling tail. Compare native-size and 4x sequences before focused checks. Preserve the accepted body-mask mechanism, path shape, final held/hidden registration and existing small idle swing. Local edge occlusion during the outboard turn is allowed; do not preserve an internal zero-pixel depth-switch criterion at the expense of the requested shorter reach. If the 5.5px prototype creates an artificial frame disappearance, use 6.2px for the two apex poses only after visual comparison. No new controller, geometry wrapper, extra lean or opacity animation. Update existing duration-derived assertions and run only the relevant focused gesture checks after visual acceptance.

## Continuous travel

After the reach was shortened to 5.5 units and travel to 900ms, the arc read as four stops rather
than one gesture. A per-frame measurement of the live travel transform confirmed the cause before
any edit: speed collapsed to roughly 1.4 units per second at 180ms, 337ms, 445ms and 602ms - one
standstill at every waypoint - because each keyframe segment carried its own `ease-in-out`, which
forces zero velocity at both of its ends. Peak speed also swung about sixfold between segments,
since the short outboard turn held 13% of the timeline while the long rear leg held 28%.

The correction keeps the accepted path, the 5.5-unit reach, the 900ms duration, the mask mechanism,
the hidden endpoint, the reversal handling and the 250ms entry settling tail. Only the timing
changes:

- Remove every per-keyframe easing from the travel track and apply one `ease-in-out` envelope over
  the whole 900ms instead, so the gesture accelerates once and decelerates once.
- Distribute keyframe offsets by path arc length - 0, .189, .343, .378, .584, 1 - so each segment
  receives time in proportion to the distance it covers and no joint changes speed.
- Give the depth track the identical duration and easing, and move its switch to offsets .35 and
  .375 so it still completes while the lantern sits at the outboard apex.

Measured result across the full timeline at 2ms resolution: speed rises smoothly from rest to about
33 units per second, holds that cruise through the turn and the rear leg, then tapers back to rest.
The only remaining frame-to-frame speed change is a single sample straddling the apex corner, which
is a chord-measurement artifact rather than motion. Translation now glides to a halt immediately
before the rotational settle begins, so the two read as one movement.

Keyframe offsets are no longer timeline fractions, so focused checks seek the eased positions of the
waypoints: 0, .301, .41, .427, .549, .78 and 1. A speed-continuity check guards the regression
directly by sampling the paused travel track and asserting the cruising middle never drops below
60% of its peak.

## Immediate start and carried inertia

Two further corrections, both inside the existing 900ms gesture and the accepted path.

The symmetric `ease-in-out` envelope spent its first 180ms below half speed, covering 0.42 units -
about one pixel at mascot size - so stowing read as a pause before anything happened. Replace it
with `cubic-bezier(0.15, 0, 0.7, 1)`: a short ramp-in reaches half speed in roughly two frames and
1.37 units by 100ms, while the longer tail still brings the lantern to rest without a snap. Peak
speed drops from 33 to 25 units per second, so the motion is calmer as well as more immediate. On
entry the envelope is reversed, which puts the slow part where the lantern is still hidden behind
the body and the quick part at arrival, feeding the existing settling tail.

A hanging lantern also trails the hand that carries it, and the travel group alone could not express
that: its origin is the viewBox corner, not the handle. Add a third track on its own group between
the lantern and the settling wrapper, sharing the handle pivot with the idle swing. It is driven
with the same currentTime, playbackRate and play commands as travel and depth, so reversal, reduced
motion and cleanup need no separate handling.

Its offsets are plain time fractions on a linear track, because a lag answers to acceleration rather
than to distance along the path. It holds exactly zero through the outward leg and the outboard
turn, honouring the earlier rejection of a swing there, then builds to -5 degrees as the hand sweeps
the lantern left behind the back, crosses back through zero and settles. The build-up and the
crossing both fall inside the window where the lantern is still drawn: it is fully occluded only
past 72% of the gesture, and the swing peaks at 53%, with the lantern at x=1.8.

Waypoint seek fractions move with the envelope, to 0, .204, .33, .347, .5097, .75 and 1. Two focused
checks guard this: one asserts the travel covers more than one unit in its first 100ms and never
drops below 60% of peak speed through the cruise, the other asserts the lag is neutral at rest, on
the outward leg and at the turn, negative on the rear sweep, and back to zero at the end.

## Settling without a pause

Held in front of the ghost, the lantern began its settling shake a few frames after it had already
stopped, which read as a separate twitch rather than as part of the stop. Per-frame measurement
placed the travel at rest around 997ms and the first rotation at 1031ms, reaching one degree only
near 1035ms.

The cause was the easing on the segment that leaves neutral: `ease-in-out` starts at zero angular
speed, so the lantern stood still while the curve built up. A pendulum does the opposite - its
angular speed is highest at the instant the support stops, and zero only at the extremes of the
swing. Switch that one segment to `ease-out` and start it `SETTLE_LEAD_MS` before the hand finishes
its last crawl, because the lag builds while the hand is still slowing rather than after it has
stopped. The peak, the rebound and the total length are unchanged, and the remaining segments keep
`ease-in-out`, which is correct between two extremes.

The lead is clamped to the neutralisation window, so a reversal that leaves little travel still
finishes neutralising a leftover pose before the swing starts rather than reordering keyframes.

Measured after the change: the travel reaches rest around 960ms with the rotation already at 0.5
degrees, 2.6 degrees twenty milliseconds later, and the same five-degree peak. Two focused checks
cover it - the initial-Halloween case pins the full lead by asserting neutral at arrival minus 40ms
and clearly past neutral at arrival, and the short-reversal case asserts the swing has begun by
arrival without depending on how much travel was left.

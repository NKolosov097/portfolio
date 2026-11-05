# Implementation plan

## Scope

Update `AnimatedGhost.tsx`, its CSS module and active `e2e/winter-appearance.spec.ts`. Adapt the hat artwork below; preserve mitten geometry, brim dimensions, existing IDs and nonwinter behavior. Preserve unrelated work and archived Halloween assets/tests. The user selected reference №4; implement its adaptation together with the motion.

## Selected artwork: reference №4

Visual reference: [Santa hat by BabyCorn, Flaticon #9019318](https://www.flaticon.com/free-icon/santa-hat_9019318), selected from the [actual-image contact sheet](reference-board.png). Adapt the rounded fold in original SVG; do not ship the reference PNG as a runtime asset. Mirror its left droop to screen-right. Keep the brim's existing rect `(1.5,3.8,13,1.5,rx.7)` as the actual visible base and stable contact geometry.

- Replace the current short cap with a rounded, asymmetric fabric bulb: `M2 4.25C1.65 2.65 2.1.45 3.8-.6C5.85-1.9 9.25-1.5 11.15.15C12.65 1.45 13.25 3.25 14.2 3.85C13.8 4.65 12.2 4.7 11.7 4.15Q7.5 4.8 2 4.25Z`, fill `#dc2429`. It is taller than the current flattened cap but remains compact at50px.
- Add a broad side-fold shadow: `M11.15.15C12.65 1.45 13.25 3.25 14.2 3.85C13.8 4.65 12.2 4.7 11.7 4.15C12.6 3.6 12.1 2.1 11.15.15Z`, fill `#b51923`. Add a curved crease `M10.1 1.05C11.65 1.8 12.1 2.95 12.25 3.9`, no fill, stroke `#7f1720`, width.22, rounded caps. Remove the old bright highlight stroke and hat radial red fill; keep the red gradient only where the existing mitten uses it.
- Preserve the white base brim rect and use restrained stops `#fff` at0%, `#f1eeee` at65%, `#bfc2c7` at100%. A shallow lower-band shadow `M1.6 4.8Q7.8 5.15 14.4 4.8Q14.2 5.3 13.8 5.3H2.2Q1.8 5.3 1.6 4.8Z`, fill `#c4c6ca`, makes the padding readable without changing its bounds or adding an invisible geometry helper.
- Lower the white pompom to `(14.25,3.85)`, radius1.2, keeping its test ID and restrained white/gray shading. Add a thin `#85888f` outline with width0.12 so the pompom remains distinct from the brim at native size. Draw it after the brim so the padded band does not cut its circle. This sits low beside the fold while leaving brim-local contact `(13.3,4.8)` outside the pompom. Draw the mitten after all hat artwork.

Inspect the chosen-reference likeness at native50px and enlarged size: rounded fabric, explicit inward crease, low side pompom and padded band. These are independent paths inspired by the selected example, not a traced asset. Retain all motion/contact/clipping instructions below.

## Shared winter clock (latest timing requirement)

Keep the artwork, hat/hand/reveal keyframe percentages and all motion geometry below. Synchronize only winter idle timing with the12s sequence; do not add timers or remount the SVG.

- Add an instance-local winter class to the existing SVG in the same React render that mounts the winter artwork. Use this class for winter-only idle overrides, avoiding dependence on separate document-attribute updates.
- Winter bob and breathe: duration3s, delay-1.5s, existing easing/amplitudes. Winter sway: duration6s, delay0, existing rotation curve (0deg at0/100%, -3.5deg at25%, +3.5deg at75%).
- Give winter bob/sway/breathe distinct animation names with the same small keyframe bodies as their original counterparts. Changing only duration/delay would retain the old idle animation epoch after an appearance toggle, while the newly mounted hat starts a fresh epoch. Different names restart the idle cohort with the four mounted winter sequence tracks. Preserve original animation names/timings outside winter and preserve existing WAAPI refs.
- Add delay-0.3s to ALL FOUR winter sequence tracks: hat, crown clip, mitten and hand reveal. Declare delays after any animation shorthands so they are not reset. Every sequence starts in its harmless resting2.5% phase.
- Extend the reduced-motion overrides with selectors of matching specificity to the new winter idle rules. All idle and winter tracks must be disabled together; the hat stays raised and mitten hidden. Restoring motion starts the cohort together again.

Phase proof: bob lower turns occur at global1.5+3n seconds. The sway's negative extremum at1.5+6n seconds shifts the body center screen-right because its pivot lies above the center (positive rotation would shift it left). Thus right-side ascents begin at1.5,7.5,13.5,19.5 seconds. Hat fall begins at12\*.65-.3=7.5 seconds, then19.5,31.5: skip/fall/skip/fall on those right-side ascents. Bob, sway and breathe all have zero velocity at the turn; after it the visible body moves upward. This preserves the existing idle shapes while making their phase deterministic.

Add a finite clock regression that sets every owned bob/sway/breathe/sequence animation's currentTime to the SAME global milliseconds, preserving each effect's CSS delay. Freeze only unrelated eye/lantern idle loops. At1.5,7.5,13.5,19.5 seconds and just before/after (approximately100ms), check that the ghost-body center is lower at the turn than either neighboring sample and moves upward afterward; verify screen-right using transformed body coordinates relative to the lower-left turn at4.5 seconds. Assert the hat remains neutral around the first/third right turn and begins clockwise/downward motion immediately after the second/fourth. Compare actual SVG matrices/points, not just configured durations. Repeat phase assertions for a new winter cohort after original->winter switching, and retain live reduced-motion restoration coverage.

For existing cycle-relative pose sampling, set each of the four sequence currentTime values to `fraction * duration + effect.getTiming().delay`; otherwise adding the negative delay silently changes every sampled pose. The global-clock regression deliberately uses currentTime=globalTime instead. Keep this distinction explicit in the two helpers.

## Hat and crown clip

Use `transform-box:view-box` and `transform-origin:8px 4.55px` for both the hat and its existing animated clip rect. Their transform lists and easing must be identical:

- 0%,65%,86%,100%: `translate(0,0) rotate(0deg)`.
- 76%,80%: `translate(.6px,1.2px) rotate(14deg)`.

Keep the 12s ease-in-out loop. Positive rotation is clockwise in SVG screen coordinates; translation occurs after rotation in this transform list. The existing clip rect starts at local y5.3 and stays in defs; its transformed upper edge follows the entire tilted brim bottom. Do not use a separate vertical-only clip or change idle transform origins.

The brim-local contact point is `(13.3,4.8)`. With pivot `(8,4.55)` it becomes approximately `(13.681,7.274)` in the slipped pose and returns to `(13.3,4.8)` when raised. The tilted brim reaches the right eye while leaving the left substantially clearer.

## Mitten arc and wrist

Keep the existing mitten geometry and set its animated group's origin to `14.1px 10px`, with `transform-box:view-box`. Use transform order `translate(...) rotate(...)`, so rotation turns the wrist without rotating its translation. Use these positions (translations are relative to the existing origin):

| Percentage | Translation    | Wrist angle | Meaning                                      |
| ---------- | -------------- | ----------- | -------------------------------------------- |
| 0,70       | (-.5,1)        | 180deg      | Hidden behind lower right body, fingers down |
| 75         | (1.8,1)        | 145deg      | Emerges outward, still pointing mostly down  |
| 78         | (2.6,-1.4)     | 65deg       | Fully outboard, sweeping upward              |
| 80         | (-.419,-2.726) | 14deg       | Contacts the tilted right brim               |
| 86         | (-.8,-5.2)     | 0deg        | Lifts brim back to its resting position      |
| 89         | (2.6,-1.4)     | 65deg       | Withdraws outward                            |
| 92         | (1.8,1)        | 145deg      | Turns downward beside body                   |
| 94,100     | (-.5,1)        | 180deg      | Tucks behind body and disappears             |

Use linear interpolation for travel/wrist keyframes so the outboard waypoints do not each become a full stop. Override easing at80% to ease-in-out for80..86%, matching the hat correction. The small nonlinear difference between the two interpolated contact paths remains below0.05 SVG units. The arc stays within approximately x18, clear of the title. Set opacity0 through70%, opacity1 from73% through92%, then opacity0 at94..100%; set the underlying CSS pose to hidden/fingers down so reduced motion naturally rests there.

## Behind-body reveal

Opacity alone must not make a mitten appear through the hollow ghost. Wrap the animated mitten group in one stationary group inside the existing breathe/sway group, after the hat. Apply a unique winter-only `clipPath` to this stationary wrapper; never apply this reveal clip to the moving/rotating mitten group.

The reveal definition is a rect `(x=15,y=-8,width=32,height=40)` with test ID `aside-ghost-winter-hand-reveal`. At first it exposes only the area outside the ghost's screen-right silhouette. Animate its x translation using a separate12s `steps(1,end)` track: transform0 at0%, transform-23px at78%, hold-23px at89%, transform0 at90%, hold0 through100%. This opens the gate only once the mitten is wholly outboard, allowing it to reach inward over the brim; it closes while the returning mitten is still outboard, before the tuck. All large reveal geometry stays in defs and does not enlarge visible fill-box bounds. Keep the hand's existing test ID on the inner moving group.

Disable all winter tracks in the reduced-motion rule. Unlike the raised hat and crown clip, the mitten's base transform is the downward stowed pose and opacity0; do not assert transform:none for it. The reveal gate rests closed. Conditional mounting removes every winter-only definition and wrapper in original appearance.

## Verification

Seek all four winter tracks together: hat, crown clip, mitten, reveal rect. Freeze unrelated infinite loops only; preserve finite stowed lantern tracks and finish the mobile drawer entrance. Replace old whole-eyes coverage and always-visible-hand assertions with right-biased tilt, opacity/occlusion, wrist direction and phase-specific contact checks. Test hidden rest through65%, emerging75%, outboard78%, contact80%, lift83/86%, withdrawal89/92%, hidden94/100%, initial/live reduced motion and appearance switching.

For rotated geometry, compare the crown clip line and brim bottom at TWO shared local x coordinates using each element's own CTM; do not compare to bounding-rectangle bottom. Use precision4 for CTM coordinate comparisons: Firefox demonstrated a harmless6.4e-6px discrepancy, narrowly outside precision5. Do not compare SVG geometric edges to inflated browser bounding rectangles. Check the mitten center mapped into brim-local coordinates stays within0.1 SVG units of(13.3,4.8) during80..86%. At the slipped pose map eye centers into brim-local coordinates to verify the right eye lies under the brim and the left stays below it; freeze eye look/blink for this assertion. Require the reveal gate closed at75/92% and open throughout80..86% contact. At exact step-switch outboard poses78/89%, either adjacent gate state is acceptable; cross-browser step-boundary rounding does not affect the already-outboard mitten. Inspect actual native-size occlusion and finger orientation.

Run type check, scoped lint/format, existing three tickle tests, build and winter suites on Chromium desktop/mobile, Firefox and WebKit. Inspect native poses and one unfrozen loop, including tickling. Preserve unrelated scratch files; full-lint's known scratch-output limitation remains outside this change.

The prior matrix had unrelated WebKit snow-canvas absence under load; rerun those existing field tests in isolation if needed, without changing snow code for this task.

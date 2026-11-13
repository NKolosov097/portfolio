# Natural heading snow: specification and implementation plan

Status: complete. All 31 positional glyph occurrences passed integrated review, alongside the six-profile browser matrix, centralized lifecycle checks, exact endpoint comparisons and production build.

## Specification

Snow must accumulate as a supported, progressively thickening mound and melt continuously back toward its support. Preserve the approved complete English and Russian decoration: every visible path, material, gradient, shadow, opacity, patch count and size, including the large clean-edged Latin k/K banks. Preserve live selectable text, accessible heading name, wrapping, counters, separate dot/stem shapes and the final-letter sparkle.

Ordinary exposed roofs begin on real ink with a shallow curved crest. Higher crown/shelf surfaces accumulate before their steep descending shoulders. Deep retaining banks fill upward from their lowest actual supporting floor. Lower lobes appear only after their supporting body has developed, remain attached, and retreat with it. No embedded white seed, airborne tip, long early shoulder stripe, moving rectangular waterline, radial crest collision or body/lip hairline is acceptable. Separate deposits on distinct supported portions of a multi-crown run are valid; do not require every partial mask to have one connected component.

Keep a 300ms wait for winter color before increasing snow and a 2,000ms full phase traversal in either direction. Melting starts immediately. A reversal preserves the displayed state and traverses only the remaining phase at the same speed. New geometry starts hidden until font readiness and the existing arming boundary; initial/live reduced motion settles immediately to the requested endpoint. Locale changes, pending preparation and rapid toggles must not produce stale snow or a full-size flash. Tiny initial mobile layers may be subpixel-thin, but by .15–.3 the deposit should read as a raised mound without enlarging its approved endpoint.

Scope: SnowText, its runtime geometry, heading-specific browser checks, this specification and the authorized standalone preview. Preserve the Canvas particle field, garland, Home layout/callers, dependencies and unrelated changes. No commit, deployment, font replacement, glyph-specific animation table or new lower decoration is part of this task.

### Evidence and physical interpretation

Radial masks currently start at support plus the final contact overlap, revealing dots inside ink. Their advancing arcs also collide with fixed crests and reveal steep shoulders sideways. Contour-based temporary previews remove those defects. A full-body hold in an earlier preview froze initial melting; touching body/lip masks caused an antialiasing hairline. Continuous body motion and a small interior union overlap corrected those two prototype defects.

Deposited snow consists of grains which evolve and bond; wind redistributes deposits and builds attached overhangs. These facts support supported cohesive masses. They do not prescribe these glyph shapes or numeric animation constants. See [NSIDC snow science](https://nsidc.org/learn/parts-cryosphere/snow/science-snow), [bonding and sintering](https://avalanche.org/avalanche-encyclopedia/snowpack/snow-metamorphism/bonding-or-sintering/), [SLF cornice research](https://www.slf.ch/en/news/beautiful-but-dangerous-how-cornices-are-formed/) and the [original wind-tunnel study](https://tc.copernicus.org/articles/17/639/2023/). Real melting follows energy exchange, not necessarily reverse snowfall; see [USACE snowpack accounting](https://www.hec.usace.army.mil/confluence/hmsdocs/hmstrm/snow-accumulation-and-melt/snowpack-mass-and-energy-accounting). The rounded profiles, high-support exposure order, two-second clock and exact reversal below are deliberate UI heuristics.

## Implementation plan

### Files and interfaces

Modify:

- `src/home-sections/Home/components/SnowText/snowGeometry.ts`: retain all visible builders, prepare cached mask keyframes and remove ellipse metadata/helpers.
- `src/home-sections/Home/components/SnowText/SnowText.tsx`: render polygon-clipped mask rectangles and own native animations per prepared fragment.
- `src/home-sections/Home/components/SnowText/SnowText.module.css`: remove scale transitions and obsolete animation selectors; retain typography, positioning, selection and materials.
- `e2e/winter-heading-snow.spec.ts`: replace ellipse-specific helpers/assertions with actual native polygon state and physical mask checks.
- This file: record final convergence and verification. The intermediate standalone preview is archived outside the repository; its public page redirects and links to the current heading on `/`. No second runtime renderer is retained.

Keep the public `SnowText` props, `SnowPart`, `SnowGlyph`, `createRasterContext()` and `prepareSnowGlyph(ctx, ch, part, index)` signatures. Retain existing visible-path metadata. Replace only reveal data:

```ts
export type SnowMotionKind = 'cap' | 'basin'
export type SnowMaskKeyframe = {
  offset: number
  clipPath: string
}
export type SnowProfileColumn = {
  x: number
  support: number
  top: number
  bodyBottom: number
  fullBottom: number
}
export type SnowContactLayout = {
  fontSize: number
  pixelRatio: number
  glyphLeft: number
  baseline: number
  svgLeft: number
  svgTop: number
}
// Existing SnowPath fields d/material/pocket/corner/hasExtraLip remain.
type SnowRevealFields = {
  motion: SnowMotionKind
  profile: { columns: SnowProfileColumn[]; minSupport: number }
  bodyKeyframes: SnowMaskKeyframe[]
  lip?: {
    bodyD: string
    keyframes: SnowMaskKeyframe[]
  }
}
```

Use these fields directly in `SnowPath`; `SnowRevealFields` can be an internal Pick/return type, not another runtime wrapper. No `any`. Add intent comments above functions and complex effects; use numeric separators for four-digit integer parts.

Internal geometry contracts:

- `BuiltSnowPatch = { path: string; hasLip: boolean }`.
- `buildRevealFrames(ctx: CanvasRenderingContext2D, patch: BuiltSnowPatch, run: readonly Point[], motion: SnowMotionKind, overlap: number, size: Pick<Outline, 'cw' | 'chPx' | 'padding'>): SnowRevealFields`.
- `prepareSnowContact(ctx: CanvasRenderingContext2D, glyph: SnowGlyph, ch: string, layout: SnowContactLayout): SnowGlyph` returns the same fixed geometry with new cap body/lip keyframes. It never mutates the cached input, its profile columns or basin keyframes.
- `serializeMask(top: readonly Point[], bottom: readonly Point[]): string` returns `polygon(...px ...px)`, top left-to-right then bottom right-to-left.
- Replace `buildLateLip` with `hasLowerBulge(run: readonly Point[], bottom: readonly Point[], overlap: number): boolean`, using the existing test `bottom[i].y > run[i].y + overlap + 0.000001`. Builders return that flag without constructing a duplicate upper contour. Remove the old center/bounds/ellipse work, `buildGrowthEllipse`, `fitGrowthEllipse` and unused builder bounds.

### Preparation and exact envelope

Choose one-time bounded native Path2D raster extraction, matching the reviewed preview. It is smaller than adding an SVG parser or parallel C/Q curve interpreter, and preserves the builders' complete paths exactly. It samples already-built snow, not the font again.

1. Keep the existing fixed 200px Inter 700 outline sampler and all visible path formulas untouched, except for its failed-context branch: in sampleGlyphOutline, a missing secondary glyph raster context throws before writing either cache; the existing fragment catch leaves plain text. Legitimately empty sampled outlines, including spaces, remain valid cache entries. Cache completed SnowGlyph results by `JSON.stringify([ch, part, index])` after successful preparation, in addition to the existing outline cache. This fixed-content cache avoids repeating mask raster/keyframe preparation on toggles and repeated locale visits. A failed preparation must not cache an invalid result. No new cache invalidation system: font and text contract remains the existing fixed one.
2. For each built patch, resize the supplied preparation canvas to `2*cw` by `2*chPx`, reset transform to scale(2,2), fill the full `Path2D(patch.path)`, then read pixels once. Canvas state is local to preparation; restore/reset it explicitly before reuse. For each integer source column x, inspect both subpixel columns and all raster rows. Alpha > 5 counts as covered.
3. Let lo be minimum covered row/2 and hi maximum (covered row+1)/2. Keep one point at x+.5 with top T=lo-1 and full bottom B1=hi+1. Omit empty columns. Prepend a copy of the first point at firstX-1 and append a copy of the last at lastX+1. This is the same one-source-pixel coverage margin used in the reviewed prototype. Do not add this margin to the zero support. An unexpectedly empty envelope throws to the existing guarded fragment preparation, leaving plain live text rather than caching invalid coordinates.
4. Interpolate actual support S(x) linearly between the run's sorted samples. Outside the run, use its nearest endpoint y; this covers existing retaining-wall overshoot without inventing an extra support. Use the corrected straight supportRun already supplied for Latin k/K corners.
5. For a non-lip patch, B0=B1. For an actual lip, B0=S+the existing overlap: 5 only for fuller first-name ordinary runs, otherwise 3. Build the floor-only bodyD clip specified below, retaining the exact original unbulged floor. Keep the entire full-path envelope grid for both body and late masks so correspondence and wall coverage are stable.
6. All keyframes for one mask use the identical x grid, vertex count, ordering and unrounded finite source coordinates. Raster envelopes are only reveal bounds; the unchanged visible path remains the final clipping silhouette. Full-mask coverage must pass the physical gate below; do not relax the threshold or silently reshape visible d to fix a failed bound.

The fixed cache is prepared only after exact font readiness, during the existing cancellable idle work. Retain each envelope column's S/T/B0/B1 and min(run.y) as profile metadata so layout-dependent contact preparation does not repeat full-path sampling. Native contact profiles are not globally cached by character; repeated occurrences have different physical pixel positions. There is no per-frame canvas work or React state loop.

### Contact with the actual laid-out text

The fixed 200px support does not always coincide with native text at 50.3/80px. Firefox exposed an actual background row between partial snow and ink; the full path's overlap hid that registration difference at full growth. Disabling optical sizing changes the text and is rejected. Arbitrary padding, a guessed baseline and selecting the top rather than the center of an ink pixel also failed the measured cases.

Prepare native contact once per occurrence/layout, after its fixed glyph SVG is committed and before normal arming. Keep Inter 700, optical sizing, text dimensions, full visible d and fixed T/B0/B1 unchanged. Use the following proven algorithm only for caps; basins retain their existing C.

1. Measure the glyph's actual computed font size f, current DPR D, glyph-left X, SVG bounds origin (L,U), and live alphabetic baseline A. Obtain A with a temporary zero-width/zero-height inline-block marker aligned to the baseline, appended and synchronously removed in a finally block. Reset its margin/padding/border to zero. One marker measurement may serve the glyphs sharing a SnowText baseline. Do not infer A from fixed em coefficients or assume the diagnostic value 212. Read each glyph's size/left and SVG origin; enlarged diagnostic glyphs can differ in size from their word.
2. Set s=(f/200)*D, phiX=fract(L*D), phiY=fract(U*D). Allocate a bounded canvas ceil(cw*s)+2 by ceil(chPx\*s)+2. Reset its transform, translate by phiX/phiY, scale by s, set font `700 200px Inter` and alphabetic baseline, and draw ch at source coordinates ((X-L)/(f/200),(A-U)/(f/200)). Keep the source font at 200px: native-sized font drawing introduced fractional-size quantization in the measured Firefox case. No full-viewport canvas is needed.
3. At each existing profile x, sample native column floor(phiX+x*s), clipped to canvas bounds. Expected row Y=phiY+S(x)*s. Search rows floor(Y)-3 through floor(Y)+4, clipped to valid rows. A candidate requires alpha[row]>=128 and alpha[row-1]<128 (outside the canvas is transparent); an already-ink row is not a new supporting surface.
4. Convert each candidate core-row center to source coordinates: candidate=(row+.5-phiY)/s. Keep only candidates inside this patch's fixed [T(x),B0(x)]. Choose the candidate row nearest Y; ties keep the upper one. If none qualifies, retain original S(x). Do not clamp a wrong surface into the patch, use the first ink pixel indiscriminately or search farther: native pixels can merge an adjacent stem/shelf.
5. This result is the cap's collapsed contact C. Keep shoulder exposure r derived from ORIGINAL S and minSupport. Rebuild cap upper as `C+h(q)*r*(T-C)`, lower as `C+q*r*(B0-C)`. Both coincide at zero; full remains T/B0. For a cap with a lip, rebuild late E using this same C. Do not leave its lobe attached to an obsolete source-only floor.

This is contact calibration of an existing outline, not a different visible snow shape or font system. The current heading is untransformed; the measured bounds/em mapping is the tested contract. Do not add arbitrary-transform handling. A future transform changing that mapping requires explicit validation.

Own the latest calibrated result and normalized layout signature per mounted glyph, not an unbounded cache of resize widths. The signature includes f, D, (X-L)/(f/200), (A-U)/(f/200), phiX and phiY; preserve each occurrence's identity. Use one ResizeObserver per SnowText for size/line-height changes, a window resize notification for reflow/position changes during viewport resize, and a resolution matchMedia listener re-armed after DPR changes. Coalesce notifications with at most one cancellable frame callback per burst and skip unchanged signatures. These are layout events, not an animation loop.

On same-text recalibration, rebuild only contact/keyframes and update existing effects in the same task. Do not regenerate fixed d/envelopes, re-arm geometry, reset phase, replace Animation objects, restart a color wait or trigger React renders per frame. A failed resize preparation leaves the previous valid profiles intact and its old signature eligible for a later retry. Failed initial contact preparation leaves hidden decoration and live text, never a cached invalid native profile. Disconnect observers/media/window listeners and cancel any queued measurement on locale replacement/unmount.

Position-only scrolling does not trigger sampling. Retained profiles passed small position/scroll changes at integer and fractional DPR; this is a bounded visual policy, not exact pixel-phase invariance. After deliberate fractional shifts, the first/last 10–20ms can show a faint edge tint inside ink (observed maximum about 24.1% contribution), reaching the edge by the sampled 40ms frame. It is not the former opaque embedded bead or separating arc. Preserve the no-gap gates at .05/.15 and do not introduce a scroll/frame loop to eliminate this rasterization limit.

### Physical motion classification

Assign role at the builder call site, independently of QA markers:

| Existing surface                                                          | Motion |
| ------------------------------------------------------------------------- | ------ |
| Every buildRunPath output, including the ordinary lowercase k arm deposit | cap    |
| Latin t stem and both crossbar buildRecessPath outputs                    | cap    |
| All ordinary Cyrillic crowns and shelves                                  | cap    |
| N/k/K buildCornerPath outputs                                             | basin  |
| Only v's deep buildRecessPath output                                      | basin  |

Keep pocket/corner/hanging/extra-lip markers unchanged. Cyrillic lookalikes do not acquire Latin special banks or lips. All actual lower bulges remain staged: the existing m/a/s/first-o hanging deposits and N/k/K/v interior lobes. Use actual optional lip metadata, not a hardcoded cross-engine count.

### Body profiles

For each x grid point, define initial collapsed contour C:

- Cap: C is the measured native contact described above; the initial source-only profile uses C=S until that preparation completes while hidden.
- Basin: yLow=max(run.y); collect support samples with y >= yLow-1, choose the actual sample nearest the midpoint of their x range (first wins ties). Its x is anchorX. Let R=max(1,max(abs(x-anchorX))) over the envelope grid, and bow=.35*(lastRunX-firstRunX). Set `C=yLow+bow*((x-anchorX)/R)^2`. This is a curved zero-area contour at/below the lowest floor, not a band laid along the entire incline.

Basin body: exactly two keyframes, offsets 0 and 1:

```text
upper(q,x) = C + q*(T-C)
lower(q,x) = C + q*(B0-C)
```

Caps: use exactly nine offsets `[0, .05, .1, .15, .2, .3, .45, .6, 1]`. h(q) is piecewise linear through `(0,0), (.1,sqrt(.1)), (.3,sqrt(.3)), (.6,sqrt(.6)), (1,1)`. Evaluate that existing interpolation at additional knots; do NOT use fresh sqrt(q) there.

```text
d(x) = clamp(S(x)-min(run.y), 0, TOP_BAND_PX)
a(x) = .6*d(x)/TOP_BAND_PX              // existing TOP_BAND_PX = 20
t(q,x) = a==0 ? 1 : clamp((q-a/2)/(a/2), 0, 1)
r(q,x) = t*t*(3-2*t)
upper(q,x) = C + h(q)*r(q,x)*(T-C)
lower(q,x) = C + q*r(q,x)*(B0-C)
```

Serialize each upper/lower pair. Native linear interpolation fills the intervals; this is a fixed-keyframe approximation, not evaluation of the analytical formula every frame. Flat highest supports have r=1. Deep shoulder points remain collapsed early, then become fully active by q=.6. From .6 onward every cap equals the height-shaped profile using the SAME calibrated C; do not compare it with the superseded source-only contact. At zero, upper and lower coincide on contact; final overlap never serves as an embedded growth origin.

### Late lobes and mask union

For each actual lip, keep the body rectangle inside a FIXED outer group clipped by bodyD. The clip must not be animated with the rectangle. Add one late rectangle as a white sibling in the mask.

bodyD protects ONLY the unbulged lower floor. Its top and sides extend beyond the glyph: start at (-padding,-padding), continue to (cw+padding,-padding), then (cw+padding,lastRun.y+overlap), follow the ORIGINAL run samples in reverse order at y=run.y+overlap, continue to (-padding,firstRun.y+overlap), and close. Use the original integer-x support samples (including the corrected straight k/K run), not the half-column envelope grid, so the exact floor is retained at source-sample bends. The constant endpoint extensions cover retaining-wall overshoot.

Do not duplicate the visible path's upper/side contour in this clip. The full visible d already supplies that silhouette. The former duplicate bodyD contour multiplied antialias alpha twice: all 24 lip-bearing engine/locale patches failed the >=99.9% gate, while non-lip patches passed; removing the redundant clip restored coverage and isolated the lost pixels to coincident outer AA edges. The exact floor-only variant passed all 142 full patches at the unchanged threshold, with minimum coverage 99.9994945921%. It preserves the geometric unbulged body when intersected with full d, without moving the floor or allowing an early lobe.

Pre-lip tests use this exact floor as their reference, not bit equality with the obsolete duplicate upper contour. At q=.7, the k comparison gained only boundary antialias alpha: at most 9/255, within .16796875 source pixels of the unchanged floor, with none beyond .25 source pixels at the 4x diagnostic raster. Other lips matched the lower-floor reference. This is a measured raster-edge change, not permission for visible lobe growth before .7. Compare against the same new floor clip, inspect the rounded late lobe separately, and keep the full-coverage threshold unchanged.

```text
E(q,x) = (1-q)*min(C,B0) + q*B0
U(q,x) = E(q,x)-1
rLip(q) = clamp((q-.7)/.3, 0, 1)
D(q,x) = U(q,x) + rLip(q)*(B1-B0+1)
```

Prepare exactly three late keyframes: polygon(U(0),U(0)) at 0; polygon(U(.7),U(.7)) at .7; polygon(U(1),B1) at 1. Before .7 the late mask has zero area. Its one-source-pixel upper overlap is inside the current body, preventing two antialiased edges merely touching. At 1 its lower bound is B1. Do not add a nonzero pre-lip strip.

E is the effective lower edge of the body after its fixed clip. The cap shoulder correction has fully converged before late onset, so it does not require a separate E schedule. Body motion continues through the entire phase; no full-body hold after .7 and no independent 600ms reverse timeline. From full, lips retract during the first 600ms while the body also immediately thins. On partial reversal, both remain functions of the same current phase.

### Rendering and animation ownership

Keep stable useId-derived mask IDs and body clip IDs, user-space bounds, material definitions and outer filter ordering. Replace ellipses with white SVG rectangles at x=0/y=0, width=cw, height=chPx. Set each rectangle's inline clipPath to its first keyframe BEFORE animation creation. Keep `data-snow-support`; distinguish late rectangles with the existing `data-snow-lip-support` marker. Body rectangles may expose `data-snow-motion=cap|basin` for scoped inspection. No scale transforms or CSS transitions remain on masks.

One native clock belongs to each prepared SnowText fragment. All body/lip tracks in that fragment share currentTime, direction, duration and startTime. Independently completing initial font/idle preparations may start separately, as today; no global registry/context is needed. Already prepared fragments respond to the same theme commit on the document timeline.

Keep the controller internal to SnowText.tsx:

```ts
type SnowMotion = {
  animations: Animation[]
  setTarget: (winter: boolean, reduced: boolean, armed: boolean) => void
  updateKeyframes: (frames: readonly (readonly SnowMaskKeyframe[])[]) => void
  dispose: () => void
}
function createSnowMotion(
  bindings: readonly { element: SVGRectElement; keyframes: readonly SnowMaskKeyframe[] }[],
): SnowMotion
```

Adopt the already verified typed controller into this component, using the shared SnowMaskKeyframe type. Create once for the matching committed prepared glyph array, never once per toggle. Each binding calls element.animate with duration 2_000, fill 'both', easing 'linear', zero native delay, then immediately pauses/seeks 0. Store only owned animations in a ref; do not capture sparkle or unrelated native tracks.

setTarget behavior:

1. Cancel any pending 300ms start timer. Read the first owned currentTime once, require a finite number or use 0, clamp to [0,2_000]. Pause all tracks and seek that same time before changing direction. The current displayed geometry is retained.
2. If reduced, seek every track immediately to winter ? 2_000 : 0, leave paused, and ignore arming/delay. Disabling reduced motion resumes the requested target from that endpoint, with no replay.
3. If winter and not armed, leave the current phase paused. A new normal-motion set is already hidden at zero; do not reset a full state previously established by reduced motion. Original mode never advances a newly prepared hidden set.
4. Winter entry/reentry waits 300ms at the retained current phase before further growth. Melting has no delay. At callback time recheck the current generation/target; stale starts must not run.
5. Resume toward target only if time differs from it. Set playbackRate to +1/-1, retain the captured currentTime, play, and give every track one shared startTime = document.timeline.currentTime - currentTime/playbackRate when that timeline value is numeric. Do not call play/reverse at an already reached target: native endpoint restart behavior can otherwise jump to the opposite endpoint. There are no animation-frame callbacks or per-frame writes.
6. Finite native animations retain their endpoint with fill 'both'. A later request reads/clamps their current time. dispose cancels the start timer and every owned animation.

updateKeyframes requires the same binding count/order and calls setKeyframes on the existing KeyframeEffects. It must preserve Animation/effect identity, currentTime, startTime, playbackRate, play state and the pending entry deadline; it does not call setTarget. Initial native preparation occurs before creation/arming, while same-text layout updates use this method. Changed topology belongs to normal text/part replacement.

Retain the existing font promise/idle cancellation, retained prepared geometry across theme changes, and double-rAF one-time arming for new normal-motion geometry. Install a live matchMedia change listener for reduced motion and remove it on cleanup. Changes to text/part remove stale decoration immediately, cancel old animations/timers/arming, and prepare only the current locale. Keep the Fast Refresh reset directive. Plain text remains visible when preparation fails.

Delete obsolete .support/.lip transform/transition/delay/reduced-scale rules and every ellipse field/helper. Do not maintain two renderers, CSS fallback animation paths, test-only product globals or a general animation service.

## Tasks and verification

Occurrence coverage is positional, not a set of unique characters:

| Locale  | Fragment                | Independently reviewed occurrences                                |
| ------- | ----------------------- | ----------------------------------------------------------------- |
| English | intro                   | I, apostrophe, m                                                  |
| English | firstName               | N, first i (index 1), k, second i (index 3), t, a                 |
| English | lastName head           | K, first o (index 1), l, second o (index 3), s, third o (index 5) |
| English | final separate fragment | v at local index 0                                                |
| Russian | intro                   | Я, hyphen at index 2                                              |
| Russian | firstName               | Н, first и (index 1), к, second и (index 3), т, а                 |
| Russian | lastName head           | К, first о (index 1), л, second о (index 3), с, third о (index 5) |
| Russian | final separate fragment | в at local index 0                                                |

Spaces have no decoration. Preserve exact character identity; Cyrillic and Latin lookalikes are different occurrences. Use a stable element reference when moving an occurrence into an enlarged diagnostic view so repeated-letter selectors cannot silently change their target.

- [x] Reconcile all 31 occurrence reports, including the measured native-contact correction and independent retained-position review.
- [x] Complete the independent physical full-mask coverage gate: exact-floor clip passes all 142 patches; the lower-floor AA diagnostic is recorded above. Geometry/AA contradictions during integration still return to design rather than being guessed.
- [x] Capture pre-change full d/material/patch records separately for each engine and locale. Preserve the existing full-size reference and review preview.
- [x] Implement cached reveal preparation and physical role assignment without changing visible builders. Check exact before/after full d/material equality for every EN/RU occurrence in each engine.
- [x] Replace mask rendering and wire retained per-fragment native ownership. Check initial zero, real color wait, immediate melt, endpoint guards, timer cancellation and all body/lip phase equality.
- [x] Replace heading test helpers and spatial assertions; retain useful selection/accessibility/locale/material checks. Remove obsolete transform-scale assumptions rather than keeping compatibility wrappers.
- [x] Run focused Chromium checks and inspect normal/enlarged representative cap, steep shoulder, deep bank and all lower-lobe joins. Fix implementation defects before the wider matrix.
- [x] Run the six desktop/mobile engine projects, static checks and production build.
- [x] Complete the centralized layout, DPR, entry-deadline and reduced-motion lifecycle checks.
- [x] Independently review every one of the 31 exact occurrences against the integrated implementation, including repeated letters and the final separate fragment. Prototype approval alone is insufficient.
- [x] Record actual verification results, remaining limits and outside-scope integrity.
- [x] Archive the intermediate standalone preview and redirect its public URL to the integrated heading.

### Native test/capture contract

Replace snowThickness/seekSnow/finishSnow and the ellipse raster helper with helpers that inspect only the actual owned rectangle animations. They are Animation/KeyframeEffect clipPath tracks, not CSSTransition transform matrices. Pause/await ready, then set all their currentTimes to q\*2_000. Read computed clipPath and actual timing/direction; do not set independent body/lip scales or simulate the profile formula in tests.

Deterministic phase captures begin only after all current fragments are armed and the winter start delay has fired, or a settled reduced-motion endpoint has canceled it. A full settled endpoint is the simplest spatial-sweep setup. Then pause all owned tracks, await ready and seek together. Do not change theme, media preference, locale or layout between that freeze and capture. Native pause alone does not cancel the controller's pending timer; otherwise a later callback can resume motion during asynchronous rasterization or screenshots. Real delay/reversal tests observe the live controller separately; subsequent phase captures reestablish these prerequisites without test-only controller globals.

Real toggle tests must additionally verify pending color delay and live progression, not only deterministic phase seeks. Test reversal at .15/.5/.85, rapid winter/original changes during the delay, and full-to-melt: same-frame geometry does not jump, then body changes immediately (1 versus .99), and the requested endpoint stays settled without replay. Capture actual current state before applying a new target.

Use numerical precision rather than byte-identical native serialization: same-phase time drift must remain below .05ms, normalized effect-progress drift below .000025 and coordinate drift below .005 source pixels when comparing settled computed values. Firefox demonstrated about .02ms rounding. In WebKit, a manually sought or live sampled computed clipPath can still describe the previous paint; flushing a seek during retarget can then produce a false multi-pixel string difference. Establish the painted baseline after deterministic seeks and pair live clock/effect-progress assertions with frozen before/after rendered images inside the actual 300ms wait. The tested WebKit witness at .15/.5/.85/full had zero changed raster pixels and exact retained phase with the unchanged controller. Do not relax visible-jump tolerance, compare stale style strings as current pixels, or add asynchronous controller delays merely to satisfy that faulty oracle.

For physical mask checks, serialize the actual SVG mask/clip definitions with each rectangle's COMPUTED clipPath frozen inline. Rasterize the original unmasked white full path and the actual masked white path at a fixed increased source scale; remove only materials/opacity/filters for this coverage calculation. This evaluates rendered mask union rather than restating keyframe formulas. Keep separate real-material screenshots.

Required assertions:

- Zero alpha is empty. Full alpha-weighted coverage is >=99.9% per patch in both locales; partial states remain partial. Compare visible d/material/size exactly against the per-engine pre-change snapshot, not a universal 27-patch constant.
- At .05/.15 ordinary caps have snow on/above real ink, not solely an embedded dot. Inspect native desktop/mobile and enlarged I/apostrophe/l/t, both English i, m/a/o/s, Cyrillic flat and rounded supports. Very small .05 coatings may be faint.
- N/Latin K and Cyrillic и/к/К steep cap shoulders do not form complete early diagonal stripes. At .3/.45/.6 the front remains tapered and attached; .6 matches the untapered profile.
- N/k/K/v basins begin at their correct lowest floor, with rounded intermediate crest and no whole-slope ribbon or narrow radial tongue. Preserve the full large clean k/K silhouettes and filters.
- For every actual lip, pixels outside bodyD remain hidden through .7. At .75/.8/.85/.9/.95 they appear attached with a rounded lower boundary. At full and late partial phases inspect m/a joins for hairlines even if total coverage passes. No orphan remains on reverse.
- Inspect legitimate separated supported m crowns and t shelves without treating their topology as an error. Counters and dot/stem gaps remain empty.
- Initial winter/font-ready never flashes a full mask; original-before-ready stays bare. Locale switch during pending font, idle work, growth, delay and melt cannot apply old paths. Mask/material IDs stay unique.
- Initial/live reduced motion settle immediately; switching reduced off does not replay. Text remains selectable with the exact accessible label, normal wrapping and final sparkle.
- Native contact must be inspected at actual font size, including Firefox 393px/DPR2 final Russian о and desktop flat I, plus centralized fractional-DPR1.25/1.5 controls. No background-only separating row/arc at .05/.15 in growth or terminal melt. Compare matched ink-only/combined layers after paint; partial ink AA is contact, not a gap. Use opacity on the visible path for ink-only diagnostics, not whole-SVG visibility, which produced stale Firefox resource captures.
- Resize at .15/.5/.85, during the growth wait and at reduced endpoints. Preserve Animation/effect identities, current phase, direction and pending entry deadline while contact updates. Verify actual DPR-change invalidation once centrally, and ensure repeated toggles/unchanged resize notifications do not rerasterize. No scroll sampling is added; retain-position captures cover the documented bounded AA limit.

Do not normalize existing browser font/raster differences. WebKit may have 28 English patches where Chromium/Firefox have 27. Compare against each engine's own frozen endpoint and inspect actual font/ink contact at native size.

### Commands

From the repository root, after the source slice is stable:

```powershell
pnpm.cmd exec tsc --noEmit --pretty false
pnpm.cmd exec eslint src/home-sections/Home/components/SnowText e2e/winter-heading-snow.spec.ts
pnpm.cmd exec stylelint src/home-sections/Home/components/SnowText/SnowText.module.css
pnpm.cmd exec prettier --check src/home-sections/Home/components/SnowText e2e/winter-heading-snow.spec.ts specs/heading-snow-growth.md
pnpm.cmd build
$env:E2E_PORT = '4321'
pnpm.cmd exec playwright test e2e/winter-heading-snow.spec.ts --project=chromium --project=mobile-chrome --project=firefox --project=mobile-firefox --project=safari --project=mobile-safari --workers=1
git diff --check -- src/home-sections/Home/components/SnowText e2e/winter-heading-snow.spec.ts specs/heading-snow-growth.md
```

Use the existing approved server or an unoccupied owned port; never stop an unrelated service. Avoid running browser captures against a concurrent build. No unrelated full suite, particle benchmark or intentionally failing test is required. Browser and coverage failures that expose a design contradiction must be resolved explicitly before broad reruns.

## Verification record

The integrated native polygon implementation passed all six heading scenarios across desktop/mobile Chromium, Firefox and WebKit: 36 profile scenarios verified across the desktop Chromium initial run plus a focused rerun, mobile Chromium's six-case run and the remaining 24 Firefox/WebKit cases in one passing run. The checks cover actual serialized SVG mask union at zero/partial/full phases, >=99.9% alpha-weighted full coverage per patch in both locales, all eight lower-lobe gates, native reversal and pending-entry cancellation, reduced motion, retained resize effects, delayed font/locale cancellation, materials, selection and accessible labels. The q=.99 body polygons change immediately; full silhouette coverage can already exceed 99.9% there because of the required envelope padding, so coverage loss is not used as a no-hold oracle.

Exact pre/post endpoint comparison passed all 12 engine/locale/width records (1,440px and 393px): every visible d, material/filter, marker, opacity, viewBox and SVG size is unchanged. English retains 27 patches in Chromium/Firefox and 28 in WebKit; Russian retains 20 in each engine. The pre-change and after records retain the exact per-engine comparison evidence.

TypeScript, scoped ESLint, Stylelint and Prettier passed. The production build passed with all 12 static pages. Independent source review found no important issues, and the outside-scope integrity check retained all 1,172 files. Independent normal-size Chromium EN/DPR2 and Firefox RU/DPR2 stage captures and real theme/resize smoke checks passed.

The prior preparation proofs remain supporting evidence: bounded native contact passed 36 integer-DPR and eight fractional Firefox profiles; the typed controller passed Chromium/Firefox/WebKit lifecycle and keyframe-update checks; the exact-floor mask passed all 142 prepared full patches at minimum coverage 0.9999949459213585. All six integrated lifecycle groups passed: actual DPR invalidation with retained native effects, unchanged-notification raster skipping, resize during the entry wait without restarting its deadline, an in-page resize at 101ms with the original timers firing around 310ms, reduced endpoint resizes, and reduced-to-normal before arming without replay. CDP did not independently emit its resolution-media notification; reevaluating the unchanged screen medium delivered it, so no runtime polling was added. All 31 positional glyph occurrences passed individual integrated review at normal desktop/mobile typography and enlarged diagnostic size, including repeated letters and the final separate fragment. Growth and reverse phases retain supported rounded caps, delayed attached lobes and the approved full artwork within the documented pixel/antialiasing limits. No full repository test matrix, particle benchmark or deployment was run.

The intermediate preview was archived byte-for-byte before replacement. Its public URL now redirects and links to the integrated main page; the existing `public/snow-lettering.html` remains unchanged. The served preview URL and resulting main heading were checked in Chromium without page errors.

# Winter Santa flight

## Intent

Add a believable flying Santa, sleigh and reindeer to the winter home screen. The user approved a custom 3D scene, allows new dependencies, requires free assets only, and explicitly requires Santa's red cap with white trim and a pompom. Existing seasonal decorations and all current workspace changes must be preserved.

## Appearance

- Recognizable seated Santa with human proportions, white beard, red winter coat, black boots and gloves, reins in his hands, and a curved red cap with white trim and pompom. The cap must remain recognizable at the distant scale.
- Four anatomically proportioned quadruped reindeer in two pairs, with branching antlers, pointed ears, dark hooves, short tails, pale throats and leather harnesses. Use the textured natural deer asset described in `natural-deer-spec.md` with continuous skinned limbs and restrained warm/pale antler fairy lights. Avoid toy proportions, spherical heads, stick legs, visible ball joints and faceted low-poly shading.
- A curved burgundy sleigh with metal runners, restrained brass trim, upholstered seat, gift sack and small warm lanterns. Avoid a block-shaped vehicle and oversaturated gift boxes.
- Cold blue night illumination matches the current navy background, frost and icy-blue heading. Warm light stays local to lanterns, metal and small antler lights. Each deer has a deterministic recognizable gallop cadence with a different period, phase and modest amplitude, plus restrained sleigh motion and responsive reins.
- Use original geometry where free source models cannot be downloaded through their official access flow. Never extract protected viewer geometry or purchase an asset. Record that custom geometry is an authored study, not a claim of film-quality realism.

## Flight and layering

1. A small distant team enters fully from above near the right, initially tilted nose-down, then smoothly levels leftward through the center along a visible arc and slightly toward the viewer. The entire team exits beyond the left edge so its later return from the left is coherent. Duration: 12 seconds.
2. A hidden offscreen turnaround lasts 2 seconds. No visible mirror flip or layer jump.
3. A larger near team enters through the left edge in the lower part of the viewport, follows an ascending curve in front of the heading and exits through the right edge while receding. Duration: 9 seconds. Follow the screenshot's lower arrow for the left-to-right direction.
4. Rest for 25 seconds, then repeat. Only one team is visible. Full cycle: 48 seconds.

Use real perspective, depth and banking. Keep the team at roughly 12–18% of desktop viewport width when distant and 28–35% at its nearest point, with a lower mobile size. Aside, header, controls, focus rings and modal layers stay usable and above the scene; the near flight must visibly cross the heading. No sideways scrolling or layout shifts.

## Lifecycle and performance

- Load renderer code only for winter, after hydration/idle, while the home section intersects the viewport and the document is visible.
- With reduced motion enabled, do not import or create the renderer. React must not update per frame.
- Stop animation frames when the hero is offscreen, the tab is hidden, during the 25-second rest, or after unmount/theme change. Resume without a time jump.
- Use one transparent renderer, capped device-pixel ratio (1.5 desktop, 1 mobile), shared geometry/materials where practical, no runtime shadow maps or fullscreen postprocessing, and finite texture/geometry budgets. Dispose GPU resources and listeners on unmount. Handle unavailable/lost WebGL without breaking the page.
- Canvas is decorative, hidden from accessibility APIs and pointer-transparent. Preview controls remain accessible and use the existing Button component.

## Reviewable preview

Provide `/santa-preview` in the existing app shell, with a readable contained Model view and controls to inspect distant flight, near flight and the live route across the full viewport. Reuse the same canvas when changing modes. This must show the actual implemented geometry and lighting. Preview controls must not appear on the normal home page.

## Acceptance

The red cap is asserted on the actual model. Verify distinct repeatable animal periods, actual GLB geometry/UVs/skin weights, independent skeletons, shared team-owned coat resources, fitted antler core/halo placement and complete resource teardown. Project the complete team above the first entry and beyond all horizontal exit/close-entry boundaries at desktop, portrait and landscape sizes. Verify motion continuity and gradual downward-to-leftward levelling, coherent left exit/left reentry, lazy loading/reduced motion, phase/layer placement, viewport clipping, and at least desktop/mobile rendering. Inspect real rendered screenshots before claiming the appearance is complete. Keep fewer than 180,000 actual triangles, 45 distinct geometries and 125 mesh/point draws. TypeScript, scoped lint/style/format, focused unit/e2e checks and a production build must pass or have clearly identified existing blockers. No commit, push or deployment is requested.

# Rounded aside frost corners

## Specification

Give the winter aside frost visibly softer rounded outer corners on all four corners. Preserve the feather artwork, opacity, growth animation, sizing, placement, the Card's 8px radius, mobile hiding, pointer pass-through and theme gating.

## Plan and scope

Only adjust rounded rectangles in `src/layout/Aside/components/AsideFrost/AsideFrost.tsx`: change the outer clip and growth mask radii from `8` to `22`, and the inset edge fade radius from `7.2` to `21.2`, retaining the `.8` inset. Add a concise intent comment explaining the softer decorative contour. Do not change blur, feather paths, branches, CSS or unrelated working-tree changes.

Run focused installed Prettier and ESLint checks. Verify the visible corners in the browser and confirm preserved animation, layout and interaction behavior before completing verification.

## Tasks

- [x] Specify the rounded contour and bounded scope.
- [x] Implement the three radius changes and intent comment.
- [x] Verify formatting, lint and browser appearance and behavior.

## Verification

Focused Prettier and ESLint checks passed; ESLint reported only stale Browserslist data. Project type and style checks passed. Chromium inspection of the actual source confirmed all four rounded corners, radii `22` / `22` / `21.2`, unchanged Card bounds (`x=20`, `y=150`, `270x700`) and `8px` radius, pointer pass-through, original/winter opacity `0` / `1`, final growth stroke width `40`, hiding at `1024px` and `375px`, and no page errors. Browser verification covered Chromium only; no production build or full end-to-end suite was run.

The full-project `check-lint` run was interrupted after an extended run with no diagnostics; focused ESLint passed.

## Follow-up: match the winter Card and glow contour

The winter Card and its shadow must follow the frost's `22px` contour. This supersedes the earlier requirement to preserve the winter Card's `8px` radius; the original theme still uses `8px`. Preserve glow colors, blur, intensity, geometry, transitions and SVG artwork.

Plan: add only `--g-card-border-radius: 22px` to the existing winter `.container` rule in `src/layout/Aside/aside.module.css`. The installed Gravity Card consumes this public token for its border radius, which also shapes the box shadow. Run focused installed Prettier and non-mutating Stylelint checks; leave browser verification pending.

- [x] Specify the winter-only radius override and bounded scope.
- [x] Add the Card radius token and run focused formatting and style checks.
- [x] Verify the winter glow contour and original theme radius in the browser.

Focused Prettier and non-mutating Stylelint checks passed. Chromium inspection confirmed the winter Card and glow follow the `22px` frost contour, original restores `8px` with no shadow, and switching back to winter restores the unchanged shadow values. Card bounds remained `x=20`, `y=150`, `270x700` throughout. No broad checks were run for this CSS-only follow-up.

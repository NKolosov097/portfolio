# Winter snow overflow

## Requirements

- Snow extends above and below its section and across the document viewport on the home page and both not-found routes.
- Resizing keeps snow aligned to the document edges without horizontal scrolling, including when the section stays at its maximum width.
- Snow has matching top and bottom fades, with the top fade beginning below the actual header bottom even after scrolling. The desktop aside stays above the snow.
- The top fade stays fixed natively during scrolling, without scroll-driven JavaScript or visible lag, and disappears with the snow field beyond the hero.
- The header background stays opaque except for its final 28px, with nine smooth opacity stops of 100%/96%/85%/69%/50%/31%/15%/4%/0% at 28px/24.5px/21px/17.5px/14px/10.5px/7px/3.5px/0px from the bottom, keeping text and controls opaque.
- Snow never extends the document below the normal-flow body or leaves blank scrolling space after the footer on either not-found route.
- Preserve the original sparkle geometry, pointer transparency, accessibility, reduced motion, and both rendering transports.

## Diagnosis

The shared field uses `inset: 0`, so its canvas bitmap ends at the section edges. The section and its ancestors do not clip the snow; enlarging the raster surface addresses the clipping at its source.

## Plan

For snow only, align the field to the document's client width using the section's horizontal offset. Synchronize on section, body, header, and window resize without observing the field itself. Extend the field by 128px above and by 25% plus 128px below the section, capped at the normal-flow body's bottom. Keep the bottom 82%-100% canvas mask. A fixed background-colored pseudo-element covers snow through the actual header bottom and fades to transparent across 18% of the raster height. Clip this veil to the field so it cannot cover later sections. Set its geometry only on resize; scrolling needs no JavaScript. Let the existing field observer resize either rendering transport. Give the desktop aside a stacking level above the main content.

Keep the header background opaque except for a smooth gradient across its final 28px, with nine opacity stops of 100%/96%/85%/69%/50%/31%/15%/4%/0% at 28px/24.5px/21px/17.5px/14px/10.5px/7px/3.5px/0px from the bottom, without changing the snow veil geometry or header content opacity.

## Tasks

1. Add snow-only geometry synchronization and cleanup in `SparkleLayer`.
2. Add snow-only vertical bounds capped at the body bottom, a bottom canvas fade, and a clipped fixed header veil; keep the aside above snow.
3. Extend the winter browser tests for home, both not-found routes, aside stacking, pointer transparency, synchronous native fade geometry after scrolling, footer scroll bounds, and viewport resizing. Assert HTTP 404 only for the global missing page: the article route streams its not-found view after a loading boundary.
4. Run formatting, type and lint checks, and relevant browser coverage.

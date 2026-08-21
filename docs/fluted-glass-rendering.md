# Fluted glass renderer

Design rationale for `src/components/fluted-glass/gl/passes.ts`, the WebGL renderer.

## Three-pass architecture

1. The shape layers composite into a premultiplied field at `fieldScale`.
2. A small separable blur removes upsampling facets, and mipmaps are generated for the wide field
   read the shimmer gate needs.
3. The full-resolution glass pass refracts that field per flute and adds lighting.

No GL blending is used anywhere: the field pass composites in the shader and the glass pass emits
premultiplied alpha for the browser to composite over the page.

## `FrameState.reveal`

Vertical reveal, 0..1.

Scales every shape's height and its distance above the panel's bottom edge, so at a half it is that
field at half the size growing out of that edge. Which is the only way to uncover this thing and
still have it look like itself: a mask would cut the flutes off along whatever contour the mask
has, and the soft comb of tips dissolving at their own heights is most of what the field looks like
from the outside.

Two things deliberately do not scale with it. The feather shrinks more slowly than the shape, so a
shallow reveal is proportionally softer rather than a scale model with a crisp edge. And the alpha
fades out across the bottom of the range, so the shape dissolves on its way to nothing instead of
bottoming out on the floors under its geometry and being switched off.

## `REVEAL_FADE`

Reveal below which the field fades as well as shrinking.

The geometry has floors under it, half a texel of height and a texel of feather, so that a shape
scaled towards nothing never reaches the degenerate case the coverage function cannot evaluate.
Which means the last of a reveal is not a shape getting smaller: it is a hairline of full strength
colour sitting on the bottom edge, held there until the reveal reaches zero and it is switched off.
Fading across the bottom of the range takes that away, and a reveal that dissolves as it shrinks is
what one wants out of it regardless.

## `FEATHER_EASE`

How the feather shrinks against the shape it belongs to.

Under 1, so it shrinks more slowly: at a tenth of a reveal the shape is a tenth of its height but
its falloff is nearer a fifth, which is a band that is almost entirely falloff. Held at 1 instead, a
shallow reveal is a scale model of a deep one, and a scale model of a soft edge is a crisp one.

## `dispose()` and context loss

Deliberately does not force context loss: a canvas has exactly one context for its lifetime, so
losing it would poison the element for any later renderer, which is what a Strict Mode remount
does. The context itself goes away with the canvas.

---
Consumed by: `src/components/fluted-glass/gl/passes.ts`.

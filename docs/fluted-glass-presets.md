# Fluted glass presets

Design rationale for `src/components/fluted-glass/presets.ts`.

## `HERO_SHAPES`

The mock: a periwinkle glow bleeding up out of the bottom edge, with an orchid layer over its
right side so the band grades in hue rather than being one flat tint.

Both are wide shallow ellipses whose cores sit almost entirely below the panel, so nearly
everything visible is feather. That is also why the band spans so much more width than the cores'
chords do: an ellipse this flat runs nearly parallel to the bottom edge, so the field stays within
a feather of it across a long span.

The two layers carry different `pull` and `drift`, so the hues separate slightly as the pointer
moves and the band is never quite the same shape twice.

## `PANEL_GLASS`

The glass itself, shared by the hero and the footer.

The `card` treatment at a wider pitch, which is the version that read as actual fluted glass.
Everything not listed takes the resolved defaults, same as `card` does, so the three stay in step.
Shared rather than copied because the footer's dome is the hero's material seen through a mask, and
two sets of numbers to keep level is how they end up not being.

## `presets.footer`

The dome that grows out of the bottom of the footer on overscroll. The hero's material, on the
same paper, so it takes `PANEL_GLASS` unchanged: same flute width, same lens, and the resolved
defaults for `variance` and `wick`, which is what gives it the hero's smooth dissolve rather than a
comb of ragged fingered tips.

Grown through `reveal` rather than uncovered by a mask. The footer scales this field with the pull,
so its falloff is always the same share of whatever height is showing. Held at full size and masked
instead, a short pull would be a strip cut out of the saturated bottom of it: a flat blue wall with
no gradient in it, and every flute sliced off along the mask's own contour rather than dissolving at
its own height.

`shapeCoverage` saturates at 1.0 everywhere inside a shape and only feathers outside it, so any core
that clears the bottom edge shows up as a flat slab with a ramp perched on top. Both crests are
parked exactly on the edge instead, which leaves the whole visible band inside the Gaussian tail:
one continuous falloff with nothing flat in it. That is the whole of why the hero dissolves.

It is also why the panel has to be taller than the dome ever opens to, which is the footer's
`OVERHEAD` (see `docs/footer.md`). A feather is a fraction of the panel and so is the reveal, so a
reveal approaching 1 is a tail as long as the panel it has to die inside, and it does not: it meets
the top of the canvas at strength and rules a hard line across the page. The reveal only ever uses
the bottom half, and the half above it is where the tail goes to finish.

`blur` runs far above the hero's number for a feather not much longer than it, because it is a
fraction of the panel's height and this panel is a fraction of the hero's: at a full pull the reveal
scales 0.572 of a ~550px panel down to a ~185px feather over a ~275px dome, against 0.075 of a
~980px hero at ~74px. Long on purpose. Nearly the whole of the dome is falloff, which is what keeps
a shallow pull from reading as a wall with a lid on it.

Which pairs these two numbers with `OVERHEAD` as well. The reveal shrinks a feather more slowly than
the shape it belongs to, so what survives that is a fourth root of the panel's own height: the room
the tail needs would otherwise widen the tail by a fifth, and these come down by the same fifth to
pay for it.

## `presets.accent`

The band that bleeds off the right edge of the awards list, and the only preset that ships without
shapes: its colour is whichever item currently holds the stage, so the layers are built at the call
site and the glass, light and interaction are all that is fixed here.

Its own glass rather than `PANEL_GLASS`, because this is the one panel whose flutes run across the
direction its field falls off in: horizontal flutes over a band that fades leftward read as a comb
of fingers reaching out of the glow, where vertical ones would only draw stripes along it.
`variance` and `wick` run well above the shared treatment for the same reason, since those ragged
tips are this panel's leading edge rather than an accent on it.

The site's only curved sheet, and scroll driven, so the band keeps travelling while the list beside
it holds still. At this orientation `fluteExtent` is the panel's height, so the axis lies horizontal
and the flutes roll vertically, compressing into each rim rather than sliding past as one piece.

`scrollSource` has to be `window` here, which is the opposite of what a panel that owns a section
usually wants. `section` measures the panel's own progress through the viewport, and this panel
lives inside a sticky pin: its rect holds the same top for the whole section, so that source would
read one constant and the flutes would never turn at all.

### `interaction`: reach and pullY

The hero's bargain: the layers lean toward the pointer, and nothing else answers it. A glint here
would compete with the retint, which is the one thing this panel is for.

A `reach` well past the default, because this panel is a slice down the right of a section whose
left half is the list. At 0.35 the margin stops short of the copy, so the lean died the moment the
cursor settled on the thing the reader came to read — presence eases out, the pull goes to zero, and
the band snaps back to rest until the cursor returns. 2 clears the margin over even the far (left)
edge of the list at ordinary window widths, so presence never drops and the lean never resets while
the cursor is anywhere in the section. The travel itself is reined in on the shapes' own `pull`, not
here — narrowing the reach only trades the snap for a dead zone over the copy, which is the wrong
fix for "leans too far".

`pullY` a touch above the default 0.35, so the vertical lean reads a little more clearly alongside
the horizontal one instead of trailing far behind it.

---
Consumed by: `src/components/fluted-glass/presets.ts`.

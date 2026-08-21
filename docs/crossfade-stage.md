# Crossfade stage

Design rationale for `src/components/crossfade-stage/CrossfadeStage.tsx`.

## Position, not time

Two panels stacked in one pinned viewport, crossfaded by scroll position.

Nothing moves geometrically while the handoff runs, so the eye reads a dissolve between two scenes
rather than one sliding over the other. Opacity is a pure function of scroll position, never of
elapsed time: park the wheel and the picture parks with it, scroll back up and it retraces exactly,
and jumping straight to a position (scroll restoration, End, an anchor) is correct on the first
frame instead of catching up.

For the shared pin-geometry mechanics this component uses (`range()`/`measure()`/`commit()`, the
iOS forced-layout problem, width-gated resize), see `docs/pinned-scroll-stages.md`. For the
`--bleed`/`.stage-pin` mechanism its pin wrapper depends on, see `docs/ios-viewport-bleed.md`.

## Dissolve vs. `cover` mode

`"dissolve"` (default): both layers' opacity animate independently across their own `out`/`in`
windows, with `gap` a deliberate blank beat between them — right for two translucent scenes, where
overlapping them mid-transition would show a muddy blend of both.

`"cover"`: `from` stays at full opacity and `to`'s opacity is tied directly to `from`'s own `out`
curve instead — complementary, so there's no gap, which is what a plain cross-dissolve wants once
`to` is already opaque: `gap`/`in` stop affecting the crossfade itself in this mode (though
`phases`' total still sets the track's height as always).

`from` never getting an animated `opacity` matters when it wraps a full-screen WebGL canvas: an
animated `opacity` over one forces an expensive translucent composite every frame for the whole
transition, where a canvas at a constant opacity composites directly. `--fade`/`.fade-rise` drift on
`from` is identical either way — only what drives visible opacity does.

In `cover` mode, `to`'s opacity mirrors `from`'s own fade-out curve directly, rather than riding its
own `gap`/`in` window: the visible transition was always `out` (`from`'s own fadeout — "the
animation this stage exists to show", per `page.tsx`), and covering with an opaque `to` should use
that same window, not require `phases` to be separately retuned for `in` every time a usage switches
mode (a `gap`/`in` sized for a disjoint dissolve — a deliberate blank beat between two translucent
scenes — left `to` a near-instant snap here instead of a dissolve). This also makes the two
opacities complementary, which is exactly a cross-dissolve: no gap where neither layer covers the
point being looked at.

## `overflow-anchor: none` (`globals.css`)

`CrossfadeStage` takes a faded-out layer out of the page with `display: none`, which the browser
reads as content changing under the viewport and answers by correcting the scroll position to keep
what you were looking at in place. There is nothing to keep in place here: every layer is `absolute
inset-0` in a pinned box, so the correction is pure error. Safari does not implement
`overflow-anchor` at all, so this is a Chrome/Firefox-only fix.

---
Consumed by: `src/components/crossfade-stage/CrossfadeStage.tsx`, `src/app/globals.css`.

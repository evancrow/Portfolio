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
transition, where a canvas at a constant opacity composites directly.

In `cover` mode, `to`'s opacity mirrors `from`'s own fade-out curve directly, rather than riding its
own `gap`/`in` window: the visible transition was always `out` (`from`'s own fadeout — "the
animation this stage exists to show", per `page.tsx`), and covering with an opaque `to` should use
that same window, not require `phases` to be separately retuned for `in` every time a usage switches
mode (a `gap`/`in` sized for a disjoint dissolve — a deliberate blank beat between two translucent
scenes — left `to` a near-instant snap here instead of a dissolve). This also makes the two
opacities complementary, which is exactly a cross-dissolve: no gap where neither layer covers the
point being looked at.

## Compositor-driven fade (`globals.css`, `@supports (animation-timeline: scroll())`)

`from`/`to`'s `opacity` is driven by a CSS scroll-timeline animation where supported, not by the JS
`measure()`/`commit()` below — see `docs/pinned-scroll-stages.md` for that JS mechanism, which stays
as the fallback where it isn't (and stays the only writer of `--fade` either way, see below).

iOS deprioritizes the page's main thread during momentum scrolling, so a scroll gesture itself
stays compositor-smooth while anything JS has to write per rAF frame (window.scrollY-driven or
not) falls behind and steps — the picture scrolls smoothly, the fade doesn't. The fix has to
animate `opacity` directly rather than through a custom property: `opacity` and `transform` are the
properties a browser can hand entirely to the compositor thread, evaluated against the true scroll
offset every compositor frame with no dependency on main-thread scheduling. A registered custom
property doesn't get that — resolving `opacity: var(--fade)` back from an animated `--fade` still
needs a main-thread style recalculation, which is exactly the thread this is trying to get off of,
so an earlier version of this that animated `--fade` itself kept stepping despite the animation
correctly running. No JS feature detection is needed to switch between the CSS and JS paths: CSS
Animations override normal-priority declarations (including inline styles) regardless of
specificity, so wherever the `@supports` block applies, the running animation simply wins over JS's
own `opacity: var(--fade)`; wherever it doesn't, that block never applies and JS's write is what
renders.

`range()` writes `--fade-out-start`/`--fade-out-end`/`--fade-in-start`/`--fade-in-end` (document-
relative pixels, same cache as `--pin-start`/`--pin-end`) for `.crossfade-from`/`.crossfade-to` to
point their `animation-range` at. `from` only carries `.crossfade-from` in `dissolve` mode —
`CrossfadeStage` leaves it off entirely in `cover` mode, since `cover` pins `from`'s `opacity` to 1
via the existing static inline style and never wants it animated. `to` always animates `fade-in`, but `CrossfadeStage`
points `--to-range-start`/`--to-range-end` at the in-window in `dissolve` mode or the out-window in
`cover` mode, which is what makes `to` rise exactly as `from` falls without a third keyframe set.

The easing is `cubic-bezier(1/3, 0, 2/3, 1)`, the exact closed-form equivalent of the same
`smoothstep(3t² - 2t³)` shape the JS fallback uses — not an approximation: those control points
make the curve's x-component reduce identically to linear time, and its y-component then works out
to exactly `3t² - 2t³`. `animation-timing-function` can't call a function, so this is what stands in
for it; the curve's shape doesn't depend on the actual pixel range (`animation-range` supplies that
per element), so one fixed easing serves every window.

## `overflow-anchor: none` (`globals.css`)

`CrossfadeStage` takes a faded-out layer out of the page with `display: none`, which the browser
reads as content changing under the viewport and answers by correcting the scroll position to keep
what you were looking at in place. There is nothing to keep in place here: every layer is `absolute
inset-0` in a pinned box, so the correction is pure error. Safari does not implement
`overflow-anchor` at all, so this is a Chrome/Firefox-only fix.

---
Consumed by: `src/components/crossfade-stage/CrossfadeStage.tsx`, `src/app/globals.css`.

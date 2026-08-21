# iOS viewport bleed (`--bleed` / `--fold`)

The system behind two CSS custom properties, `--bleed` and `--fold`, that let the pinned WebGL
panels (hero, footer dome, the Awards/Projects accent band) reach correctly to the bottom of an
iOS Safari screen despite its floating URL bar.

## Why it's needed: `MEASURE_BLEED` (`src/app/layout.tsx`)

Measures the strip of screen the layout viewport does not cover, and publishes it as `--bleed`.

iOS Safari's floating URL bar sits over the page rather than beside it, and the page paints into
that strip whenever there is scroll left below. So the pinned panels are given that much overhang
and the reader is stopped that far short of the end. It is not a length anyone can write down: it
differs per device and per orientation, and no CSS exposes it, `env(safe-area-inset-*)` included,
which reports 0 here even under `viewport-fit: cover`.

What can be measured is the screen and the viewport at its tallest, and the difference between
them is the chrome at both ends together. The top of it comes off where the inset will admit to a
figure and is left in where it will not, which over-reserves rather than under-reserves: too much
overhang is field nobody sees and a little more scroll held back, where too little is bare paper
under the bar.

`lvh > svh` is the whole of the browser check, and it is about the behaviour rather than about the
browser: those two are equal wherever the chrome does not collapse, which is every desktop, so
this works out at zero there without anything having to know which engine it is running in. That
same inequality is also what gates `.stage-pin`'s mechanism below — `--pin-position`/`--pin-anim`
are only ever written here alongside a non-zero `--bleed`, so the pin only ever leaves `sticky`
where the strip it exists to clear is real.

Inline and blocking, at the top of the body, because every panel's height is a function of this
and a value that arrives a frame late is a page that visibly resizes on load.

Published through a stylesheet of its own rather than as an inline style on the root, which is the
same value by a route React is not watching. Setting it on the element directly is an attribute
the server did not render, and hydration compares the two and reports the difference.

Rewritten only when the number changes, which is the difference between this being free and it
being a stutter. `resize` fires all through a scroll on iOS as the bar folds, and assigning to the
sheet invalidates style for the whole document whether or not the text differs: every panel on the
page was being laid out again mid-fling.

The measurement itself is gated the same way, on top of that: every one of `px()`'s four probes is
a forced layout, and none of `lvh`/`svh`/`screen.height`/the safe-area inset can change from the
bar folding alone — only a real width change or a rotation moves any of them. Without this, a
toolbar-fold `resize` storm mid-scroll was forcing this many synchronous layouts of the *whole
document* on every one of its events, which is what read as content elsewhere on the page (About's
text, with no scroll logic of its own) visibly jutting.

`--fold` (`lvh - svh`, i.e. how much shorter the always-visible viewport is than the collapsed-bar
one) is published unconditionally alongside `--bleed` rather than gated behind the same
screen-height sanity check: the stage components use it to size their scroll-progress unit off the
viewport that's actually always on screen, which is a real correction on any browser where the bar
collapses, not only the ones that also get pin overhang.

## The `--bleed` custom property (`src/app/globals.css`)

How far the pinned panels reach past the bottom of the viewport.

iOS Safari keeps a strip of the screen for its URL bar, and page content does paint into it, but
only ordinary in-flow content that carries on below the viewport. A `position: sticky` box is
bounded by the viewport and stops dead on that line, which is what left a band of paper under the
glass.

Zero by default, and measured from the screen at runtime by `MEASURE_BLEED` above. It cannot be
written as a length: the strip is the part of the screen the layout viewport does not cover, which
is a different size on every device and is not exposed to CSS at all, `env(safe-area-inset-bottom)`
included. Zero is also the right answer everywhere the strip does not exist, which is every browser
but this one, so nothing else has to know the difference.

## `.stage-pin`: sticky vs. scroll-timeline swap (`src/app/globals.css`)

The pin: `position: sticky` wherever it can be afforded, and a scroll-driven transform where it
cannot.

Sticky is held by the compositor, so it never jitters, and it is bounded by the layout viewport, so
its bottom edge lands on the URL bar and the glass stops there. A scroll timeline is the other way
round on both counts: the box stays ordinary in-flow content and paints past the viewport into the
strip behind the bar, and Safari interpolates the transform at scroll offsets that fall between
frames, which reads as the whole stage shaking.

Gated on `--pin-position`/`--pin-anim` rather than a media query: `layout.tsx`'s measuring script
only ever writes them alongside a non-zero `--bleed`, so the mechanism is driven by the same
measurement that says a strip is really there, not by a second guess (device type, pointer
coarseness) that could disagree with it — a touch-capable desktop or a large window measures a
zero strip and keeps `sticky`, which also keeps it clear of the transform's trackpad-only shake.

Unlayered on purpose: Tailwind v4 puts `.relative` in `@layer utilities`, and an unlayered rule
beats a layered one regardless of source order, which is what lets `position: static` win here over
the `relative` utility on the same element.

### Why longhand, not the `animation` shorthand

Both `position` and `animation-name` default to sticky's values, so an element with neither var
written (the desktop case) is untouched. Longhands rather than the `animation` shorthand: a
`var()` standing in for one token of a compound shorthand value is exactly the kind of thing
WebKit's shorthand parser can fail to resolve, and when it does the whole declaration is dropped
silently — no console error, just an animation that never attaches. `transform` stays `none` in
that failure case, and `position: static` with no transform gives the panel no containing block at
all for its `absolute inset-0` layers, which is a blank hero, not a clipped one. Each of these as
its own longhand can only ever fail on its own value.

`transform: translate3d(0, 0, 0)` is a static, non-animated baseline. `position: static` gives the
panel no containing block for its `absolute inset-0` layers unless `transform` is something other
than `none` — and this holds that regardless of whether the animation actually engages, so a
failure in the animation degrades to an unpinned (but still visible, still sized) panel rather than
a blank one. The 0%-keyframe transform is the same value, so this is inert whenever the animation
does run.

## Consumers

- `src/components/crossfade-stage/CrossfadeStage.tsx` — pin wrapper uses `.stage-pin`.
- `src/components/awards-projects/AwardsProjects.tsx` — pin wrapper uses `.stage-pin`.
- `src/components/layout/Footer.tsx` — dome wrapper's mask ramp is gated on `--bleed` (see
  `docs/footer.md` for the footer-specific fold-fade math).

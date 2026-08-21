# Awards / Projects stage

Design rationale for `src/components/awards-projects/AwardsProjects.tsx`.

## Position, not time

Awards and Projects, as one pinned stage whose glass band retints to the item holding it.

The list itself never moves. Scroll position through the track picks which item is live, and the
only things that change are that item's own treatment and the colour of the band bleeding off the
right edge, so the retint is the whole event rather than a detail on top of a scroll.

Position, not time: the index is a pure function of where the track sits against the viewport, so
parking the wheel parks the list, scrolling back up retraces it exactly, and landing partway in (an
anchor, End, scroll restoration) is right on the first frame instead of catching up.

For the shared pin-geometry mechanics this component uses (`range()`/`measure()`/`commit()`, the
iOS forced-layout problem, width-gated resize, the body-height retrigger), see
`docs/pinned-scroll-stages.md`. For the `--bleed`/`.stage-pin` mechanism its pin wrapper depends on,
see `docs/ios-viewport-bleed.md`.

## List centering (`position()`)

Keeps the live item centred in the list's own box by sliding `inner` under a clipped, fixed-height
`list` — a transform tied straight to `continuous` (the live scroll-derived position), not a nested
`overflow-y-auto`, so it's the same one physical scroll as everything else in the stage rather than
a separate scrollable region with its own scrollbar. A no-op whenever the list isn't actually taller
than the pin, which is every viewport this design was built for.

The floor stays 0 — the very first item sits flush with the box's own top rather than pulled down to
center it, which is what keeps the section landing right below Work instead of opening mid-list. The
ceiling gets an extra half-height of slack past the true content end, since without it the last item
is clamped hard against the bottom the moment its own center would otherwise need to scroll past
where content actually stops, landing it low in the box instead of centered like every other item.

The clip lives on the list wrapper; `inner` is what actually moves, shifted by a plain transform
driven straight off the same scroll listener that picks `active`. No CSS transition on the
transform: it's already a continuous, every-frame value straight from scroll position, not a
discrete state change — a transition on it only restarts itself every frame and adds a permanent lag
behind the finger/wheel.

## Body-resize retrigger

`range()`'s `start` is the track's document-absolute position, which shifts whenever anything above
it resizes — Work's "Show All"/"Show More" toggles, most concretely. A window resize is the only
thing that recomputed it before, so any of those toggles left `--pin-start`/`--pin-end` pointing at
the pre-toggle layout: the scroll-timeline then engages/releases at the wrong scroll offset, which
reads as a blank gap that only clears once an actual resize (or, on some browsers, enough
scroll-driven relayout) forces a fresh `range()` call. A `ResizeObserver` on `document.body` covers
every such case in one place, generically.

But body height is also exactly what wobbles, by up to `bleed`, on every iOS toolbar fold during a
scroll — the same noise the width-gated `onResize` filters. Width doesn't apply to a body observer,
so the tolerance is `bleed` itself instead: a genuine content reflow moves the body by much more than
the toolbar strip ever does, so only changes past that band trigger `range()`, and the toolbar's own
wobble is left alone.

## Retint band sizing (mobile full-bleed)

Full-bleed on mobile, and taller than the pin, which is one fix rather than two.

A shape's `w` is a fraction of the panel's width and its `blur` a fraction of the panel's height, and
an ellipse's distance field scales with its *minor* radius — so on a narrow panel every distance in
the field shrinks while the feather it is measured against does not. The band's own falloff then
never finishes inside the box, and the canvas cuts it off at a hard line. Desktop's 46% is wide
enough that the field is down to a thousandth by the top edge; a phone-width column is not, and
narrowing it further only makes it worse. So the panel takes the whole width here, which also gives
the copy beside it its gutter back.

Full pin height rather than taller, which is the part that is easy to get backwards. Hanging the
panel past the pin does move its own edges off screen, but the window's top row is a boundary too —
the page does not paint under the status bar — and all the overhang does is put a stronger part of
the field against it. The field has to finish inside the window, not somewhere past it.

## Layout gutters

Same left gutter as every other body section (Work, About), so copy lines up down the page
regardless of which section it's in. On desktop the right padding is the band's own width plus a
gap, so a long line runs out of room before it runs under the band. On mobile the band is
full-bleed, so there is nothing to clear: the copy takes the ordinary gutter and sits over the faint
left tail of the glow, which is the room a description needs on a narrow phone.

---
Consumed by: `src/components/awards-projects/AwardsProjects.tsx`.

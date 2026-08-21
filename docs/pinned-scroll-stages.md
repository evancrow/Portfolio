# Pinned scroll stages

The shared mechanics behind every full-viewport pinned section driven by scroll position
(`CrossfadeStage`, `AwardsProjects`): a `range()`/`measure()`/`commit()` split, coordinated through
one shared per-frame scheduler, `useScrollStage`.

## Why a shared scheduler (`src/components/scroll-stage/useScrollStage.ts`)

One shared per-frame scheduler for every pinned scroll stage on the page.

Each stage (`CrossfadeStage`, `AwardsProjects`) used to run its own independent
`requestAnimationFrame` loop: read live geometry (`getBoundingClientRect`, `offsetHeight`), then
immediately write styles from it. With two stages mounted, the browser had to run stage A's read,
stage A's write (dirties layout), stage B's read (forces the layout stage A just dirtied), stage
B's write — a forced synchronous layout wedged into every single scroll frame, for as long as both
were on screen.

Registering a `measure` (reads only) and a `commit` (writes only) here instead means every stage's
reads run before any stage's writes, every frame — eliminating that interleave by construction
rather than by accident.

Deliberately narrow: `range()` (each stage's occasional, resize-driven pin-geometry write) and the
scroll/resize listeners that trigger it stay on each stage — neither runs every frame, so neither
was contributing to the per-frame interleave this exists to remove. Centralizing only the part that
actually runs on every frame of a scroll gesture is what keeps this small.

Registration order sets read/write order within a frame, but every `measure` still runs before
every `commit` regardless, which is the guarantee that matters here.

## `range()`'s cache, and why `measure()` never forces layout

`range()`'s job: turn the handful of things that force a synchronous layout to read
(`getBoundingClientRect()`, `offsetHeight`, `getComputedStyle()`) into plain numbers cached in
`trackTop`/`unit`, so `measure()` — which runs on every scroll frame, not just the occasional
resize — never has to force one itself. `window.scrollY` is the one read `measure()` keeps doing
live, and it's cheap: the browser already tracks it continuously and it forces nothing.

This split is what actually matters on iOS specifically: the URL bar animates the viewport height
*during* an active scroll gesture, not just at rest between them, so there is a layout-affecting
change genuinely pending on or near every scroll frame — which is exactly what a forced-layout read
has to resolve synchronously before it can return anything. Desktop never has anything pending
mid-scroll (nothing resizes while scrolling), so the same per-frame reads that are nearly free
there were forcing real work on every mobile scroll frame, more of them the faster the scroll — a
strong match for "smooth slow, stepping at normal speed, desktop unaffected either way."

`AwardsProjects` follows the identical pattern but also caches `bleed` outside `range()`, since its
`onBodyResize` handler (below) needs it as a standing tolerance, not just as an input to `unit`; and
it caches `rowCenters`/`listHeight`/`overflow` (`measureList()`) the same way, since its old
`position()` used to `querySelector` and read all of these straight from the DOM on every single
frame — a forced layout read wedged into the one function meant to be a pure write.

## Full pin height vs. bleed, in `range()`

The *full* pin height, bleed included, is a physical release distance, not a phase/dwell unit. The
pin's actual box is `pin.offsetHeight` tall regardless of how much of that is overhang; translating
it up by anything less leaves exactly that much of its bottom edge still overlapping whatever comes
after the track once released. Subtracting `bleed` here (the way `unit` does, for the phase/dwell
math) was tried and measured wrong: the pin let go early by that many pixels and sat over the next
section's top edge instead of clearing it.

## Width-gated resize handling

iOS fires `resize` all through a scroll as the URL bar folds — same behaviour `layout.tsx`
documents for `--bleed` — and none of those change the viewport's width. Gating `range()` on a real
width change is what tells an actual resize (rotation, an actual window resize) apart from that
noise, so `--pin-start`/`--pin-end` stay put through a toolbar fold instead of being rewritten
mid-gesture, which is what let the scroll-timeline's range drift under a stationary scroll position
and snap the pin.

`AwardsProjects` additionally has to catch layout shifts that aren't a width change at all — Work's
"Show All"/"Show More" toggles resize the page above it without ever firing `resize`. A
`ResizeObserver` on `document.body`, tolerance-gated on `bleed` itself (since width doesn't apply to
a body observer, and a genuine content reflow moves the body by much more than the toolbar's own
wobble ever does), covers that case generically in one place.

## Orientation / scrollend

A real recompute regardless of width: a rotation can keep the shorter dimension unchanged on some
devices, `scrollend` is free since the page is already stationary when it fires and catches
anything the width gate above was too narrow for, and fonts are the one thing that resizes the page
with no resize event at all.

## Consumers

- `src/components/crossfade-stage/CrossfadeStage.tsx`
- `src/components/awards-projects/AwardsProjects.tsx` (also see `docs/awards-projects.md` for its
  component-specific list-centering logic on top of this shared pattern)
- `src/components/scroll-stage/useScrollStage.ts` (the scheduler itself)

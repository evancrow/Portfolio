# Timeline

Design rationale for `src/components/timeline/TimelineView.tsx` and
`src/components/timeline/useTimelineWindow.ts`.

## The model

The Timeline's real content, mounted by `Timeline.tsx` once its dissolve transition is under way.
The model is two numbers, held in refs and written imperatively so panning never costs a React
render: `centerRef` (the date at the vertical center of the view — the cursor) and `pxPerMonthRef`
(pixels per month, `BASE_PX_PER_MONTH * zoom`). `useTimelineWindow` owns the cursor's bounded
elastic pan; `useTimelineZoom` owns the continuous zoom. Both funnel into `renderFrame`, the one
function that writes every mounted flute's `transform`, every label's `textContent`, and — rarely,
since it only changes as flutes cross the viewport's edge — the mounted (visible) flute set as React
state.

Flutes are culled to the visible set plus a margin — cheap now that a flute is a plain CSS fill, but
the column can still run to dozens of entries at once, and there's no reason to keep DOM nodes and
per-frame writes going for ones nowhere near the viewport.

## Feather mask (`EDGE_INSET_TOP`/`BOTTOM`, `FEATHER_SPAN`, `FEATHER_EASE`)

Where the top/bottom edge date labels sit, as a fraction of the view's height — and, so the flute
column's feather lines up with them exactly, also where its mask finishes fading to nothing. A flute
is gone by the time it reaches a label, not just starting to fade there: from the label out to the
true edge is empty, not a continuing dissolve. One number driving both, rather than two that
happened to agree.

`FEATHER_SPAN` is how much room the fade itself needs, in percentage points, anchored so it finishes
exactly at `EDGE_INSET_TOP`/`BOTTOM` and runs inward from there — not outward from the label toward
the true edge, which is what left the old version fading past where the labels sat.

`FEATHER_OPAQUE_TOP`/`BOTTOM` is where the mask reaches full opacity, moving inward from the label.
Also the band flute title labels are allowed to sit in — inside the ramp itself, a label would be
sitting on partially faded glass, which reads as broken rather than as part of the dissolve.

`FEATHER_EASE` is how far into the ramp the eased midpoint sits, as a fraction of `FEATHER_SPAN` —
tuned so it reads as a soft dissolve rather than a flat linear wipe.

The flute column's fade (`FEATHER_MASK`) is built once from these constants rather than hand-tuned
separately, so it can't drift out of step with the labels it has to line up against. Computed here,
not in a global stylesheet, since a static CSS class has no way to share these numbers with the
component that also positions those labels.

## Bounded elastic pan (`useTimelineWindow.ts`)

Bounded elastic pan for the Timeline's date cursor: an absolute ms-since-epoch `centerMs`, nothing
scrolls in DOM terms. Wheel and touch deltas accumulate into a raw position that can give a little
past either bound during a gesture — a small, viewport-relative squish rather than the whole
content, so panning never reveals more than a sliver of blank timeline — and a critically damped
spring, always starting from rest, decelerates it back once the gesture ends. No overshoot: the
bound it settles to often sits exactly on a month boundary (`parseDate` resolves "Mon YYYY" to day
1, midnight), so it's a knife-edge for the cursor label — any overshoot there, however small,
crosses the label's transition and comes back, reading as the month flickering rather than as a
bounce. Starting the spring from rest every time (`ZETA >= 1` guarantees no overshoot only when the
initial velocity is zero) is what actually makes that guarantee hold.

## `ELASTIC_FRACTION` / `MAX_GIVE_MONTHS`

How far a pull can push past a bound, as a fraction of one viewport's worth of months — small on
purpose, so the give reads as a squish rather than scrolling into blank timeline. Capped by
`MAX_GIVE_MONTHS` regardless of zoom, since at a wide-out zoom this fraction alone can still be well
over a month.

## `OVERSCROLL_IGNORE_PX`

Below this px, a wheel tick while already overscrolled doesn't count as a live pull — it's what a
trackpad's decaying momentum tail looks like (a real, deliberate scroll or drag keeps feeding deltas
well above this). Ignoring them, rather than just timing them out, means a long tail can't hold the
bounce open or interrupt it: the pull already ends on schedule after the last *meaningful* tick, and
nothing past that point re-engages it.

---
Consumed by: `src/components/timeline/TimelineView.tsx`, `src/components/timeline/useTimelineWindow.ts`.

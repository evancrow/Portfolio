# Footer overscroll dome

Design rationale for `src/components/layout/Footer.tsx` and its only consumer-specific hook,
`src/components/layout/useOverscrollReveal.ts`.

## One number drives all of it

Footer, with a fluted glass dome that grows out of its bottom edge on overscroll.

One number drives all of it, and everything here is a share of that one number, which is the whole
of why it reads as one movement:

- The page above and the name ride up by the full pull, through `--lift` and a matching transform.
  Two writes, one value, no second rate to keep in step. The strip the page vacates is the footer's
  own paper, so paper slides over paper and the seam between them never shows.
- The dome is a fixed-size glass panel whose field grows out of its bottom edge, through the
  renderer's own `reveal` (see `docs/fluted-glass-rendering.md`). Fixed, because the renderer sizes
  its render targets from the panel's rect and they are immutable textures, so animating the panel
  itself would reallocate both of them every frame. Grown rather than uncovered: a mask over it
  would cut every flute off along one contour, where scaling the field leaves each one dissolving
  at its own height, which is what the hero looks like and the whole reason the panel is here.
- The credit line is the one thing that moves on its own account, because it is not moving on its
  own account: it is lying on a beam the dome bends. The beam is one path and each half of the line
  is one string laid along it, so a phrase bends from the middle as a whole and keeps its kerning.
  Not a box per letter: letters set individually come apart, and the rim of a curve sweeping through
  a word tears it in half.

## `OVERHEAD`

The glass panel's height, in domes.

The reveal is a fraction of the panel, and so is the field's feather, so a reveal approaching 1 is a
falloff as long as the panel it has to die inside. It does not make it: it meets the top of the
canvas still at strength and rules a hard horizontal line across the page, which is the one thing
nothing downstream can soften, since a canvas has no outside. So the panel is built taller than the
dome ever opens to and the reveal only ever uses the bottom of it. Two is enough to leave the tail
at a few ten-thousandths by the top edge.

The footer preset's `blur` (see `docs/fluted-glass-presets.md`) is paired with this number: the room
costs a slightly wider feather, and that preset pays for it.

## `FOLD_FADE`

How much of the panel's bottom dissolves into the fold, as a share of its own height.

iOS Safari's floating URL bar paints over the last stretch of the document rather than beside it,
and there is no remaining scroll at the footer to give the panel overhang the way the hero's bleed
does (see `docs/ios-viewport-bleed.md`) — this is the true end of the page. So the panel doesn't
reach for the fold, it dissolves before it: masked out over its own last `FOLD_FADE` share, so what
would otherwise be a hard cut where the bar's strip begins is instead paper meeting paper, since
`body`'s background already propagates to the viewport canvas underneath.

Only this long because the ramp below is eased; on a linear one it would make the band worse rather
than better. Past ~0.35 it starts eating the dome.

## Fold ramp (Mach banding)

Smoothstep, as gradient stops along a ramp of `--fold-ramp`.

A plain linear gradient leaves a visible line where the fade starts: nothing in the image is a
line, but the slope changes in one step where the ramp meets the solid part, and the eye's edge
detection amplifies that discontinuity into a Mach band. Lengthening a linear ramp only relocates
the line, it does not remove it. Smoothstep (`t²(3−2t)`) leaves and arrives with zero slope instead.

## `SURFACE`

Where the beam rides, as a share of the pull.

Above 1, which reads wrong until you look at what the dome is made of. Its crest is parked on the
panel's bottom edge and everything visible is the Gaussian tail above that, so the blue reaches well
past the height the reveal nominally opens to. A beam on that nominal height is small grey text laid
inside the glass with flutes running through it, which is the one place it cannot go, so the beam
clears the dome rather than sitting on it: at a full pull the ends of the line ride a little over
one pull above the seam, where the field is down to a few percent and the paper is white again.

Bounded at the top by the name, which rides up by exactly the pull. Much past 1.4 and the inner end
of the longer phrase starts arriving under its descenders.

## `MOBILE_SURFACE`

Below `sm`, the beam's crest reads taller than the dome under it.

The dome's blur feather scales as `blur * reveal^0.75 * fh` in the shader (`passes.ts`), where `fh`
is the panel's own pixel height — so for the same raw overscroll, a shorter mobile footer feathers a
shorter reach. The beam's crest has no such term: it is `pull * SURFACE` alone, blind to the panel
it is meant to ride above. So on a short footer the line arcs above where the glass has actually
reached.

Tapered rather than stepped, so there is no seam at the breakpoint, and flat at 1 from `sm` up, so
desktop is untouched. The floor is a rough match to the feather's own `fh^0.25` falloff between a
phone-width and a desktop-width footer, not a measured one — nudge `MOBILE_SURFACE` if it still
reads tall on a narrow device.

## `BEAM_SPAN`

The beam's own width, in half-footers, measured to where its parabola would come back to rest.

Above 1 on purpose: the ends sit off the window, so what crosses the page is the gentle middle of
the arc rather than the steep shoulders where it turns over. It also means the beam has no rim on
screen for a phrase to straddle, which is the thing that cannot be made to look like anything but a
fault.

## Dome wrapper & fold mask (JSX)

A wrapper for the height, since the panel carries its own `relative` and the two would be one
specificity apart with nothing to say which wins. Taller than the dome by `OVERHEAD`, so it reaches
well up behind the name, which is why it comes first: everything after it in here paints over it.
Never resized either way, so the renderer allocates its targets once.

The mask is gated on the overhang, and by taking the shorter of the two rather than by a second
condition anything could disagree with. `--bleed` is 0 wherever the window's bottom edge really is
the bottom edge, which zeroes the ramp and collapses every stop below onto the same place: a mask
that hides nothing, so the dome runs to the edge untouched, which is right, since there is no bar in
front of it to stand clear of. Where there is chrome the bleed is far longer than the ramp, so the
fade is the full one. Only `maskImage` is set — also setting the `-webkit-` spelling visibly weakens
the glass on iOS, a different compositing path for the masked layer.

## Overscroll reveal: why a custom gesture (`useOverscrollReveal.ts`)

Turns overscroll at the bottom of the page into one number.

There is nothing left to scroll down there, so there is no position to read and the gesture has to
be assembled out of raw wheel and touch deltas. That is the whole difficulty of this file: a wheel
event is a chunk rather than a place, momentum arrives as more of the same chunks with nothing
marking where the hand stopped, and a finger resting still on a trackpad sends nothing at all. Every
one of those gaps is a timer in here.

The alternative, giving the page real scroll room past its own end and reading the position out of
it, was tried and taken back out. The browser owns that position, and it will not share it: the
return has to be a programmatic scroll, Safari holds the wheel gesture's own target offset for a
while past the `scrollend` it has already fired, and it puts the page back where it wanted it.
Which our return reads as a hand, stands down for, and tries again. The two of them trade the page
back and forth for a second or more. Owning the whole gesture is more code than that was, and it is
the only version of this that cannot be argued with.

Nothing pulls back while the gesture is still going. The band holds wherever the hand left it and
only starts home once the finger lifts or the wheel goes quiet, because anything that reels it in
mid-pull is felt as the page arguing with the hand rather than as resistance. The resistance lives
in the accumulator instead, which is what `RESIST` sets.

The value is handed to a callback rather than to React state. It changes every frame, and a number
that only ever lands in a style property has no business going through a render.

## `RESIST`

TUNE ME. How firm the pull is: how much gesture a full dome costs, against the dome's own height.

The accumulator is asymptotic, so this is resistance rather than a rate. At 1 the first pixels track
the gesture exactly and it takes about three domes of scrolling to arrive within a few percent of a
full one. Raising it multiplies that: the reveal never quite finishes, which is the point, and the
last of it costs far more than the first.

The one thing it costs is the opening, since the first pixels track at `1 / RESIST` of the gesture.
That softens the start but never delays it, which is the line that matters: glass that arrives late
was the original complaint about this whole effect. Much above 2 and it is soft enough off the mark
to read as lag.

## `IDLE_MS`

Quiet that counts as the gesture being over.

Momentum keeps wheel events coming after the fingers lift, so this is waiting out the momentum
rather than the fingers. Long enough to cover a slow deliberate scroll, whose events are sparse and
whose gaps a short window reads as a release: the reader pushes a notch, the spring takes it back,
and the reveal is stuck. Worst at the top of the travel, where the spring pulls hardest.

## `STIFFNESS` / `ZETA`

The return. Critically damped, since an overshoot here would be the band pushing past shut and the
page moving down under a reader who is already on their way up.

Soft on purpose: it only ever runs with the hand off, so it has nothing to hurry back for, and a
stiff one reads as the band being yanked out from under the gesture that just finished. Around a
third of a second to settle from a full pull.

## `VEL_RATE`

How quickly the measured pull velocity is allowed to change while the hand is on it. Smoothed
because it is a difference of two frames of chunked wheel deltas, and the spring inherits it at
release: unsmoothed, whichever notch happened to land last would decide how the return leaves.

## `UP_SLOP`

Slack on a wheel delta going the other way.

A trackpad drag is not monotonic: it emits the odd zero and the odd pixel the wrong way while the
fingers are still moving down. Treating those as a release starts the return home under the hand,
which is felt as the band stuttering. A genuine scroll back up still lets go on the spot.

---
Consumed by: `src/components/layout/Footer.tsx`, `src/components/layout/useOverscrollReveal.ts`.

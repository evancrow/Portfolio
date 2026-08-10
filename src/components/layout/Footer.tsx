"use client";

/**
 * Footer, with a fluted glass dome that grows out of its bottom edge on overscroll.
 *
 * One number drives all of it, and everything here is a share of that one number, which is the whole
 * of why it reads as one movement:
 *
 * - The page above and the name ride up by the full pull, through `--lift` and a matching transform.
 *   Two writes, one value, no second rate to keep in step. The strip the page vacates is the footer's
 *   own paper, so paper slides over paper and the seam between them never shows.
 * - The dome is a fixed-size glass panel whose field grows out of its bottom edge, through the
 *   renderer's own `reveal`. Fixed, because the renderer sizes its render targets from the panel's
 *   rect and they are immutable textures, so animating the panel itself would reallocate both of
 *   them every frame. Grown rather than uncovered: a mask over it would cut every flute off along
 *   one contour, where scaling the field leaves each one dissolving at its own height, which is
 *   what the hero looks like and the whole reason the panel is here.
 * - The credit line is the one thing that moves on its own account, because it is not moving on its
 *   own account: it is lying on a beam the dome bends. The beam is one path and each half of the line
 *   is one string laid along it, so a phrase bends from the middle as a whole and keeps its kerning.
 *   Not a box per letter: letters set individually come apart, and the rim of a curve sweeping
 *   through a word tears it in half.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { FlutedGlass, presets } from "@/components/fluted-glass";
import { site } from "@/content/site";
import { links } from "@/content/links";
import { useOverscrollReveal } from "./useOverscrollReveal";

/** Crest of a full pull, as a fraction of the footer's height. Measured rather than fixed, so the
 *  dome holds its share of a footer that is itself sized off the viewport. */
const ARC_RATIO = 0.45;

/** Fallback until the first measurement lands, so the very first frame has somewhere to go. */
const ARC_FALLBACK = 225;

/**
 * The glass panel's height, in domes.
 *
 * The reveal is a fraction of the panel, and so is the field's feather, so a reveal approaching 1 is
 * a falloff as long as the panel it has to die inside. It does not make it: it meets the top of the
 * canvas still at strength and rules a hard horizontal line across the page, which is the one thing
 * nothing downstream can soften, since a canvas has no outside. So the panel is built taller than the
 * dome ever opens to and the reveal only ever uses the bottom of it. Two is enough to leave the tail
 * at a few ten-thousandths by the top edge.
 *
 * The footer preset's `blur` is paired with this number: the room costs a slightly wider feather, and
 * that preset pays for it.
 */
const OVERHEAD = 2;

/**
 * How much of the panel's bottom dissolves into the fold, as a share of its own height.
 *
 * iOS Safari's floating URL bar paints over the last stretch of the document rather than beside it,
 * and there is no remaining scroll at the footer to give the panel overhang the way the hero's bleed
 * does — this is the true end of the page. So the panel doesn't reach for the fold, it dissolves
 * before it: masked out over its own last `FOLD_FADE` share, so what would otherwise be a hard cut
 * where the bar's strip begins is instead paper meeting paper, since `body`'s background already
 * propagates to the viewport canvas underneath.
 *
 * Only this long because the ramp below is eased; on a linear one it would make the band worse rather
 * than better. Past ~0.35 it starts eating the dome.
 */
const FOLD_FADE = 0.26;

/** Smoothstep segments in the mask below. More changes nothing — the browser interpolates linearly
 *  between stops, and past this many each straight piece is shorter than the banding it would cause. */
const FOLD_STEPS = 8;

/**
 * Smoothstep, as gradient stops along a ramp of `--fold-ramp`.
 *
 * A plain linear gradient leaves a visible line where the fade starts: nothing in the image is a
 * line, but the slope changes in one step where the ramp meets the solid part, and the eye's edge
 * detection amplifies that discontinuity into a Mach band. Lengthening a linear ramp only relocates
 * the line, it does not remove it. Smoothstep (`t²(3−2t)`) leaves and arrives with zero slope instead.
 */
const foldRamp = () =>
  Array.from({ length: FOLD_STEPS + 1 }, (_, i) => {
    const t = i / FOLD_STEPS;
    const a = t * t * (3 - 2 * t);
    return `rgba(0,0,0,${a.toFixed(3)}) calc(var(--fold-ramp) * ${t.toFixed(3)})`;
  }).join(", ");

/**
 * Where the beam rides, as a share of the pull.
 *
 * Above 1, which reads wrong until you look at what the dome is made of. Its crest is parked on the
 * panel's bottom edge and everything visible is the Gaussian tail above that, so the blue reaches
 * well past the height the reveal nominally opens to. A beam on that nominal height is small grey
 * text laid inside the glass with flutes running through it, which is the one place it cannot go, so
 * the beam clears the dome rather than sitting on it: at a full pull the ends of the line ride a
 * little over one pull above the seam, where the field is down to a few percent and the paper is
 * white again.
 *
 * Bounded at the top by the name, which rides up by exactly the pull. Much past 1.4 and the inner end
 * of the longer phrase starts arriving under its descenders.
 */
const SURFACE = 1.25;

/**
 * The beam's own width, in half-footers, measured to where its parabola would come back to rest.
 *
 * Above 1 on purpose: the ends sit off the window, so what crosses the page is the gentle middle of
 * the arc rather than the steep shoulders where it turns over. It also means the beam has no rim on
 * screen for a phrase to straddle, which is the thing that cannot be made to look like anything but
 * a fault.
 */
const BEAM_SPAN = 1.35;

/** The page's side gutter, matching the `px-[8.7vw]` the rest of the footer is laid out on. The beam
 *  runs gutter to gutter, so both halves of the credit line are pinned to its ends and neither
 *  creeps along it as the curve lengthens. */
const GUTTER = 0.087;

/** The beam's height at the gutters, as a share of its crest. Its own parabola, at the gutters. */
const EDGE = 1 - ((2 * (0.5 - GUTTER)) / BEAM_SPAN) ** 2;

/** One footer to a page, so a fixed id is enough for the two `textPath` references. */
const BEAM_ID = "credit-beam";

/** Split so the name can force-break to "Evan / Crow" on mobile without hardcoding either word. */
const [FIRST_NAME, LAST_NAME] = site.name.split(" ");

const CREDIT = [
  { line: "Designed & Developed by Evan.", at: "0%", anchor: "start" },
  { line: `© ${new Date().getFullYear()}`, at: "100%", anchor: "end" },
] as const;

/** Everything but the résumé download — the footer's Connect column is outbound links only. */
const CONNECT_LINKS = links.filter((entry) => entry.title !== "Download Resume");

/**
 * The beam, as one quadratic Bezier from gutter to gutter.
 *
 * A quadratic is a parabola, and with the control point over the midpoint x advances linearly along
 * it, so this is exactly the parabola and not a curve fitted to it. Which matters, because the
 * browser takes the tilt of every letter from this path's own tangent: anything with a kink in it
 * would show up as a letter snapping round.
 */
function beamPath(pull: number, width: number): string {
  const crest = pull * SURFACE;
  const gutter = width * GUTTER;
  // Up is negative here, since the beam sits on the baseline at y = 0.
  const ends = -(crest * EDGE);
  const control = -(crest * (2 - EDGE));
  return `M${gutter.toFixed(1)} ${ends.toFixed(2)}Q${(width / 2).toFixed(1)} ${control.toFixed(2)} ${(width - gutter).toFixed(1)} ${ends.toFixed(2)}`;
}

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<SVGPathElement>(null);
  /** Handed to the renderer, which reads it every frame. The pull, as a share of the panel's height. */
  const revealRef = useRef(0);

  /** Width feeds the beam, height the dome and the pull's ceiling. One measurement, so the two of
   *  them cannot disagree. */
  const [box, setBox] = useState({ width: 0, arc: ARC_FALLBACK });

  // Offset geometry rather than rects: one read per resize either way, and offsets ignore the lift
  // the reveal is applying to everything above this.
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const measure = () => {
      const width = footer.offsetWidth;
      const arc = Math.round(footer.offsetHeight * ARC_RATIO);
      // Same numbers, same object: a ResizeObserver fires on plenty of things that are not a size
      // change, and every new object here would be a render.
      setBox((prev) => (prev.width === width && prev.arc === arc ? prev : { width, arc }));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(footer);
    return () => ro.disconnect();
  }, []);

  const write = useCallback(
    (px: number) => {
      const shift = px > 0 ? `translate3d(0, ${(-px).toFixed(2)}px, 0)` : "";

      // A whole transform rather than a length, so at rest there is no transform at all: no
      // containing block, no layer, nothing for the pinned stage above to notice while the footer
      // is off screen.
      const root = document.documentElement.style;
      if (px > 0) root.setProperty("--lift", shift);
      else root.removeProperty("--lift");

      // The name's own copy of the same value. It is inside the footer rather than the lifted page,
      // and it has to ride up with it or the dome grows straight through it.
      if (nameRef.current) nameRef.current.style.transform = shift;

      // The renderer picks this up on its own next frame, notices it moved, and redraws the field at
      // that height. Measured against the panel rather than the dome, since the panel carries the
      // overhead the field's tail needs and a full pull is only ever a fraction of it. Nothing here
      // touches the panel's box, so its render targets are never resized.
      revealRef.current = box.arc > 0 ? px / (box.arc * OVERHEAD) : 0;

      // One attribute for the whole credit line. The strings never move: the path under them does.
      if (beamRef.current && box.width > 0) {
        beamRef.current.setAttribute("d", beamPath(px, box.width));
      }
    },
    [box],
  );

  useOverscrollReveal(box.arc, write);

  return (
    <footer
      ref={footerRef}
      className="relative isolate bg-paper pb-[env(safe-area-inset-bottom)] text-ink"
    >
      {/* A wrapper for the height, since the panel carries its own `relative` and the two would be
          one specificity apart with nothing to say which wins. Taller than the dome by `OVERHEAD`,
          so it reaches well up behind the name, which is why it comes first: everything after it in
          here paints over it. Never resized either way, so the renderer allocates its targets once.

          The mask is gated on the overhang, and by taking the shorter of the two rather than by a
          second condition anything could disagree with. `--bleed` is 0 wherever the window's bottom
          edge really is the bottom edge, which zeroes the ramp and collapses every stop below onto
          the same place: a mask that hides nothing, so the dome runs to the edge untouched, which is
          right, since there is no bar in front of it to stand clear of. Where there is chrome the
          bleed is far longer than the ramp, so the fade is the full one. Only `maskImage` is set —
          also setting the `-webkit-` spelling visibly weakens the glass on iOS, a different
          compositing path for the masked layer. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={
          {
            height: box.arc * OVERHEAD,
            "--fold-ramp": `min(${(FOLD_FADE * box.arc * OVERHEAD).toFixed(0)}px, calc(var(--bleed) * 99))`,
            maskImage: `linear-gradient(to top, ${foldRamp()})`,
          } as CSSProperties
        }
      >
        <FlutedGlass {...presets.footer} reveal={revealRef} className="h-full w-full" />
      </div>

      <div
        ref={nameRef}
        className="relative flex min-h-[clamp(20rem,33vw,34rem)] flex-col justify-end px-[8.7vw] pb-[clamp(5rem,11.5vw,11rem)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-[clamp(2.5rem,5vw,4.5rem)] gap-y-10 sm:items-start">
          <h2 className="font-display text-[clamp(2.75rem,7.5vw,7rem)] leading-none font-bold tracking-[-0.02em]">
            {FIRST_NAME}
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>
            {LAST_NAME}
          </h2>
          <div className="flex gap-[clamp(2.5rem,5vw,4.5rem)] text-[clamp(0.95rem,1.3vw,1.15rem)]">
            <div className="flex flex-col gap-[0.4em]">
              <p className="font-display text-mute mb-[0.2em] text-[0.85em]">Connect</p>
              {CONNECT_LINKS.map((entry) => {
                const external = entry.link?.startsWith("http");
                return (
                  <a
                    key={entry.title}
                    href={entry.link}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="font-display -my-1.5 inline-flex items-center gap-1 py-1.5 underline decoration-1 underline-offset-4"
                  >
                    {entry.title}
                    <ArrowUpRight aria-hidden="true" className="size-[0.8em]" />
                  </a>
                );
              })}
            </div>
            
          </div>
        </div>
      </div>

      {/*
        The credit line, on the beam. A one pixel box whose bottom edge is the text's baseline, so
        the descenders and everything the curve lifts hang outside it, which is what
        `overflow-visible` is for. Its own font size, since the SVG text inherits the CSS font like
        any other text and the `em` in the offset below has to resolve against the same one.
      */}
      <svg
        className="font-display pointer-events-none absolute inset-x-0 h-px w-full overflow-visible text-[clamp(0.8rem,1.15vw,1.05rem)] text-mute"
        style={{ bottom: "calc(clamp(2rem, 4.5vw, 4rem) + 0.24em)" }}
      >
        {/* No stroke and no fill, so it paints nothing and needs no `defs` to hide it in. */}
        <path
          ref={beamRef}
          id={BEAM_ID}
          fill="none"
          d={box.width > 0 ? beamPath(0, box.width) : undefined}
        />
        {CREDIT.map(({ line, at, anchor }) => (
          <text key={line} fill="currentColor" textAnchor={anchor}>
            <textPath href={`#${BEAM_ID}`} startOffset={at}>
              {line}
            </textPath>
          </text>
        ))}
      </svg>
    </footer>
  );
}

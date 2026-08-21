"use client";

/** Footer, with a fluted glass dome that grows out of its bottom edge on overscroll — one number
 *  (the pull) drives the page lift, the dome's reveal, and the credit line's beam together.
 *  Rationale: docs/footer.md § One number drives all of it */

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

/** The glass panel's height, in domes — taller than the dome ever opens to, so the reveal's tail
 *  finishes inside the panel instead of hitting the canvas edge as a hard line.
 *  Rationale: docs/footer.md § OVERHEAD */
const OVERHEAD = 2;

/** How much of the panel's bottom dissolves into the fold, as a share of its own height, so the
 *  iOS URL-bar strip meets paper rather than a hard-clipped edge.
 *  Rationale: docs/footer.md § FOLD_FADE */
const FOLD_FADE = 0.26;

/** Smoothstep segments in the mask below. More changes nothing — the browser interpolates linearly
 *  between stops, and past this many each straight piece is shorter than the banding it would cause. */
const FOLD_STEPS = 8;

/** Smoothstep gradient stops along `--fold-ramp`, to avoid a Mach band at a linear fade's edge.
 *  Rationale: docs/footer.md § Fold ramp (Mach banding) */
const foldRamp = () =>
  Array.from({ length: FOLD_STEPS + 1 }, (_, i) => {
    const t = i / FOLD_STEPS;
    const a = t * t * (3 - 2 * t);
    return `rgba(0,0,0,${a.toFixed(3)}) calc(var(--fold-ramp) * ${t.toFixed(3)})`;
  }).join(", ");

/** Where the beam rides, as a share of the pull — above 1, since the dome's crest sits on the
 *  panel's bottom edge and the visible blue reaches well past the reveal's nominal height.
 *  Rationale: docs/footer.md § SURFACE */
const SURFACE = 1.25;

/** Below `sm`, tapers `SURFACE` down so the beam's crest doesn't read taller than the shorter
 *  mobile dome under it. Rationale: docs/footer.md § MOBILE_SURFACE */
const MOBILE_SURFACE = 0.3;
const MOBILE_WIDTH = 375;
const SM_WIDTH = 640;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function surfaceFor(width: number): number {
  if (width >= SM_WIDTH || width <= 0) return SURFACE;
  const t = clamp01((width - MOBILE_WIDTH) / (SM_WIDTH - MOBILE_WIDTH));
  return SURFACE * (MOBILE_SURFACE + (1 - MOBILE_SURFACE) * t);
}

/** The beam's own width, in half-footers, measured to where its parabola would come back to rest —
 *  above 1 so the ends (and the parabola's steep shoulders) sit off the window.
 *  Rationale: docs/footer.md § BEAM_SPAN */
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
  const crest = pull * surfaceFor(width);
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
      {/* Height wrapper, taller than the dome by OVERHEAD; mask gated on the overhang (--bleed).
          Rationale: docs/footer.md § Dome wrapper & fold mask */}
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
        className="relative flex min-h-[clamp(20rem,33vw,34rem)] flex-col justify-end px-[8.7vw] pb-[clamp(9rem,11.5vw,11rem)] sm:pb-[clamp(5rem,11.5vw,11rem)]"
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
        className="font-display pointer-events-none absolute inset-x-0 bottom-[calc(5rem+0.24em)] h-px w-full overflow-visible text-[clamp(0.8rem,1.15vw,1.05rem)] text-mute sm:bottom-[calc(clamp(2rem,4.5vw,4rem)+0.24em)]"
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

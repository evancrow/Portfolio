"use client";

/**
 * Two panels stacked in one pinned viewport, crossfaded by scroll position.
 *
 * Nothing moves geometrically while the handoff runs, so the eye reads a dissolve between two
 * scenes rather than one sliding over the other. Opacity is a pure function of scroll position,
 * never of elapsed time: park the wheel and the picture parks with it, scroll back up and it
 * retraces exactly, and jumping straight to a position (scroll restoration, End, an anchor) is
 * correct on the first frame instead of catching up.
 */

import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";

/** Scroll distance in pin-heights. Never time. */
export type CrossfadePhases = {
  /** `from` untouched, so a stray flick does not immediately dim it. */
  hold: number;
  /** `from` fades out. */
  out: number;
  /** Bare background. The beat that makes this a cut between scenes rather than a dip. */
  gap: number;
  /** `to` fades in. */
  in: number;
  /** `to` alone, still holding the pin. Scroll room for whatever it does with position. */
  tail: number;
};

const DEFAULT_PHASES: CrossfadePhases = {
  hold: 0.35,
  // Half a viewport of wheel is a couple of flicks, which reads as a dissolve rather than a
  // switch. `in` matches it so the pair reverses identically.
  out: 0.5,
  gap: 0.2,
  in: 0.5,
  tail: 1.35,
};

export type CrossfadeStageProps = {
  /** Visible at the top of the stage. */
  from: ReactNode;
  /** Takes over. */
  to: ReactNode;
  phases?: Partial<CrossfadePhases>;
  /** Extra classes for the pinned viewport. The track owns its own height. */
  className?: string;
};

/**
 * `--fade` drives opacity, and `--rise` is the drift direction a child can read through
 * `.fade-rise`, so `from` leaves upward and `to` arrives from below. Both are set here rather
 * than on first paint of the effect, so server-rendered HTML is already the top of the stage.
 */
const LAYER_FROM = { "--fade": 1, "--rise": -1, opacity: "var(--fade)" } as CSSProperties;
const LAYER_TO = { "--fade": 0, "--rise": 1, opacity: "var(--fade)" } as CSSProperties;

/** Below this a layer is indistinguishable from absent, so it gets taken out of the page. */
const EPSILON = 1e-3;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

export function CrossfadeStage({ from, to, phases, className }: CrossfadeStageProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  const stops = useMemo(() => {
    const p = { ...DEFAULT_PHASES, ...phases };
    const outStart = p.hold;
    const outEnd = outStart + p.out;
    const inStart = outEnd + p.gap;
    const inEnd = inStart + p.in;
    // The pin holds for `travel` and the track is one viewport taller, so the height is a
    // function of the phases. Passing it in separately would desync the moment one changes.
    // Rounded, because summing the phases otherwise lands a float tail in the markup.
    const travel = inEnd + p.tail;
    return { outStart, outEnd, inStart, inEnd, height: Math.round((travel + 1) * 1e4) / 100 };
  }, [phases]);

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;

    // The page is one pinned stage, so restoring into the middle of a transition is never what
    // anyone wanted, and the server has no way to render that frame correctly anyway.
    const supported = "scrollRestoration" in history;
    const restoration = supported ? history.scrollRestoration : "auto";
    if (supported) history.scrollRestoration = "manual";

    let queued = 0;
    // Seeded from what the markup actually says. Both layers ship displayed and only `to` ships
    // transparent, so at the top of the stage its opacity is already right and its `display` is
    // not, which is exactly the case a single "last value" would miss.
    const fromState = { fade: 1, shown: true };
    const toState = { fade: 0, shown: true };

    const write = (el: HTMLElement | null, s: { fade: number; shown: boolean }, fade: number) => {
      if (!el) return;
      const show = fade > EPSILON;
      if (show !== s.shown) {
        s.shown = show;
        // `display` rather than `visibility`, because the panels pause their render loops on an
        // IntersectionObserver and a hidden element still has a box to intersect with. This is
        // also the only thing that stops a faded-out panel from tracking the pointer forever.
        el.style.display = show ? "" : "none";
      }
      if (show && Math.abs(fade - s.fade) > 1e-4) el.style.setProperty("--fade", fade.toFixed(4));
      s.fade = fade;
    };

    const apply = () => {
      // Measured every frame rather than cached, and from the track's own rect rather than
      // scrollY, so the stage is correct wherever it sits on the page and after anything that
      // moves it: resize, orientation, a late font swap. Dividing by the pin's measured height
      // rather than innerHeight is what keeps the phases honest when a vh and the real viewport
      // disagree, which they do for the whole of an iOS URL bar collapse.
      const unit = pin.getBoundingClientRect().height || 1;
      const p = -track.getBoundingClientRect().top / unit;
      write(fromRef.current, fromState, 1 - smoothstep(stops.outStart, stops.outEnd, p));
      write(toRef.current, toState, smoothstep(stops.inStart, stops.inEnd, p));
    };

    const onScroll = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        apply();
      });
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(queued);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (supported) history.scrollRestoration = restoration;
    };
  }, [stops]);

  return (
    <div ref={trackRef} className="relative w-full" style={{ height: `${stops.height}vh` }}>
      {/* Sticky is already a containing block, so the layers need nothing else to position against. */}
      <div ref={pinRef} className={["sticky top-0 h-screen", className].filter(Boolean).join(" ")}>
        <div ref={fromRef} className="absolute inset-0" style={LAYER_FROM}>
          {from}
        </div>
        <div ref={toRef} className="absolute inset-0" style={LAYER_TO}>
          {to}
        </div>
      </div>
    </div>
  );
}

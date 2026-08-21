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
import { registerStage, requestStageFrame } from "@/components/scroll-stage/useScrollStage";

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
  /**
   * Overrides `phases` on a coarse pointer, for the fade's timing only — `hold`/`out`/`gap`/`in`
   * pick where within the scroll the fade sits, same as `phases`, but never feed the track's
   * height (that's `phases` alone, via `stops.travel` below), so this can't desync what the
   * server rendered from what a touch client measures.
   *
   * Exists because the same fraction of scroll costs far more gestures on a thumb-swipe than a
   * trackpad flick: a `hold`/`out` tuned so the fade reads calmly under a mouse leaves a phone
   * scrolling through most of a swipe before anything visibly moves. Retuned smaller here so the
   * fade both starts and finishes within roughly the one swipe that budget actually buys on a
   * phone; whatever scroll room `phases`' own total leaves beyond that plays out as `tail` always
   * has, holding the pin over an already-settled `to`.
   */
  touchPhases?: Partial<CrossfadePhases>;
  /** Extra classes for the pinned viewport. The track owns its own height. */
  className?: string;
  /**
   * `"dissolve"` (default): both layers' opacity animate independently across their own
   * `out`/`in` windows, with `gap` a deliberate blank beat between them — right for two
   * translucent scenes, where overlapping them mid-transition would show a muddy blend of both.
   * `"cover"`: `from` stays at full opacity and `to`'s opacity is tied directly to `from`'s own
   * `out` curve instead (see `apply()`) — complementary, so there's no gap, which is what a plain
   * cross-dissolve wants once `to` is already opaque: `gap`/`in` stop affecting the crossfade
   * itself in this mode (though `phases`' total still sets the track's height as always).
   * `from` never getting an animated `opacity` matters when it wraps a full-screen WebGL canvas:
   * an animated `opacity` over one forces an expensive translucent composite every frame for the
   * whole transition, where a canvas at a constant opacity composites directly. `--fade`/
   * `.fade-rise` drift on `from` is identical either way — only what drives visible opacity does.
   */
  mode?: "dissolve" | "cover";
};

/**
 * `--fade` drives opacity, and `--rise` is the drift direction a child can read through
 * `.fade-rise`, so `from` leaves upward and `to` arrives from below. Both are set here rather
 * than on first paint of the effect, so server-rendered HTML is already the top of the stage.
 */
const LAYER_FROM_DISSOLVE = { "--fade": 1, "--rise": -1, opacity: "var(--fade)" } as CSSProperties;
/** `mode="cover"`'s `from`: `--fade` still published for `.fade-rise`, opacity pinned at 1. */
const LAYER_FROM_COVER = { "--fade": 1, "--rise": -1, opacity: 1 } as CSSProperties;
const LAYER_TO = { "--fade": 0, "--rise": 1, opacity: "var(--fade)" } as CSSProperties;

/** Below this a layer is indistinguishable from absent, so it gets taken out of the page. */
const EPSILON = 1e-3;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

export function CrossfadeStage({
  from,
  to,
  phases,
  touchPhases,
  className,
  mode = "dissolve",
}: CrossfadeStageProps) {
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
    // The pin holds for `travel`, past its own one-viewport height, so the track's height is a
    // function of the phases. Passing it in separately would desync the moment one changes.
    // In `svh` — the viewport that's always visible, not `100vh`/`lvh`'s bar-collapsed one — so
    // this is the scroll distance a phase actually costs a reader's thumb, not a browser chrome
    // state. Rounded, because summing the phases otherwise lands a float tail in the markup.
    const travel = Math.round((inEnd + p.tail) * 1e4) / 100;
    return { outStart, outEnd, inStart, inEnd, travel };
  }, [phases]);

  // Deliberately excludes `travel`/`tail`: this reshapes where the fade sits, never how much
  // track it's given, which is what keeps it free of the SSR/touch-client height mismatch a
  // device-conditional `phases` would risk.
  const touchStops = useMemo(() => {
    if (!touchPhases) return null;
    const p = { ...DEFAULT_PHASES, ...phases, ...touchPhases };
    const outStart = p.hold;
    const outEnd = outStart + p.out;
    const inStart = outEnd + p.gap;
    const inEnd = inStart + p.in;
    return { outStart, outEnd, inStart, inEnd };
  }, [phases, touchPhases]);

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;

    // The page is one pinned stage, so restoring into the middle of a transition is never what
    // anyone wanted, and the server has no way to render that frame correctly anyway.
    const supported = "scrollRestoration" in history;
    const restoration = supported ? history.scrollRestoration : "auto";
    if (supported) history.scrollRestoration = "manual";

    // Checked once — pointer type doesn't change mid-session on the devices this matters for, and
    // this only ever picks which fixed set of numbers `apply()` reads below, so there's nothing
    // to keep in sync if it did. Read-only; `stops` (server-rendered track height) never sees it.
    const fadeStops =
      touchStops && window.matchMedia("(hover: none) and (pointer: coarse)").matches
        ? touchStops
        : stops;

    // `range()`'s job: turn the handful of things that force a synchronous layout to read
    // (`getBoundingClientRect()`, `offsetHeight`, `getComputedStyle()`) into plain numbers cached
    // here, so `measure()` — which runs on every scroll frame, not just the occasional resize —
    // never has to force one itself. `window.scrollY` is the one read `measure()` keeps doing
    // live, and it's cheap: the browser already tracks it continuously and it forces nothing.
    //
    // This split is what actually matters on iOS specifically: the URL bar animates the viewport
    // height *during* an active scroll gesture, not just at rest between them, so there is a
    // layout-affecting change genuinely pending on or near every scroll frame — which is exactly
    // what a forced-layout read has to resolve synchronously before it can return anything.
    // Desktop never has anything pending mid-scroll (nothing resizes while scrolling), so the same
    // per-frame reads that are nearly free there were forcing real work on every mobile scroll
    // frame, more of them the faster the scroll — a strong match for "smooth slow, stepping at
    // normal speed, desktop unaffected either way."
    let trackTop = 0;
    let unit = 1;

    // The scroll timeline runs on the document, so the pin's range is where the track sits in it.
    // Written on every resize as well as at mount, because both ends move with the viewport.
    const range = () => {
      const bleed = parseFloat(getComputedStyle(pin).getPropertyValue("--bleed")) || 0;
      // How much shorter the always-visible viewport is than `100vh`/`lvh` (the URL-bar-collapsed
      // one `pin.offsetHeight` is built from) — published by `layout.tsx` alongside `--bleed`.
      // Subtracted from `unit` below so a phase costs the same scroll distance whether or not the
      // bar happens to be showing, rather than the up-to-13%-larger bar-collapsed figure.
      const fold = parseFloat(getComputedStyle(pin).getPropertyValue("--fold")) || 0;
      const start = track.getBoundingClientRect().top + window.scrollY;
      trackTop = start;
      // The pin's own height is fixed — it only ever changes on the same resize/orientation
      // events that call `range()` in the first place — so this is the only place it needs
      // reading at all, unlike the per-frame read `measure()` used to do for the same number.
      unit = pin.offsetHeight - bleed - fold || 1;
      // The *full* pin height, bleed included — this is a physical release distance, not a phase
      // unit. The pin's actual box is `pin.offsetHeight` tall regardless of how much of that is
      // overhang; translating it up by anything less leaves exactly that much of its bottom edge
      // still overlapping whatever comes after the track once released. Subtracting `bleed` here
      // (matching `unit` above) was tried and measured wrong: the pin let go early by that many
      // pixels and sat over the next section's top edge instead of clearing it.
      const travel = Math.max(track.offsetHeight - pin.offsetHeight, 0);
      pin.style.setProperty("--pin-start", `${start.toFixed(1)}px`);
      pin.style.setProperty("--pin-end", `${(start + travel).toFixed(1)}px`);
      pin.style.setProperty("--travel", `${travel.toFixed(1)}px`);
    };

    // iOS fires `resize` all through a scroll as the URL bar folds — same behaviour `layout.tsx`
    // documents for `--bleed` — and none of those change the viewport's width. Gating `range()`
    // on a real width change is what tells an actual resize (rotation, an actual window resize)
    // apart from that noise, so `--pin-start`/`--pin-end` stay put through a toolbar fold instead
    // of being rewritten mid-gesture, which is what let the scroll-timeline's range drift under a
    // stationary scroll position and snap the pin.
    let lastWidth = window.innerWidth;

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

    // What `measure()` found, for `commit()` to write. Split from a single `apply()` so this
    // stage's reads and every other stage's reads all happen before any of either one's writes —
    // see `useScrollStage`'s own comment for why that's not just tidiness.
    const pending = { fromFade: fromState.fade, toFade: toState.fade };

    const measure = () => {
      // `trackTop` and `unit` are `range()`'s cache, not read live here — see the comment above
      // `range()`. `window.scrollY` is the only per-frame read, and it never forces layout.
      const p = (window.scrollY - trackTop) / unit;
      pending.fromFade = 1 - smoothstep(fadeStops.outStart, fadeStops.outEnd, p);
      // In cover mode `to`'s opacity mirrors `from`'s own fade-out curve directly, rather than
      // riding its own `gap`/`in` window: the visible transition was always `out` (`from`'s own
      // fadeout — "the animation this stage exists to show", per `page.tsx`), and covering with an
      // opaque `to` should use that same window, not require `phases` to be separately retuned
      // for `in` every time a usage switches mode (a `gap`/`in` sized for a disjoint dissolve — a
      // deliberate blank beat between two translucent scenes — left `to` a near-instant snap here
      // instead of a dissolve). This also makes the two opacities complementary, which is exactly
      // a cross-dissolve: no gap where neither layer covers the point being looked at.
      pending.toFade =
        mode === "cover" ? 1 - pending.fromFade : smoothstep(fadeStops.inStart, fadeStops.inEnd, p);
    };

    const commit = () => {
      write(fromRef.current, fromState, pending.fromFade);
      write(toRef.current, toState, pending.toFade);
    };

    const unregister = registerStage(measure, commit);

    const onScroll = () => requestStageFrame();

    const onResize = () => {
      const width = window.innerWidth;
      if (width !== lastWidth) {
        lastWidth = width;
        range();
      }
      onScroll();
    };

    // A real recompute regardless of width: a rotation can keep the shorter dimension unchanged on
    // some devices, `scrollend` is free since the page is already stationary when it fires and
    // catches anything the width gate above was too narrow for, and fonts are the one thing that
    // resizes the page with no resize event at all.
    const onOrientation = () => {
      lastWidth = window.innerWidth;
      range();
      onScroll();
    };
    const onScrollEnd = () => {
      range();
      onScroll();
    };

    range();
    measure();
    commit();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onOrientation);
    window.addEventListener("scrollend", onScrollEnd, { passive: true });
    document.fonts?.ready.then(onScrollEnd);

    return () => {
      unregister();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientation);
      window.removeEventListener("scrollend", onScrollEnd);
      if (supported) history.scrollRestoration = restoration;
    };
  }, [stops, touchStops, mode]);

  return (
    <div ref={trackRef} style={{ height: `calc(${stops.travel}svh + 100vh + var(--bleed))` }}>
      {/*
        Held by `sticky` where the viewport has no chrome overlapping it, and by the transform
        `.stage-pin` defines in `globals.css` where it does — see that rule for why. Exactly one
        viewport tall plus `--bleed`, since that's the unit every phase above is measured in; the
        overhang belongs to the layers below, not to this box.

        `relative` for the layers to position against (sticky provides this too, but the
        scroll-timeline path does not), and `isolate` so the stage composites as one stacking
        context either way.
      */}
      <div
        ref={pinRef}
        className={["stage-pin relative isolate", className].filter(Boolean).join(" ")}
        style={{ height: "calc(100vh + var(--bleed))" }}
      >
        <div
          ref={fromRef}
          className="absolute inset-0"
          style={mode === "cover" ? LAYER_FROM_COVER : LAYER_FROM_DISSOLVE}
        >
          {from}
        </div>
        <div ref={toRef} className="absolute inset-0" style={LAYER_TO}>
          {to}
        </div>
      </div>
    </div>
  );
}

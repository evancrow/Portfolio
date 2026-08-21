"use client";

/** Two panels stacked in one pinned viewport, crossfaded by scroll position — never time, so the
 *  picture is always exactly where the scroll position says it should be.
 *  Rationale: docs/crossfade-stage.md § Position, not time */

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
   * whole transition, where a canvas at a constant opacity composites directly.
   */
  mode?: "dissolve" | "cover";
};

/**
 * `--fade` drives opacity, and `--rise` is the drift direction a child can read through
 * `.fade-rise`, so `from` leaves upward and `to` arrives from below. Both are set here rather
 * than on first paint of the effect, so server-rendered HTML is already the top of the stage.
 */
const LAYER_FROM_DISSOLVE = { "--fade": 1, "--rise": -1, opacity: "var(--fade)" } as CSSProperties;
/** `mode="cover"`'s `from`: opacity pinned at 1, never animated; `--rise` still published for `.fade-rise`. */
const LAYER_FROM_COVER = { "--fade": 1, "--rise": -1, opacity: 1 } as CSSProperties;
const LAYER_TO = { "--fade": 0, "--rise": 1, opacity: "var(--fade)" } as CSSProperties;

/**
 * Extra slack (fraction of one `unit`) added to the show/hide boundary beyond the fade window
 * itself. `display:none` stops a layer's scroll-timeline animation from tracking/painting at all,
 * and the JS sample deciding when to undo that is the same one that lags behind true scroll
 * position during a fast iOS flick — so a tight fade-based boundary can un-hide a layer late,
 * revealing it already far into its curve with no frames in between to have painted the transition
 * ("just appears" instead of fading). Widening the boundary itself (rather than retiming when it's
 * decided — two prior attempts at that were reverted for worse regressions) gives the compositor a
 * head start: the layer is back in the render tree well before its true opacity would meaningfully
 * depart from its resting value. Rationale: docs/crossfade-stage.md § Compositor-driven fade
 */
const VISIBILITY_MARGIN = 0.2;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * A `linear()` easing that holds flat outside `[start, end]` (fractions of the whole scroll-
 * timeline range) and ramps through `smoothstep` inside it. This is what lets `.crossfade-from`/
 * `.crossfade-to`'s `animation-range` span the entire pinned stage (`--pin-start`/`--pin-end`,
 * never left during normal scrolling within it) instead of just the narrow fade window — a
 * narrower range was found to freeze at a stale value once scroll left it and not reliably resume
 * on re-entry, a real (not just cosmetic) discontinuity on-device.
 * Rationale: docs/crossfade-stage.md § Compositor-driven fade
 */
const buildFadeEasing = (rawStart: number, rawEnd: number, samples = 24) => {
  const start = Math.min(Math.max(rawStart, 0), 1);
  const end = Math.min(Math.max(rawEnd, 0), 1);
  const stops: string[] = ["0 0%"];
  if (start > 0) stops.push(`0 ${(start * 100).toFixed(3)}%`);
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const x = start + t * (end - start);
    stops.push(`${smoothstep(0, 1, t).toFixed(4)} ${(x * 100).toFixed(3)}%`);
  }
  if (end < 1) stops.push(`1 ${(end * 100).toFixed(3)}%`);
  stops.push("1 100%");
  return `linear(${stops.join(", ")})`;
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
    // TEMP DEBUG — remove once we've confirmed which side is actually stepping on-device.
    console.log("scroll-timeline supported:", CSS.supports("animation-timeline", "scroll()"));

    // `range()` caches the forced-layout reads so `measure()` (runs every scroll frame) never
    // has to force one itself. Rationale: docs/pinned-scroll-stages.md § range()'s cache
    let trackTop = 0;
    let unit = 1;

    // What `range()` last actually wrote — skips redundant rewrites of a running scroll-linked
    // animation's inputs, since `scrollend` fires repeatedly during a top-of-page bounce.
    let lastPinStart = "";
    let lastPinEnd = "";
    let lastTravel = "";
    let lastFromEasing = "";
    let lastToEasing = "";

    // The scroll timeline runs on the document, so the pin's range is where the track sits in it.
    // Written on every resize as well as at mount, because both ends move with the viewport.
    const range = (reason: string) => {
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
      // Full pin height, bleed included — a physical release distance, not a phase unit.
      // Rationale: docs/pinned-scroll-stages.md § Full pin height vs. bleed, in range()
      const travel = Math.max(track.offsetHeight - pin.offsetHeight, 0);
      // TEMP DEBUG — remove once the top-of-scroll jitter in Hero/AwardsProjects is diagnosed.
      // Flat string, not an object: Safari's console collapses nested objects to "{…}" in a
      // copy-paste unless each one is expanded by hand first.
      console.log(
        `[CrossfadeStage.range] ${reason} scrollY=${window.scrollY} innerW=${window.innerWidth} innerH=${window.innerHeight} bleed=${bleed} fold=${fold} pinH=${pin.offsetHeight} trackH=${track.offsetHeight} start=${start.toFixed(1)} unit=${unit.toFixed(1)} travel=${travel.toFixed(1)} pinStart=${start.toFixed(1)} pinEnd=${(start + travel).toFixed(1)}`,
      );
      const pinStartStr = start.toFixed(1);
      const pinEndStr = (start + travel).toFixed(1);
      const travelStr = travel.toFixed(1);
      if (pinStartStr !== lastPinStart) {
        pin.style.setProperty("--pin-start", `${pinStartStr}px`);
        lastPinStart = pinStartStr;
      }
      if (pinEndStr !== lastPinEnd) {
        pin.style.setProperty("--pin-end", `${pinEndStr}px`);
        lastPinEnd = pinEndStr;
      }
      if (travelStr !== lastTravel) {
        pin.style.setProperty("--travel", `${travelStr}px`);
        lastTravel = travelStr;
      }
      // `.crossfade-from`/`.crossfade-to`'s own animation-range is this same `--pin-start`/
      // `--pin-end` span (set above) — the fade windows within it are baked into a per-instance
      // `linear()` easing instead, since a narrower animation-range was found to freeze on exit.
      // Written as `--fade-ease` (a custom property, not the longhand directly) so `.fade-rise`
      // children can pick up the identical easing through inheritance for their own separate
      // `transform` animation, rather than needing their own ref for CrossfadeStage to write to.
      // Rationale: docs/crossfade-stage.md § Compositor-driven fade
      const safeTravel = travel || 1;
      const outStartNorm = (fadeStops.outStart * unit) / safeTravel;
      const outEndNorm = (fadeStops.outEnd * unit) / safeTravel;
      const fromEasing = buildFadeEasing(outStartNorm, outEndNorm);
      if (fromRef.current && fromEasing !== lastFromEasing) {
        fromRef.current.style.setProperty("--fade-ease", fromEasing);
        lastFromEasing = fromEasing;
      }
      const [toStartNorm, toEndNorm] =
        mode === "cover"
          ? [outStartNorm, outEndNorm]
          : [(fadeStops.inStart * unit) / safeTravel, (fadeStops.inEnd * unit) / safeTravel];
      const toEasing = buildFadeEasing(toStartNorm, toEndNorm);
      if (toRef.current && toEasing !== lastToEasing) {
        toRef.current.style.setProperty("--fade-ease", toEasing);
        lastToEasing = toEasing;
      }
    };

    // Width-gated so an iOS toolbar-fold resize storm doesn't rewrite the pin range mid-gesture.
    // Rationale: docs/pinned-scroll-stages.md § Width-gated resize handling
    let lastWidth = window.innerWidth;

    // Seeded from what the markup actually says. Both layers ship displayed and only `to` ships
    // transparent, so at the top of the stage its opacity is already right and its `display` is
    // not, which is exactly the case a single "last value" would miss.
    const fromState = { fade: 1, shown: true };
    const toState = { fade: 0, shown: true };

    const write = (
      el: HTMLElement | null,
      s: { fade: number; shown: boolean },
      fade: number,
      visible: boolean,
    ) => {
      if (!el) return;
      if (visible !== s.shown) {
        s.shown = visible;
        // `display` rather than `visibility`, because the panels pause their render loops on an
        // IntersectionObserver and a hidden element still has a box to intersect with. This is
        // also the only thing that stops a faded-out panel from tracking the pointer forever.
        el.style.display = visible ? "" : "none";
      }
      if (visible && Math.abs(fade - s.fade) > 1e-4) el.style.setProperty("--fade", fade.toFixed(4));
      s.fade = fade;
    };

    // What `measure()` found, for `commit()` to write. Split from a single `apply()` so this
    // stage's reads and every other stage's reads all happen before any of either one's writes —
    // see `useScrollStage`'s own comment for why that's not just tidiness.
    const pending = {
      fromFade: fromState.fade,
      toFade: toState.fade,
      fromVisible: true,
      toVisible: true,
    };

    const measure = () => {
      // `trackTop` and `unit` are `range()`'s cache, not read live here — see the comment above
      // `range()`. `window.scrollY` is the only per-frame read, and it never forces layout.
      const p = (window.scrollY - trackTop) / unit;
      pending.fromFade = 1 - smoothstep(fadeStops.outStart, fadeStops.outEnd, p);
      // Cover mode: `to`'s fade mirrors `from`'s own fade-out curve directly, complementary,
      // rather than riding its own gap/in window. Rationale: docs/crossfade-stage.md § Dissolve vs. cover mode
      pending.toFade =
        mode === "cover" ? 1 - pending.fromFade : smoothstep(fadeStops.inStart, fadeStops.inEnd, p);
      // Widened past the fade window itself by VISIBILITY_MARGIN — see its own comment above.
      pending.fromVisible = p < fadeStops.outEnd + VISIBILITY_MARGIN;
      pending.toVisible =
        mode === "cover"
          ? p > fadeStops.outStart - VISIBILITY_MARGIN
          : p > fadeStops.inStart - VISIBILITY_MARGIN;
    };

    const commit = () => {
      write(fromRef.current, fromState, pending.fromFade, pending.fromVisible);
      write(toRef.current, toState, pending.toFade, pending.toVisible);
    };

    const unregister = registerStage(measure, commit);

    const onScroll = () => requestStageFrame();

    const onResize = () => {
      const width = window.innerWidth;
      if (width !== lastWidth) {
        lastWidth = width;
        range("resize");
        onScroll();
      }
    };

    // Real recompute regardless of width. Rationale: docs/pinned-scroll-stages.md § Orientation / scrollend
    const onOrientation = () => {
      lastWidth = window.innerWidth;
      range("orientation");
      onScroll();
    };
    const onScrollEnd = () => {
      range("scrollend");
      onScroll();
    };

    range("mount");
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
    <div ref={trackRef} style={{ height: `calc(${stops.travel}svh + 100lvh + var(--bleed))` }}>
      {/* .stage-pin: sticky or scroll-timeline transform depending on --bleed.
          Rationale: docs/ios-viewport-bleed.md § .stage-pin: sticky vs. scroll-timeline swap */}
      <div
        ref={pinRef}
        className={["stage-pin relative isolate", className].filter(Boolean).join(" ")}
        style={{ height: "calc(100lvh + var(--bleed))" }}
      >
        <div
          ref={fromRef}
          // `crossfade-from` only in dissolve mode — cover mode keeps opacity pinned to 1 via
          // `LAYER_FROM_COVER` below and never wants it animated. Rationale: docs/crossfade-stage.md § Compositor-driven fade
          className={["absolute inset-0", mode === "cover" ? "" : "crossfade-from"]
            .filter(Boolean)
            .join(" ")}
          style={mode === "cover" ? LAYER_FROM_COVER : LAYER_FROM_DISSOLVE}
        >
          {from}
        </div>
        <div ref={toRef} className="absolute inset-0 crossfade-to" style={LAYER_TO}>
          {to}
        </div>
      </div>
    </div>
  );
}

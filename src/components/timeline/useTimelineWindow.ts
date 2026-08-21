"use client";

/** Bounded elastic pan for the Timeline's date cursor: wheel/touch deltas accumulate into a raw
 *  position that can give a little past either bound, and a critically damped spring — always
 *  starting from rest, guaranteeing no overshoot — decelerates it back once the gesture ends.
 *  Rationale: docs/timeline.md § Bounded elastic pan */

import { useEffect, useRef, type RefObject } from "react";
import { spring, stepSpring, type Spring } from "@/components/fluted-glass/spring";
import { MS_PER_MONTH } from "./timeline-data";

/** How far a pull can push past a bound, as a fraction of one viewport's worth of months.
 *  Rationale: docs/timeline.md § ELASTIC_FRACTION / MAX_GIVE_MONTHS */
const ELASTIC_FRACTION = 0.1;
/** Absolute ceiling on the give, in months, however many months the viewport shows. */
const MAX_GIVE_MONTHS = 0.3;

/** Quiet that counts as a wheel/touch gesture being over. */
const IDLE_MS = 160;

/** Below this px, a wheel tick while already overscrolled doesn't count as a live pull.
 *  Rationale: docs/timeline.md § OVERSCROLL_IGNORE_PX */
const OVERSCROLL_IGNORE_PX = 3;

/** Spring back to a bound. Critically damped — see the module doc for why this needs to be exact,
 *  not just "close to 1." High `STIFFNESS` keeps the approach quick. */
const STIFFNESS = 340;
const ZETA = 1;

const EPSILON = 0.05;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Maps a raw centerMs — which can run past either bound while a gesture is live — onto what's
 *  shown: 1:1 inside `[lo, hi]`, asymptotic beyond it in either direction, approaching but never
 *  reaching `bound ± give`. */
function rubberBand(raw: number, lo: number, hi: number, give: number): number {
  if (give <= 0) return clamp(raw, lo, hi);
  const relative = raw - lo;
  const max = hi - lo;
  if (relative < 0) return lo - give * (1 - Math.exp(relative / give));
  if (relative > max) {
    const over = relative - max;
    return hi + give * (1 - Math.exp(-over / give));
  }
  return raw;
}

/**
 * - viewportRef: the fixed-height element wheel/touch listeners attach to (used only for its
 *   height, to size the elastic give and to convert a page-mode wheel delta into px).
 * - rangeRef: `{ start, end }` ms, the full career range — set once, stable.
 * - pxPerMonthRef: current pixels-per-month — changes with zoom, read fresh every frame.
 * - write: called with the new `centerMs` whenever it changes.
 *
 * Returns `kick()`, which restarts the settle loop if it's parked — for a caller (zoom) that just
 * changed `pxPerMonthRef` and needs `centerMs` re-clamped into the new bounds even though nothing
 * panned.
 */
export function useTimelineWindow(
  viewportRef: RefObject<HTMLElement | null>,
  rangeRef: RefObject<{ start: number; end: number }>,
  pxPerMonthRef: RefObject<number>,
  write: (centerMs: number) => void,
): { kick: () => void } {
  const writeRef = useRef(write);
  useEffect(() => {
    writeRef.current = write;
  }, [write]);

  const rawRef = useRef(0);
  const kickRef = useRef<() => void>(() => {});

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The hard bound is the data itself: the first entry's start and the later of the last
    // entry's end or today. No padding baked in here — any "past the edge" travel is the elastic
    // give below, which always springs back to exactly this.
    const bounds = () => {
      const range = rangeRef.current ?? { start: 0, end: 0 };
      const lo = range.start;
      const hi = Math.max(range.end, Date.now());
      if (hi < lo) {
        const mid = (lo + hi) / 2;
        return { lo: mid, hi: mid };
      }
      return { lo, hi };
    };

    const give = () => {
      const pxPerMonth = pxPerMonthRef.current ?? 0;
      const visibleMonths = pxPerMonth > 0 ? viewport.clientHeight / pxPerMonth : 0;
      return Math.min(ELASTIC_FRACTION * visibleMonths, MAX_GIVE_MONTHS) * MS_PER_MONTH;
    };

    // Open centered on today, not on the range's own edge — the cursor generally reads as
    // "here's now" first, not "here's the very end of recorded history."
    const { lo: initialLo, hi: initialHi } = bounds();
    const initial = clamp(Date.now(), initialLo, initialHi);
    rawRef.current = initial;
    const pos: Spring = spring(initial);
    let pulling = false;
    let touching = false;
    let touchY = 0;
    let idle = 0;
    let raf = 0;
    let running = false;
    let lastFrame = 0;
    let shown = -Infinity;

    const frame = (now: number) => {
      const dt = clamp((now - (lastFrame || now)) / 1000, 1 / 240, 1 / 20);
      lastFrame = now;
      const { lo, hi } = bounds();

      if (pulling) {
        pos.value = rubberBand(rawRef.current, lo, hi, give());
        pos.velocity = 0;
      } else {
        const settleTarget = clamp(rawRef.current, lo, hi);
        if (reduced) {
          pos.value = settleTarget;
          pos.velocity = 0;
        } else {
          stepSpring(pos, settleTarget, STIFFNESS, ZETA, dt);
        }
      }

      if (Math.abs(pos.value - shown) > EPSILON) {
        shown = pos.value;
        writeRef.current(shown);
      }

      const settled = !pulling && Math.abs(pos.velocity) < 1 && shown === pos.value;
      if (settled) {
        running = false;
        lastFrame = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
    };

    // Force one write on mount so the flutes/labels reflect the initial cursor immediately.
    shown = initial;
    writeRef.current(initial);

    /** A finger still resting on the surface is not a release, whatever the idle timer thinks. */
    const release = () => {
      if (!pulling) return;
      if (touching) {
        idle = window.setTimeout(release, IDLE_MS);
        return;
      }
      clearTimeout(idle);
      pulling = false;
      // Always releases from rest: `frame()` forces `pos.velocity = 0` on every pulling frame, so
      // the settle spring above starts here with nothing carried in, and a critically damped
      // spring started from rest is mathematically guaranteed not to overshoot its target.
      start();
    };

    /** deltaPx: positive moves the cursor toward later dates — matches the old list's "scroll down
     *  reveals rows further down, which are older" feel, inverted since down is now later. */
    const pull = (deltaPx: number) => {
      const { lo, hi } = bounds();
      const alreadyOverscrolled = rawRef.current < lo || rawRef.current > hi;
      if (alreadyOverscrolled && !touching && Math.abs(deltaPx) < OVERSCROLL_IGNORE_PX) {
        // A trackpad's momentum tail decaying toward zero, most likely — don't let it extend the
        // pull or push the release further out.
        return;
      }

      const pxPerMonth = pxPerMonthRef.current ?? 0;
      const msPerPx = pxPerMonth > 0 ? MS_PER_MONTH / pxPerMonth : 0;
      const g = give();
      pulling = true;
      // Capped a few multiples of the give past the bound rather than left to run away — otherwise
      // a long pull against the edge leaves a backlog of raw motion that a reversal has to unwind
      // before the display even starts moving back.
      rawRef.current = clamp(rawRef.current + deltaPx * msPerPx, lo - g * 3, hi + g * 3);
      clearTimeout(idle);
      idle = window.setTimeout(release, IDLE_MS);
      start();
    };

    const onWheel = (e: WheelEvent) => {
      // Trackpad pinch / ctrl-wheel is the zoom gesture, owned by `useTimelineZoom` instead.
      if (e.ctrlKey) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewport.clientHeight : 1;
      pull(e.deltaY * unit);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return; // two fingers is the pinch-zoom gesture.
      touching = true;
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const y = e.touches[0]?.clientY ?? 0;
      const delta = touchY - y;
      touchY = y;
      e.preventDefault();
      pull(delta);
    };
    const onTouchEnd = () => {
      touching = false;
      release();
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });
    viewport.addEventListener("touchcancel", onTouchEnd, { passive: true });

    kickRef.current = () => start();

    return () => {
      clearTimeout(idle);
      cancelAnimationFrame(raf);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [viewportRef, rangeRef, pxPerMonthRef]);

  return {
    kick: () => kickRef.current(),
  };
}

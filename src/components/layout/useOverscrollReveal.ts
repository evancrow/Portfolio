"use client";

/**
 * Turns overscroll at the bottom of the page into one number.
 *
 * There is nothing left to scroll down there, so there is no position to read and the gesture has to
 * be assembled out of raw wheel and touch deltas. That is the whole difficulty of this file: a wheel
 * event is a chunk rather than a place, momentum arrives as more of the same chunks with nothing
 * marking where the hand stopped, and a finger resting still on a trackpad sends nothing at all.
 * Every one of those gaps is a timer in here.
 *
 * The alternative, giving the page real scroll room past its own end and reading the position out of
 * it, was tried and taken back out. The browser owns that position, and it will not share it: the
 * return has to be a programmatic scroll, Safari holds the wheel gesture's own target offset for a
 * while past the `scrollend` it has already fired, and it puts the page back where it wanted it. Which
 * our return reads as a hand, stands down for, and tries again. The two of them trade the page back and
 * forth for a second or more. Owning the whole gesture is more code than that was, and it is the only
 * version of this that cannot be argued with.
 *
 * Nothing pulls back while the gesture is still going. The band holds wherever the hand left it and
 * only starts home once the finger lifts or the wheel goes quiet, because anything that reels it in
 * mid-pull is felt as the page arguing with the hand rather than as resistance. The resistance lives in
 * the accumulator instead, which is what `RESIST` sets.
 *
 * The value is handed to a callback rather than to React state. It changes every frame, and a number
 * that only ever lands in a style property has no business going through a render.
 */

import { useEffect, useRef } from "react";
import { expEase, spring, stepSpring } from "@/components/fluted-glass/spring";

/**
 * TUNE ME. How firm the pull is: how much gesture a full dome costs, against the dome's own height.
 *
 * The accumulator is asymptotic, so this is resistance rather than a rate. At 1 the first pixels track
 * the gesture exactly and it takes about three domes of scrolling to arrive within a few percent of a
 * full one. Raising it multiplies that: the reveal never quite finishes, which is the point, and the
 * last of it costs far more than the first.
 *
 * The one thing it costs is the opening, since the first pixels track at `1 / RESIST` of the gesture.
 * That softens the start but never delays it, which is the line that matters: glass that arrives late
 * was the original complaint about this whole effect. Much above 2 and it is soft enough off the mark
 * to read as lag.
 */
const RESIST = 1.6;

/**
 * Quiet that counts as the gesture being over.
 *
 * Momentum keeps wheel events coming after the fingers lift, so this is waiting out the momentum
 * rather than the fingers. Long enough to cover a slow deliberate scroll, whose events are sparse and
 * whose gaps a short window reads as a release: the reader pushes a notch, the spring takes it back,
 * and the reveal is stuck. Worst at the top of the travel, where the spring pulls hardest.
 */
const IDLE_MS = 240;

/**
 * The return. Critically damped, since an overshoot here would be the band pushing past shut and the
 * page moving down under a reader who is already on their way up.
 *
 * Soft on purpose: it only ever runs with the hand off, so it has nothing to hurry back for, and a
 * stiff one reads as the band being yanked out from under the gesture that just finished. Around a
 * third of a second to settle from a full pull.
 */
const STIFFNESS = 110;
const ZETA = 1;

/**
 * How quickly the measured pull velocity is allowed to change while the hand is on it. Smoothed
 * because it is a difference of two frames of chunked wheel deltas, and the spring inherits it at
 * release: unsmoothed, whichever notch happened to land last would decide how the return leaves.
 */
const VEL_RATE = 30;

/** Below this the band is shut as far as anyone can see. */
const EPSILON = 0.05;

/** Slack on the bottom of the page, for fractional device pixels and zoom. */
const BOTTOM_SLOP = 4;

/**
 * Slack on a wheel delta going the other way.
 *
 * A trackpad drag is not monotonic: it emits the odd zero and the odd pixel the wrong way while the
 * fingers are still moving down. Treating those as a release starts the return home under the hand,
 * which is felt as the band stuttering. A genuine scroll back up still lets go on the spot.
 */
const UP_SLOP = 2;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * - max: how far the band opens, in CSS px. The accumulator's asymptote, so it is approached and
 *   never quite reached.
 * - write: called with the current extension whenever it moves.
 */
export function useOverscrollReveal(max: number, write: (px: number) => void) {
  const writeRef = useRef(write);
  useEffect(() => {
    writeRef.current = write;
  }, [write]);

  useEffect(() => {
    if (max <= 0) return;
    // Nothing here is scroll-linked: it is an animation the page does on its own account, so under
    // this setting it does not happen at all rather than happening quickly. Bailing before the
    // listeners go on also leaves the wheel completely untouched.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ext = spring(0);
    /** The gesture as delivered, before resistance. */
    let raw = 0;
    let pulling = false;
    let touching = false;
    let touchY = 0;
    let idle = 0;
    let raf = 0;
    let running = false;
    let lastFrame = 0;
    let shown = -1;

    /**
     * Cached, and refreshed only when the scroll settles or the window changes size. `scrollHeight`
     * costs a layout, and this is read on every wheel event that is not already part of a pull.
     */
    let docHeight = document.documentElement.scrollHeight;
    const remeasure = () => {
      docHeight = document.documentElement.scrollHeight;
    };
    // iOS fires `resize` all through a scroll as the URL bar folds, and none of those change the
    // viewport's width or the document's real height — just a forced-layout read for nothing, same
    // fix as `layout.tsx`'s `MEASURE_BLEED`. `scrollend`'s own `remeasure` stays unconditioned: it
    // only fires once the page is already stationary, so it's free either way.
    let lastWidth = window.innerWidth;
    const onResize = () => {
      const width = window.innerWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      remeasure();
    };
    const atBottom = () => window.scrollY + window.innerHeight >= docHeight - BOTTOM_SLOP;

    const frame = (now: number) => {
      const dt = clamp((now - (lastFrame || now)) / 1000, 1 / 240, 1 / 20);
      lastFrame = now;

      if (pulling) {
        // Asymptotic, so growth starts out proportional to the gesture and eases toward the ceiling
        // without a clamp to run into. It is also what keeps the release gentle on its own: up near
        // the top the target barely moves, so there is almost no speed left to hand the spring.
        const next = max * (1 - Math.exp(-raw / (max * RESIST)));
        // Measured before the write, so the spring inherits where the hand was going.
        ext.velocity = expEase(ext.velocity, (next - ext.value) / dt, VEL_RATE, dt);
        ext.value = next;
      } else {
        stepSpring(ext, 0, STIFFNESS, ZETA, dt);
        if (ext.value < 0) {
          ext.value = 0;
          ext.velocity = 0;
        }
      }

      if (Math.abs(ext.value - shown) > EPSILON) {
        shown = ext.value;
        writeRef.current(shown);
      }

      // Home, and nothing on its way anywhere. The next notch starts this again.
      if (!pulling && ext.value < EPSILON && Math.abs(ext.velocity) < 1) {
        running = false;
        lastFrame = 0;
        if (shown !== 0) {
          shown = 0;
          writeRef.current(0);
        }
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

    const pull = (delta: number) => {
      if (!pulling) {
        pulling = true;
        // From wherever the band already is, so a second flick on top of a return picks it up rather
        // than starting it over. `raw` is solved back out of the extension for the same reason.
        raw = -max * RESIST * Math.log(1 - clamp(ext.value / max, 0, 0.999));
      }
      raw += delta;
      clearTimeout(idle);
      idle = window.setTimeout(release, IDLE_MS);
      start();
    };

    /**
     * Lets the band start home. `forced` is a hand that has actually gone the other way, which is
     * evidence in a way that a quiet timer is not.
     */
    const release = (forced = false) => {
      if (!pulling) return;
      // A finger still down is not a release, whatever the timer thinks. It sends nothing while it
      // rests, and letting go of the band under it is the one thing that reads as a fight.
      if (touching && !forced) {
        idle = window.setTimeout(release, IDLE_MS);
        return;
      }
      clearTimeout(idle);
      pulling = false;
      start();
    };

    const onWheel = (e: WheelEvent) => {
      // Going back up lets go at once. Waiting out the idle timer would hold the band open while the
      // page is already scrolling away underneath it.
      if (e.deltaY < -UP_SLOP) {
        release(true);
        return;
      }
      // Jitter, or a notch that carries nothing. Not a release, and not worth a frame either.
      if (e.deltaY <= UP_SLOP) return;
      if (!pulling && !atBottom()) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      pull(e.deltaY * unit);
    };

    const onTouchStart = (e: TouchEvent) => {
      touching = true;
      touchY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      // Swiping up is scrolling down, so the sign matches the wheel's.
      const delta = touchY - y;
      touchY = y;
      if (delta < 0) {
        release(true);
        return;
      }
      if (!pulling && !atBottom()) return;
      pull(delta);
    };

    const onTouchEnd = () => {
      touching = false;
      release(true);
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scrollend", remeasure, { passive: true });

    return () => {
      clearTimeout(idle);
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scrollend", remeasure);
      // Nothing is going to put this back on its own once the loop is gone.
      if (shown !== 0) writeRef.current(0);
    };
  }, [max]);
}

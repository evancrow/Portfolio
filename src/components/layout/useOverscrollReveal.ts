"use client";

/** Turns overscroll at the bottom of the page into one number, assembled from raw wheel/touch
 *  deltas since there's no scroll position left to read once the page is at its end.
 *  Rationale: docs/footer.md § Overscroll reveal: why a custom gesture */

import { useEffect, useRef } from "react";
import { expEase, spring, stepSpring } from "@/components/fluted-glass/spring";

/** TUNE ME. How firm the pull is: how much gesture a full dome costs, against the dome's own
 *  height. Rationale: docs/footer.md § RESIST */
const RESIST = 1.6;

/** Quiet that counts as the gesture being over — waits out wheel momentum, not just the fingers.
 *  Rationale: docs/footer.md § IDLE_MS */
const IDLE_MS = 240;

/** The return spring. Critically damped, soft on purpose since it only ever runs with the hand
 *  off. Rationale: docs/footer.md § STIFFNESS / ZETA */
const STIFFNESS = 110;
const ZETA = 1;

/** How quickly the measured pull velocity is allowed to change while the hand is on it, so the
 *  spring doesn't inherit whichever chunked wheel delta happened to land last.
 *  Rationale: docs/footer.md § VEL_RATE */
const VEL_RATE = 30;

/** Below this the band is shut as far as anyone can see. */
const EPSILON = 0.05;

/** Slack on the bottom of the page, for fractional device pixels and zoom. */
const BOTTOM_SLOP = 4;

/** Slack on a wheel delta going the other way — a trackpad drag isn't monotonic, and treating its
 *  odd notch as a release starts the return home under the hand.
 *  Rationale: docs/footer.md § UP_SLOP */
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

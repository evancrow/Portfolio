"use client";

import { useEffect, useRef, type RefObject } from "react";
import { expEase, spring, stepSpring, type Spring } from "./spring";

/** Ease rate for the glint position, about a 100ms time constant. Slow enough that the highlight
 * glides after the cursor rather than sticking to it, fast enough that it stays a highlight near
 * the pointer rather than a shape crossing the panel on its own. */
const LIGHT_RATE = 10;

/** Quick to rise and slow to fall, so the glint is there the moment the hand moves and then ebbs
 * away rather than cutting out. One rate cannot do both: fast enough to catch the start of a drag
 * is fast enough to snap off at the end of one. */
const WAKE_RISE = 12;
const WAKE_FALL = 3.5;

/** Press ramp rates. Immediate on the way down, since a press should feel like it lands, and
 * gentler on release so the glint ebbs out rather than being cut. */
const PRESS_RISE = 22;
const PRESS_FALL = 7;

export type PointerTarget = {
  clientX: number;
  clientY: number;
  /** False until the first pointer event, so the layers rest at their base positions. */
  seen: boolean;
  /** True between pointerdown and pointerup, mouse button or finger alike. */
  pressed: boolean;
};

/**
 * The pointer target is shared across every panel on the page rather than tracked per instance:
 * each `FlutedGlass` used to attach its own six window/document listeners, which adds up fast
 * once a page has several panels. One set of listeners, ref-counted across mounted panels, feeds
 * them all from the same object.
 */
const sharedTarget: PointerTarget = {
  clientX: 0,
  clientY: 0,
  seen: false,
  pressed: false,
};

let listenerCount = 0;
let detachListeners: (() => void) | null = null;

function attachListeners() {
  if (detachListeners) return;
  const onMove = (e: PointerEvent) => {
    sharedTarget.clientX = e.clientX;
    sharedTarget.clientY = e.clientY;
    sharedTarget.seen = true;
  };
  const onDown = (e: PointerEvent) => {
    onMove(e);
    sharedTarget.pressed = true;
  };
  // Release is caught in the capture phase and on blur as well as on pointerup, because a drag
  // that ends over an element which stops the event, or outside the window entirely, would
  // otherwise leave the press stuck on with no way to clear it.
  const onUp = () => {
    sharedTarget.pressed = false;
  };
  const onLeave = () => {
    sharedTarget.seen = false;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { capture: true, passive: true });
  window.addEventListener("pointercancel", onUp, {
    capture: true,
    passive: true,
  });
  window.addEventListener("blur", onUp);
  document.addEventListener("pointerleave", onLeave);
  detachListeners = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp, { capture: true });
    window.removeEventListener("pointercancel", onUp, { capture: true });
    window.removeEventListener("blur", onUp);
    document.removeEventListener("pointerleave", onLeave);
  };
}

/**
 * Tracks the pointer at the window level, so a panel can react to a cursor that is close
 * but not yet over it. Writes to a shared ref only, so pointer motion never re-renders React.
 *
 * - Returns a ref holding the latest client coordinates.
 */
export function usePointerTracker(): RefObject<PointerTarget> {
  const ref = useRef<PointerTarget>(sharedTarget);

  useEffect(() => {
    listenerCount++;
    attachListeners();
    return () => {
      listenerCount--;
      if (listenerCount === 0 && detachListeners) {
        detachListeners();
        detachListeners = null;
      }
    };
  }, []);

  return ref;
}

/**
 * Smoothed pointer state in container space, plus the derived speed and presence the
 * shimmer is gated by.
 */
export class PointerMotion {
  x: Spring = spring(0);
  y: Spring = spring(0);
  /** Normalized speed, 0..1. Asymmetrically eased, so it ebbs away well after the hand stops. */
  velocity = 0;
  /** Eased presence, 0..1. */
  presence = 0;
  /** True while the cursor is inside the presence margin. The unsmoothed form of `presence`,
   * for anything that must stop the instant the cursor is gone rather than fade out. */
  near = false;
  /** Eased 0..1 press, for panels that only light under a held finger or button. */
  press = 0;
  /** Latest target in container CSS px. The unsmoothed position, for anything that needs to
   * know where the cursor actually is rather than where it is being followed to. */
  targetX = 0;
  targetY = 0;
  /** Cursor glint position. Its own fast ease rather than the springs above, which trail by
   * nearly two hundred pixels at speed and read as a light dragged along behind the pointer.
   * Enough smoothing to take the edge off a jumpy pointer, little enough to stay attached. */
  lightX = 0;
  lightY = 0;

  /** Previous frame's target, for the speed above. */
  private lastX = 0;
  private lastY = 0;
  private primed = false;

  /**
   * Advances the pointer springs.
   *
   * - rect: the container's current bounding rect.
   * - target: raw client coordinates from the tracker.
   * - reach: presence margin around the panel, as a fraction of its smaller side, so a cursor that
   *   is merely nearby still pulls the layers and can raise a glint at the edge.
   */
  step(
    rect: DOMRect,
    target: PointerTarget,
    reach: number,
    stiffness: number,
    zeta: number,
    dt: number,
  ) {
    const localX = target.clientX - rect.left;
    const localY = target.clientY - rect.top;
    const margin = Math.min(rect.width, rect.height) * reach;
    const near =
      target.seen &&
      localX > -margin &&
      localY > -margin &&
      localX < rect.width + margin &&
      localY < rect.height + margin;

    if (!this.primed && target.seen) {
      this.x.value = localX;
      this.y.value = localY;
      this.lightX = localX;
      this.lightY = localY;
      this.primed = true;
      this.lastX = localX;
      this.lastY = localY;
    }

    if (target.seen) {
      stepSpring(this.x, localX, stiffness, zeta, dt);
      stepSpring(this.y, localY, stiffness, zeta, dt);
      this.lightX = expEase(this.lightX, localX, LIGHT_RATE, dt);
      this.lightY = expEase(this.lightY, localY, LIGHT_RATE, dt);
    }

    // Speed off the raw target rather than the spring, because the cursor glint fades out on
    // speed alone. A spring under-reads while the hand accelerates and keeps reading after it
    // stops, which would light the panel a beat late and then hold it lit.
    const dx = localX - this.lastX;
    const dy = localY - this.lastY;
    this.lastX = localX;
    this.lastY = localY;
    this.targetX = localX;
    this.targetY = localY;
    const speed = Math.hypot(dx, dy) / Math.max(dt, 1e-4);
    const wake = Math.min(speed / 1200, 1);
    this.velocity = expEase(this.velocity, wake, wake > this.velocity ? WAKE_RISE : WAKE_FALL, dt);
    this.presence = expEase(this.presence, near ? 1 : 0, 5, dt);
    // A press held off the panel counts for nothing, so leaving the margin releases it and the
    // glint cannot be parked somewhere by holding the button down and walking away.
    const held = target.pressed && near;
    this.press = expEase(this.press, held ? 1 : 0, held ? PRESS_RISE : PRESS_FALL, dt);
    this.near = near;
  }

  get moving(): boolean {
    return this.velocity > 1e-3 || this.presence > 1e-3;
  }
}

"use client";

/**
 * Pinch-to-zoom for the Timeline spine: trackpad pinch (Chrome/Safari deliver this as `wheel`
 * events with `ctrlKey` set) and native two-finger touch. Both are multiplicative — each gesture
 * step scales the current zoom rather than setting an absolute one — so a pinch that pauses and
 * resumes continues smoothly instead of snapping back to some fixed baseline.
 *
 * Writes straight to a callback rather than React state: the spine already runs its own per-frame
 * loop reading this, and a gesture can fire many events a frame apart, none worth a render of
 * their own.
 */

import { useEffect, useRef, type RefObject } from "react";

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export type TimelineZoomOptions = {
  min?: number;
  max?: number;
  initial?: number;
  /** How much one wheel notch changes zoom, as a fraction. */
  wheelSensitivity?: number;
};

export function useTimelineZoom(
  targetRef: RefObject<HTMLElement | null>,
  write: (zoom: number) => void,
  options: TimelineZoomOptions = {},
): void {
  const { min = 0.4, max = 4, initial = 1, wheelSensitivity = 0.0025 } = options;
  const writeRef = useRef(write);
  useEffect(() => {
    writeRef.current = write;
  }, [write]);

  const zoomRef = useRef(initial);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const apply = (next: number) => {
      zoomRef.current = clamp(next, min, max);
      writeRef.current(zoomRef.current);
    };
    apply(zoomRef.current);

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      apply(zoomRef.current * Math.exp(-e.deltaY * wheelSensitivity));
    };

    const distance = (touches: TouchList) => {
      const a = touches[0];
      const b = touches[1];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    let pinchDistance = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      pinchDistance = distance(e.touches);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchDistance === 0) return;
      e.preventDefault();
      const next = distance(e.touches);
      apply(zoomRef.current * (next / pinchDistance));
      pinchDistance = next;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchDistance = 0;
    };

    target.addEventListener("wheel", onWheel, { passive: false });
    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: false });
    target.addEventListener("touchend", onTouchEnd, { passive: true });
    target.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      target.removeEventListener("wheel", onWheel);
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", onTouchEnd);
      target.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [targetRef, min, max, wheelSensitivity]);
}

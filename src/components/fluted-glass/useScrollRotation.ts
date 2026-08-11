"use client";

import { spring, stepSpring, type Spring } from "./spring";
import type { ResolvedConfig, ResolvedCurve } from "./types";

const TAU = Math.PI * 2;

/**
 * Advances the rotation of a curved sheet's flutes around their cylinder.
 *
 * Two of the three drives are positions rather than deltas. Scroll couples rotation to scroll
 * *position*, so scrolling back up retraces the turn exactly and the two can never drift apart.
 * Pointer couples it to the angle under the cursor, so the flutes point at it instead of being
 * pushed away from center by it. Ambient is the only one that accumulates. The spring supplies
 * the feel in both positional cases: a fast flick overshoots slightly and eases in, and the
 * cylinder is perfectly still when its input is still.
 */
export class RotationMotion {
  private rot: Spring = spring(0);
  private free = 0;
  private held = 0;
  private lastDrive: string | null = null;
  private primed = false;

  /** Normalized turn speed, 0..1. Feeds a small specular boost so the glass catches light. */
  velocity = 0;

  /**
   * - curve: the panel's resolved curve, which the caller has already established it has.
   * - interaction: only for the pointer drive's spring feel.
   * - rect: the panel's current bounding rect, already read this frame. Also what the `section`
   *   scroll source measures its progress through the viewport from.
   * - pointerAnchor: the rotation the cursor is asking for, used by the `pointer` drive. Null
   *   when there is no live cursor, which is what makes that drive hold its last angle.
   * - externalProgress: 0..1, read this frame from `FlutedGlassProps.scrollProgress` — what the
   *   `external` scroll source uses instead of `window`/`section`. Null when the caller supplied
   *   no ref, which holds the last angle exactly like a live-but-absent pointer anchor does.
   * - Returns the rotation in radians.
   */
  step(
    curve: ResolvedCurve,
    interaction: ResolvedConfig["interaction"],
    rect: DOMRect,
    pointerAnchor: number | null,
    dt: number,
    externalProgress: number | null = null,
  ): number {
    // Hand the current angle over when the drive changes, so switching does not jump.
    if (curve.drive !== this.lastDrive) {
      this.free = this.rot.value;
      this.held = this.rot.value;
      this.lastDrive = curve.drive;
    }

    if (curve.drive === "ambient") {
      this.free += curve.speed * TAU * dt;
      this.velocity = Math.min(Math.abs(curve.speed) / 0.5, 1);
      this.rot.value = this.free;
      this.rot.velocity = 0;
      return this.free;
    }

    if (curve.drive === "pointer") {
      if (pointerAnchor !== null) this.held = pointerAnchor;
      // Softer than the springs the shape layers ride, so the flutes trail the cursor rather
      // than arriving with it, and light damping keeps them from sailing past it and coming
      // back every time the hand stops. `damping` is the same knob the scroll drive glides on.
      const stiffness = interaction.stiffness * Math.exp(-2 * curve.damping);
      return this.settle(this.held, stiffness, interaction.zeta, dt);
    }

    const target = this.scrollTarget(curve, rect, externalProgress) * curve.turnsPerViewport * TAU;

    // First frame of a run lands on the scroll position instead of springing up to it from
    // wherever the loop was when it stopped. Without this, anything that resumes the loop after
    // a pause - a hidden layer coming back, a tab switch, a reload partway down the page - whips
    // the cylinder across the whole gap it slept through.
    if (!this.primed) {
      this.primed = true;
      this.rot.value = target;
      this.rot.velocity = 0;
      this.velocity = 0;
      return target;
    }

    return -this.settle(target, 400 * Math.exp(-3.5 * curve.damping), 0.78, dt);
  }

  /** Called when the render loop resumes, so the next frame snaps rather than springs. */
  resync() {
    this.primed = false;
  }

  private settle(target: number, stiffness: number, zeta: number, dt: number): number {
    stepSpring(this.rot, target, stiffness, zeta, dt);
    this.velocity = Math.min(Math.abs(this.rot.velocity) / (TAU * 0.75), 1);
    return this.rot.value;
  }

  /** Scroll position expressed in viewports, or 0..1 progress for `section`/`external`. */
  private scrollTarget(curve: ResolvedCurve, rect: DOMRect, externalProgress: number | null): number {
    if (curve.scrollSource === "external") {
      return externalProgress ?? 0;
    }

    const vh = window.innerHeight || 1;

    if (curve.scrollSource === "section") {
      const travel = vh + rect.height;
      return Math.min(Math.max((vh - rect.top) / travel, 0), 1);
    }

    return window.scrollY / vh;
  }

  get moving(): boolean {
    return this.velocity > 1e-3 || Math.abs(this.rot.velocity) > 1e-3;
  }
}

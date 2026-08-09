import type { ResolvedConfig, ResolvedCurve } from "./types";

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * The panel's extent along the flute-variation axis. Both the flute count and the cylinder
 * radius are measured against it, so either stays correct at any orientation.
 */
export function fluteExtent(orientation: number, width: number, height: number): number {
  return width * Math.abs(Math.cos(orientation)) + height * Math.abs(Math.sin(orientation));
}

/**
 * Radius of the cylinder the flutes are wrapped around. Sized from the panel so the 90 degree
 * singularity, where a flute's on-screen width falls to zero, sits just off the panel at
 * `rimAngle`.
 */
export function cylinderRadius(
  orientation: number,
  width: number,
  height: number,
  rimAngle: number,
): number {
  return (0.5 * fluteExtent(orientation, width, height)) / Math.max(Math.sin(rimAngle), 0.05);
}

/**
 * The rotation, in radians, that parks a flute directly under a point.
 *
 * This inverts the shader's cylinder mapping. There a flute at angle `a` sits at x = R sin(a)
 * along the flute axis, and the flute coordinate is (a - rotation) / angularPitch. Solving for
 * the rotation that lands s = 0.5 under the point gives the line below. Half a flute matters:
 * integer s is a seam, so anchoring at s = 0 would park the dark join under the cursor rather
 * than the body of a lens.
 *
 * Everything here is in container CSS px while the shader works in device px. Only the ratio of
 * the axis offset to the radius reaches the angle, and both scale with dpr, so the two agree.
 *
 * - curve: the panel's resolved curve, which the caller has already established it has.
 * - rect: the panel's current bounding rect.
 * - px, py: the point in container CSS px, y measured downward.
 */
export function cylinderAnchor(
  glass: ResolvedConfig["glass"],
  curve: ResolvedCurve,
  rect: DOMRect,
  px: number,
  py: number,
): number {
  const { orientation, pitch, flutes } = glass;
  const radius = cylinderRadius(orientation, rect.width, rect.height, curve.rimAngle);
  // A collapsed or not yet measured panel would divide by zero, and a single NaN through the
  // rotation spring never washes back out.
  if (!(radius > 0)) return 0;

  // The flute axis, matching the shader's rot2(-orientation) exactly. Its mat2 is column major,
  // so q.x works out to cos*dx - sin*dy, and GL measures y upward where py measures it down.
  const dx = px - rect.width / 2;
  const dy = rect.height / 2 - py;
  const axis = Math.cos(orientation) * dx - Math.sin(orientation) * dy;

  const extent = fluteExtent(orientation, rect.width, rect.height);
  const angularPitch = Math.max(flutes > 0 ? extent / flutes : pitch, 1) / radius;

  // Bounded by the rim angle, so an edge to edge sweep turns the cylinder by twice it and no
  // further. Gain scales that mapping; the half flute is a phase fix, so it stays outside.
  const angle = Math.asin(clamp(axis / radius, -1, 1));
  return angle * curve.gain - 0.5 * angularPitch;
}

/** Damped springs used for the pointer, the shape layers, and the cylinder rotation. */

export type Spring = { value: number; velocity: number };

export function spring(value = 0): Spring {
  return { value, velocity: 0 };
}

const MAX_STEP = 1 / 120;

/**
 * Advances a damped spring toward a target.
 *
 * - stiffness: higher tracks the target more tightly.
 * - zeta: 1 is critically damped, below 1 overshoots slightly and eases back in.
 * - dt: seconds. Substepped so a long frame cannot make the spring explode.
 */
export function stepSpring(s: Spring, target: number, stiffness: number, zeta: number, dt: number) {
  const steps = Math.min(8, Math.max(1, Math.ceil(dt / MAX_STEP)));
  const h = dt / steps;
  const damping = 2 * zeta * Math.sqrt(stiffness);
  for (let i = 0; i < steps; i++) {
    const accel = stiffness * (target - s.value) - damping * s.velocity;
    s.velocity += accel * h;
    s.value += s.velocity * h;
  }
}

/** Frame-rate independent exponential ease, for values that should never overshoot. */
export function expEase(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

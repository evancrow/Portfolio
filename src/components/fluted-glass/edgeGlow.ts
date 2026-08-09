import type { GlassShape } from "./types";

export type EdgeGlowOptions = {
  /** Which edge the glow bleeds in from — its crests sit just past this edge, off-panel. */
  edge: "left" | "right";
  primary: string;
  secondary: string;
  /** Vertical center of the glow, 0..1 of the panel. */
  y?: number;
};

/**
 * Two ellipses parked just past a panel edge, so only their Gaussian falloff shows inside it — an
 * arc, never a flat slab: coverage saturates at 1.0 anywhere inside a shape and only feathers
 * outside it, so a core that cleared the edge would show as a flat slab with a ramp on top.
 *
 * Awards/Projects' band (`accents.ts`) is the unmirrored case of this, `edge: "right"`. The
 * Timeline's current-position glow is the mirrored one — `edge: "left"`, so it bleeds in from
 * off-screen and grows toward whatever sits to its right, rather than the other way around.
 */
export function edgeGlow({ edge, primary, secondary, y = 0.5 }: EdgeGlowOptions): GlassShape[] {
  const edgeX = edge === "right" ? 1 : 0;
  const sign = edge === "right" ? 1 : -1;

  return [
    {
      kind: "ellipse",
      x: edgeX + sign * 0.53,
      y,
      w: 1.06,
      h: 0.7,
      color: primary,
      // Headroom: flute bodies transmit above neutral, and a colour near full in its own
      // channel goes pale the moment that boost clips.
      opacity: 0.9,
      blur: 0.11,
      pull: 0.02,
      drift: { amp: 0.006, speed: 0.04 },
    },
    {
      // Offset from centre and a shorter reach, so the arc grades in hue along its own extent
      // rather than being one tint with a lighter core.
      kind: "ellipse",
      x: edgeX + sign * 0.29,
      y: y - 0.1,
      w: 0.58,
      h: 0.52,
      color: secondary,
      opacity: 0.32,
      blur: 0.09,
      pull: 0.09,
      drift: { amp: 0.009, speed: 0.055 },
    },
  ];
}

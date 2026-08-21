import type { FlutedGlassProps, GlassConfig, GlassShape } from "./types";

/** The hero's periwinkle-into-orchid glow, bled up from the bottom edge.
 *  Rationale: docs/fluted-glass-presets.md § HERO_SHAPES */
const HERO_SHAPES: GlassShape[] = [
  {
    kind: "ellipse",
    x: 0.517,
    y: 1.11,
    w: 0.91,
    h: 0.23,
    color: "#8ea8f5",
    // Not quite 1. The flute bodies sit above neutral transmission, so the field has to leave
    // headroom or that boost clips a channel and the periwinkle goes pale and cyan.
    opacity: 0.85,
    blur: 0.075,
    pull: 0.06,
    drift: { amp: 0.004, speed: 0.04 },
  },
  {
    kind: "ellipse",
    x: 0.78,
    y: 1.1,
    w: 0.62,
    h: 0.2,
    color: "#c48af0",
    opacity: 0.45,
    blur: 0.08,
    pull: 0.09,
    drift: { amp: 0.006, speed: 0.055 },
  },
];

/** The glass itself, shared by the hero and the footer so the two stay in step.
 *  Rationale: docs/fluted-glass-presets.md § PANEL_GLASS */
const PANEL_GLASS: GlassConfig = {
  orientation: 0,
  // A count, so the flutes hold their share of the width at any window size. Lands near
  // 20px on a 900-wide window, between the card's 14 and the mock's 40.
  flutes: 46,
  roundness: 0.68,
  ior: 1.38,
  // Scaled up from the card's 8 along with the pitch. Displacement has to track flute
  // width, or a wider flute reads as a flatter one.
  thickness: 10,
  dispersion: 0.03,
  seam: 0.65,
  gather: 0.3,
  presence: 0,
};

export const presets = {
  /** Full-bleed hero. Vertical flutes, invisible until the glow reaches them. */
  hero: {
    shapes: HERO_SHAPES,
    glass: PANEL_GLASS,
    light: { angle: 108, intensity: 0.2, sharpness: 7, ambient: 0.03 },
    // No cursor light here. The blob's lean toward the pointer is the only interaction.
    interaction: { pull: 0.03, shimmer: { radius: 160, gain: 0 } },
    // Below the default 2x: this is the one panel that's guaranteed full-bleed on every phone, and
    // the field has no detail sharp enough for the extra resolution to read as anything but cost.
    quality: { maxDpr: 1.5 },
  },

  /** The dome that grows out of the bottom of the footer on overscroll — the hero's material,
   *  grown through `reveal` rather than uncovered by a mask.
   *  Rationale: docs/fluted-glass-presets.md § presets.footer */
  footer: {
    shapes: [
      {
        // Crest on the bottom edge, and a feather two thirds of the dome's height on top of it, so
        // the blue is still fading at the crest of the arc and does not finish until nearly the top
        // of the panel.
        kind: "ellipse",
        x: 0.5,
        y: 1.72,
        // Under 1, unlike the hero's, so the ends fall away inside the window: the arc is this
        // field's own silhouette and there is no mask over it drawing one. The core still reaches
        // to within a couple of hundred pixels of both edges, so it reads as a wide gentle dome
        // rather than a bump.
        w: 0.86,
        h: 1.45,
        // The hero's periwinkle. A saturated blue here read as a different material entirely,
        // and the mock's arc is the same glass as the top of the page, lower down.
        color: "#8ea8f5",
        // Headroom, same as the hero: flute bodies transmit above neutral, and a colour this
        // close to full in its own channel goes pale and cyan the moment that boost clips.
        opacity: 0.85,
        blur: 0.572,
        pull: 0,
        drift: { amp: 0, speed: 0 },
      },
      {
        // Quiet, and left of centre. The mock's arc is nearly monochrome, so this is only here to
        // keep the blue from being one flat tint across the whole span.
        kind: "ellipse",
        x: 0.38,
        y: 1.66,
        w: 0.62,
        h: 1.32,
        color: "#6f95e8",
        opacity: 0.22,
        blur: 0.471,
        pull: 0,
        drift: { amp: 0, speed: 0 },
      },
    ],
    glass: PANEL_GLASS,
    // The hero's light, white default and all. Highlights are additive and gated by field alpha,
    // so over paper they composite away to nothing on their own at the top of the falloff.
    light: { angle: 108, intensity: 0.2, sharpness: 7, ambient: 0.03 },
    // Nothing here answers the cursor, and nothing drifts: the dome's only motion is the overscroll
    // that reveals it, and a drifting layer would hold the renderer's loop open for as long as the
    // reader sits at the bottom of the page.
    interaction: { disabled: true, pull: 0, shimmer: { gain: 0 } },
  },

  /** The band bleeding off the right edge of the Awards/Projects list; retints per item, scroll
   *  driven, the site's only curved sheet.
   *  Rationale: docs/fluted-glass-presets.md § presets.accent */
  accent: {
    glass: {
      orientation: 90,
      // A fixed pitch, not a count: the panel is a fraction of the window wide, and a count would
      // divide that into flutes narrow enough for the shader's own subpixel dissolve to eat.
      pitch: 14,
      roundness: 0.68,
      ior: 1.38,
      thickness: 9,
      dispersion: 0.03,
      variance: 0.5,
      wick: 0.3,
      seam: 0.65,
      gather: 0.3,
      presence: 0,
      curve: {
        drive: "scroll",
        scrollSource: "window",
        // A fifth of the stage's. The section is five viewports long, so even this carries the
        // pattern about a panel height across it, which is a roll rather than a spin.
        turnsPerViewport: 0.06,
        damping: 0.6,
        rimAngle: 78,
        // The rim fade lands in the top and bottom couple of percent of the panel, where the arc has
        // already died out, so the flutes dissolve into nothing instead of into a visible band.
        edgeFade: 0.07,
      },
    },
    // Near across the flutes, the same relationship the hero's light has to its own vertical ones.
    light: { angle: 18, intensity: 0.2, sharpness: 7, ambient: 0.03 },
    // No glint here, only the pointer-lean retint — `reach`/`pullY` tuned for this section's layout.
    // Rationale: docs/fluted-glass-presets.md § interaction: reach and pullY
    interaction: { pull: 0.03, reach: 2, pullY: 0.45, shimmer: { radius: 160, gain: 0 } },
  },
} satisfies Record<string, Omit<FlutedGlassProps, "children" | "className">>;

export type PresetName = keyof typeof presets;

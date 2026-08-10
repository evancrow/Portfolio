import type { FlutedGlassProps, GlassConfig, GlassShape } from "./types";

/**
 * The mock: a periwinkle glow bleeding up out of the bottom edge, with an orchid layer over
 * its right side so the band grades in hue rather than being one flat tint.
 *
 * Both are wide shallow ellipses whose cores sit almost entirely below the panel, so nearly
 * everything visible is feather. That is also why the band spans so much more width than the
 * cores' chords do: an ellipse this flat runs nearly parallel to the bottom edge, so the field
 * stays within a feather of it across a long span.
 *
 * The two layers carry different `pull` and `drift`, so the hues separate slightly as the
 * pointer moves and the band is never quite the same shape twice.
 */
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

/**
 * The glass itself, shared by the hero and the footer.
 *
 * The `card` treatment at a wider pitch, which is the version that read as actual fluted glass.
 * Everything not listed takes the resolved defaults, same as `card` does, so the three stay in
 * step. Shared rather than copied because the footer's dome is the hero's material seen through a
 * mask, and two sets of numbers to keep level is how they end up not being.
 */
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
  },

  /**
   * The dome that grows out of the bottom of the footer on overscroll. The hero's material, on the
   * same paper, so it takes `PANEL_GLASS` unchanged: same flute width, same lens, and the resolved
   * defaults for `variance` and `wick`, which is what gives it the hero's smooth dissolve rather
   * than a comb of ragged fingered tips.
   *
   * Grown through `reveal` rather than uncovered by a mask. The footer scales this field with the
   * pull, so its falloff is always the same share of whatever height is showing. Held at full size
   * and masked instead, a short pull would be a strip cut out of the saturated bottom of it: a flat
   * blue wall with no gradient in it, and every flute sliced off along the mask's own contour rather
   * than dissolving at its own height.
   *
   * `shapeCoverage` saturates at 1.0 everywhere inside a shape and only feathers outside it, so any
   * core that clears the bottom edge shows up as a flat slab with a ramp perched on top. Both crests
   * are parked exactly on the edge instead, which leaves the whole visible band inside the Gaussian
   * tail: one continuous falloff with nothing flat in it. That is the whole of why the hero dissolves.
   *
   * It is also why the panel has to be taller than the dome ever opens to, which is the footer's
   * `OVERHEAD`. A feather is a fraction of the panel and so is the reveal, so a reveal approaching 1
   * is a tail as long as the panel it has to die inside, and it does not: it meets the top of the
   * canvas at strength and rules a hard line across the page. The reveal only ever uses the bottom
   * half, and the half above it is where the tail goes to finish.
   *
   * `blur` runs far above the hero's number for a feather not much longer than it, because it is a
   * fraction of the panel's height and this panel is a fraction of the hero's: at a full pull the
   * reveal scales 0.572 of a ~550px panel down to a ~185px feather over a ~275px dome, against 0.075
   * of a ~980px hero at ~74px. Long on purpose. Nearly the whole of the dome is falloff, which is
   * what keeps a shallow pull from reading as a wall with a lid on it.
   *
   * Which pairs these two numbers with `OVERHEAD` as well. The reveal shrinks a feather more slowly
   * than the shape it belongs to, so what survives that is a fourth root of the panel's own height:
   * the room the tail needs would otherwise widen the tail by a fifth, and these come down by the
   * same fifth to pay for it.
   */
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

  /**
   * The band that bleeds off the right edge of the awards list, and the only preset that ships
   * without shapes: its colour is whichever item currently holds the stage, so the layers are built
   * at the call site and the glass, light and interaction are all that is fixed here.
   *
   * Its own glass rather than `PANEL_GLASS`, because this is the one panel whose flutes run across
   * the direction its field falls off in: horizontal flutes over a band that fades leftward read as a
   * comb of fingers reaching out of the glow, where vertical ones would only draw stripes along it.
   * `variance` and `wick` run well above the shared treatment for the same reason, since those ragged
   * tips are this panel's leading edge rather than an accent on it.
   *
   * The site's only curved sheet, and scroll driven, so the band keeps travelling while the list
   * beside it holds still. At this orientation `fluteExtent` is the panel's height, so the axis lies
   * horizontal and the flutes roll vertically, compressing into each rim rather than sliding past as
   * one piece.
   *
   * `scrollSource` has to be `window` here, which is the opposite of what a panel that owns a section
   * usually wants. `section` measures the panel's own progress through the viewport, and this panel
   * lives inside a sticky pin: its rect holds the same top for the whole section, so that source would
   * read one constant and the flutes would never turn at all.
   */
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
    // The hero's bargain: the layers lean toward the pointer, and nothing else answers it. A glint
    // here would compete with the retint, which is the one thing this panel is for.
    //
    // A `reach` well past the default, because this panel is a slice down the right of a section
    // whose left half is the list. At 0.35 the margin stops short of the copy, so the lean died the
    // moment the cursor settled on the thing the reader came to read — presence eases out, the pull
    // goes to zero, and the band snaps back to rest until the cursor returns. 2 clears the margin
    // over even the far (left) edge of the list at ordinary window widths, so presence never drops
    // and the lean never resets while the cursor is anywhere in the section. The travel itself is
    // reined in on the shapes' own `pull`, not here — narrowing the reach only trades the snap for a
    // dead zone over the copy, which is the wrong fix for "leans too far".
    // pullY a touch above the default 0.35, so the vertical lean reads a little more clearly
    // alongside the horizontal one instead of trailing far behind it.
    interaction: { pull: 0.03, reach: 2, pullY: 0.45, shimmer: { radius: 160, gain: 0 } },
  },

  // The about section's glow. Held still rather than curved and scroll-driven like `accent`: this
  // panel sits in plain document flow, not a pinned stage, so there is no scroll progress of its
  // own to roll it against. The pointer lean and cursor shimmer are the only motion.
  //
  // Centred low, behind where the copy sits, with a wide feather so the field is already faint by
  // the panel's own top and bottom edges — the call site bleeds the canvas further still, so what
  // little is left finishes off-panel instead of being clipped flat at the seam with its neighbours.
  //
  // Disabled for now — About ships without glass. Left here in case that changes.
  // about: {
  //   shapes: [
  //     {
  //       kind: "ellipse",
  //       x: 0.5,
  //       y: 0.62,
  //       w: 0.7,
  //       h: 0.38,
  //       color: "#8ea8f5",
  //       opacity: 0.85,
  //       blur: 0.12,
  //       pull: 0.05,
  //       drift: { amp: 0.01, speed: 0.05 },
  //     },
  //     {
  //       kind: "ellipse",
  //       x: 0.28,
  //       y: 0.56,
  //       w: 0.34,
  //       h: 0.24,
  //       color: "#c48af0",
  //       opacity: 0.5,
  //       blur: 0.1,
  //       pull: 0.09,
  //       drift: { amp: 0.012, speed: 0.06 },
  //     },
  //   ],
  //   glass: PANEL_GLASS,
  //   light: { angle: 104, intensity: 0.2, sharpness: 6, ambient: 0.03 },
  //   interaction: { pull: 0.05, shimmer: { radius: 150, gain: 0.85 } },
  // },
} satisfies Record<string, Omit<FlutedGlassProps, "children" | "className">>;

export type PresetName = keyof typeof presets;

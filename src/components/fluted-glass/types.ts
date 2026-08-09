import type { CSSProperties, ReactNode, RefObject } from "react";

/** Underlying shape drawn behind the glass and refracted by the flutes. */
export type ShapeKind = "ellipse" | "circle" | "bar" | "ring" | "arc";

export const SHAPE_KIND_ID: Record<ShapeKind, number> = {
  ellipse: 0,
  circle: 1,
  bar: 2,
  ring: 3,
  arc: 4,
};

/**
 * One layer behind the glass. Position and size are fractions of the container,
 * so a shape keeps its composition across viewport sizes.
 */
export type GlassShape = {
  kind?: ShapeKind;
  /** Center, 0..1 of the container. 0,0 is top left. */
  x: number;
  y: number;
  /** Full width and height, 0..1 of the container. */
  w: number;
  h: number;
  /** Degrees, clockwise. Also the center direction of an `arc`. */
  rotate?: number;
  color: string;
  opacity?: number;
  /** Edge feather, as a fraction of container height. Larger reads as more blurred. */
  blur?: number;
  /** How strongly this layer follows the pointer, 0..1. Differing values give the stack depth. */
  pull?: number;
  /** Slow idle wander so the layer breathes when the pointer is absent. */
  drift?: { amp: number; speed: number };
  /** Band thickness for `ring` and `arc`, or corner radius for `bar`. Fraction of the shape's smaller radius. */
  thickness?: number;
  /** Angular span of an `arc`, in degrees. */
  span?: number;
};

export type CurveDrive = "scroll" | "ambient" | "pointer";

/**
 * Curves the sheet of glass, wrapping the flutes around a cylinder so they foreshorten toward each
 * rim and can be rolled around it. Everything here describes that curve; a panel that omits the
 * whole block is a flat sheet and none of it applies.
 */
export type CurveConfig = {
  /** What rolls the flutes around the curve. */
  drive?: CurveDrive;
  /**
   * Where scroll is read from. `section` measures this panel's own progress through the
   * viewport. `external` reads `FlutedGlassProps.scrollProgress` instead of either — for a panel
   * whose scroll isn't the page's, like one driven by its own virtual/elastic scroll container.
   */
  scrollSource?: "window" | "section" | "external";
  /** Rotation per viewport scrolled, in turns. */
  turnsPerViewport?: number;
  /** 0 tracks its input tightly, 1 glides far behind it. `scroll` and `pointer` drives. */
  damping?: number;
  /** Degrees. Sets the cylinder radius from the panel width, so the 90 degree singularity sits off-panel. */
  rimAngle?: number;
  /** Fraction of the visible span faded out at each rim, so flutes dissolve instead of stacking. */
  edgeFade?: number;
  /** Turns per second, `ambient` drive only. */
  speed?: number;
  /** Scales the cursor-anchored rotation, `pointer` drive only. 1 keeps a flute exactly under
   * the cursor, and the sweep is bounded by `rimAngle` either way. */
  gain?: number;
};

export type GlassConfig = {
  /** Degrees. 0 gives vertical flutes. */
  orientation?: number;
  /** Flute width in CSS px. On a curved sheet this is the width at the center of the span. */
  pitch?: number;
  /** Flutes across the panel. Overrides `pitch` when above 0, which holds a design's
   * proportions at any viewport where a fixed pitch would not. */
  flutes?: number;
  /** How much of a full cylinder each flute covers, 0..1. Higher is a rounder, stronger lens. */
  roundness?: number;
  /** Index of refraction. 1 is flat glass with no displacement, 1.5 is close to real glass. */
  ior?: number;
  /** Displacement scale in CSS px. */
  thickness?: number;
  /** Chromatic dispersion, as a fraction of the displacement. */
  dispersion?: number;
  /** Blur along the flute axis, as a fraction of pitch. Reads as frosting. */
  blur?: number;
  /** Low-pass across the flute's own profile, as a fraction of pitch. Softens the fingers
   * themselves, where `blur` only softens the field they are cut from. */
  soften?: number;
  /** Per-flute shift along the flute, in flute widths, giving the tips their own depths
   * instead of one shared contour. */
  variance?: number;
  /** How far each flute carries the glow along its own length, in flute widths. Shows as soft
   * columns reaching past the falloff, which is most of what makes a panel look fluted. */
  wick?: number;
  /** How far each flute pinches transmission to nothing at its boundaries, 0..1. */
  seam?: number;
  /** How much each flute gathers light along its crown. This is what makes the fingers. */
  gather?: number;
  /** How far the seams show over bare background, 0..1. 0 makes the panel truly invisible. */
  presence?: number;
  /** Body tint applied to transmitted light. */
  tint?: string;
  /** Strength of the body tint, 0..1. */
  tintAmount?: number;
  /**
   * Curves the sheet. Present means the flutes wrap a cylinder, foreshortening toward each rim and
   * rolling around it as `drive` asks; omitted means a flat sheet, where the flutes run straight
   * across at one width and none of `CurveConfig` has anything to act on.
   */
  curve?: CurveConfig;
};

export type LightConfig = {
  /** Degrees, counter-clockwise from the right, with up being positive. */
  angle?: number;
  intensity?: number;
  /** Specular exponent. Higher is a tighter highlight along each flute. */
  sharpness?: number;
  /** Constant sheen across every flute crown. */
  ambient?: number;
  specColor?: string;
  /** How much the highlight contributes to alpha, which is what makes it visible on dark pages. */
  specAlpha?: number;
  /** Brightness of the thin focused line just inside each flute join. */
  caustic?: number;
};

export type InteractionConfig = {
  /** Baseline pointer pull for shapes that do not set their own. */
  pull?: number;
  /** How far outside the panel a cursor still counts as present, as a fraction of the panel's
   * smaller side. The default suits a panel that is itself the thing being pointed at. Raise it for
   * one that is a slice of something wider, where the cursor spends its time over the copy beside
   * the glass rather than over the glass, and the layers should keep leaning toward it anyway. */
  reach?: number;
  /** Scales the vertical component of pull, 1 matching the horizontal. A layer centered off
   * the panel is much further away in y than it can ever be in x, so an equal factor swings it
   * harder vertically and leans it permanently off its base rather than either side of it. */
  pullY?: number;
  shimmer?: {
    /** Radius of the cursor glint in CSS px. The falloff is bounded, so this is where it ends. */
    radius?: number;
    /** Roughly the fraction a flute crown brightens by directly under the cursor, measured
     * against the key light's own highlight. 0 removes the glint and its lens swell both. */
    gain?: number;
    /** Only light the glass while the button or finger is held down. Off by default, since a
     * hover-lit panel is the point on a desktop; worth turning on for a touch layout, where
     * there is no hover and a released finger would otherwise leave the glint parked. */
    onPress?: boolean;
  };
  /** Pointer spring. Higher stiffness tracks more tightly. */
  stiffness?: number;
  /** 1 is critically damped, below 1 overshoots slightly. */
  zeta?: number;
  disabled?: boolean;
};

export type QualityConfig = {
  /** Device pixel ratio ceiling. */
  maxDpr?: number;
  /** Resolution of the shape field relative to the canvas. The field is smooth, so this can be low. */
  fieldScale?: number;
  /** Samples along the flute axis. 1 is sharpest and cheapest, 5 is smoothest. */
  taps?: 1 | 3 | 5;
  /** Blur applied to the field in field texels, which hides upsampling facets. */
  fieldSmoothing?: number;
};

export type FlutedGlassProps = {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** CSS background behind everything. Transparent by default so the page shows through. */
  background?: string;
  /** CSS background shown in place of the canvas when WebGL2 is unavailable. */
  fallback?: string;
  shapes?: GlassShape[];
  glass?: GlassConfig;
  light?: LightConfig;
  interaction?: InteractionConfig;
  quality?: QualityConfig;
  /**
   * Vertical reveal, 0..1, read every frame rather than on render.
   *
   * 1 is the panel as configured. Below that the whole field is the same field at that fraction of
   * its height, growing out of the panel's bottom edge: heights, feathers and distances from that
   * edge all scale together. A ref, because this is meant to be driven from an animation loop, and
   * a prop would be a render per frame.
   *
   * For uncovering a panel, this is what to reach for rather than a mask over it. A mask cuts the
   * flutes off along the mask's own contour, where the field's own falloff leaves every flute
   * dissolving at its own height, and that soft comb of tips is most of what the glass looks like.
   */
  reveal?: RefObject<number>;
  /**
   * 0..1, read every frame — the scroll progress `glass.curve.scrollSource: "external"` rolls the
   * flutes against, for a panel whose scroll is its own rather than the page's. A ref for the same
   * reason `reveal` is: something an animation loop drives shouldn't cost a render per frame.
   */
  scrollProgress?: RefObject<number>;
};

/* ---------------------------------------------------------------- defaults */

/**
 * Every fallback in one place, in the units a caller authors in — degrees, not radians, since
 * `resolveConfig` converts after the fallback rather than before it.
 *
 * Read by `resolveConfig` below and by the dev playground's sliders, which used to restate all of
 * these as literals of its own and so could quietly disagree with what the renderer actually did.
 */
export const DEFAULTS = {
  shape: {
    kind: "ellipse",
    rotate: 0,
    opacity: 1,
    blur: 0.12,
    thickness: 0.25,
    span: 120,
    drift: { amp: 0.012, speed: 0.06 },
  },
  glass: {
    orientation: 0,
    pitch: 40,
    flutes: 0,
    roundness: 0.8,
    ior: 1.5,
    thickness: 22,
    dispersion: 0.05,
    blur: 0.2,
    soften: 0.08,
    variance: 0.15,
    wick: 0.15,
    seam: 0.7,
    gather: 0.25,
    presence: 0,
    tint: "#ffffff",
    tintAmount: 0,
  },
  curve: {
    drive: "scroll",
    scrollSource: "window",
    turnsPerViewport: 0.28,
    damping: 0.6,
    rimAngle: 78,
    edgeFade: 0.06,
    speed: 0.03,
    gain: 1,
  },
  light: {
    angle: 96,
    intensity: 0.16,
    sharpness: 4,
    ambient: 0.02,
    specColor: "#ffffff",
    specAlpha: 0.3,
    caustic: 0.08,
  },
  interaction: {
    pull: 0.04,
    reach: 0.35,
    pullY: 0.35,
    stiffness: 90,
    zeta: 0.9,
    disabled: false,
  },
  shimmer: {
    radius: 130,
    gain: 0.85,
    onPress: false,
  },
  quality: {
    maxDpr: 2,
    fieldScale: 0.34,
    taps: 3,
    fieldSmoothing: 1.4,
  },
} as const;

export type ResolvedShape = Required<Omit<GlassShape, "drift" | "color">> & {
  drift: { amp: number; speed: number };
  rgb: [number, number, number];
};

/** `rimAngle` is in radians here, unlike everywhere a caller writes it. */
export type ResolvedCurve = Required<CurveConfig>;

export type ResolvedConfig = {
  shapes: ResolvedShape[];
  glass: Required<Omit<GlassConfig, "curve" | "tint">> & {
    /** Null on a flat sheet, which is what the renderer branches on. */
    curve: ResolvedCurve | null;
    tintRgb: [number, number, number];
  };
  light: Required<Omit<LightConfig, "specColor">> & {
    specRgb: [number, number, number];
  };
  interaction: Required<Omit<InteractionConfig, "shimmer">> & {
    shimmer: Required<NonNullable<InteractionConfig["shimmer"]>>;
  };
  quality: Required<QualityConfig>;
};

const DEG = Math.PI / 180;

/** Parses `#rgb`, `#rrggbb`, or `rgb()/rgba()` into linear-ish 0..1 components. */
export function parseColor(input: string): [number, number, number] {
  const s = input.trim();
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    const full =
      hex.length === 3 || hex.length === 4
        ? hex
            .slice(0, 3)
            .split("")
            .map((c) => c + c)
            .join("")
        : hex.slice(0, 6);
    const n = parseInt(full, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const nums = s.match(/[\d.]+/g);
  if (nums && nums.length >= 3) {
    return [+nums[0] / 255, +nums[1] / 255, +nums[2] / 255];
  }
  return [1, 1, 1];
}

export function resolveConfig(props: FlutedGlassProps): ResolvedConfig {
  const g = props.glass ?? {};
  const curve = g.curve;
  const l = props.light ?? {};
  const i = props.interaction ?? {};
  const q = props.quality ?? {};
  const basePull = i.pull ?? DEFAULTS.interaction.pull;

  return {
    shapes: (props.shapes ?? []).map((s) => ({
      kind: s.kind ?? DEFAULTS.shape.kind,
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      rotate: (s.rotate ?? DEFAULTS.shape.rotate) * DEG,
      opacity: s.opacity ?? DEFAULTS.shape.opacity,
      blur: s.blur ?? DEFAULTS.shape.blur,
      pull: s.pull ?? basePull,
      thickness: s.thickness ?? DEFAULTS.shape.thickness,
      span: (s.span ?? DEFAULTS.shape.span) * DEG,
      drift: s.drift ?? DEFAULTS.shape.drift,
      rgb: parseColor(s.color),
    })),
    glass: {
      orientation: (g.orientation ?? DEFAULTS.glass.orientation) * DEG,
      pitch: g.pitch ?? DEFAULTS.glass.pitch,
      flutes: g.flutes ?? DEFAULTS.glass.flutes,
      roundness: g.roundness ?? DEFAULTS.glass.roundness,
      ior: g.ior ?? DEFAULTS.glass.ior,
      thickness: g.thickness ?? DEFAULTS.glass.thickness,
      dispersion: g.dispersion ?? DEFAULTS.glass.dispersion,
      blur: g.blur ?? DEFAULTS.glass.blur,
      soften: g.soften ?? DEFAULTS.glass.soften,
      variance: g.variance ?? DEFAULTS.glass.variance,
      wick: g.wick ?? DEFAULTS.glass.wick,
      seam: g.seam ?? DEFAULTS.glass.seam,
      gather: g.gather ?? DEFAULTS.glass.gather,
      presence: g.presence ?? DEFAULTS.glass.presence,
      tintAmount: g.tintAmount ?? DEFAULTS.glass.tintAmount,
      tintRgb: parseColor(g.tint ?? DEFAULTS.glass.tint),
      // Absent means a flat sheet. Nothing downstream has to consult a second flag to know which
      // it is, and there is no way to describe a curve on a panel that does not have one.
      curve: curve
        ? {
            drive: curve.drive ?? DEFAULTS.curve.drive,
            scrollSource: curve.scrollSource ?? DEFAULTS.curve.scrollSource,
            turnsPerViewport: curve.turnsPerViewport ?? DEFAULTS.curve.turnsPerViewport,
            damping: curve.damping ?? DEFAULTS.curve.damping,
            rimAngle: (curve.rimAngle ?? DEFAULTS.curve.rimAngle) * DEG,
            edgeFade: curve.edgeFade ?? DEFAULTS.curve.edgeFade,
            speed: curve.speed ?? DEFAULTS.curve.speed,
            gain: curve.gain ?? DEFAULTS.curve.gain,
          }
        : null,
    },
    light: {
      angle: (l.angle ?? DEFAULTS.light.angle) * DEG,
      intensity: l.intensity ?? DEFAULTS.light.intensity,
      sharpness: l.sharpness ?? DEFAULTS.light.sharpness,
      ambient: l.ambient ?? DEFAULTS.light.ambient,
      specAlpha: l.specAlpha ?? DEFAULTS.light.specAlpha,
      caustic: l.caustic ?? DEFAULTS.light.caustic,
      specRgb: parseColor(l.specColor ?? DEFAULTS.light.specColor),
    },
    interaction: {
      pull: basePull,
      reach: i.reach ?? DEFAULTS.interaction.reach,
      pullY: i.pullY ?? DEFAULTS.interaction.pullY,
      stiffness: i.stiffness ?? DEFAULTS.interaction.stiffness,
      zeta: i.zeta ?? DEFAULTS.interaction.zeta,
      disabled: i.disabled ?? DEFAULTS.interaction.disabled,
      shimmer: {
        radius: i.shimmer?.radius ?? DEFAULTS.shimmer.radius,
        gain: i.shimmer?.gain ?? DEFAULTS.shimmer.gain,
        onPress: i.shimmer?.onPress ?? DEFAULTS.shimmer.onPress,
      },
    },
    quality: {
      maxDpr: q.maxDpr ?? DEFAULTS.quality.maxDpr,
      fieldScale: q.fieldScale ?? DEFAULTS.quality.fieldScale,
      taps: q.taps ?? DEFAULTS.quality.taps,
      fieldSmoothing: q.fieldSmoothing ?? DEFAULTS.quality.fieldSmoothing,
    },
  };
}

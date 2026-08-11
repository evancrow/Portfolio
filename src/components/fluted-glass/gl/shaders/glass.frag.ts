/**
 * Pass 3. The glass itself, at full device resolution.
 *
 * Each flute is a cylindrical lens. Its surface normal drives a Snell-style lateral
 * displacement of the field behind it, which is what produces the chopped, compressed
 * copies of the shape rather than a merely striped overlay. Highlights are additive with
 * a small alpha contribution, so over a white page they composite away to nothing while
 * over the saturated field they read strongly.
 *
 * `TAPS` is injected as a compile-time define.
 */
export const GLASS_FRAG = /* glsl */ `#version 300 es
precision highp float;

#define TAPS_F float(TAPS)

uniform sampler2D uField;
uniform vec2  uResolution;
uniform float uTime;

/** The sheet is curved: the flutes wrap the cylinder below rather than running straight across. */
uniform bool  uCurved;
uniform float uAngle;
uniform float uPitch;
uniform float uRoundness;
uniform float uIor;
uniform float uThickness;
uniform float uDispersion;
uniform float uBlur;
uniform float uSoften;
uniform float uVariance;
uniform float uWick;
uniform float uSeam;
uniform float uGather;
uniform float uPresence;
uniform vec3  uTint;
uniform float uTintAmount;

uniform float uCylRadius;
uniform float uCylRot;
uniform float uEdgeFade;

uniform float uLightAngle;
uniform float uLightIntensity;
uniform float uLightSharp;
uniform float uAmbient;
uniform vec3  uSpecColor;
uniform float uSpecAlpha;
uniform float uCaustic;

uniform vec2  uPointer;
uniform float uPointerVel;
uniform float uPointerIn;
uniform float uShimmerRadius;
uniform float uShimmerGain;

out vec4 outColor;

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

/**
 * Grayscale transmission profile across one flute, 0.5 being neutral.
 *
 * Flat across the body with a hairline dip at the join. Both halves are deliberate: a flute
 * that varies across its width reads as a soft gradient rather than as glass, and a join that
 * eases in over any real distance reads as a pale gap rather than as an edge. So the body is
 * one constant, and the drop happens inside a twentieth of the flute, which at a normal pitch
 * is two or three device pixels: enough to antialias, narrow enough to be a line.
 *
 * The small overshoot just inside the join is the caustic, a hair more opaque than the body,
 * so the edge reads as slightly more saturated on one side.
 *
 * - u: position across the flute, 0..1.
 */
float fluteProfile(float u) {
  if (u < 0.05) return mix(0.30, 0.72, smoothstep(0.0, 1.0, u / 0.05));
  if (u < 0.12) return mix(0.72, 0.68, smoothstep(0.0, 1.0, (u - 0.05) / 0.07));
  if (u < 0.95) return 0.68;
  return mix(0.68, 0.30, smoothstep(0.0, 1.0, (u - 0.95) / 0.05));
}

/**
 * The profile low-passed across the flute.
 *
 * This is the only thing that softens the fingers. uBlur widens the field samples, so it
 * blurs what the glass looks at, never the flute's own structure, and the profile prints
 * every crease it has at full contrast no matter how blurred the field behind it is.
 *
 * Seven parabola-weighted taps over a window of w flute widths, wrapping at the joins so
 * the seam softens along with the crowns. Pure ALU, so it costs nothing next to the texture
 * fetches above.
 *
 * - u: position across the flute, 0..1.
 * - w: window width as a fraction of the flute, 0 leaving the profile untouched.
 */
float softProfile(float u, float w) {
  float sum = 0.0;
  float norm = 0.0;
  for (int k = -3; k <= 3; k++) {
    float x = float(k) / 4.0;
    float wt = 1.0 - x * x;
    sum += wt * fluteProfile(fract(u + x * w + 1.0));
    norm += wt;
  }
  return sum / norm;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 q = rot2(-uAngle) * (frag - 0.5 * uResolution);

  // ---- flute coordinate -------------------------------------------------
  float s, pitchPx, foreshorten;
  float edge = 1.0;

  if (uCurved) {
    // Orthographic view of a vertical cylinder: a flute at angle a sits at x = R*sin(a),
    // so its on-screen width falls off as cos(a) and reaches zero at the rim.
    float xn = clamp(q.x / max(uCylRadius, 1.0), -1.0, 1.0);
    float a = asin(xn);
    foreshorten = max(cos(a), 0.0);
    float angularPitch = uPitch / max(uCylRadius, 1.0);
    s = (a - uCylRot) / angularPitch;
    pitchPx = uCylRadius * foreshorten * angularPitch;
    edge = 1.0 - smoothstep(1.0 - max(uEdgeFade, 1e-3), 1.0, abs(xn));
  } else {
    s = q.x / uPitch;
    pitchPx = uPitch;
    foreshorten = 1.0;
  }

  // Fade a flute out just before its width reaches a pixel, so the rim dissolves
  // instead of aliasing into a moire band.
  float lod = smoothstep(1.25, 3.5, pitchPx) * edge;

  float u = fract(s);
  float t = u * 2.0 - 1.0;
  float sn = t * uRoundness;
  float cs = sqrt(max(1.0 - sn * sn, 1e-4));

  // ---- cursor proximity -------------------------------------------------
  // Bounded rather than Gaussian, so uShimmerRadius is where the light ends instead of where it
  // has faded to a third and is still lifting glass half a screen away. Quadratic, so it meets
  // zero with zero slope and the swell below has no rim to print.
  float pd = length(frag - uPointer) / max(uShimmerRadius, 1.0);
  float prox = max(1.0 - pd, 0.0);
  prox = prox * prox * uPointerIn;
  // Both cursor effects stop at gain 0, so a panel can opt out of the cursor entirely. The swell
  // reads gain only through that zero: bulge depth belongs to the glass, not to the glint.
  float swell = uShimmerGain > 0.0 ? prox : 0.0;

  // ---- refraction -------------------------------------------------------
  float bend = (1.0 - 1.0 / max(uIor, 1.0)) * sn / max(cs, 0.25);
  float disp = bend * uThickness * foreshorten * lod * (1.0 + 0.55 * swell);

  vec2 dir = rot2(uAngle) * vec2(1.0, 0.0);
  float span = uBlur * pitchPx;

  // Per-flute shift along the flute, in flute widths, so each flute shows the field from its
  // own depth and so terminates at its own tip. One value for the whole flute, which is what
  // makes the tips read as flat steps between neighbours rather than as noise, and faded out
  // with lod, since a subpixel flute would turn the variation into exactly that noise.
  //
  // It moves the sample position rather than scaling alpha. Scaling would dim a saturated
  // core and clip whichever channel is already at 1, which desaturates the color; moving the
  // sample leaves a plateau alone and shows up only where the field has a gradient to walk.
  vec2 along = rot2(uAngle) * vec2(0.0, 1.0);
  float jitter = (hash(vec2(floor(s), 7.3)) - 0.5) * 2.0;
  vec2 stagger = along * (jitter * uVariance * pitchPx * lod);

  vec4 acc = vec4(0.0);
  for (int k = 0; k < TAPS; k++) {
    float j = TAPS_F > 1.5 ? (float(k) / (TAPS_F - 1.0) - 0.5) : 0.0;
    vec2 off = dir * (disp + j * span);
    // The stagger is outside the dispersion scaling: dispersion is a lateral splitting of the
    // lens, so carrying it along the flute would fringe the tips.
    vec2 base = frag + stagger;
    // Explicit LOD 0: fract() makes the derivative blow up at every flute boundary,
    // which would otherwise pull a blurry mip in exactly at the seams.
    vec4 cr = textureLod(uField, (base + off * (1.0 + uDispersion)) / uResolution, 0.0);
    vec4 cg = textureLod(uField, (base + off) / uResolution, 0.0);
    vec4 cb = textureLod(uField, (base + off * (1.0 - uDispersion)) / uResolution, 0.0);
    acc += vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) * (1.0 / 3.0));
  }
  acc /= TAPS_F;

  // A flute is a lens, so its body pipes light further along itself than its joins do and the
  // glow reaches deeper in soft columns, one per flute, with pale lanes between. That comb
  // crossing the envelope is what makes a panel read as fluted rather than as a striped
  // gradient, and it is why the transmission profile can stay as quiet as it does.
  //
  // Three details, each of which went wrong once. It reads from whichever direction along the
  // flute has more light rather than a fixed one, so it works with the glow at either end of a
  // panel. It picks that sample by alpha rather than per component, which would let two
  // differently colored layers cross-contaminate. And it is weighted by the sample's own
  // strength, so a column fades out where the light it is reaching for does, instead of running
  // the whole height of the panel as a pinstripe.
  if (uWick > 0.0) {
    // A plateau with narrow shoulders, not an arch. An arch prints its own curve, so every
    // flute ends up scalloped; a plateau gives a column with straight sides and a flat depth.
    float body = smoothstep(0.0, 0.2, min(u, 1.0 - u));
    vec2 reach = along * (uWick * pitchPx * lod);
    vec4 up = textureLod(uField, (frag + reach) / uResolution, 0.0);
    vec4 down = textureLod(uField, (frag - reach) / uResolution, 0.0);
    vec4 far = up.a > down.a ? up : down;
    if (far.a > acc.a) acc = mix(acc, far, body * smoothstep(0.05, 0.35, far.a));
  }

  // ---- lighting ---------------------------------------------------------
  // The flute profile splits into a lift and a sink around neutral, and both are applied
  // multiplicatively to the premultiplied field. That is the whole reason the panel is
  // invisible over paper: where nothing glows behind the glass there is nothing to modulate,
  // and where the blob does glow the profile carves it into fingers.
  //
  // The depth term then ramps the modulation in with the field, because multiplication alone
  // keeps contrast constant as the glow thins out and the eye reads contrast, not absolute
  // difference. It starts well above zero on purpose: the flutes should only show where the
  // color is strong, so the far end of the falloff stays a clean wash with no structure in it.
  float depth = smoothstep(0.06, 0.55, acc.a);
  float g = softProfile(u, uSoften);
  float lift = max(g - 0.5, 0.0) * 2.0;
  float sink = max(0.5 - g, 0.0) * 2.0;

  // A 2D lighting model, not a 3D normal: n.x is the flute's lateral tilt and n.y stands in
  // for how much it faces the viewer. So uLightAngle near 90 degrees lights each flute crown
  // head-on, and rotating it away slides the highlight off center.
  vec2 n = normalize(rot2(uAngle) * vec2(sn, cs));
  vec2 L = vec2(cos(uLightAngle), sin(uLightAngle));
  float spec = pow(max(dot(n, L), 0.0), uLightSharp) * uLightIntensity;

  // The cursor sharpens the light already on the panel rather than adding one of its own: the
  // same crown highlight at twice the exponent, so ribs near the pointer grow a brighter core.
  // A light with a position cannot work against this n, which only ever faces the viewer, so it
  // lights the fragments to one side of the pointer and none of the others.
  //
  // Gated by a wide read of the field so it only fires where there is glass to see.
  float wide = textureLod(uField, frag / uResolution, 3.0).a;
  float visible = mix(0.1, 1.0, smoothstep(0.02, 0.35, wide));
  float glint = pow(max(dot(n, L), 0.0), uLightSharp * 2.0);
  // Speed gates the whole term, so a parked cursor leaves the panel alone. The ramp tops out
  // well below full speed: an ordinary drag should raise it, not only a flick.
  float wake = smoothstep(0.02, 0.35, uPointerVel);
  float cursorLight = prox * uShimmerGain * glint * visible * wake;

  // The cursor spends most of its strength gathering the field's own color into the crowns
  // rather than adding white, so it reads as glass concentrating light instead of a lamp aimed
  // at the panel. Gather multiplies the field, so the ribs deepen in their own hue.
  float trans =
    mix(1.0, (1.0 - uSeam * sink) * (1.0 + (uGather + 0.5 * cursorLight) * lift), lod * depth);

  // Scaled by the key light, so gain reads as the fraction a crown brightens by under the
  // cursor and the cylinder's motion boost carries through to it.
  float shimmer = cursorLight * uLightIntensity;

  // ---- composite (premultiplied) ---------------------------------------
  vec3 col = mix(acc.rgb, acc.rgb * uTint, uTintAmount) * trans;
  float alpha = acc.a * trans;

  // Highlights are additive white, gated by how much field sits behind this pixel, so the panel
  // does not draw a sheen across bare paper. Every term rides the crown mask, the cursor glint
  // included, so all of them print per-flute ribs and vanish at the joins.
  float light = (spec + uAmbient + uCaustic + shimmer) * lift * lod * depth;
  col += uSpecColor * light;
  alpha += light * uSpecAlpha * (1.0 - alpha);

  // Over bare paper the panel can optionally keep a whisper of its own seams, so it reads as
  // glass rather than as a hole in the page. Off by default: at any strength it prints as
  // ribbing across the whole panel, which is louder than it sounds.
  float paper = uSeam * sink * uPresence * lod * (1.0 - depth);
  alpha += paper * (1.0 - alpha);

  // Dither: a field this soft bands visibly on 8-bit displays without it.
  float d = (hash(frag + fract(uTime)) - 0.5) / 255.0;
  outColor = clamp(vec4(col, alpha) + d, 0.0, 1.0);
}
`;

/**
 * Signed distance functions for the shape layers, plus the feathered coverage
 * function they all funnel through.
 *
 * Distances are approximate for the ellipse family, but the approximation has to hold far
 * from the boundary as well as near it, because the Gaussian tail is what most of the panel
 * sees. An error out there reads as a feather several times wider than the one asked for.
 */
export const SDF_CHUNK = /* glsl */ `
#define KIND_ELLIPSE 0
#define KIND_CIRCLE  1
#define KIND_BAR     2
#define KIND_RING    3
#define KIND_ARC     4

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float sdEllipse(vec2 p, vec2 r) {
  float k1 = length(p / r);
  float k2 = length(p / (r * r));
  // First-order distance to the k1 = 1 level set, which is (k1 - 1) / |grad k1| and
  // |grad k1| = k2 / k1. Dropping that k1 factor costs nothing near the boundary, where it
  // is about 1, but underestimates the distance by a factor of k1 far away, so a feathered
  // eccentric ellipse bleeds many times further than its feather asks for.
  return k2 > 1e-6 ? (k1 - 1.0) * k1 / k2 : -max(min(r.x, r.y), 1e-4);
}

float sdRoundBox(vec2 p, vec2 b, float cr) {
  vec2 d = abs(p) - b + cr;
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - cr;
}

/**
 * Coverage for one shape.
 *
 * - p: pixel position relative to the shape center, already un-rotated.
 * - r: half extents in px.
 * - kind: one of the KIND_ constants.
 * - feather: falloff width in px.
 * - thickness: band width for ring and arc, corner radius for bar, as a fraction of min(r).
 * - span: angular span in radians for arc.
 * - Returns coverage in 0..1, saturated inside the shape.
 */
float shapeCoverage(vec2 p, vec2 r, int kind, float feather, float thickness, float span) {
  float sd;
  float mask = 1.0;
  float minR = max(min(r.x, r.y), 1e-4);

  if (kind == KIND_CIRCLE) {
    sd = length(p) - minR;
  } else if (kind == KIND_BAR) {
    sd = sdRoundBox(p, r, min(thickness * minR, minR));
  } else if (kind == KIND_RING) {
    sd = abs(sdEllipse(p, r)) - thickness * minR;
  } else if (kind == KIND_ARC) {
    sd = abs(sdEllipse(p, r)) - thickness * minR;
    float ang = abs(atan(p.y, p.x));
    float halfSpan = max(span * 0.5, 1e-3);
    mask = 1.0 - smoothstep(halfSpan * 0.72, halfSpan, ang);
  } else {
    sd = sdEllipse(p, r);
  }

  // Gaussian tail rather than smoothstep: a long soft falloff with a saturated core.
  float t = max(sd, 0.0) / max(feather, 1.0);
  return exp(-t * t) * mask;
}
`;

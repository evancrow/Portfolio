import { SDF_CHUNK } from "./sdf.glsl";

/**
 * Pass 1. Composites the shape layers back to front into a premultiplied field,
 * rendered at a fraction of the display resolution since the result is smooth.
 *
 * Geometry arrives in field-texture pixels with the GL origin at bottom left.
 * `SHAPE_COUNT` is injected as a compile-time define.
 */
export const FIELD_FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec4 uGeom[SHAPE_COUNT];    // center.xy, radius.xy
uniform vec4 uColor[SHAPE_COUNT];   // rgb, opacity
uniform vec4 uParams[SHAPE_COUNT];  // kind, feather, rotation, thickness
uniform vec4 uExtra[SHAPE_COUNT];   // span, unused...

out vec4 outColor;

${SDF_CHUNK}

void main() {
  vec2 p = gl_FragCoord.xy;
  vec4 acc = vec4(0.0);

  for (int i = 0; i < SHAPE_COUNT; i++) {
    vec2 local = rot2(-uParams[i].z) * (p - uGeom[i].xy);
    float a = shapeCoverage(
      local,
      uGeom[i].zw,
      int(uParams[i].x + 0.5),
      uParams[i].y,
      uParams[i].w,
      uExtra[i].x
    ) * uColor[i].a;

    // Premultiplied source-over.
    acc.rgb = acc.rgb * (1.0 - a) + uColor[i].rgb * a;
    acc.a = acc.a * (1.0 - a) + a;
  }

  outColor = acc;
}
`;

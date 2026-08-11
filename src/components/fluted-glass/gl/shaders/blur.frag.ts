/**
 * Pass 2. Separable 9-tap Gaussian over the field, run once per axis.
 *
 * Its job is small but real: at a low `fieldScale`, bilinear upsampling of a shape edge
 * can show faint faceting, and a couple of texels of blur removes it.
 */
export const BLUR_FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uSrc;
uniform vec2 uTexel;   // 1 / field size
uniform vec2 uDir;     // (1,0) or (0,1)
uniform float uRadius; // in texels

out vec4 outColor;

const float W[5] = float[5](0.2270270, 0.1945946, 0.1216216, 0.0540541, 0.0162162);

void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 stride = uDir * uTexel * uRadius;

  vec4 sum = textureLod(uSrc, uv, 0.0) * W[0];
  for (int i = 1; i < 5; i++) {
    vec2 o = stride * float(i);
    sum += textureLod(uSrc, uv + o, 0.0) * W[i];
    sum += textureLod(uSrc, uv - o, 0.0) * W[i];
  }
  outColor = sum;
}
`;

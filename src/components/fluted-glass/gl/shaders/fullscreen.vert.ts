/**
 * Fullscreen triangle, one oversized triangle covering the viewport.
 *
 * Positions come from a static 24-byte attribute buffer rather than a `gl_VertexID` bit
 * trick. Same cost, and it reads as ordinary GL.
 */
export const FULLSCREEN_VERT = /* glsl */ `#version 300 es
precision highp float;

in vec2 aPos;

void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/** Bound to location 0 before linking, rather than with a `layout` qualifier. */
export const FULLSCREEN_ATTRIB = "aPos";

/** The three clip-space corners, uploaded once. */
export const FULLSCREEN_TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);

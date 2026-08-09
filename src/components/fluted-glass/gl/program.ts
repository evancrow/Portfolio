/** Minimal WebGL2 helpers: program compilation, uniform setters, and a fullscreen triangle. */

import { FULLSCREEN_ATTRIB } from "./shaders/fullscreen.vert";

export type UniformSetters = Record<string, (value: number | number[] | Float32Array) => void>;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) || "(empty info log)";
    gl.deleteShader(sh);
    const stage = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
    const numbered = src
      .split("\n")
      .map((line, i) => `${String(i + 1).padStart(3)} | ${line}`)
      .join("\n");
    throw new Error(`${stage} shader compile failed: ${log}\n${numbered}`);
  }
  return sh;
}

/**
 * Builds a program, injecting `#define` lines after the `#version` directive.
 *
 * - `defines`: compile-time constants such as `SHAPE_COUNT`, which must be literals in GLSL.
 * - Returns the linked program.
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string,
  defines: Record<string, number | string> = {},
): WebGLProgram {
  const header = Object.entries(defines)
    .map(([k, v]) => `#define ${k} ${v}`)
    .join("\n");
  const inject = (src: string) =>
    header ? src.replace(/^(#version[^\n]*\n)/, `$1${header}\n`) : src;

  const vs = compile(gl, gl.VERTEX_SHADER, inject(vertSrc));
  const fs = compile(gl, gl.FRAGMENT_SHADER, inject(fragSrc));
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, FULLSCREEN_ATTRIB);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown";
    gl.deleteProgram(program);
    throw new Error(`program link failed: ${log}`);
  }
  return program;
}

/**
 * Enumerates active uniforms once and returns a name-keyed setter map, so per-frame
 * updates skip both the location lookup and the type dispatch.
 *
 * - Array uniforms are keyed by their bare name, without the `[0]` suffix.
 * - Returns setters that accept a number for scalars and an array for vectors.
 */
export function createUniformSetters(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
): UniformSetters {
  const setters: UniformSetters = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;

  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (!info) continue;
    const name = info.name.replace(/\[0\]$/, "");
    const loc = gl.getUniformLocation(program, info.name);
    if (!loc) continue;

    switch (info.type) {
      case gl.FLOAT:
        setters[name] = (v) =>
          typeof v === "number" ? gl.uniform1f(loc, v) : gl.uniform1fv(loc, v);
        break;
      case gl.FLOAT_VEC2:
        setters[name] = (v) => gl.uniform2fv(loc, v as Float32Array);
        break;
      case gl.FLOAT_VEC3:
        setters[name] = (v) => gl.uniform3fv(loc, v as Float32Array);
        break;
      case gl.FLOAT_VEC4:
        setters[name] = (v) => gl.uniform4fv(loc, v as Float32Array);
        break;
      case gl.INT:
      case gl.BOOL:
      case gl.SAMPLER_2D:
        setters[name] = (v) =>
          typeof v === "number" ? gl.uniform1i(loc, v) : gl.uniform1iv(loc, v as number[]);
        break;
      default:
        break;
    }
  }
  return setters;
}

/** A color texture plus its framebuffer, used for the offscreen field passes. */
export type RenderTarget = {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
};

export function createRenderTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  mipmapped: boolean,
): RenderTarget {
  // Immutable storage rejects more levels than the size supports, which small panels hit.
  const levels = mipmapped
    ? Math.min(5, Math.floor(Math.log2(Math.max(width, height))) + 1)
    : 1;
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, width, height);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    levels > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const framebuffer = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { texture, framebuffer, width, height };
}

export function disposeRenderTarget(gl: WebGL2RenderingContext, rt: RenderTarget) {
  gl.deleteFramebuffer(rt.framebuffer);
  gl.deleteTexture(rt.texture);
}

import {
  createProgram,
  createRenderTarget,
  createUniformSetters,
  disposeRenderTarget,
  type RenderTarget,
  type UniformSetters,
} from "./program";
import { BLUR_FRAG } from "./shaders/blur.frag";
import { FIELD_FRAG } from "./shaders/field.frag";
import { FULLSCREEN_TRIANGLE, FULLSCREEN_VERT } from "./shaders/fullscreen.vert";
import { GLASS_FRAG } from "./shaders/glass.frag";
import { cylinderRadius, fluteExtent } from "../cylinder";
import { SHAPE_KIND_ID, type ResolvedConfig } from "../types";

/** Everything the renderer needs for one frame. Positions are in CSS px or 0..1 container units. */
export type FrameState = {
  config: ResolvedConfig;
  /** Animated shape centers as x,y pairs in 0..1 container space, y measured downward. */
  centers: Float32Array;
  /** Animated shape colors as rgba quads, easing toward the config's own values so a palette
   *  change grades across rather than cutting on one frame. */
  colors: Float32Array;
  /** Pointer in CSS px relative to the container, y measured downward. The glint's own lightly
   * eased position, not the shape spring, so the highlight sits under the cursor. */
  pointerX: number;
  pointerY: number;
  /** Normalized pointer speed, 0..1. */
  pointerVel: number;
  /** Eased 0..1 presence, so entering and leaving fades rather than snaps. */
  pointerIn: number;
  /** Cylinder rotation in radians. */
  cylRot: number;
  /** Extra specular while the cylinder turns, so the glass catches light in motion. */
  lightBoost: number;
  /** Vertical reveal, 0..1. Scales every shape's height and its distance above the panel's bottom
   *  edge, so at a half it is that field at half the size growing out of that edge.
   *  Rationale: docs/fluted-glass-rendering.md § FrameState.reveal */
  reveal: number;
  /** Seconds since mount. */
  time: number;
};

type ProgramEntry = { program: WebGLProgram; u: UniformSetters };

/** Reveal below which the field fades as well as shrinking, so the last of a reveal dissolves
 *  rather than sitting as a hairline on the bottom edge.
 *  Rationale: docs/fluted-glass-rendering.md § REVEAL_FADE */
const REVEAL_FADE = 0.6;

/** How the feather shrinks against the shape it belongs to — under 1, so a shallow reveal is
 *  proportionally softer rather than a scale model with a crisp edge.
 *  Rationale: docs/fluted-glass-rendering.md § FEATHER_EASE */
const FEATHER_EASE = 0.75;

/** Hermite ramp from 0 to `edge`, flat at both ends so neither the appearance nor the disappearance
 *  has a corner in it. */
function smoothstep(edge: number, v: number): number {
  const t = v <= 0 ? 0 : v >= edge ? 1 : v / edge;
  return t * t * (3 - 2 * t);
}

/** Three-pass fluted glass renderer: composite the field, blur it, then refract/light it per flute.
 *  Rationale: docs/fluted-glass-rendering.md § Three-pass architecture */
export class GlassRenderer {
  private gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject;
  private quad: WebGLBuffer;
  private fieldPrograms = new Map<number, ProgramEntry>();
  private glassPrograms = new Map<number, ProgramEntry>();
  private blurProgram: ProgramEntry;
  private targetA: RenderTarget | null = null;
  private targetB: RenderTarget | null = null;

  private geom = new Float32Array(0);
  private params = new Float32Array(0);
  private extra = new Float32Array(0);
  private colors = new Float32Array(0);
  private vec2 = new Float32Array(2);
  private vec3 = new Float32Array(3);
  private axis = new Float32Array(2);

  width = 0;
  height = 0;
  dpr = 1;
  private fieldScale = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("webgl2 unavailable");
    this.gl = gl;
    this.vao = gl.createVertexArray()!;
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    // The triangle lives in the VAO, so every pass is bind-VAO then draw.
    this.quad = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const program = createProgram(gl, FULLSCREEN_VERT, BLUR_FRAG);
    this.blurProgram = { program, u: createUniformSetters(gl, program) };
  }

  private fieldProgram(shapeCount: number): ProgramEntry {
    let entry = this.fieldPrograms.get(shapeCount);
    if (!entry) {
      const program = createProgram(this.gl, FULLSCREEN_VERT, FIELD_FRAG, {
        SHAPE_COUNT: Math.max(shapeCount, 1),
      });
      entry = { program, u: createUniformSetters(this.gl, program) };
      this.fieldPrograms.set(shapeCount, entry);
    }
    return entry;
  }

  private glassProgram(taps: number): ProgramEntry {
    let entry = this.glassPrograms.get(taps);
    if (!entry) {
      const program = createProgram(this.gl, FULLSCREEN_VERT, GLASS_FRAG, {
        TAPS: taps,
      });
      entry = { program, u: createUniformSetters(this.gl, program) };
      this.glassPrograms.set(taps, entry);
    }
    return entry;
  }

  /**
   * Sizes the canvas and the offscreen targets.
   *
   * - cssWidth / cssHeight: container size in CSS px.
   * - dpr: already clamped to the quality ceiling.
   * - fieldScale: offscreen field resolution relative to the canvas.
   */
  resize(cssWidth: number, cssHeight: number, dpr: number, fieldScale: number) {
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    // Always current, even when the pixel size happens to land on the same value.
    this.dpr = dpr;
    if (w === this.width && h === this.height && fieldScale === this.fieldScale) return;

    this.width = w;
    this.height = h;
    this.fieldScale = fieldScale;
    this.gl.canvas.width = w;
    this.gl.canvas.height = h;

    const fw = Math.max(8, Math.round(w * fieldScale));
    const fh = Math.max(8, Math.round(h * fieldScale));
    if (this.targetA) disposeRenderTarget(this.gl, this.targetA);
    if (this.targetB) disposeRenderTarget(this.gl, this.targetB);
    this.targetA = createRenderTarget(this.gl, fw, fh, true);
    this.targetB = createRenderTarget(this.gl, fw, fh, false);
  }

  render(state: FrameState) {
    const gl = this.gl;
    const { config } = state;
    const A = this.targetA;
    const B = this.targetB;
    if (!A || !B || this.width === 0) return;

    gl.bindVertexArray(this.vao);
    this.renderField(state, A);
    this.blurField(config.quality.fieldSmoothing, A, B);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, A.texture);
    gl.generateMipmap(gl.TEXTURE_2D);

    this.renderGlass(state, A);
    gl.bindVertexArray(null);
  }

  private renderField(state: FrameState, target: RenderTarget) {
    const gl = this.gl;
    const shapes = state.config.shapes;
    const count = shapes.length;
    const { width: fw, height: fh } = target;

    // Drop the previous frame's binding so this target is never sampled and drawn at once.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, fw, fh);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (count === 0) return;
    // Shut. Not a very small field: the shapes' crests are parked on the bottom edge, so a floor of
    // half a texel on the height would leave a hairline of colour along it at rest.
    const reveal = state.reveal;
    if (reveal <= 0) return;

    if (this.geom.length !== count * 4) {
      this.geom = new Float32Array(count * 4);
      this.params = new Float32Array(count * 4);
      this.extra = new Float32Array(count * 4);
      this.colors = new Float32Array(count * 4);
    }

    const fade = smoothstep(REVEAL_FADE, reveal);

    for (let i = 0; i < count; i++) {
      const s = shapes[i];
      const o = i * 4;
      // Container space has y down, GL has y up. Which is why the reveal is one multiply here: in
      // this space the panel's bottom edge is the origin, so scaling toward it is scaling y.
      this.geom[o] = state.centers[i * 2] * fw;
      this.geom[o + 1] = (1 - state.centers[i * 2 + 1]) * reveal * fh;
      this.geom[o + 2] = Math.max(s.w * 0.5 * fw, 0.5);
      this.geom[o + 3] = Math.max(s.h * reveal * 0.5 * fh, 0.5);

      this.colors[o] = state.colors[o];
      this.colors[o + 1] = state.colors[o + 1];
      this.colors[o + 2] = state.colors[o + 2];
      this.colors[o + 3] = state.colors[o + 3] * fade;

      this.params[o] = SHAPE_KIND_ID[s.kind];
      this.params[o + 1] = Math.max(s.blur * reveal ** FEATHER_EASE * fh, 1);
      this.params[o + 2] = s.rotate;
      this.params[o + 3] = s.thickness;

      this.extra[o] = s.span;
    }

    const { program, u } = this.fieldProgram(count);
    gl.useProgram(program);
    u.uGeom?.(this.geom);
    // The frame state's own eased colors, which are what is on screen rather than what the config is
    // travelling toward, with the reveal's fade carried on the alpha.
    u.uColor?.(this.colors);
    u.uParams?.(this.params);
    u.uExtra?.(this.extra);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private blurField(radius: number, A: RenderTarget, B: RenderTarget) {
    if (radius <= 0) return;
    const gl = this.gl;
    const { program, u } = this.blurProgram;
    gl.useProgram(program);
    gl.viewport(0, 0, A.width, A.height);
    this.vec2[0] = 1 / A.width;
    this.vec2[1] = 1 / A.height;
    u.uTexel?.(this.vec2);
    u.uRadius?.(radius);
    u.uSrc?.(0);
    gl.activeTexture(gl.TEXTURE0);

    const axis = this.axis;
    // Horizontal into B, then vertical back into A.
    for (const [src, dst, dx, dy] of [
      [A, B, 1, 0],
      [B, A, 0, 1],
    ] as const) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.framebuffer);
      gl.bindTexture(gl.TEXTURE_2D, src.texture);
      axis[0] = dx;
      axis[1] = dy;
      u.uDir?.(axis);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  private renderGlass(state: FrameState, field: RenderTarget) {
    const gl = this.gl;
    const { glass, light, interaction, quality } = state.config;
    const dpr = this.dpr;
    const { program, u } = this.glassProgram(quality.taps);

    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, field.texture);
    u.uField?.(0);

    this.vec2[0] = this.width;
    this.vec2[1] = this.height;
    u.uResolution?.(this.vec2);
    u.uTime?.(state.time);

    const extent = fluteExtent(glass.orientation, this.width, this.height);

    u.uCurved?.(glass.curve ? 1 : 0);
    u.uAngle?.(glass.orientation);
    u.uPitch?.(Math.max(glass.flutes > 0 ? extent / glass.flutes : glass.pitch * dpr, 1));
    u.uRoundness?.(glass.roundness);
    u.uIor?.(glass.ior);
    u.uThickness?.(glass.thickness * dpr);
    u.uDispersion?.(glass.dispersion);
    u.uBlur?.(glass.blur);
    u.uSoften?.(glass.soften);
    u.uVariance?.(glass.variance);
    u.uWick?.(glass.wick);
    u.uSeam?.(glass.seam);
    u.uGather?.(glass.gather);
    u.uPresence?.(glass.presence);
    u.uTintAmount?.(glass.tintAmount);
    this.vec3.set(glass.tintRgb);
    u.uTint?.(this.vec3);

    // Only a curved sheet reads any of these, and the radius is a square root and two trig calls
    // per frame. A flat panel used to pay for all three every frame and throw the result away.
    if (glass.curve) {
      u.uCylRadius?.(
        cylinderRadius(glass.orientation, this.width, this.height, glass.curve.rimAngle),
      );
      u.uCylRot?.(state.cylRot);
      u.uEdgeFade?.(glass.curve.edgeFade);
    }

    u.uLightAngle?.(light.angle);
    u.uLightIntensity?.(light.intensity * (1 + state.lightBoost));
    u.uLightSharp?.(Math.max(light.sharpness, 0.1));
    u.uAmbient?.(light.ambient);
    u.uSpecAlpha?.(light.specAlpha);
    u.uCaustic?.(light.caustic);
    this.vec3.set(light.specRgb);
    u.uSpecColor?.(this.vec3);

    this.vec2[0] = state.pointerX * dpr;
    this.vec2[1] = this.height - state.pointerY * dpr;
    u.uPointer?.(this.vec2);
    u.uPointerVel?.(state.pointerVel);
    u.uPointerIn?.(interaction.disabled ? 0 : state.pointerIn);
    u.uShimmerRadius?.(interaction.shimmer.radius * dpr);
    u.uShimmerGain?.(interaction.disabled ? 0 : interaction.shimmer.gain);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Deletes every GL object this renderer owns. Deliberately does not force context loss.
   *  Rationale: docs/fluted-glass-rendering.md § dispose() and context loss */
  dispose() {
    const gl = this.gl;
    for (const { program } of this.fieldPrograms.values()) gl.deleteProgram(program);
    for (const { program } of this.glassPrograms.values()) gl.deleteProgram(program);
    gl.deleteProgram(this.blurProgram.program);
    this.fieldPrograms.clear();
    this.glassPrograms.clear();
    if (this.targetA) disposeRenderTarget(gl, this.targetA);
    if (this.targetB) disposeRenderTarget(gl, this.targetB);
    this.targetA = null;
    this.targetB = null;
    gl.deleteBuffer(this.quad);
    gl.deleteVertexArray(this.vao);
  }
}

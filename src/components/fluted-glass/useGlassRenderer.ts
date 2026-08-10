"use client";

import { useEffect, useState, type RefObject } from "react";
import { cylinderAnchor } from "./cylinder";
import { GlassRenderer, type FrameState } from "./gl/passes";
import { spring, stepSpring, expEase, type Spring } from "./spring";
import { PointerMotion, usePointerTracker } from "./usePointerSpring";
import { RotationMotion } from "./useScrollRotation";
import type { ResolvedConfig } from "./types";

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Rate the shape colors ease at, in e-folds per second. Lands in around a third of a second: slow
 * enough that the panel reads as grading from one colour to the next rather than being swapped, and
 * short enough that it is settled by the time the eye has finished arriving anywhere.
 *
 * An ease rather than a spring, because a colour that overshoots leaves the panel and goes
 * somewhere that is not in the palette at all on the way past.
 */
const COLOR_RATE = 9;

/** Half an 8-bit step. A channel this close to its target cannot change a pixel, so the loop is
 *  free to park rather than easing out a tail nothing can see. */
const COLOR_EPSILON = 1 / 512;

/**
 * Owns the WebGL renderer and the animation loop.
 *
 * Reads the container rect once per frame and shares it between pointer mapping and scroll
 * progress, so there is exactly one layout read per frame. Config is consumed through a ref,
 * so changing props pushes new uniforms without tearing down the GL context.
 *
 * - hostRef: the positioned container.
 * - canvasRef: the canvas filling it.
 * - configRef: resolved config, updated by the component on every render.
 * - revealRef: optional 0..1 vertical reveal, read every frame. A ref rather than a prop, so a
 *   caller animating it per frame does not put the tree through sixty renders a second.
 * - scrollProgressRef: optional 0..1 scroll progress for a curved sheet whose
 *   `glass.curve.scrollSource` is `"external"` — same ref-not-prop reasoning as `revealRef`.
 * - Returns whether the renderer is unavailable (WebGL2 missing or context creation failed),
 *   so the caller can show a static fallback in place of the canvas.
 */
export function useGlassRenderer(
  hostRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  configRef: RefObject<ResolvedConfig>,
  revealRef?: RefObject<number>,
  scrollProgressRef?: RefObject<number>,
): boolean {
  const tracker = usePointerTracker();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let renderer: GlassRenderer | null = null;
    try {
      renderer = new GlassRenderer(canvas);
    } catch (err) {
      // The panel stays transparent and children render normally, but never silently: a
      // blank panel with a clean console is the hardest possible thing to diagnose.
      console.error("[FlutedGlass] renderer unavailable", err);
      // WebGL2 support can only be discovered by trying to create the context against the
      // mounted canvas, so this genuinely isn't known until the first effect run.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnavailable(true);
      return;
    }

    const pointer = new PointerMotion();
    const rotation = new RotationMotion();
    let springs: { x: Spring; y: Spring }[] = [];
    let centers = new Float32Array(0);
    let colors = new Float32Array(0);

    let raf = 0;
    let running = false;
    let visible = true;
    let dirty = true;
    let failed = false;
    let restFrames = 0;
    let lastConfig: ResolvedConfig | null = null;
    let lastTime = 0;
    const start = performance.now();

    const state: FrameState = {
      config: configRef.current!,
      centers,
      colors,
      pointerX: 0,
      pointerY: 0,
      pointerVel: 0,
      pointerIn: 0,
      cylRot: 0,
      lightBoost: 0,
      reveal: 1,
      time: 0,
    };

    const syncSprings = (config: ResolvedConfig) => {
      if (springs.length === config.shapes.length) return;
      springs = config.shapes.map((s) => ({ x: spring(s.x), y: spring(s.y) }));
      centers = new Float32Array(config.shapes.length * 2);
      colors = new Float32Array(config.shapes.length * 4);
      // Seeded from the config rather than left at zero, or the panel would ease up out of black on
      // its first frame, and again every time the shape count changed under it.
      for (let i = 0; i < config.shapes.length; i++) {
        const s = config.shapes[i];
        const o = i * 4;
        colors[o] = s.rgb[0];
        colors[o + 1] = s.rgb[1];
        colors[o + 2] = s.rgb[2];
        colors[o + 3] = s.opacity;
      }
      state.centers = centers;
      state.colors = colors;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!renderer) return;

      const config = configRef.current!;
      if (config !== lastConfig) {
        lastConfig = config;
        dirty = true;
      }
      syncSprings(config);

      const dt = clamp((now - (lastTime || now)) / 1000, 1 / 240, 1 / 20);
      lastTime = now;
      const time = (now - start) / 1000;

      const rect = host.getBoundingClientRect();
      // A collapsed panel has nothing to draw, and resizing to it would reallocate both render
      // targets down and then straight back up again on the next real frame.
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, config.quality.maxDpr);
      // Layout geometry, not the rect. The panels can sit inside a box a scroll timeline is
      // transforming, and a rect reports the transformed box: interpolating that transform leaves
      // ten-thousandths of a pixel of noise on the height, which measures as 894.0000 / 894.0001 /
      // 893.9999 from one frame to the next. `resize` reallocates both field targets on any change at
      // all and hands back cleared ones, so that noise was tearing down and rebuilding the field
      // mid-scroll and the glass visibly jumped. Offsets ignore transforms and hold still.
      //
      // Both dimensions, because either one reallocates. A height-only resize is what a URL bar
      // collapse or a rotation is, so watching width alone parks the loop three frames later on an
      // empty field.
      const beforeW = renderer.width;
      const beforeH = renderer.height;
      renderer.resize(host.offsetWidth, host.offsetHeight, dpr, config.quality.fieldScale);
      if (renderer.width !== beforeW || renderer.height !== beforeH) dirty = true;

      pointer.step(
        rect,
        tracker.current,
        config.interaction.reach,
        config.interaction.stiffness,
        config.interaction.zeta,
        dt,
      );

      const nx = rect.width > 0 ? pointer.x.value / rect.width : 0.5;
      const ny = rect.height > 0 ? pointer.y.value / rect.height : 0.5;

      let springsMoving = false;
      let driftActive = false;
      let colorsMoving = false;
      for (let i = 0; i < config.shapes.length; i++) {
        const s = config.shapes[i];
        if (s.drift.amp > 0) driftActive = true;

        const wobbleX = Math.sin(time * s.drift.speed * TAU) * s.drift.amp;
        const wobbleY = Math.cos(time * s.drift.speed * TAU * 0.73) * s.drift.amp * 0.6;
        const pull = config.interaction.disabled ? 0 : s.pull * pointer.presence;
        // The pointer can only ever be half a panel away horizontally, but a layer centered
        // off the panel is further than that vertically everywhere, and always to the same
        // side, so an equal factor both swings it harder in y and leans it permanently off
        // its base instead of either side of it.
        const pullY = pull * config.interaction.pullY;

        // Layers with more pull also track more tightly, which reads as sitting closer
        // to the glass and gives the stack depth.
        const k = config.interaction.stiffness * clamp(0.35 + s.pull * 2.5, 0.35, 1.4);
        stepSpring(springs[i].x, s.x + wobbleX + (nx - s.x) * pull, k, config.interaction.zeta, dt);
        stepSpring(
          springs[i].y,
          s.y + wobbleY + (ny - s.y) * pullY,
          k,
          config.interaction.zeta,
          dt,
        );

        centers[i * 2] = springs[i].x.value;
        centers[i * 2 + 1] = springs[i].y.value;
        if (Math.abs(springs[i].x.velocity) > 1e-4 || Math.abs(springs[i].y.velocity) > 1e-4) {
          springsMoving = true;
        }

        // Colour is something the layer travels to rather than something it is set to, so swapping a
        // palette grades across instead of cutting. Unrolled and written in place, because this loop
        // runs every frame and allocates nothing anywhere else in it.
        const o = i * 4;
        if (
          Math.abs(colors[o] - s.rgb[0]) > COLOR_EPSILON ||
          Math.abs(colors[o + 1] - s.rgb[1]) > COLOR_EPSILON ||
          Math.abs(colors[o + 2] - s.rgb[2]) > COLOR_EPSILON ||
          Math.abs(colors[o + 3] - s.opacity) > COLOR_EPSILON
        ) {
          colorsMoving = true;
        }
        colors[o] = expEase(colors[o], s.rgb[0], COLOR_RATE, dt);
        colors[o + 1] = expEase(colors[o + 1], s.rgb[1], COLOR_RATE, dt);
        colors[o + 2] = expEase(colors[o + 2], s.rgb[2], COLOR_RATE, dt);
        colors[o + 3] = expEase(colors[o + 3], s.opacity, COLOR_RATE, dt);
      }

      // Null on a flat sheet, where there is no cylinder to roll and none of this runs.
      const curve = config.glass.curve;
      // The cylinder angle under the cursor, so the flutes are anchored to it rather than pushed
      // by it. Raw target rather than the smoothed spring value: the rotation spring downstream
      // supplies the feel, and two of them in series lag far enough to read as broken for
      // something that claims to be attached to the cursor. A null anchor holds the last angle.
      const live = !config.interaction.disabled && pointer.near;
      const anchor =
        curve && live
          ? cylinderAnchor(config.glass, curve, rect, pointer.targetX, pointer.targetY)
          : null;
      const externalProgress = scrollProgressRef?.current ?? null;
      state.cylRot = curve
        ? rotation.step(curve, config.interaction, rect, anchor, dt, externalProgress)
        : 0;
      state.lightBoost = curve ? rotation.velocity * 0.6 : 0;

      state.config = config;
      // The glint's own eased position, not the shape spring, which trails by nearly two hundred
      // pixels at speed and reads as a light dragged along behind the pointer. The shape pull
      // above keeps the spring, where the lag is the point.
      state.pointerX = pointer.lightX;
      state.pointerY = pointer.lightY;
      // Press folds into presence and speed rather than into the shader, because uPointerIn
      // already scales the glint and its lens swell together, and the shape pull reads presence
      // directly so it keeps following a hovering cursor either way.
      //
      // In press mode the speed gate is pinned open and the press does all the gating, so a
      // finger held still still lights the glass. Leaving it in would mean holding down and
      // stopping killed the effect, which is not what a press is asking for.
      const onPress = config.interaction.shimmer.onPress;
      state.pointerVel = onPress ? 1 : pointer.velocity;
      state.pointerIn = onPress ? pointer.presence * pointer.press : pointer.presence;
      state.time = time;

      // Nothing else here knows this moved, so it has to say so itself or the idle cutoff below
      // parks the loop mid-reveal and the field freezes at whatever height it last drew.
      const reveal = clamp(revealRef?.current ?? 1, 0, 1);
      if (reveal !== state.reveal) {
        state.reveal = reveal;
        dirty = true;
      }

      const busy =
        pointer.moving ||
        springsMoving ||
        driftActive ||
        colorsMoving ||
        (curve != null && rotation.moving);
      if (busy || dirty) restFrames = 0;
      else restFrames++;
      dirty = false;

      if (restFrames < 3 && !failed) {
        try {
          renderer.render(state);
        } catch (err) {
          // The field and glass programs compile on first use, so a failure lands here.
          // Report it once and stop, rather than throwing every frame.
          console.error("[FlutedGlass] render failed", err);
          failed = true;
        }
      }
    };

    const play = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      lastTime = 0;
      // Only a real resume gets here, since this returns early while already running, so the
      // resize path below cannot snap the rotation mid-drag.
      rotation.resync();
      raf = requestAnimationFrame(frame);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const ro = new ResizeObserver(() => {
      dirty = true;
      restFrames = 0;
      play();
    });
    ro.observe(host);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) play();
        else pause();
      },
      { rootMargin: "15%" },
    );
    io.observe(host);

    const onVisibility = () => (document.hidden ? pause() : play());
    document.addEventListener("visibilitychange", onVisibility);

    const onLost = (e: Event) => {
      e.preventDefault();
      pause();
      renderer = null;
    };
    const onRestored = () => {
      try {
        renderer = new GlassRenderer(canvas);
        dirty = true;
        setUnavailable(false);
        play();
      } catch {
        renderer = null;
        setUnavailable(true);
      }
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    play();

    return () => {
      pause();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      renderer?.dispose();
      renderer = null;
    };
  }, [hostRef, canvasRef, configRef, revealRef, scrollProgressRef, tracker]);

  return unavailable;
}

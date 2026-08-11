"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGlassRenderer } from "./useGlassRenderer";
import { resolveConfig, type FlutedGlassProps, type ResolvedConfig } from "./types";

/**
 * Fluted glass panel.
 *
 * Renders a stack of soft shape layers, refracts them through a field of cylindrical
 * flutes, and lays `children` crisply on top. The flutes are near-invisible over a plain
 * light background and only reveal themselves where a shape glows behind them.
 *
 * - Sizing comes entirely from `className`, so the panel is a normal layout box.
 * - Every visual prop is a uniform, so changing them is free and never remounts the context.
 * - The root always carries `relative` (needed to anchor the canvas), which beats a caller's
 *   own `absolute` in Tailwind's cascade order. To position the panel itself, wrap it in a
 *   positioned host and size `FlutedGlass` to fill that wrapper — never pass `absolute` in
 *   `className` directly, it will silently lose to `relative` and the panel falls into flow.
 */
export function FlutedGlass({
  className,
  style,
  children,
  background,
  fallback,
  shapes,
  glass,
  light,
  interaction,
  quality,
  reveal,
  scrollProgress,
}: FlutedGlassProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const config = useMemo(
    () => resolveConfig({ shapes, glass, light, interaction, quality }),
    [shapes, glass, light, interaction, quality],
  );

  const configRef = useRef<ResolvedConfig>(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const unavailable = useGlassRenderer(hostRef, canvasRef, configRef, reveal, scrollProgress);

  return (
    <div
      ref={hostRef}
      className={["relative isolate overflow-hidden", className].filter(Boolean).join(" ")}
      style={{ background, ...style }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 block h-full w-full"
      />
      {unavailable && fallback && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: fallback }}
          aria-hidden="true"
        />
      )}
      {children != null && <div className="relative h-full w-full">{children}</div>}
    </div>
  );
}

"use client";

/**
 * Rescales a preset's field for a panel that runs past the bottom of the screen, and gives it a little
 * more height on a phone.
 *
 * Two separate jobs, in that order.
 *
 * The first is not a taste decision at all, it is arithmetic. Every shape is written in fractions of
 * the panel: the hero's crest sits at `y: 1.11`, a tenth of a panel below its bottom edge, and its
 * feather is `0.075` of one. The pinned panels now carry `--bleed` of overhang behind the URL bar, so
 * the panel those fractions resolve against is taller than the frame the preset was drawn for, and the
 * whole field slides down and spreads out with it: the crest ends up a quarter of a screen below the
 * fold instead of a tenth, and what is left in frame is the pale tail of the band. Multiplying the
 * geometry by the viewport's share of the panel puts every shape back at the same absolute distance
 * from the top edge it had before, so the composition is the one that was tuned and the overhang is
 * extra field below it rather than a stretch of the same field.
 *
 * The second is the taste one: on a phone the band reads shallow, since it is sized in fractions of a
 * frame that is now portrait, so the field runs taller there than the mock's.
 */

import { useEffect, useState } from "react";
import type { GlassShape } from "./types";

/** The touch layout. Only gates the taste knob (`grow`/`feather`) below — `keep` is measured, not
 *  matched to a device class, so it can never disagree with how tall the panel actually is. */
const TOUCH = "(hover: none) and (pointer: coarse)";

/** How much taller the band runs on a phone, and how much of that the feather takes. Under the height,
 *  so a taller band is a little more defined rather than only more diffuse. */
const GROW = 1.3;
const GROW_FEATHER = 1.15;

/** The panel's overhang and one viewport, in px. Both are CSS, so both are measured rather than
 *  assumed, and both move when the window does. */
function measure() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;height:100vh";
  document.body.appendChild(probe);
  const vh = probe.offsetHeight;
  probe.remove();
  const bleed =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bleed")) || 0;
  // The viewport's share of the panel. 1 wherever there is no overhang, which is every desktop.
  return vh > 0 ? vh / (vh + bleed) : 1;
}

export function useTouchField(shapes: GlassShape[]): GlassShape[] {
  const [{ keep, touch }, setState] = useState({ keep: 1, touch: false });

  useEffect(() => {
    const mq = window.matchMedia(TOUCH);
    // `measure()` appends a probe to the body to read `100vh` — a forced layout. iOS fires
    // `resize` all through a scroll as the URL bar folds, and none of those change the viewport's
    // width, so gating the probe on a real width change is what keeps this free during a scroll
    // instead of adding a forced layout to every one of those events, same fix as `layout.tsx`'s
    // `MEASURE_BLEED` and the stage components' own `range()`.
    let lastWidth = window.innerWidth;

    const sync = (force: boolean) => {
      const width = window.innerWidth;
      const widthChanged = width !== lastWidth;
      lastWidth = width;
      if (!force && !widthChanged) return;
      const next = { keep: measure(), touch: mq.matches };
      // Same numbers, same object, or every resize is a new array and the renderer rebuilds its
      // springs for a field that did not move.
      setState((prev) =>
        Math.abs(prev.keep - next.keep) < 1e-4 && prev.touch === next.touch ? prev : next,
      );
    };

    sync(true);
    const onChange = () => sync(true);
    const onResize = () => sync(false);
    mq.addEventListener("change", onChange);
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const grow = touch ? GROW : 1;
  const feather = touch ? GROW_FEATHER : 1;
  if (keep === 1 && grow === 1) return shapes;

  return shapes.map((s) => ({
    ...s,
    // `y` alone takes no `grow`: the crest stays where the preset put it and the band grows around it,
    // which for a crest parked below the edge means it grows into frame.
    y: s.y * keep,
    w: s.w,
    h: s.h * keep * grow,
    blur: (s.blur ?? 0) * keep * feather,
    // Drift exists to make an idle panel breathe for a cursor that's resting on it. There is no
    // cursor on a touch device, and while scrolling the wobble is invisible under the motion
    // anyway — but it still counts as `busy` in the render loop and holds the shader open every
    // frame for as long as the panel is on screen. Zeroing it here is what lets the hero's loop
    // (which has no scroll-driven `curve` to also hold it busy) actually park while scrolling.
    ...(touch ? { drift: { amp: 0, speed: 0 } } : null),
  }));
}

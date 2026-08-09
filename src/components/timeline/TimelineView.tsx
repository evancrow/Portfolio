"use client";

/**
 * The Timeline's real content, mounted by `Timeline.tsx` once its dissolve transition is under
 * way. The model is two numbers, held in refs and written imperatively so panning never costs a
 * React render: `centerRef` (the date at the vertical center of the view — the cursor) and
 * `pxPerMonthRef` (pixels per month, `BASE_PX_PER_MONTH * zoom`). `useTimelineWindow` owns the
 * cursor's bounded elastic pan; `useTimelineZoom` owns the continuous zoom. Both funnel into
 * `renderFrame`, the one function that writes every mounted flute's `transform`, every label's
 * `textContent`, and — rarely, since it only changes as flutes cross the viewport's edge — the
 * mounted (visible) flute set as React state.
 *
 * Flutes are culled to the visible set plus a margin — cheap now that a flute is a plain CSS
 * fill, but the column can still run to dozens of entries at once, and there's no reason to keep
 * DOM nodes and per-frame writes going for ones nowhere near the viewport.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { education } from "@/content/education";
import { work } from "@/content/work";
import { DEFAULT_ACCENT } from "@/content/accent";
import type { Entry } from "@/content/types";
import { TimelineAxis } from "./TimelineAxis";
import { TimelineDetail } from "./TimelineDetail";
import { TimelineFlute } from "./TimelineFlute";
import { buildTimeline, formatCursor, formatEdge, MS_PER_MONTH } from "./timeline-data";
import { useTimelineWindow } from "./useTimelineWindow";
import { useTimelineZoom } from "./useTimelineZoom";

/** Width of one lane's slot in the flute column, and the flute's own width within it — narrower
 *  than the slot so adjacent lanes read as visibly separate flutes rather than touching. */
const LANE_PITCH = 50;
const FLUTE_W = 34;
/** Floor on a flute's pixel height, so a short internship stays legible even zoomed way out. */
const MIN_FLUTE_PX = 14;
/** Extra clearance a label's own height must have below the visible band before it's shown —
 *  without it, a label whose height barely clears the threshold still visibly pokes past the
 *  flute's top/bottom edge, since `getBoundingClientRect` doesn't capture every bit of font
 *  metrics (ascent/descent) the browser actually paints. */
const LABEL_CLEARANCE_PX = 16;

/** Pixels per month at zoom = 1. */
const BASE_PX_PER_MONTH = 64;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.5;

/** Where the top/bottom edge date labels sit, as a fraction of the view's height — and, so the
 *  flute column's feather lines up with them exactly, also where its mask finishes fading to
 *  nothing. A flute is gone by the time it reaches a label, not just starting to fade there: from
 *  the label out to the true edge is empty, not a continuing dissolve. One number driving both,
 *  rather than two that happened to agree. */
const EDGE_INSET_TOP = 0.12;
const EDGE_INSET_BOTTOM = 0.88;

/** How much room the fade itself needs, in percentage points, anchored so it finishes exactly at
 *  `EDGE_INSET_TOP`/`BOTTOM` and runs inward from there — not outward from the label toward the
 *  true edge, which is what left the old version fading past where the labels sat. */
const FEATHER_SPAN = 8;
/** Where the mask reaches full opacity, moving inward from the label. Also the band flute title
 *  labels are allowed to sit in — inside the ramp itself, a label would be sitting on partially
 *  faded glass, which reads as broken rather than as part of the dissolve. */
const FEATHER_OPAQUE_TOP = EDGE_INSET_TOP + FEATHER_SPAN / 100;
const FEATHER_OPAQUE_BOTTOM = EDGE_INSET_BOTTOM - FEATHER_SPAN / 100;

/** How far into the ramp the eased midpoint sits, as a fraction of `FEATHER_SPAN` — tuned so it
 *  reads as a soft dissolve rather than a flat linear wipe. */
const FEATHER_EASE = 0.45;

/** The flute column's fade, built once from the constants above rather than hand-tuned
 *  separately, so it can't drift out of step with the labels it has to line up against. Computed
 *  here, not in a global stylesheet, since a static CSS class has no way to share these numbers
 *  with the component that also positions those labels. */
const FEATHER_MASK = `linear-gradient(to bottom, transparent, transparent ${EDGE_INSET_TOP * 100}%, rgba(0, 0, 0, 0.55) ${EDGE_INSET_TOP * 100 + FEATHER_SPAN * FEATHER_EASE}%, #000 ${FEATHER_OPAQUE_TOP * 100}%, #000 ${FEATHER_OPAQUE_BOTTOM * 100}%, rgba(0, 0, 0, 0.55) ${EDGE_INSET_BOTTOM * 100 - FEATHER_SPAN * FEATHER_EASE}%, transparent ${EDGE_INSET_BOTTOM * 100}%, transparent)`;
/** Extra viewport-heights of margin, each side, before a flute is unmounted. */
const CULL_MARGIN = 0.5;
/** Above this many visible months, the cursor and edge labels switch from month+year to bare year. */
const YEAR_MODE_MONTHS = 30;

type FluteItem = {
  key: string;
  entryKey: string;
  title: string;
  accent: string;
  startMs: number;
  endMs: number;
  lane: number;
};

const setsEqual = (a: Set<string>, b: Set<string>) => {
  if (a.size !== b.size) return false;
  for (const k of a) if (!b.has(k)) return false;
  return true;
};

export function TimelineView() {
  const data = useMemo(() => buildTimeline(work, education), []);

  const fluteList = useMemo<FluteItem[]>(() => {
    if (!data) return [];
    const byKey = new Map(data.entries.map((e) => [e.key, e]));
    return data.spans.map((span, i) => {
      const owner = byKey.get(span.entryKey)!;
      return {
        key: `${span.entryKey}:${i}`,
        entryKey: span.entryKey,
        title: owner.entry.title,
        accent: owner.entry.accent ?? DEFAULT_ACCENT,
        startMs: span.start.getTime(),
        endMs: span.end.getTime(),
        lane: span.lane,
      };
    });
  }, [data]);

  const entryByKey = useMemo(
    () => new Map(data?.entries.map((e) => [e.key, e.entry]) ?? []),
    [data],
  );

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [pxPerMonth, setPxPerMonth] = useState(BASE_PX_PER_MONTH);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => new Set());

  const rootRef = useRef<HTMLDivElement>(null);
  const fluteColumnRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLParagraphElement>(null);
  const topEdgeRef = useRef<HTMLParagraphElement>(null);
  const bottomEdgeRef = useRef<HTMLParagraphElement>(null);

  const hostRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const labelRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const labelHeights = useRef<Map<string, number>>(new Map());
  const lastVisibleRef = useRef<Set<string>>(new Set());

  // Placeholder — `useTimelineWindow`'s mount effect writes the real initial cursor (today's date,
  // clamped into bounds) before the content area's own 420ms fade-in ever makes it visible.
  const centerRef = useRef(0);
  const pxPerMonthRef = useRef(BASE_PX_PER_MONTH);
  /** Stable across the component's life — `data` never changes after mount. */
  const rangeRef = useRef({
    start: data ? data.rangeStart.getTime() : 0,
    end: data ? data.rangeEnd.getTime() : 0,
  });

  // Holds the last non-null selection so `TimelineDetail` still has content to fade out during
  // the cross-fade back to the cursor label, rather than blanking the instant it's deselected.
  // Adjusting state during render like this — comparing against the previous value and calling
  // the setter conditionally — is React's own sanctioned alternative to a ref write here, which
  // `react-hooks/refs` (this repo's lint config) forbids during render.
  const activeEntry = activeKey ? (entryByKey.get(activeKey) ?? null) : null;
  const [displayEntry, setDisplayEntry] = useState<Entry | null>(null);
  if (activeEntry && activeEntry !== displayEntry) {
    setDisplayEntry(activeEntry);
  }

  /** Writes every mounted flute's position, every label's text/visibility, and the axis labels —
   *  reading `centerRef`/`pxPerMonthRef` fresh, never React state, so this can run every panned
   *  frame for free. Also recomputes the visible-flute set, only touching React state (rarely)
   *  when that set actually changes. */
  const renderFrame = useCallback(() => {
    const col = fluteColumnRef.current;
    if (!col) return;
    const height = col.clientHeight || 1;
    const centerY = height / 2;
    const centerMs = centerRef.current;
    const pxPerMonthNow = pxPerMonthRef.current || 1;
    const yOf = (ms: number) => centerY + ((ms - centerMs) / MS_PER_MONTH) * pxPerMonthNow;
    const msOf = (y: number) => centerMs + ((y - centerY) / pxPerMonthNow) * MS_PER_MONTH;

    const bandTop = height * FEATHER_OPAQUE_TOP;
    const bandBottom = height * FEATHER_OPAQUE_BOTTOM;
    // Wider than the label band above: anywhere the mask still shows any color at all, not just
    // the fully-opaque interior — a partially-faded flute is still visible and should stay
    // clickable, only the fully transparent 0-EDGE_INSET_TOP/EDGE_INSET_BOTTOM-100 margins outside
    // it shouldn't be.
    const visibleTop = height * EDGE_INSET_TOP;
    const visibleBottom = height * EDGE_INSET_BOTTOM;
    const margin = height * CULL_MARGIN;
    const nextVisible = new Set<string>();

    for (const f of fluteList) {
      const top = yOf(f.startMs);
      const bottom = yOf(f.endMs);
      if (bottom < -margin || top > height + margin) continue;
      nextVisible.add(f.key);

      const hostEl = hostRefs.current.get(f.key);
      if (!hostEl) continue;
      hostEl.style.transform = `translate3d(0, ${top}px, 0)`;
      // A flute mounted for the cull margin's sake, or sitting (wholly or partly) in the feather's
      // fully transparent zone, shouldn't be clickable there — `disabled` alone only covers the
      // wholly-invisible case; a long flute straddling the boundary is still partly visible, so it
      // stays enabled but gets clipped to just that visible slice, not its full (taller) box.
      const visTop = Math.max(top, visibleTop);
      const visBottom = Math.min(bottom, visibleBottom);
      if (visBottom <= visTop) {
        hostEl.disabled = true;
        hostEl.style.clipPath = "inset(0 0 100% 0)";
      } else {
        hostEl.disabled = false;
        const insetTop = visTop - top;
        const insetBottom = bottom - visBottom;
        hostEl.style.clipPath = `inset(${insetTop}px 0px ${insetBottom}px 0px)`;
      }

      const labelEl = labelRefs.current.get(f.key);
      if (!labelEl) continue;
      const iTop = Math.max(top, bandTop);
      const iBottom = Math.min(bottom, bandBottom);
      const span = iBottom - iTop;
      const labelH = labelHeights.current.get(f.key) ?? Infinity;
      if (span < labelH + LABEL_CLEARANCE_PX) {
        labelEl.style.opacity = "0";
      } else {
        labelEl.style.opacity = "1";
        const mid = (iTop + iBottom) / 2 - top;
        labelEl.style.transform = `translate(-50%, ${mid}px) translateY(-50%)`;
      }
    }

    const yearMode = height / pxPerMonthNow > YEAR_MODE_MONTHS;
    const cursorDate = new Date(centerMs);
    if (cursorRef.current) cursorRef.current.textContent = formatCursor(cursorDate, yearMode);
    if (topEdgeRef.current) {
      topEdgeRef.current.textContent = formatEdge(
        new Date(msOf(height * EDGE_INSET_TOP)),
        cursorDate,
        yearMode,
      );
    }
    if (bottomEdgeRef.current) {
      bottomEdgeRef.current.textContent = formatEdge(
        new Date(msOf(height * EDGE_INSET_BOTTOM)),
        cursorDate,
        yearMode,
      );
    }

    if (!setsEqual(nextVisible, lastVisibleRef.current)) {
      lastVisibleRef.current = nextVisible;
      setVisibleKeys(nextVisible);
    }
  }, [fluteList]);

  const onCenterChange = useCallback(
    (centerMs: number) => {
      centerRef.current = centerMs;
      renderFrame();
    },
    [renderFrame],
  );

  const windowHandle = useTimelineWindow(rootRef, rangeRef, pxPerMonthRef, onCenterChange);

  const onZoomChange = useCallback(
    (zoom: number) => {
      const value = BASE_PX_PER_MONTH * zoom;
      pxPerMonthRef.current = value;
      setPxPerMonth(value);
      windowHandle.kick();
      renderFrame();
    },
    [windowHandle, renderFrame],
  );

  useTimelineZoom(rootRef, onZoomChange, { min: MIN_ZOOM, max: MAX_ZOOM });

  // Newly mounted flutes (visible set grew) or a resized column (zoom) both need a fresh
  // position/label pass once the DOM has the new elements/sizes to write into.
  useEffect(() => {
    renderFrame();
  }, [renderFrame, visibleKeys, pxPerMonth]);

  // Any pan clears the current selection — a deliberate wheel/touch move reads as "never mind,
  // show me something else," not as background noise to preserve a selection through.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const clear = () => setActiveKey((k) => (k === null ? k : null));
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) clear();
    };
    const onTouchMove = () => clear();
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // Escape deselects rather than closing the Timeline, while something is selected. Capture phase,
  // so this runs — and can stop the key going any further — before `Timeline`'s own bubble-phase
  // listener treats the same Escape as "close."
  useEffect(() => {
    if (activeKey === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setActiveKey(null);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [activeKey]);

  const selectEntry = useCallback((key: string) => {
    setActiveKey((prev) => (prev === key ? null : key));
  }, []);

  if (!data) {
    return (
      <p className="font-display pl-[var(--gutter-left)] text-[clamp(1rem,1.3vw,1.15rem)] text-mute">
        The timeline is waiting on dated history to show.
      </p>
    );
  }

  const visibleFlutes = fluteList.filter((f) => visibleKeys.has(f.key));

  return (
    <div ref={rootRef} className="relative h-full w-full">
      <div
        className="flex h-full min-h-0 w-full"
        style={{ paddingLeft: "var(--gutter-left)", paddingRight: "6vw" }}
      >
        <div
          ref={fluteColumnRef}
          className="relative h-full shrink-0"
          style={{
            width: data.laneCount * LANE_PITCH,
            maskImage: FEATHER_MASK,
            WebkitMaskImage: FEATHER_MASK,
          }}
        >
          {visibleFlutes.map((f) => {
            const durationMonths = (f.endMs - f.startMs) / MS_PER_MONTH;
            const height = Math.max(MIN_FLUTE_PX, durationMonths * pxPerMonth);
            const left = f.lane * LANE_PITCH + (LANE_PITCH - FLUTE_W) / 2;
            return (
              <TimelineFlute
                key={f.key}
                hostRef={(el) => {
                  if (el) hostRefs.current.set(f.key, el);
                  else hostRefs.current.delete(f.key);
                }}
                labelRef={(el) => {
                  if (el) {
                    labelRefs.current.set(f.key, el);
                    if (!labelHeights.current.has(f.key)) {
                      labelHeights.current.set(f.key, el.getBoundingClientRect().height);
                    }
                  } else {
                    labelRefs.current.delete(f.key);
                  }
                }}
                left={left}
                width={FLUTE_W}
                height={height}
                title={f.title}
                accent={f.accent}
                dimmed={activeKey !== null && activeKey !== f.entryKey}
                onSelect={() => selectEntry(f.entryKey)}
              />
            );
          })}
        </div>

        <div className="relative ml-[5rem] min-h-0 max-w-[46rem] flex-1">
          <TimelineAxis
            cursorRef={cursorRef}
            topRef={topEdgeRef}
            bottomRef={bottomEdgeRef}
            topInset={EDGE_INSET_TOP}
            bottomInset={EDGE_INSET_BOTTOM}
            hideCursor={activeKey !== null}
          />
          <div
            aria-hidden={activeKey === null}
            className={`absolute inset-x-0 top-1/2 -translate-y-1/2 transition-opacity duration-300 motion-reduce:transition-none ${
              activeKey !== null ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {displayEntry && <TimelineDetail entry={displayEntry} />}
          </div>
        </div>
      </div>
    </div>
  );
}

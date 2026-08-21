"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Entry } from "@/content/types";
import { renderRichText } from "@/lib/rich-text";
import { FlutedGlass, presets, type GlassShape } from "@/components/fluted-glass";
import { awards } from "@/content/awards";
import { projects } from "@/content/projects";
import { accentShapes } from "./accents";
import { registerStage, requestStageFrame } from "@/components/scroll-stage/useScrollStage";

/** Scroll each item holds the stage for, in pin-heights. Under one, so a single flick carries the
 *  list a whole item instead of stalling it between two. */
const DWELL = 0.8;

type Item = { entry: Entry; group: "Awards" | "Projects"; key: string };

const ITEMS: Item[] = [
  ...awards.map((entry) => ({ entry, group: "Awards" as const, key: `award:${entry.title}` })),
  ...projects.map((entry) => ({ entry, group: "Projects" as const, key: `project:${entry.title}` })),
];

const TRAVEL = ITEMS.length * DWELL;

/** The pin holds for `TRAVEL`, past its own one-viewport height, the same relationship
 *  CrossfadeStage's track height has to its phases — see that file's `stops.travel` for why
 *  it's `svh` and not `vh`/`lvh`. Rounded, or the multiply lands a float tail in the markup. */
const TRACK_HEIGHT = Math.round(TRAVEL * 1e4) / 100;

/** Where the Projects group starts in the flat list, for the `#projects` anchor — the section's
 *  own top is Awards' first item, not the group the link names. */
const PROJECTS_START = awards.length;

/** The list split into the runs each heading covers. Every item keeps its index in the flat list,
 *  so the live check and the scroll target are both still in scroll order. */
const GROUPS = ITEMS.reduce<{ group: string; items: { item: Item; index: number }[] }[]>(
  (groups, item, index) => {
    const open = groups[groups.length - 1];
    if (open && open.group === item.group) open.items.push({ item, index });
    else groups.push({ group: item.group, items: [{ item, index }] });
    return groups;
  },
  [],
);

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

function Row({
  item,
  index,
  live,
  onActivate,
}: {
  item: Item;
  index: number;
  live: boolean;
  onActivate: (index: number) => void;
}) {
  const { entry } = item;
  const external = entry.link?.startsWith("http");

  return (
    <li
      data-active={live}
      data-index={index}
      className="mt-[clamp(1.5rem,2.6vw,2.25rem)] border-l border-transparent pl-4 transition-colors duration-500 first:mt-0 data-[active=true]:border-ink motion-reduce:transition-none"
    >
      <button
        type="button"
        onClick={() => onActivate(index)}
        aria-current={live}
        className="-my-2 block cursor-pointer py-2 text-left"
      >
        <span className="font-display block text-[clamp(1.05rem,1.4vw,1.25rem)] leading-tight font-bold">
          {entry.title}
        </span>
        {entry.subheader && (
          <span className="font-display block text-[clamp(1.05rem,1.4vw,1.25rem)] leading-tight">
            {entry.subheader}
          </span>
        )}
      </button>

      {/*
        Mounted for every item and revealed by a `0fr` to `1fr` row, rather than rendered only
        when live: a block that arrives with the switch has no previous height to transition
        from, so it would pop in however it was styled.
      */}
      <div
        data-active={live}
        className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-500 data-[active=true]:grid-rows-[1fr] data-[active=true]:opacity-100 motion-reduce:transition-none"
      >
        <div className="overflow-hidden">
          {entry.description && (
            <p className="font-display mt-3 max-w-[36rem] text-[clamp(1rem,1.3vw,1.15rem)] leading-[1.35]">
              {renderRichText(entry.description)}
            </p>
          )}
          {entry.link && (
            <a
              href={entry.link}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              // Out of the tab order while closed, so tabbing through the list does not land on
              // a link nobody can see.
              tabIndex={live ? undefined : -1}
              className="relative mt-2 inline-flex items-center gap-1 text-[0.9em] underline decoration-1 underline-offset-4"
            >
              Link
              <ArrowUpRight aria-hidden="true" className="size-[0.8em]" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

export function AwardsProjects() {
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Keyed on the active index, so the array identity changes exactly when the item does and the
  // renderer sees one new config per switch rather than one per render.
  const shapes = useMemo<GlassShape[]>(
    () => accentShapes(ITEMS[active].entry),
    [active],
  );

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    const list = listRef.current;
    const inner = innerRef.current;
    if (!track || !pin || !list || !inner) return;

    // Same range()/measure() split as CrossfadeStage, same reason: forced-layout reads cached
    // here so measure() never has to force one on iOS mid-scroll.
    // Rationale: docs/pinned-scroll-stages.md § range()'s cache
    let trackTop = 0;
    let unit = 1;
    // Kept outside `range()` too — `onBodyResize` below needs it as a standing tolerance, not
    // just as an input to `unit`.
    let bleed = 0;

    // Same width-gated fix as CrossfadeStage's range(). Rationale: docs/pinned-scroll-stages.md § Width-gated resize handling
    let lastWidth = window.innerWidth;

    // What `range()` last actually wrote — same guard as CrossfadeStage's.
    let lastPinStart = "";
    let lastPinEnd = "";
    let lastTravel = "";

    // The scroll timeline runs on the document, so the pin's range is where the track sits in it —
    // same mechanism CrossfadeStage uses; see docs/ios-viewport-bleed.md for why a sticky subtree
    // needs the scroll-timeline swap at all.
    // Cached list geometry so position() (below) can become a write-only commit().
    // Rationale: docs/pinned-scroll-stages.md § range()'s cache
    let rowCenters: number[] = [];
    let listHeight = 0;
    let overflow = 0;
    const measureList = () => {
      rowCenters = ITEMS.map((_, i) => {
        const row = inner.querySelector<HTMLElement>(`[data-index="${i}"]`);
        return row ? row.offsetTop + row.offsetHeight / 2 : 0;
      });
      listHeight = list.clientHeight;
      overflow = inner.offsetHeight - listHeight;
    };

    const range = (reason: string) => {
      bleed = parseFloat(getComputedStyle(pin).getPropertyValue("--bleed")) || 0;
      const fold = parseFloat(getComputedStyle(pin).getPropertyValue("--fold")) || 0;
      const start = track.getBoundingClientRect().top + window.scrollY;
      trackTop = start;
      // The pin's own height is fixed between resizes, so this is the only place the DWELL unit
      // needs reading at all — `measure()` used to re-read it, forcing a layout, every frame.
      unit = pin.offsetHeight - bleed - fold || 1;
      // Full pin height, bleed included — a physical release distance, not the DWELL unit above.
      // Rationale: docs/pinned-scroll-stages.md § Full pin height vs. bleed, in range()
      const travel = Math.max(track.offsetHeight - pin.offsetHeight, 0);
      // TEMP DEBUG — remove once the top-of-scroll jitter in Hero/AwardsProjects is diagnosed.
      // Flat string, not an object: Safari's console collapses nested objects to "{…}" in a
      // copy-paste unless each one is expanded by hand first.
      console.log(
        `[AwardsProjects.range] ${reason} scrollY=${window.scrollY} innerW=${window.innerWidth} innerH=${window.innerHeight} bleed=${bleed} fold=${fold} pinH=${pin.offsetHeight} trackH=${track.offsetHeight} start=${start.toFixed(1)} unit=${unit.toFixed(1)} travel=${travel.toFixed(1)} pinStart=${start.toFixed(1)} pinEnd=${(start + travel).toFixed(1)}`,
      );
      const pinStartStr = start.toFixed(1);
      const pinEndStr = (start + travel).toFixed(1);
      const travelStr = travel.toFixed(1);
      if (pinStartStr !== lastPinStart) {
        pin.style.setProperty("--pin-start", `${pinStartStr}px`);
        lastPinStart = pinStartStr;
      }
      if (pinEndStr !== lastPinEnd) {
        pin.style.setProperty("--pin-end", `${pinEndStr}px`);
        lastPinEnd = pinEndStr;
      }
      if (travelStr !== lastTravel) {
        pin.style.setProperty("--travel", `${travelStr}px`);
        lastTravel = travelStr;
      }
      measureList();
    };

    const rowCenter = (index: number) => rowCenters[index] ?? 0;

    // Keeps the live item centred in the list's own box by sliding `inner` under a clipped,
    // fixed-height `list`. Rationale: docs/awards-projects.md § List centering (position())
    const position = (continuous: number) => {
      if (overflow <= 0) {
        inner.style.transform = "";
        return;
      }
      const lo = Math.floor(continuous);
      const hi = Math.min(lo + 1, ITEMS.length - 1);
      const frac = continuous - lo;
      const center = rowCenter(lo) + (rowCenter(hi) - rowCenter(lo)) * frac;
      const offset = clamp(center - listHeight / 2, 0, overflow + listHeight / 2);
      inner.style.transform = `translate3d(0, ${(-offset).toFixed(1)}px, 0)`;
    };

    // What `measure()` found, for `commit()` to write — same split as `CrossfadeStage`'s, and for
    // the same reason: this stage's reads and every other stage's reads all happen before either
    // one's writes. See `useScrollStage`'s own comment.
    let pendingContinuous = 0;

    // TEMP DEBUG — the reported Awards jitter left no `range()` log at all, so whatever's snapping
    // must be in this per-scroll-frame path instead (`position()`'s `translate3d`, driven straight
    // off `pendingContinuous`). Flags a frame where `continuous` moved by more than the actual
    // `scrollY` delta explains — a real snap, not just a fast flick, and not just the ordinary
    // clamp saturation `continuous` sits in for most of the page (below the pin, or past its end):
    // the "expected" value is clamped the exact same way `continuous` itself is, from the
    // *unclamped* running total, so sitting pinned at 0 or at `ITEMS.length - 1` while scrolling
    // through the rest of the page no longer reads as a jump. Remove once the top-of-scroll/Awards
    // jitter is diagnosed.
    let lastScrollY = window.scrollY;
    let rawContinuous = 0;
    let lastMeasureTime = performance.now();

    const measure = () => {
      // `trackTop`/`unit` are `range()`'s cache — see the comment above it. `window.scrollY` is
      // the only per-frame read, and unlike a rect or an offset, it never forces layout.
      const scrollY = window.scrollY;
      const p = (scrollY - trackTop) / unit;
      const continuous = clamp(p / DWELL, 0, ITEMS.length - 1);

      const now = performance.now();
      const dt = now - lastMeasureTime;
      const scrollDelta = scrollY - lastScrollY;
      const expectedRawContinuous = rawContinuous + scrollDelta / unit / DWELL;
      const expectedContinuous = clamp(expectedRawContinuous, 0, ITEMS.length - 1);
      const jump = continuous - expectedContinuous;
      if (Math.abs(jump) > 0.05) {
        console.log(
          `[AwardsProjects.measure] SNAP dt=${dt.toFixed(1)}ms scrollY=${scrollY} prevScrollY=${lastScrollY} scrollDelta=${scrollDelta} trackTop=${trackTop.toFixed(1)} unit=${unit.toFixed(1)} expectedContinuous=${expectedContinuous.toFixed(3)} continuous=${continuous.toFixed(3)} jump=${jump.toFixed(3)}`,
        );
      }
      lastScrollY = scrollY;
      rawContinuous = p / DWELL;
      lastMeasureTime = now;

      pendingContinuous = continuous;
    };

    const commit = () => {
      setActive(Math.floor(pendingContinuous));
      position(pendingContinuous);
    };

    const unregister = registerStage(measure, commit);

    const onScroll = () => requestStageFrame();

    const onResize = () => {
      const width = window.innerWidth;
      if (width !== lastWidth) {
        lastWidth = width;
        range("resize");
      }
      onScroll();
    };

    range("mount");
    measure();
    commit();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    // Retriggers range() when Work's "Show All"/"Show More" resizes the page above this section
    // (no `resize` event fires for that). Tolerance-gated on `bleed` to ignore the iOS toolbar's
    // own body-height wobble. Rationale: docs/awards-projects.md § Body-resize retrigger
    let lastBodyHeight = document.body.getBoundingClientRect().height;
    const onBodyResize = () => {
      const height = document.body.getBoundingClientRect().height;
      if (Math.abs(height - lastBodyHeight) > bleed) {
        lastBodyHeight = height;
        range("body-resize");
      }
      onScroll();
    };
    const bodyObserver = new ResizeObserver(onBodyResize);
    bodyObserver.observe(document.body);

    // Same as CrossfadeStage's identical listeners. Rationale: docs/pinned-scroll-stages.md § Orientation / scrollend
    const onOrientation = () => {
      lastWidth = window.innerWidth;
      range("orientation");
      onScroll();
    };
    const onScrollEnd = () => {
      range("scrollend");
      onScroll();
    };
    window.addEventListener("orientationchange", onOrientation);
    window.addEventListener("scrollend", onScrollEnd, { passive: true });
    document.fonts?.ready.then(onScrollEnd);

    return () => {
      unregister();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientation);
      window.removeEventListener("scrollend", onScrollEnd);
      bodyObserver.disconnect();
    };
  }, []);

  /**
   * Scrolls to an item rather than selecting it, so scroll position stays the only state there
   * is and a click can never leave the list saying one thing and the page another.
   */
  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;
    // Same unit `apply()` uses to pick the active index — has to agree, or a click could land on a
    // scroll position `apply()` reads back as a different item.
    const bleed = parseFloat(getComputedStyle(pin).getPropertyValue("--bleed")) || 0;
    const fold = parseFloat(getComputedStyle(pin).getPropertyValue("--fold")) || 0;
    const unit = pin.offsetHeight - bleed - fold || 1;
    // The middle of the item's dwell, not its start, so where this lands is unambiguously that
    // item instead of a boundary a pixel of scroll could tip either way.
    const top = track.getBoundingClientRect().top + window.scrollY + (index + 0.5) * DWELL * unit;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }, []);

  return (
    <section
      ref={trackRef}
      className="relative w-full"
      style={{ height: `calc(${TRACK_HEIGHT}svh + 100lvh + var(--bleed))` }}
    >
      {/* Invisible marker at the start of the Projects group, since the section's own top is
          Awards' first item and `#projects` should land on the group the link names. `svh`, not
          `vh`: has to agree with `apply()`'s runtime `unit`, which is `100svh` after `--fold`. */}
      <span
        id="projects"
        aria-hidden="true"
        className="absolute inset-x-0 h-px"
        style={{ top: `${PROJECTS_START * DWELL * 100}svh` }}
      />

      {/* .stage-pin, not a plain sticky top-0 — canvas-clips-inside-sticky-subtree issue.
          Rationale: docs/ios-viewport-bleed.md § .stage-pin: sticky vs. scroll-timeline swap */}
      <div
        ref={pinRef}
        className="stage-pin relative isolate flex items-center pb-[var(--bleed)]"
        style={{ height: "calc(100lvh + var(--bleed))" }}
      >
        {/* Full-bleed on mobile, full pin height rather than taller — one fix rather than two.
            Rationale: docs/awards-projects.md § Retint band sizing (mobile full-bleed) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[46%]"
        >
          <FlutedGlass {...presets.accent} shapes={shapes} className="h-full w-full" />
        </div>

        {/* Same left gutter as every other body section (Work, About).
            Rationale: docs/awards-projects.md § Layout gutters */}
        <div
          ref={listRef}
          className="relative max-h-full w-full overflow-hidden pl-[var(--gutter-left)] pr-[24vw] sm:pr-[calc(46%+2vw)]"
        >
          {/* The clip lives on the wrapper above; this is what actually moves.
              Rationale: docs/awards-projects.md § List centering (position()) */}
          <div ref={innerRef}>
            {GROUPS.map(({ group, items }) => (
              <div key={group} className="mt-[clamp(2.5rem,5vw,4.5rem)] first:mt-0">
                <h2 className="font-display text-[clamp(1.75rem,2.4vw,2.25rem)]">{group}</h2>
                <ul className="mt-[clamp(1.5rem,3vw,2.5rem)]">
                  {items.map(({ item, index }) => (
                    <Row
                      key={item.key}
                      item={item}
                      index={index}
                      live={index === active}
                      onActivate={goTo}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

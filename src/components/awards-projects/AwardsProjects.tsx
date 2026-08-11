"use client";

/**
 * Awards and Projects, as one pinned stage whose glass band retints to the item holding it.
 *
 * The list itself never moves. Scroll position through the track picks which item is live, and the
 * only things that change are that item's own treatment and the colour of the band bleeding off the
 * right edge, so the retint is the whole event rather than a detail on top of a scroll.
 *
 * Position, not time: the index is a pure function of where the track sits against the viewport, so
 * parking the wheel parks the list, scrolling back up retraces it exactly, and landing partway in
 * (an anchor, End, scroll restoration) is right on the first frame instead of catching up.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Entry } from "@/content/types";
import { renderRichText } from "@/lib/rich-text";
import { FlutedGlass, presets, type GlassShape } from "@/components/fluted-glass";
import { awards } from "@/content/awards";
import { projects } from "@/content/projects";
import { accentShapes } from "./accents";

/** Scroll each item holds the stage for, in pin-heights. Under one, so a single flick carries the
 *  list a whole item instead of stalling it between two. */
const DWELL = 0.8;

type Item = { entry: Entry; group: "Awards" | "Projects"; key: string };

const ITEMS: Item[] = [
  ...awards.map((entry) => ({ entry, group: "Awards" as const, key: `award:${entry.title}` })),
  ...projects.map((entry) => ({ entry, group: "Projects" as const, key: `project:${entry.title}` })),
];

const TRAVEL = ITEMS.length * DWELL;

/** The pin holds for `TRAVEL` and the track is one viewport taller, the same relationship
 *  CrossfadeStage's height has to its phases. Rounded, or the multiply lands a float tail in the
 *  markup. */
const TRACK_HEIGHT = Math.round((TRAVEL + 1) * 1e4) / 100;

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

    let queued = 0;
    // The overhang, in px, so the DWELL unit stays one viewport even though the pin is taller than
    // one. Read live, same reasoning as `CrossfadeStage`'s own `range()`.
    let bleed = 0;

    // The scroll timeline runs on the document, so the pin's range is where the track sits in it —
    // same mechanism `CrossfadeStage` uses, for the same reason: a canvas clips at the visible
    // viewport inside any `position: sticky` subtree, so this band needs the sticky→scroll-timeline
    // swap on touch too, not just a taller sticky box.
    const range = () => {
      bleed = parseFloat(getComputedStyle(pin).getPropertyValue("--bleed")) || 0;
      const start = track.getBoundingClientRect().top + window.scrollY;
      // The *full* pin height, bleed included — a physical release distance, not the DWELL unit
      // below. See CrossfadeStage's identical `range()` for why subtracting bleed here is wrong.
      const travel = Math.max(track.offsetHeight - pin.offsetHeight, 0);
      pin.style.setProperty("--pin-start", `${start.toFixed(1)}px`);
      pin.style.setProperty("--pin-end", `${(start + travel).toFixed(1)}px`);
      pin.style.setProperty("--travel", `${travel.toFixed(1)}px`);
    };

    const rowCenter = (index: number) => {
      const row = inner.querySelector<HTMLElement>(`[data-index="${index}"]`);
      return row ? row.offsetTop + row.offsetHeight / 2 : 0;
    };

    // Keeps the live item centred in the list's own box by sliding `inner` under a clipped,
    // fixed-height `list` — a transform tied straight to `continuous` below, not a nested
    // `overflow-y-auto`, so it's the same one physical scroll as everything else in the stage
    // rather than a separate scrollable region with its own scrollbar. A no-op whenever the list
    // isn't actually taller than the pin, which is every viewport this design was built for.
    const position = (continuous: number) => {
      const overflow = inner.offsetHeight - list.clientHeight;
      if (overflow <= 0) {
        inner.style.transform = "";
        return;
      }
      const lo = Math.floor(continuous);
      const hi = Math.min(lo + 1, ITEMS.length - 1);
      const frac = continuous - lo;
      const center = rowCenter(lo) + (rowCenter(hi) - rowCenter(lo)) * frac;
      // The floor stays 0 — the very first item sits flush with the box's own top rather than
      // pulled down to center it, which is what keeps the section landing right below Work instead
      // of opening mid-list. The ceiling gets an extra half-height of slack past the true content
      // end, since without it the last item is clamped hard against the bottom the moment its own
      // center would otherwise need to scroll past where content actually stops, landing it low in
      // the box instead of centered like every other item.
      const offset = clamp(center - list.clientHeight / 2, 0, overflow + list.clientHeight / 2);
      inner.style.transform = `translate3d(0, ${(-offset).toFixed(1)}px, 0)`;
    };

    const apply = () => {
      // Measured from the track's own rect rather than scrollY, so this is correct wherever the
      // section sits and after anything that moves it, the footer's overscroll lift included.
      //
      // `offsetHeight` rather than a rect, because the pin is the element the scroll timeline may
      // be transforming, and a rect reports the transformed box — same reasoning as
      // `CrossfadeStage`'s `apply()`. Subtracting bleed keeps the DWELL unit at one plain viewport
      // regardless of overhang, which is what keeps a dwell honest when a vh and the real viewport
      // disagree, which they do for the whole of an iOS URL bar collapse.
      const unit = pin.offsetHeight - bleed || 1;
      const p = -track.getBoundingClientRect().top / unit;
      const continuous = clamp(p / DWELL, 0, ITEMS.length - 1);
      setActive(Math.floor(continuous));
      position(continuous);
    };

    const onScroll = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        apply();
      });
    };

    const onResize = () => {
      range();
      onScroll();
    };

    range();
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    // `range()`'s `start` is the track's document-absolute position, which shifts whenever
    // anything above it resizes — Work's "Show All"/"Show More" toggles, most concretely. A
    // window resize is the only thing that recomputed it before, so any of those toggles left
    // `--pin-start`/`--pin-end` pointing at the pre-toggle layout: the scroll-timeline then
    // engages/releases at the wrong scroll offset, which reads as a blank gap that only clears
    // once an actual resize (or, on some browsers, enough scroll-driven relayout) forces a
    // fresh `range()` call. Body height covers every such case in one place, generically.
    const bodyObserver = new ResizeObserver(onResize);
    bodyObserver.observe(document.body);

    return () => {
      cancelAnimationFrame(queued);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
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
    const unit = pin.offsetHeight - bleed || 1;
    // The middle of the item's dwell, not its start, so where this lands is unambiguously that
    // item instead of a boundary a pixel of scroll could tip either way.
    const top = track.getBoundingClientRect().top + window.scrollY + (index + 0.5) * DWELL * unit;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }, []);

  return (
    <section ref={trackRef} className="relative w-full" style={{ height: `${TRACK_HEIGHT}vh` }}>
      {/* Invisible marker at the start of the Projects group, since the section's own top is
          Awards' first item and `#projects` should land on the group the link names. */}
      <span
        id="projects"
        aria-hidden="true"
        className="absolute inset-x-0 h-px"
        style={{ top: `${PROJECTS_START * DWELL * 100}vh` }}
      />

      {/*
        `.stage-pin` (see `globals.css`) rather than a plain `sticky top-0`: the same canvas-clips-
        inside-any-sticky-subtree issue the hero had applies here too, since this band is a WebGL
        panel in a sticky pin. Height grows by `--bleed`, and `pb-[var(--bleed)]` reserves that same
        amount so `items-center` still centers the copy within the original (non-bled) box — the
        canvas reaches the extra height through `inset-y-0` on its own host (which resolves against
        the pin's full padding box, padding included), the copy doesn't visually move.
      */}
      <div
        ref={pinRef}
        className="stage-pin relative isolate flex items-center pb-[var(--bleed)]"
        style={{ height: "calc(100vh + var(--bleed))" }}
      >
        {/*
          Full-bleed on mobile, and taller than the pin, which is one fix rather than two.

          A shape's `w` is a fraction of the panel's width and its `blur` a fraction of the panel's
          height, and an ellipse's distance field scales with its *minor* radius — so on a narrow
          panel every distance in the field shrinks while the feather it is measured against does
          not. The band's own falloff then never finishes inside the box, and the canvas cuts it off
          at a hard line. Desktop's 46% is wide enough that the field is down to a thousandth by the
          top edge; a phone-width column is not, and narrowing it further only makes it worse. So the
          panel takes the whole width here, which also gives the copy beside it its gutter back.

          Full pin height rather than taller, which is the part that is easy to get backwards. Hanging
          the panel past the pin does move its own edges off screen, but the window's top row is a
          boundary too — the page does not paint under the status bar — and all the overhang does is
          put a stronger part of the field against it. The field has to finish inside the window, not
          somewhere past it.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[46%]"
        >
          <FlutedGlass {...presets.accent} shapes={shapes} className="h-full w-full" />
        </div>

        {/* Same left gutter as every other body section (Work, About), so copy lines up down the
            page regardless of which section it's in. On desktop the right padding is the band's own
            width plus a gap, so a long line runs out of room before it runs under the band. On
            mobile the band is full-bleed, so there is nothing to clear: the copy takes the ordinary
            gutter and sits over the faint left tail of the glow, which is the room a description
            needs on a narrow phone. */}
        <div
          ref={listRef}
          className="relative max-h-full w-full overflow-hidden pl-[var(--gutter-left)] pr-[24vw] sm:pr-[calc(46%+2vw)]"
        >
          {/*
            The clip lives on the wrapper above; this is what actually moves. Shifted by a plain
            transform driven straight off the same scroll listener that picks `active`, rather
            than a nested `overflow-y-auto` — one continuous physical scroll, not a separate
            scrollable region with its own scrollbar sitting inside the page's.
          */}
          <div
            ref={innerRef}
            className="transition-transform duration-300 ease-out motion-reduce:transition-none"
          >
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

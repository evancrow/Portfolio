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
      className="mt-[clamp(1.5rem,2.6vw,2.25rem)] border-l border-transparent pl-4 transition-colors duration-500 first:mt-0 data-[active=true]:border-ink motion-reduce:transition-none"
    >
      <button
        type="button"
        onClick={() => onActivate(index)}
        aria-current={live}
        className="block cursor-pointer text-left"
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
    if (!track || !pin) return;

    let queued = 0;

    const apply = () => {
      // Measured from the track's own rect rather than scrollY, so this is correct wherever the
      // section sits and after anything that moves it, the footer's overscroll lift included. The
      // pin's measured height rather than innerHeight is what keeps a dwell honest when a vh and
      // the real viewport disagree, which they do for the whole of an iOS URL bar collapse.
      const unit = pin.getBoundingClientRect().height || 1;
      const p = -track.getBoundingClientRect().top / unit;
      setActive(clamp(Math.floor(p / DWELL), 0, ITEMS.length - 1));
    };

    const onScroll = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        apply();
      });
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(queued);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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
    const unit = pin.getBoundingClientRect().height || 1;
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

      {/* Sticky is already a containing block, so the band needs nothing else to position against. */}
      <div ref={pinRef} className="sticky top-0 flex h-screen items-center">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[46%]">
          <FlutedGlass {...presets.accent} shapes={shapes} className="h-full w-full" />
        </div>

        {/* Same left gutter as every other body section (Work, About), so copy lines up down the
            page regardless of which section it's in. The band's own width plus a gap on the
            right, so a long line runs out of room before it runs under the band at any window
            size. */}
        <div className="relative w-full pl-[var(--gutter-left)] pr-[calc(46%+2vw)]">
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
    </section>
  );
}

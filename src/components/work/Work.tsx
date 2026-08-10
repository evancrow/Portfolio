"use client";

import { useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
} from "lucide-react";
import type { Entry } from "@/content/types";
import { visibleLength } from "@/content/types";
import { renderRichText } from "@/lib/rich-text";
import { EntryIcon } from "@/components/ui/icons";
import { formatDates } from "@/components/timeline/timeline-data";
import { work } from "@/content/work";

/** Descriptions longer than this get clamped behind "Show More". */
const CLAMP_THRESHOLD = 180;

/** Collapsed description height: 3 lines at the paragraph's own `leading-[1.4]`. */
const COLLAPSED_HEIGHT = "4.2em";

/** Work/Education only — omits itself entirely until `location`/`dates` are filled in on the
 *  entry. */
function Meta({ entry }: { entry: Entry }) {
  if (!entry.location || !entry.dates?.length) return null;
  return (
    <p className="font-display text-[0.9em] leading-[1.4] text-mute italic">
      {entry.location}. {formatDates(entry.dates)}.
    </p>
  );
}

export function WorkRow({
  entry,
  isFirst,
  isLast,
}: {
  entry: Entry;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState<string>(COLLAPSED_HEIGHT);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const isLong =
    entry.description !== undefined &&
    visibleLength(entry.description) > CLAMP_THRESHOLD;
  const external = entry.link?.startsWith("http");

  /** Expand/collapse smoothly by animating `height` to a measured pixel value. Collapsing away
   *  from `height: auto` needs a concrete pixel start first, since a transition can't animate
   *  from `auto`. `scrollHeight` reflects the paragraph's natural size regardless of its current
   *  clipped height, so it's safe to measure from either direction. */
  const toggle = () => {
    const full = descriptionRef.current?.scrollHeight;
    if (full) setHeight(`${full}px`);
    if (expanded) {
      requestAnimationFrame(() => setHeight(COLLAPSED_HEIGHT));
    }
    setExpanded((v) => !v);
  };

  return (
    <div
      className={`flex w-full flex-col gap-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:gap-12 ${
        isFirst ? "pt-0" : ""
      } ${isLast ? "" : "border-b border-hair"}`}
    >
      <div className="max-w-[41.5rem]">
        <div className="flex items-center gap-4">
          {entry.icon && <EntryIcon icon={entry.icon} alt="" size={32} />}
          <div className="min-w-0">
            <p className="font-display text-[clamp(1.15rem,1.6vw,1.4rem)] leading-tight font-bold">
              {entry.link ? (
                <a
                  href={entry.link}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="inline-flex items-baseline gap-1 underline decoration-1 underline-offset-4"
                >
                  {entry.title}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-[0.75em] shrink-0 self-center"
                  />
                </a>
              ) : (
                entry.title
              )}
            </p>
            {entry.subheader && (
              <p className="font-display mt-1.5 text-[clamp(1.15rem,1.6vw,1.4rem)] leading-tight">
                {entry.subheader}
              </p>
            )}
          </div>
        </div>

        <div className={entry.icon ? "pl-12" : undefined}>
          {entry.description && (
            // The clip/measure element *is* the paragraph now, not a wrapper around it: `em` in
            // `COLLAPSED_HEIGHT` needs to resolve against this element's own font-size, and on a
            // separate wrapper (inheriting the ambient, larger font-size instead) it didn't, which
            // is why 3 lines of small mobile type used to get clipped a line short. Keeping `mt-4`
            // on this same element is safe — margin sits outside the border box, so it's never
            // touched by `overflow-hidden`/`height`/`scrollHeight` either way.
            <p
              ref={isLong ? descriptionRef : undefined}
              className={`font-display mt-4 text-[clamp(0.95rem,1.3vw,1.1rem)] leading-[1.4] ${
                isLong
                  ? "overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
                  : ""
              }`}
              style={isLong ? { height } : undefined}
              onTransitionEnd={
                isLong
                  ? () => {
                      // Un-pin once fully open, so a later reflow (resize, font swap) isn't
                      // clipped by a stale measured height.
                      if (expanded) setHeight("auto");
                    }
                  : undefined
              }
            >
              {renderRichText(entry.description)}
            </p>
          )}

          <div
            data-expanded={expanded}
            className="mt-2 grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] data-[expanded=true]:grid-rows-[1fr] data-[expanded=true]:opacity-100 motion-reduce:transition-none"
          >
            <div className="overflow-hidden">
              <Meta entry={entry} />
            </div>
          </div>

          <button
            type="button"
            onClick={toggle}
            className="mt-2 inline-flex items-center gap-1 text-[0.9em] transition-colors duration-300 hover:text-mute"
          >
            {expanded ? "Show Less" : "Show More"}
            {expanded ? (
              <ChevronUp aria-hidden="true" className="size-[0.8em]" />
            ) : (
              <ChevronDown aria-hidden="true" className="size-[0.8em]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The crossfade's `to` panel. CrossfadeStage pins one full viewport and dissolves between two
 * panels sized to exactly fill it, and there is always at least one further viewport of scroll
 * between the fade completing and the pin actually releasing (the sticky mechanics need that much
 * room to unpin cleanly). Showing a real role here — a title card, or a copy of `Work`'s own first
 * row — put that same content on screen twice at once during that release window no matter how
 * short the hold was tuned to. Blank paper is the only version of this panel that can't double up
 * with the real section starting right after it: the hero dissolves to paper, and normal scroll
 * carries straight on into `Work` below with nothing shown twice.
 */
export function WorkIntro() {
  return <div className="bg-paper h-full w-full" />;
}

/**
 * Typographic role list — no cards, no icons. Emphasis is what's shown by default
 * (`tier: "primary"`) versus what's behind "Show All" (`tier: "legacy"`), not card size.
 * The Timeline entry point is disabled for now — `components/timeline` is unused but kept in
 * place rather than deleted, pending Phase 3's mobile pass.
 *
 * Every entry stays mounted regardless of `showAll`, so legacy rows collapse/expand with a smooth
 * height transition instead of popping in and out of the DOM.
 *
 * Carries `id="work"` itself, so `#work` (the footer nav link) lands straight on the scrollable
 * list rather than on the crossfade's blank `to` panel.
 */
export function Work() {
  const [showAll, setShowAll] = useState(false);
  const hasLegacy = work.some((entry) => entry.tier === "legacy");
  const visible = work.filter((entry) => entry.tier !== "legacy" || showAll);
  const firstVisibleTitle = visible[0]?.title;
  const lastVisibleTitle = visible[visible.length - 1]?.title;

  return (
    <section id="work" className="w-full pt-[8vh] pb-[6vh]">
      <h2 className="sr-only">Work</h2>
      <div className="mx-auto w-full max-w-[72rem] px-[6vw]">
        {work.map((entry) => {
          const active = entry.tier !== "legacy" || showAll;
          return (
            <div
              key={entry.title}
              data-active={active}
              className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-500 data-[active=true]:grid-rows-[1fr] data-[active=true]:opacity-100 motion-reduce:transition-none"
            >
              <div className="overflow-hidden">
                <WorkRow
                  entry={entry}
                  isFirst={entry.title === firstVisibleTitle}
                  isLast={entry.title === lastVisibleTitle}
                />
              </div>
            </div>
          );
        })}
        {hasLegacy && (
          <p className="font-display pt-10 text-[clamp(1rem,1.3vw,1.15rem)] leading-[1.4]">
            <em>
              {showAll ? "To see highlighted roles," : "To see all roles,"}
            </em>{" "}
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="-my-2 inline-flex items-center gap-1 py-2 transition-colors duration-300 hover:text-mute"
            >
              {showAll ? "Show Less" : "Show All"}
              {showAll ? (
                <ChevronsUp aria-hidden="true" className="size-[0.8em]" />
              ) : (
                <ChevronsDown aria-hidden="true" className="size-[0.8em]" />
              )}
            </button>
          </p>
        )}
      </div>
    </section>
  );
}

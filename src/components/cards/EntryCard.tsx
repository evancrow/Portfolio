"use client";

import { useState } from "react";
import type { Entry } from "@/content/types";
import { visibleLength } from "@/content/types";
import { renderRichText } from "@/lib/rich-text";
import { EntryIcon } from "@/components/ui/icons";
import { EntryMetadata } from "./EntryMetadata";
import { EntryModal } from "./EntryModal";

/** Descriptions longer than this get clamped with a "View more" affordance. */
const CLAMP_THRESHOLD = 180;

const CARD_BASE =
  "group flex w-full flex-col items-center justify-start rounded-[10px] p-0 text-left sm:p-3";
const TAPPABLE =
  "cursor-pointer hover:bg-linear-to-r hover:from-transparent hover:to-[rgba(205,205,205,0.25)]";

function CardBody({
  entry,
  showMetadata,
}: {
  entry: Entry;
  showMetadata: boolean;
}) {
  const isLong =
    entry.description !== undefined &&
    visibleLength(entry.description) > CLAMP_THRESHOLD;

  return (
    <>
      <div className="flex w-full flex-row items-center justify-center gap-[18px]">
        {entry.icon && <EntryIcon icon={entry.icon} alt={entry.title} />}
        <div
          className="flex w-full flex-col"
          style={{ marginTop: entry.subheader ? 11 : 1 }}
        >
          <p className="w-full text-[1.25em] font-medium">{entry.title}</p>
          {entry.subheader && (
            <p className="-mt-px pb-[8px] text-[1em] font-normal text-muted [font-variant:all-small-caps] sm:text-[0.95em]">
              {entry.subheader}
            </p>
          )}
        </div>
      </div>

      {entry.description && (
        <div className="relative w-full">
          <p
            className={`w-full pt-[10px] text-[0.85em] leading-[1.25em] sm:text-[0.9em] sm:leading-[1.3em] ${
              isLong ? "line-clamp-3" : ""
            }`}
          >
            {renderRichText(entry.description)}
          </p>
          {isLong && (
            <span className="relative mt-[8px] inline-block text-[0.8em] after:absolute after:bottom-[-2px] after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-ink after:transition-transform after:duration-300 group-hover:after:origin-left group-hover:after:scale-x-100 sm:text-[0.85em]">
              View more
            </span>
          )}
        </div>
      )}

      {showMetadata && entry.platforms && (
        <EntryMetadata header="Platforms" values={entry.platforms} />
      )}
      {showMetadata && entry.languages && (
        <EntryMetadata header="Languages" values={entry.languages} />
      )}
    </>
  );
}

/**
   One entry rendered as a card. Opens a detail modal unless the entry sets
   `disableModal`, in which case it links out (or is inert with no link).
*/
export function EntryCard({
  entry,
  showMetadata = true,
}: {
  entry: Entry;
  showMetadata?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const body = <CardBody entry={entry} showMetadata={showMetadata} />;

  if (entry.disableModal) {
    if (!entry.link) {
      return <div className={CARD_BASE}>{body}</div>;
    }

    const external = entry.link.startsWith("http");
    return (
      <a
        href={entry.link}
        download={entry.download}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={`${CARD_BASE} ${TAPPABLE} no-underline`}
      >
        {body}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${CARD_BASE} ${TAPPABLE}`}
      >
        {body}
      </button>
      <EntryModal entry={entry} open={open} onOpenChange={setOpen} />
    </>
  );
}

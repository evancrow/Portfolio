"use client";

import { ArrowUpRight } from "lucide-react";
import type { Entry } from "@/content/types";
import { renderRichText } from "@/lib/rich-text";
import { formatDates } from "./timeline-data";

/** The clicked-flute detail panel — sits in the same slot as `TimelineAxis`'s cursor label, which
 *  cross-fades out as this fades in (handled by the caller, not here). */
export function TimelineDetail({ entry }: { entry: Entry }) {
  const external = entry.link?.startsWith("http");

  return (
    <div>
      <p className="font-display text-[clamp(1.9rem,2.8vw,2.5rem)] leading-tight font-bold">
        {entry.link ? (
          <a
            href={entry.link}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="inline-flex items-baseline gap-1 underline decoration-1 underline-offset-4"
          >
            {entry.title}
            <ArrowUpRight aria-hidden="true" className="size-[0.7em] shrink-0 self-center" />
          </a>
        ) : (
          entry.title
        )}
      </p>
      {entry.subheader && (
        <p className="font-display mt-1 text-[clamp(1.3rem,1.8vw,1.6rem)] leading-tight text-mute">
          {entry.subheader}
        </p>
      )}
      {entry.description && (
        <p className="font-display mt-4 text-[clamp(1.05rem,1.4vw,1.2rem)] leading-[1.4]">
          {renderRichText(entry.description)}
        </p>
      )}
      {entry.location && entry.dates?.length ? (
        <p className="font-display mt-4 text-[clamp(1.05rem,1.35vw,1.2rem)] leading-[1.4] text-mute italic">
          {entry.location}. {formatDates(entry.dates)}.
        </p>
      ) : null}
    </div>
  );
}

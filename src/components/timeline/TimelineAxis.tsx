"use client";

import type { RefObject } from "react";

/**
 * Three date labels for the Timeline's text column, all written by `textContent` from
 * `TimelineView`'s pan/zoom loop rather than props — they change every panned frame, and a prop
 * would cost a render each time. This component only renders the DOM nodes and positions them; it
 * never sets their text itself.
 *
 * `topInset`/`bottomInset` come from `TimelineView`'s own `EDGE_INSET_TOP`/`BOTTOM` — the same
 * numbers the flute column's feather is built from — rather than being repeated here, so the two
 * can't drift apart. Only the flute column fades at the top/bottom of the view; these edge labels
 * stay fully legible at any scroll/zoom position.
 */
export function TimelineAxis({
  cursorRef,
  topRef,
  bottomRef,
  topInset,
  bottomInset,
  hideCursor,
}: {
  cursorRef: RefObject<HTMLParagraphElement | null>;
  topRef: RefObject<HTMLParagraphElement | null>;
  bottomRef: RefObject<HTMLParagraphElement | null>;
  /** Fraction of the view's height, 0..1. */
  topInset: number;
  bottomInset: number;
  /** True once a flute is selected — the cursor label cross-fades out for `TimelineDetail`. */
  hideCursor: boolean;
}) {
  return (
    <>
      <p
        ref={topRef}
        className="font-display absolute inset-x-0 text-[clamp(0.9rem,1.05vw,1rem)] text-mute"
        style={{ top: `${topInset * 100}%` }}
      />
      <p
        ref={bottomRef}
        className="font-display absolute inset-x-0 text-[clamp(0.9rem,1.05vw,1rem)] text-mute"
        style={{ top: `${bottomInset * 100}%` }}
      />
      <p
        ref={cursorRef}
        className={`font-display absolute inset-x-0 top-1/2 -translate-y-1/2 text-[clamp(1.9rem,2.8vw,2.5rem)] leading-none font-bold transition-opacity duration-300 motion-reduce:transition-none ${
          hideCursor ? "opacity-0" : "opacity-100"
        }`}
      />
    </>
  );
}

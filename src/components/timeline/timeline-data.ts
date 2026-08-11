import type { DateRange, Entry } from "@/content/types";

export type Category = "work" | "education";

export type TimelineEntry = {
  key: string;
  entry: Entry;
  category: Category;
  earliestStart: Date;
  latestEnd: Date;
};

export interface TimelineSpan {
  /** The `TimelineEntry.key` this span belongs to. */
  entryKey: string;
  start: Date;
  end: Date;
  lane: number;
}

interface GroupTimelineSpan extends TimelineSpan {
  subspans: Omit<TimelineSpan, "lane">[];
}

export type TimelineData = {
  /** One per entry, most-recent/ongoing first — the content list's reading order. */
  entries: TimelineEntry[];
  /** One per date range, packed into the minimum overlap-free lanes. */
  spans: TimelineSpan[];
  laneCount: number;
  rangeStart: Date;
  rangeEnd: Date;
};

/** Roughly a month, for converting between px and ms in the pan/zoom math. */
export const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

const MONTH_ABBR = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/**
 * Parses the free-form date strings `work.ts`/`education.ts` author — a bare year ("2021") or
 * "Mon YYYY" ("Jun 2023") — into a **local** date, by hand. `new Date("2021")` parses as UTC while
 * `new Date("Jun 2023")` parses as local, a silent offset between the two formats this content
 * mixes, so both are built explicitly from `new Date(year, monthIndex, day)` instead of handed to
 * the `Date` constructor's own string parsing. `undefined` or "Present" means ongoing, which
 * resolves to now rather than failing to parse.
 */
export function parseDate(input: string | undefined): Date {
  if (!input) return new Date();
  const trimmed = input.trim();
  if (trimmed.toLowerCase() === "present") return new Date();

  const bareYear = /^(\d{4})$/.exec(trimmed);
  if (bareYear) return new Date(Number(bareYear[1]), 0, 1);

  const monthYear = /^([A-Za-z]+)\s+(\d{4})$/.exec(trimmed);
  if (monthYear) {
    const monthIndex = MONTH_ABBR.indexOf(
      monthYear[1].slice(0, 3).toLowerCase()
    );
    if (monthIndex !== -1) return new Date(Number(monthYear[2]), monthIndex, 1);
  }

  // Last-resort fallback for a shape neither pattern above matches.
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Resolves one `DateRange` into concrete start/end dates, once — reused by both the entry's own
 *  earliest/latest bounds and its spans, so an ongoing entry doesn't get two different "now"s from
 *  being parsed twice. */
function parseRange(d: DateRange): { start: Date; end: Date } {
  const ongoing = !d.end || d.end.trim().toLowerCase() === "present";
  return {
    start: parseDate(d.start),
    end: ongoing ? new Date() : parseDate(d.end),
  };
}

/** Spans within this of each other still count as conflicting for lane assignment, even without
 *  literally overlapping — two bars butted right up against each other read as one continuous
 *  flute, so a close-but-not-quite-overlapping pair (a role ending the same month the next begins)
 *  needs its own lane too, to render as a visible side-by-side hstack rather than a seam. */
const LANE_GAP_MS = 45 * 24 * 60 * 60;

/**
 * Greedy interval scheduling: sorted by start, each span takes the first lane whose last-placed
 * span ended (plus `LANE_GAP_MS`'s buffer) before this one starts, opening a new lane only when
 * every existing one is still occupied. This is what makes overlapping — or merely adjacent —
 * stretches sit in separate columns instead of stacking illegibly in one.
 */
export function packLanes(
  spans: Omit<GroupTimelineSpan, "lane">[]
): TimelineSpan[] {
  const sorted = [...spans].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );
  const laneEnds: number[] = [];
  const sortedSpans: TimelineSpan[] = [];

  sorted.forEach((span) => {
    const startMs = span.start.getTime();
    let lane = laneEnds.findIndex((end) => end + LANE_GAP_MS <= startMs);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(span.end.getTime());
    } else {
      laneEnds[lane] = span.end.getTime();
    }

    span.subspans.forEach((subspan) => {
      sortedSpans.push({ ...subspan, lane });
    });
  });

  return sortedSpans;
}

/** Combines work + education, keeping only entries with `dates` populated — anything without is
 *  simply absent from the timeline rather than rendered empty. */
export function buildTimeline(
  work: Entry[],
  education: Entry[]
): TimelineData | null {
  const source = [
    ...work.map((entry) => ({ entry, category: "work" as const })),
    ...education.map((entry) => ({ entry, category: "education" as const })),
  ].filter((s) => (s.entry.dates?.length ?? 0) > 0);

  if (source.length === 0) return null;

  const entries: TimelineEntry[] = [];
  const rawSpans: Omit<GroupTimelineSpan, "lane">[] = [];

  for (const { entry, category } of source) {
    const key = `${category}:${entry.title}`;
    const ranges = entry.dates!.map(parseRange);
    const earliestStart = new Date(
      Math.min(...ranges.map((r) => r.start.getTime()))
    );
    const latestEnd = new Date(Math.max(...ranges.map((r) => r.end.getTime())));

    entries.push({
      key,
      entry,
      category,
      earliestStart: earliestStart,
      latestEnd: latestEnd,
    });
    rawSpans.push({
      entryKey: key,
      start: earliestStart,
      end: latestEnd,
      subspans: ranges.map((span) => ({
        entryKey: key,
        start: span.start,
        end: span.end,
      })),
    });
  }

  // Most-recent/ongoing first, matching Work's own convention of leading with the current role.
  entries.sort((a, b) => b.earliestStart.getTime() - a.earliestStart.getTime());

  const spans = packLanes(rawSpans);
  const laneCount = spans.reduce((max, s) => Math.max(max, s.lane + 1), 1);

  return {
    entries,
    spans,
    laneCount,
    rangeStart: new Date(Math.min(...spans.map((s) => s.start.getTime()))),
    rangeEnd: new Date(Math.max(...spans.map((s) => s.end.getTime()))),
  };
}

const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const YEAR_FORMAT = new Intl.DateTimeFormat("en-US", { year: "numeric" });
const MONTH_ONLY_FORMAT = new Intl.DateTimeFormat("en-US", { month: "long" });
const MONTH_SHORT_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

/** The large centered cursor label — "August 2026" — or, once the visible span crosses into
 *  multi-decade territory, just "2026". */
export function formatCursor(date: Date, yearMode: boolean): string {
  return yearMode ? YEAR_FORMAT.format(date) : MONTH_YEAR_FORMAT.format(date);
}

/** A top/bottom edge label: bare year in year mode; month-only when it shares the cursor's year
 *  ("July"); month + year when it doesn't, so a span crossing a year boundary still reads
 *  unambiguously ("Dec 2025"). */
export function formatEdge(
  date: Date,
  cursorDate: Date,
  yearMode: boolean
): string {
  if (yearMode) return YEAR_FORMAT.format(date);
  return date.getFullYear() === cursorDate.getFullYear()
    ? MONTH_ONLY_FORMAT.format(date)
    : MONTH_SHORT_YEAR_FORMAT.format(date);
}

/** Formats an entry's date ranges as prose, spanning the earliest start to the latest end rather
 *  than listing each range — a role held twice reads as "From 2020 to Present", not "from 2020 to
 *  2021; from 2022 to Present". Parses each range only to find the min/max; the displayed labels
 *  are still the raw authored strings, not reformatted dates. */
export function formatDates(dates: DateRange[]): string {
  const resolved = dates.map((d) => ({ range: d, ...parseRange(d) }));
  const earliest = resolved.reduce((a, b) => (b.start < a.start ? b : a));
  const latest = resolved.reduce((a, b) => (b.end > a.end ? b : a));
  const ongoing =
    !latest.range.end || latest.range.end.trim().toLowerCase() === "present";
  return `From ${earliest.range.start} to ${ongoing ? "Present" : latest.range.end}`;
}

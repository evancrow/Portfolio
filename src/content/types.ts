/**
   Every icon the site can render. The registry in `components/ui/icons.tsx` is typed
   as `Record<IconKey, ...>`, so adding a key here without an asset fails the build.
*/
export type IconKey =
  | "apple"
  | "exa"
  | "snowflake"
  | "neeva"
  | "ferdasoft"
  | "trivory"
  | "travsolo"
  | "nome"
  | "northeastern"
  | "huntington100"
  | "kaleidoscope"
  | "stealth"
  | "linkedin"
  | "github"
  | "resume";

/**
   One span of time an entry covers. An entry can carry more than one — a role held twice, or a
   degree with a leave of absence — rather than only ever describing a single unbroken stretch.
*/
export interface DateRange {
  /** Free-form, e.g. "2023" or "Jun 2023". */
  start: string;
  /** Omitted, or "Present", for an ongoing range. */
  end?: string;
}

/**
   A single card entry — a work role, project, degree, award, or contact link.
   Shared by every section so one card component renders all of them.
*/
export interface Entry {
  title: string;
  subheader?: string;
  /** Supports `**bold**` markers, rendered by `lib/rich-text`. */
  description?: string;
  icon?: IconKey;
  platforms?: string[];
  languages?: string[];
  link?: string;
  /** Work only — drives which roles show by default vs. behind "Show All". */
  tier?: "primary" | "legacy";
  /** Filename for the anchor's `download` attribute. */
  download?: string;
  /** City, state/country. Work/Education only, feeds the row's meta line and the timeline. */
  location?: string;
  /** Work/Education only — one or more spans, feeds the row's meta line and the timeline. */
  dates?: DateRange[];
  /** Awards/Projects: the glass band's colour when this entry holds the stage. Work/Education:
   * the Timeline's bar/dot colour for this entry. Hex. Falls back to the site's periwinkle when
   * unset. */
  accent?: string;
  /** Lighter offset layer behind `accent`, for the band's soft second shape / bar glow. Hex. */
  accentSoft?: string;
}

/** Visible length of a description, ignoring the `**bold**` markers. */
export function visibleLength(description: string): number {
  return description.replace(/\*\*/g, "").length;
}

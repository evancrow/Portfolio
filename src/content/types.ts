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
  /** Work only — drives big vs. compact cards in the Phase 2 redesign. */
  tier?: "primary" | "legacy";
  /** Follows `link` directly instead of opening the detail modal. */
  disableModal?: boolean;
  /** Filename for the anchor's `download` attribute. */
  download?: string;
}

/** Visible length of a description, ignoring the `**bold**` markers. */
export function visibleLength(description: string): number {
  return description.replace(/\*\*/g, "").length;
}

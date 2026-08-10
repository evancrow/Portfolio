import type { Entry } from "@/content/types";
import { DEFAULT_ACCENT, DEFAULT_ACCENT_SOFT } from "@/content/accent";
import type { GlassShape } from "@/components/fluted-glass";
import { edgeGlow } from "@/components/fluted-glass/edgeGlow";

/**
 * Entries whose `accentSoft` is a genuinely different hue rather than a lighter tint of
 * `accent` — Nome's rose-into-cyan, Oculi's blue-into-indigo, and Apple's teal-into-violet — get
 * the fuller hero-style blend instead of the quiet same-hue accent every other entry uses.
 */
const BLEND_TITLES = new Set(["Nome - Music & Maps", "Apple Swift Student Challenge", "Oculi"]);

/**
 * The two layers behind the band, for whichever entry holds the stage. Each entry carries its own
 * `accent`/`accentSoft` in the content schema rather than a position on a computed ramp, so the
 * colour is something you set per award or project, not something derived from where it sits in
 * the list.
 */
export function accentShapes(entry: Entry): GlassShape[] {
  return edgeGlow({
    edge: "right",
    primary: entry.accent ?? DEFAULT_ACCENT,
    secondary: entry.accentSoft ?? DEFAULT_ACCENT_SOFT,
    blend: BLEND_TITLES.has(entry.title),
  });
}

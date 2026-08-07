import type { Entry } from "@/content/types";
import { EntryCard } from "./EntryCard";

/**
   A titled group of entry cards.
   @param title - Optional group heading (Education, Awards).
   @param entries - Cards to render.
   @param showMetadata - Whether cards show their Platforms/Languages rows.
   @param minColumn - Minimum column width before the grid wraps.
*/
export function EntryGrid({
  title,
  entries,
  showMetadata = true,
  minColumn = 350,
}: {
  title?: string;
  entries: Entry[];
  showMetadata?: boolean;
  minColumn?: number;
}) {
  return (
    <div className="h-full px-[25px] sm:px-[50px]">
      {title && (
        <p className="w-full pb-[20px] text-[2em] font-semibold sm:pb-[25px]">
          {title}
        </p>
      )}
      <div
        className="grid gap-[25px] sm:gap-[11px]"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(min(${minColumn}px, 100%), 1fr))`,
        }}
      >
        {entries.map((entry) => (
          <EntryCard
            key={entry.title}
            entry={entry}
            showMetadata={showMetadata}
          />
        ))}
      </div>
    </div>
  );
}

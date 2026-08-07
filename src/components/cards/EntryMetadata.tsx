/** A labelled row of small-caps chips (Platforms, Languages). */
export function EntryMetadata({
  header,
  values,
}: {
  header: string;
  values: string[];
}) {
  return (
    <div className="flex w-full flex-col">
      <p className="pt-[10px] text-[0.95em] font-normal text-muted [font-variant:all-small-caps]">
        {header}
      </p>
      <div className="flex gap-[8px]">
        {values.map((value) => (
          <p
            key={value}
            className="text-[1em] font-light [font-variant:all-small-caps]"
          >
            {value}
          </p>
        ))}
      </div>
    </div>
  );
}

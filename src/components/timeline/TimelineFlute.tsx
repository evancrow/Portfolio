"use client";

type Props = {
  /** Attaches the host element so the render loop can write its `transform` every frame. */
  hostRef: (el: HTMLButtonElement | null) => void;
  /** Attaches the rotated title span so the render loop can position/hide it every frame. */
  labelRef: (el: HTMLSpanElement | null) => void;
  /** Px — changes only with zoom, so this is a normal React-rendered box size. */
  left: number;
  width: number;
  height: number;
  title: string;
  accent: string;
  /** True once some other flute is selected — this one washes out rather than competing. */
  dimmed: boolean;
  onSelect: () => void;
};

/** One entry's span on the Timeline: a flute filled with its own accent color, with the role
 *  title rotated 90° near the top. Position within the flute column is written by the caller's
 *  per-frame loop (`transform`, via `hostRef`) — `left`/`width`/`height` come from React since
 *  they only ever change with zoom. */
export function TimelineFlute({
  hostRef,
  labelRef,
  left,
  width,
  height,
  title,
  accent,
  dimmed,
  onSelect,
}: Props) {
  const background = `linear-gradient(45deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))`;

  return (
    <button
      ref={hostRef}
      type="button"
      onClick={onSelect}
      aria-label={title}
      data-dimmed={dimmed}
      className="focus-visible:ring-accent absolute top-0 cursor-pointer overflow-hidden rounded-xl outline-none transition-opacity duration-300 focus-visible:ring-2 data-[dimmed=true]:opacity-25"
      style={{
        left,
        width,
        height,
        background,
      }}
    >
      <span
        ref={labelRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 text-[0.7rem] font-medium tracking-wide whitespace-nowrap text-white opacity-0 transition-opacity duration-200 [writing-mode:vertical-rl]"
      >
        {title}
      </span>
    </button>
  );
}

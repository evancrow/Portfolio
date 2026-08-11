import Image, { type StaticImageData } from "next/image";
import { Download, Github } from "lucide-react";
import type { IconKey } from "@/content/types";

import apple from "@/assets/icons/apple.png";
import exa from "@/assets/icons/exa.jpg";
import ferdasoft from "@/assets/icons/ferdasoft.png";
import huntington100 from "@/assets/icons/huntington100.png";
import kaleidoscope from "@/assets/icons/kaleidoscope.png";
import neeva from "@/assets/icons/neeva.png";
import nome from "@/assets/icons/nome.jpg";
import northeastern from "@/assets/icons/northeastern.png";
import snowflake from "@/assets/icons/snowflake.png";
import travsolo from "@/assets/icons/travsolo.jpg";
import trivory from "@/assets/icons/trivory.png";

type Mark = (props: { size: number }) => React.ReactElement;

/** Stealth placeholder — dashed inner square on dark slate, neutral until the company unstealths. */
const StealthMark: Mark = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" rx="5" fill="#2A2A2A" />
    <rect
      x="6"
      y="6"
      width="12"
      height="12"
      rx="2"
      fill="none"
      stroke="#888888"
      strokeWidth="1.5"
      strokeDasharray="2,2"
    />
  </svg>
);

/** LinkedIn brand mark — not available in lucide-react. */
const LinkedInMark: Mark = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="#0A66C2"
    aria-hidden="true"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

/** Lucide glyph on a solid rounded tile, matching the logo footprint. */
const tile = (
  Glyph: typeof Github,
  background: string
): Mark =>
  function Tile({ size }) {
    return (
      <div
        className="flex items-center justify-center rounded-[5px]"
        style={{ width: size, height: size, backgroundColor: background }}
      >
        <Glyph size={size * 0.55} strokeWidth={1.5} color="white" />
      </div>
    );
  };

/**
   Every icon the site renders. Typed as a total map over IconKey, so a key added
   in content/types.ts without an asset here is a build error.
*/
const registry: Record<IconKey, StaticImageData | Mark> = {
  apple,
  exa,
  snowflake,
  neeva,
  ferdasoft,
  trivory,
  travsolo,
  nome,
  northeastern,
  huntington100,
  kaleidoscope,
  stealth: StealthMark,
  linkedin: LinkedInMark,
  github: tile(Github, "#000000"),
  resume: tile(Download, "#555555"),
};

/**
   Renders an entry's icon at a fixed square size.
   @param icon - Key into the icon registry.
   @param alt - Alt text; empty for decorative use alongside a visible title.
   @param size - Rendered edge length in pixels.
*/
export function EntryIcon({
  icon,
  alt,
  size = 40,
}: {
  icon: IconKey;
  alt: string;
  size?: number;
}) {
  const asset = registry[icon];

  if (typeof asset === "function") {
    const Component = asset;
    return (
      <span className="flex shrink-0 items-center justify-center">
        <Component size={size} />
      </span>
    );
  }

  return (
    <Image
      src={asset}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-[5px] object-contain"
      style={{ width: size, height: size }}
    />
  );
}

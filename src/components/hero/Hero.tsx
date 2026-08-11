import { site } from "@/content/site";
import { HeroPanel } from "./HeroPanel";
import { renderRichText } from "@/lib/rich-text";

/**
 * Full-bleed opening panel. Geometry is transcribed from the 1512x982 design frame: text block
 * at x=431 (28.5%), headline New York Bold 128px (8.466vw), both at 100% leading. Body runs
 * smaller than the frame's literal 32px (2.116vw) — trimmed a size down against the headline.
 * The periwinkle arch rises from the bottom edge rather than sitting beside the name — that's
 * `presets.hero`, not this component.
 */
export function Hero() {
  return (
    <HeroPanel>
      {/* The bleed is padding here, so the lockup centres in the viewport while the glass
          behind it carries on under the URL bar. */}
      <div className="flex h-full flex-col justify-center pb-[var(--bleed)]">
        <div className="fade-rise mx-auto w-full max-w-[1512px] px-[6vw] sm:px-[28.5%]">
          <h1 className="font-display text-[clamp(3.3rem,8.466vw,9.5rem)] leading-none font-bold tracking-[-0.01em]">
            {site.name}
          </h1>
          <p className="font-display mt-[1.6vw] text-[clamp(1.15rem,1.9vw,2.15rem)] leading-none">
            {renderRichText(site.hero)}
          </p>
        </div>
      </div>
    </HeroPanel>
  );
}

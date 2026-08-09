import { FlutedGlass, presets } from "@/components/fluted-glass";
import { site } from "@/content/site";

/**
 * Full-bleed opening panel. Geometry is transcribed from the 1512x982 design frame: text block
 * at x=431 (28.5%), headline New York Bold 128px (8.466vw), both at 100% leading. Body runs
 * smaller than the frame's literal 32px (2.116vw) — trimmed a size down against the headline.
 * The periwinkle arch rises from the bottom edge rather than sitting beside the name — that's
 * `presets.hero`, not this component.
 */
export function Hero() {
  return (
    <FlutedGlass
      {...presets.hero}
      className="h-full"
      fallback="linear-gradient(to top, #8ea8f5 0%, rgba(142,168,245,0) 55%)"
    >
      <div className="flex h-full flex-col justify-center">
        <div className="fade-rise mx-auto w-full max-w-[1512px] px-[6vw] sm:px-[28.5%]">
          <h1 className="font-display text-[clamp(2.75rem,8.466vw,9.5rem)] leading-none font-bold tracking-[-0.01em]">
            {site.name}
          </h1>
          <p className="font-display mt-[1.6vw] text-[clamp(0.95rem,1.9vw,2.15rem)] leading-none">
            Member of Technical Staff at Exa, builder,
            <br />
            and designer. Based in San Francisco, California.
          </p>
        </div>
      </div>
    </FlutedGlass>
  );
}

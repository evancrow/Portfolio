import { site } from "@/content/site";

/**
 * Standalone full-height section, last before the footer. No glass — plain paper, ink type,
 * bottom-leading aligned at the left gutter.
 */
export function About() {
  return (
    <section id="about" className="min-h-screen w-full">
      <div className="flex min-h-screen flex-col justify-end pr-[6vw] pb-[10vh] pl-[var(--gutter-left)] text-ink">
        <div className="max-w-[38rem]">
          <h2 className="font-display text-[clamp(3rem,6vw,5.5rem)] leading-none italic">Hi,</h2>
          <p className="font-display mt-6 text-[clamp(1rem,1.6vw,1.35rem)] leading-[1.4]">
            {site.bio}
          </p>
          <p className="font-display mt-6 text-[clamp(1rem,1.6vw,1.35rem)] leading-[1.4]">
            <em>Graduating from</em> Northeastern University <em>in</em> December 2026
            <br />
            B.S. Computer Science &amp; Economics
          </p>
        </div>
      </div>
    </section>
  );
}

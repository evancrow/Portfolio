import { site } from "@/content/site";
import { education } from "@/content/education";

const northeastern = education.find((entry) => entry.icon === "northeastern")!;

export function About() {
  return (
    <section id="about" className="min-h-screen w-full">
      <div className="flex min-h-screen flex-col justify-end pr-[6vw] pb-[10vh] pl-[var(--gutter-left)] text-ink">
        <div className="max-w-[45rem]">
          <h2 className="font-display text-[clamp(3rem,6vw,5.5rem)] leading-none italic">Hi,</h2>
          <p className="font-display mt-6 text-[clamp(1rem,1.6vw,1.35rem)] leading-[1.4]">
            {site.bio}
          </p>
          <p className="font-display mt-[clamp(1.75rem,4vw,1.5rem)] text-[clamp(1rem,1.6vw,1.35rem)] leading-[1.4]">
            Graduating from <b>{northeastern.title}</b> in{" "}
            {northeastern.description?.replace("Graduating ", "")}
            <br />
            {northeastern.subheader}
          </p>
        </div>
      </div>
    </section>
  );
}

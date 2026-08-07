import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Section } from "@/components/layout/Section";
import { SectionSpacer } from "@/components/layout/SectionSpacer";
import { Hero } from "@/components/hero/Hero";
import { EntryGrid } from "@/components/cards/EntryGrid";
import { site } from "@/content/site";
import { work } from "@/content/work";
import { projects } from "@/content/projects";
import { education } from "@/content/education";
import { awards } from "@/content/awards";
import { links } from "@/content/links";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden">
      <Header />
      <Hero />

      <Section id="work" primary="Work" secondary="Experience">
        <EntryGrid entries={work} showMetadata={false} />
        <SectionSpacer />
      </Section>

      <Section id="projects" primary="Projects">
        <EntryGrid entries={projects} />
        <SectionSpacer />
      </Section>

      <Section id="about" primary="About">
        <p className="max-w-[1000px] px-[25px] text-left text-[1.1em] leading-[1.3] sm:px-[50px] sm:text-[1.3em] sm:leading-[1.4]">
          {site.bio}
        </p>

        <div className="flex w-full flex-col gap-[55px]">
          <EntryGrid title="Education" entries={education} />
          <EntryGrid title="Awards" entries={awards} />
        </div>

        <SectionSpacer variant="scribble" />
      </Section>

      <Section id="connect" primary="Connect">
        <EntryGrid entries={links} minColumn={250} />
      </Section>

      <Footer />
    </div>
  );
}

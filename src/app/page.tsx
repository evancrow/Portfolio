import { CrossfadeStage } from "@/components/crossfade-stage";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/hero/Hero";
import { About } from "@/components/about/About";
import { Work, WorkIntro } from "@/components/work/Work";
import { AwardsProjects } from "@/components/awards-projects/AwardsProjects";

export default function Home() {
  return (
    <div id="page-root" className="relative flex min-h-screen w-full flex-col">
      {/*
        `page-lift` is the page's half of the footer's overscroll reveal: everything above the
        footer rides up by the pull, and the footer's own glass slab grows into the strip it
        vacates.

        No `overflow-x-hidden` here: it computes `overflow-y: auto`, turning this div into a
        scroll container that `CrossfadeStage`'s `position: sticky` pins against instead of the
        viewport — the pin never engages and the hero just scrolls away. `html { overflow-x:
        hidden }` in globals.css is the page-wide horizontal guard and doesn't have this problem
        (the root's overflow propagates to the viewport, not to a box the pin sticks inside).
      */}
      <div className="page-lift flex w-full flex-col">
        {/*
          `WorkIntro` is blank paper, so `gap`/`in`/`tail` are crushed to a nearly instant beat
          rather than the defaults tuned for fading *into* something: there's nothing on the `to`
          side for those phases to reveal, so holding them at their normal length was just more
          scroll with nothing happening on screen. `hold`/`out` stay put — that's Hero's own
          fade-out, the animation this stage exists to show. The unavoidable last viewport of
          scroll (`CrossfadeStage`'s own `+1`, needed for the sticky pin to physically release) is
          where `Work` actually slides up into view, so it isn't dead time either.
        */}
        <CrossfadeStage
          from={<Hero />}
          to={<WorkIntro />}
          phases={{ gap: 0.05, in: 0.05, tail: 0.05 }}
          // Same total scroll room as `phases` above budgets (`touchPhases` never touches the
          // track's height), but the fade itself starts almost immediately and finishes within
          // about one thumb-swipe, instead of `hold`/`out`'s desktop-tuned pace spending most of
          // a first swipe on motion too subtle to read as anything happening.
          touchPhases={{ hold: 0.08, out: 0.45 }}
          // `WorkIntro` is opaque paper on an already-paper-backgrounded page, so only it needs to
          // animate in — `Hero` wraps a full-screen WebGL canvas, and an animated `opacity` over
          // one forces an expensive translucent composite for the whole transition. See
          // `CrossfadeStage`'s `mode` prop.
          mode="cover"
        />

        <Work />

        <AwardsProjects />

        <About />
      </div>

      <Footer />
    </div>
  );
}

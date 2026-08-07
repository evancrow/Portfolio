import { site } from "@/content/site";
import { AnimatedBlobs } from "./AnimatedBlobs";

/** Full-height opening panel: name, one-line profile, animated backdrop. */
export function Hero() {
  return (
    <div className="relative z-1 mx-auto mt-[20px] flex min-h-[calc(100vh-var(--header-height)*1.75)] w-[calc(100%-50px)] flex-col items-center justify-center gap-[75px] overflow-visible px-[25px] py-[30px] sm:mt-0 sm:min-h-[calc(100vh-var(--header-height))] sm:w-[calc(100%-100px)] sm:p-0">
      <AnimatedBlobs />

      <div className="mt-[calc(-1.1*var(--header-height))] flex flex-col items-center justify-center sm:mt-[calc(-0.5*var(--header-height))]">
        <h1 className="m-0 text-center text-[5em] leading-none font-semibold sm:text-[4.5em]">
          {site.name}
        </h1>
        <p className="w-[95%] text-center text-[1.1em] leading-[1.3] font-normal sm:w-[60%] sm:text-[1.3em] sm:leading-[1.4]">
          {site.hero}
        </p>
      </div>
    </div>
  );
}

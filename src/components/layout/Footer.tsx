import { site } from "@/content/site";

/** Renders on the server, so the year resolves at build time. */
export function Footer() {
  return (
    <footer className="px-[25px] py-[10px] text-center text-[0.8em] leading-[1.5em] text-muted sm:px-[50px] sm:pt-[40px] sm:pb-[10px] sm:text-[1em]">
      <p>
        Designed &amp; Developed by {site.name}.
        <br />
        Copyright © {new Date().getFullYear()} {site.name}. All Rights Reserved.
      </p>
    </footer>
  );
}

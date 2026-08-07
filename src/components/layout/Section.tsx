import type { ReactNode } from "react";

/**
   A full-width page section with a two-tone heading and an anchor target.
   @param id - Anchor id used by the header nav.
   @param primary - First word of the heading.
   @param secondary - Optional second word.
*/
export function Section({
  id,
  primary,
  secondary,
  children,
}: {
  id: string;
  primary: string;
  secondary?: string;
  children?: ReactNode;
}) {
  return (
    <section
      id={id}
      className="flex w-full scroll-mt-(--header-height) flex-col items-start justify-center gap-[35px] pb-[30px] sm:gap-[45px]"
    >
      <h2 className="m-0 w-full px-[25px] pt-[35px] text-left text-[2.5em] leading-none font-black sm:px-[50px] sm:pt-[55px] sm:text-[3em]">
        {primary} {secondary}
      </h2>
      {children}
    </section>
  );
}

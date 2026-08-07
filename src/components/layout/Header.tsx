import { site } from "@/content/site";

/** Fixed-height nav bar of in-page anchors. */
export function Header() {
  return (
    <header className="relative z-10 flex h-(--header-height) items-center justify-center self-stretch px-[25px] sm:px-[50px]">
      <nav className="flex items-center gap-[35px] sm:gap-[70px]">
        {site.sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="group relative text-[1em] font-normal no-underline sm:text-[1.25em]"
          >
            <span className="relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-full after:origin-right after:scale-x-0 after:bg-ink after:transition-transform after:duration-300 group-hover:after:origin-left group-hover:after:scale-x-100">
              {section.label}
            </span>
          </a>
        ))}
      </nav>
    </header>
  );
}

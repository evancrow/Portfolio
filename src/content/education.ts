import type { Entry } from "./types";

// PLACEHOLDER — `dates` below (except Northeastern's stated Dec 2026 end) are stand-ins for the
// timeline's layout, not confirmed. Replace with actual values before shipping.
export const education: Entry[] = [
  {
    icon: "northeastern",
    title: "Northeastern University",
    subheader: "B.S. Computer Science & Economics",
    accent: "rgb(201, 51, 52)",
    description: "Graduating December 2026",
    location: "Boston, Massachusetts",
    dates: [{ start: "Sep 2022", end: "Dec 2026" }],
  },
  {
    icon: "kaleidoscope",
    title: "Khoury College of Computer Sciences Kaleidoscope",
    subheader: "President",
    description:
      "President of Khoury College's club council and primary liaison to the Dean's Office. Support 40+ student organizations across Northeastern's Boston, Oakland, London, and New York campuses. Launched programs connecting clubs with industry and expanding mentorship across global campuses. Rebuilt internal operations as a live system that automates funding, event approvals, and attendance.",
    link: "https://markefontenot.notion.site/Welcome-to-Kaleidoscope-30ff5648b2344623bb5a9c7a7e3dc674",
    location: "Boston, Massachusetts",
    dates: [{ start: "Sep 2024" }],
    accent: "rgb(48, 99, 152)"
  },
];

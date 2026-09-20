import type { Entry } from "./types";

export const projects: Entry[] = [
  {
    title: "Oculi",
    description:
      "Accessibility framework for SwiftUI enabling motor-impaired users to navigate Apple devices using head and eye movements. **Winner of the Apple WWDC 2022 Swift Student Challenge.** Publicly released with **iOS and iPadOS 18**.",
    languages: ["Swift", "SwiftUI", "CoreML", "Vision"],
    link: "https://github.com/evancrow/Oculi",
    accent: "#6979df",
    accentSoft: "#a37da5",
  },
  {
    icon: "nome",
    title: "Nome - Music & Maps",
    description:
      'Navigation app that integrates with your music library to build a queue synced to your trip duration. Recognized by Apple in "Our Favorites" and "Hot New Apps" and featured by media outlets such as Product Hunt and iMore.',
    platforms: ["iOS", "WatchOS", "CarPlay", "Web"],
    accent: "#243546",
    accentSoft: "#393f42",
  },
  {
    title: "Dish Surfboards",
    description:
      "Handcrafted sustainable surfboards made in New England. Board member and advisor.",
    platforms: ["Web", "Cloud"],
    languages: ["Next.js", "TypeScript"],
    link: "https://dishsurfboards.com",
    accent: "#88aebf",
    accentSoft: "#DDE0E3",
  },
];

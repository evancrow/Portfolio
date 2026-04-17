import React from "react";
import Section from "../Components/Section/Section";
import { SectionCardGrid } from "../Components/Section/SectionCard/SectionCard";
import { Icons } from "../Icons/Icons";

export const Projects = () => {
  return (
    <Section primary="Projects" id="Projects">
      <SectionCardGrid
        cards={[
          {
            title: "",
            values: [
              {
                title: "Oculi",
                description:
                  "Accessibility framework for SwiftUI enabling motor-impaired users to navigate Apple devices using head and eye movements. **Winner of the Apple WWDC 2022 Swift Student Challenge.** Publicly released with **iOS and iPadOS 18**.",
                languages: ["Swift", "SwiftUI", "CoreML", "Vision"],
                link: "https://github.com/evancrow/Oculi",
              },
              {
                icon: Icons.NomeIcon,
                title: "Nome - Music & Maps",
                description:
                  'Navigation app that integrates with your music library to build a queue synced to your trip duration. Recognized by Apple in "Our Favorites" and "Hot New Apps" and featured by media outlets such as Product Hunt and iMore.',
                platforms: ["iOS", "WatchOS", "CarPlay", "Web"],
              },
              {
                title: "NUMacro",
                description:
                  "Website for NUMacro, a global macro investing club I co-founded. Built from scratch to showcase research, strategy, and community. Deployed with Vercel and optimized for clarity, speed, and accessibility.",
                platforms: ["Web", "Cloud"],
                languages: ["Next.js", "TypeScript"],
                link: "https://numacro.vercel.app/",
              },
            ],
          },
        ]}
      />

      <div className="sectionSpacer">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="79"
          height="72"
          viewBox="0 0 79 72"
          fill="none"
        >
          <path
            opacity="0.365565"
            d="M55.6125 71.6768C49.3367 5.43628 13.4366 58.285 1.5 36.7501C57.1509 16.9673 63.8397 73.9128 64.6842 68.5751C62.3129 15.5205 29.0442 12.2206 42.2187 54.5983C53.3661 52.2521 59.329 79.4606 76.5 67.2826C13.5003 65.7398 72.9431 4.71678 67.8817 0.963256"
            stroke="#1E1E1E"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </Section>
  );
};

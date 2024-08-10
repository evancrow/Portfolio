import React from "react";
import "./Work.css";
import Section from "../Section/Section";
import { SectionCardGrid } from "../Section/SectionCard/SectionCard";
import { Icons } from "../Shared/Icons";

export const Work = () => {
  return (
    <Section primary="Work" secondary="Experience" id="Work">
      <SectionCardGrid
        cards={[
          {
            title: "Professional",
            values: [
              {
                icon: Icons.AppleIcon,
                title: "Apple",
                subheader: "Software Engineer",
                link: "https://apple.com/",
              },
              {
                icon: Icons.SnowflakeIcon,
                title: "Snowflake",
                subheader: "Software Engineer",
                description:
                  "Continued my work from Neeva as the youngest intern at Snowflake. Full stack development across teams in machine learning, data marketplace, data distribution, and data query.",
                platforms: ["Web"],
                languages: ["React", "TypeScript", "GOLANG", "NODE.JS", "SQL"],
                link: "https://www.snowflake.com/",
              },
              {
                icon: Icons.NeevaIcon,
                title: "Neeva",
                subheader: "Software Engineer",
                description:
                  "Acquired by Snowflake. Developed mobile browser and AI search applications as well as desktop browser extensions.",
                platforms: ["iOS", "iPadOS", "MacOS", "Android"],
                languages: [
                  "Swift",
                  "SwiftUI",
                  "Combine",
                  "Kotlin",
                  "TypeScript",
                ],
                link: "https://neeva.com",
              },
              {
                icon: Icons.FerdasoftIcon,
                title: "Ferdasoft",
                subheader: "Founder & Head of Engineering",
                description:
                  "Founded the company and managed development, marketing, and communication. Built and launched Nome - Music & Maps to the Apple App Store. Featured by Apple on the App Store for over a year, and other media outlets such as Product Hunt, iMore and others.",
                platforms: ["iOS", "WatchOS", "Apple CarPlay", "Web"],
                languages: ["Swift", "SwiftUI", "UIKit", "JavaScript"],
                link: "https://ferdasoft.com",
              },
              {
                icon: Icons.TrivoryIcon,
                title: "Trivory",
                subheader: "Sofware Engineer & Designer",
                description:
                  "Designed and developed applications for Apple platforms for 20k+ users across Portland Public Schools.",
                platforms: ["iOS"],
                languages: ["Swift", "SwiftUI", "Apache Cordova"],
                link: "https://trivory.com",
              },
              {
                icon: Icons.TravSoloIcon,
                title: "TravSolo",
                subheader: "Co-Founder & Head of Engineering",
                description:
                  "Led app development and built revenue generating features. Worked with the CEO to raise over $100k in capital.",
                platforms: ["iOS"],
                languages: ["Swift", "UIKit"],
                link: "https://travsolo.com",
              },
            ],
          },
          {
            title: "Projects",
            values: [
              {
                icon: Icons.NomeIcon,
                title: "Nome - Music & Maps",
                description:
                  'Navigation app that integrates with your music library to build a queue that is synced to the duration of your trip. Named as "Our Favorites", "Hot New App" by Apple on the App Store and featured for over a year. Covered by other media outlets such as Product Hunt, iMore and others.',
                platforms: ["iOS", "WatchOS", "CarPlay", "Web"],
                link: "https://ferdasoft.com/Nome.html",
              },
              {
                title: "Oculi",
                description:
                  "Accessibility framework for SwiftUI that enabled visually impared users to navigate Apple devices using only their head and eyes. Winner of the Apple WWDC 2022 Swift Student Challenge.",
                languages: ["Swift", "SwiftUI", "CoreML", "Vision"],
                link: "https://github.com/evancrow/Oculi",
              },
              {
                title: "ML Stock Analyzer",
                description:
                  "Python neural net model that can suggest whether to buy/sell stocks based on a 5-day trading period.",
                languages: ["Python"],
                link: "https://github.com/evancrow/stock-analyzer",
              },
              {
                title: "Tutorstand",
                description:
                  "Scheduling application that connects students with free volunteer tutors.",
                platforms: ["Web"],
                link: "https://tutorstand.com",
              },
              {
                title: "MCOG",
                description:
                  "Landing page for a community volunteer group in Portland, OR.",
                platforms: ["Web"],
                link: "https://mcogpdx.org/",
              },
            ],
          },
          {
            title: "Awards",
            values: [
              {
                icon: Icons.AppleIcon,
                title: "Apple Swift Student Challenge 2022",
                description:
                  "Invented a novel accessebility software, Oculi, using Vision and ML that enabled motor impared users to control Apple devices using only their head and eyes",
                languages: ["Swift", "SwiftUI", "CoreML", "Vision"],
                link: "https://github.com/evancrow/Oculi",
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
            stroke-width="1.5"
          />
        </svg>
      </div>
    </Section>
  );
};

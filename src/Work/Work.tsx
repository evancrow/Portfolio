import React from "react";
import Section from "../Components/Section/Section";
import { SectionCardGrid } from "../Components/Section/SectionCard/SectionCard";
import { Icons } from "../Icons/Icons";

export const Work = () => {
  return (
    <Section primary="Work" secondary="Experience" id="Work">
      <SectionCardGrid
        cards={[
          {
            title: "",
            values: [
              {
                icon: Icons.AppleIcon,
                title: "Apple",
                subheader: "Software Engineer",
                platforms: ["iOS", "iPadOS", "visionOS", "macOS"],
                languages: ["Swift", "SwiftUI", "Objective-C", "C++"],
                link: "https://apple.com/",
              },
              {
                icon: Icons.ExaIcon,
                title: "Exa.ai",
                subheader: "Member of Technical Staff",
                description:
                  "Built Exa's /answer endpoint for RAG-based search result generation, the **first to achieve a 90%+ SimpleQA score, outperforming OpenAI**, Perplexity, and DeepSeek. " +
                  "Engineered crawling and spidering systems indexing billions of URLs. " +
                  "Worked directly with enterprise customers on **multi-million dollar deals**, delivering tailored search products. " +
                  "Led fullstack development of Exa Websets, a platform for AI-driven sourcing and verification of people, companies, and research.",
                link: "https://exa.ai/",
                platforms: ["Web", "Cloud"],
                languages: ["Python", "TypeScript", "Rust"],
              },
              {
                icon: Icons.SnowflakeIcon,
                title: "Snowflake",
                subheader: "Software Engineer Intern",
                description:
                  "**Youngest** software engineering intern at Snowflake. **Founding engineer on the Snowflake Notebooks** team, building client and server-side infrastructure for an ML and data analysis platform. Contributed across Machine Learning, Data Marketplace, Data Modeling, and Data Query teams.",
                platforms: ["Web", "Cloud"],
                languages: ["TypeScript", "Golang", "Node.js", "Python", "SQL"],
                link: "https://www.snowflake.com/",
              },
              {
                icon: Icons.NeevaIcon,
                title: "Neeva",
                subheader: "Software Engineer",
                description:
                  "Built the **world's first generative-AI search application** using retrieval-augmented generation. Led the iOS team to ship a browser app with over 1,000 five-star reviews. Drove a UIKit-to-SwiftUI refactor, boosting test coverage past 90% while halving test run times.",
                platforms: ["iOS", "iPadOS", "macOS", "Web", "Android"],
                languages: [
                  "Swift",
                  "SwiftUI",
                  "Combine",
                  "Kotlin",
                  "TypeScript",
                ],
              },
              {
                icon: Icons.FerdasoftIcon,
                title: "Ferdasoft",
                subheader: "Founder & Head of Engineering",
                description:
                  "Founded and led Ferdasoft, building Nome - Music & Maps for iOS, WatchOS, CarPlay, and Web. **Featured by Apple** in 'Our Favorites' and 'Hot New Apps', with coverage from Product Hunt and iMore.",
                platforms: ["iOS", "WatchOS", "Apple CarPlay", "Web"],
                languages: ["Swift", "SwiftUI", "UIKit", "JavaScript"],
              },
              {
                icon: Icons.TrivoryIcon,
                title: "Trivory",
                subheader: "Software Engineer & Designer",
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
                  "Led app development and built revenue-generating features while collaborating with the CEO to raise over $100k in capital.",
                platforms: ["iOS"],
                languages: ["Swift", "UIKit"],
                link: "https://travsolo.com",
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

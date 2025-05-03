import React from "react";
import "./Work.css";
import Section from "../Components/Section/Section";
import { SectionCardGrid } from "../Components/Section/SectionCard/SectionCard";
import { Icons } from "../Icons/Icons";

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
                platforms: ["iOS", "iPadOS", "visionOS", "macOS"],
                languages: ["Swift", "SwiftUI", "Objective-C", "C++"],
                link: "https://apple.com/",
              },
              {
                icon: Icons.ExaIcon,
                title: "Exa.ai",
                subheader: "Member of Technical Staff",
                description:
                  "Built Exa’s /answer endpoint for RAG-based search result generation, achieving the first 90%+ score on the SimpleQA benchmark—surpassing solutions from OpenAI, DeepSeek, and Perplexity. Engineered scalable crawling and spidering systems to index billions of URLs, enabling Exa’s AI-powered search capabilities. Led infrastructure work for high-throughput data ingestion and retrieval. Collaborated directly with enterprise customers on multi-million dollar deals, shaping architecture and delivering tailored data and search products. Also contributed fullstack development to Exa Websets, a new AI-driven platform for sourcing and verifying high-quality lists of people, companies, and research using enrichment, filtering, and real-time validation.",
                link: "https://exa.ai/",
                platforms: ["Web", "Cloud"],
                languages: ["Python", "TypeScript", "Rust"],
              },
              {
                icon: Icons.SnowflakeIcon,
                title: "Snowflake",
                subheader: "Software Engineer",
                description:
                  "Became the youngest software engineering intern at Snowflake, contributing across teams in Machine Learning, Data Marketplace, Data Modeling, and Data Query. Served as a founding engineer on the Snowflake Notebooks team, playing a pivotal role in client and server-side development for an innovative ML + data analysis platform.",
                platforms: ["Web", "Cloud"],
                languages: ["TypeScript", "Golang", "Node.js", "Python", "SQL"],
                link: "https://www.snowflake.com/",
              },
              {
                icon: Icons.NeevaIcon,
                title: "Neeva",
                subheader: "Software Engineer",
                description:
                  "Developed the world’s first generative-AI search application leveraging RAG for seamless AI-driven search experiences. Led the iOS development team to launch a mobile browser app with over 1000 5-star reviews, and spearheaded a comprehensive UIKit-to-SwiftUI refactor that boosted test coverage to over 90% while halving test run times.",
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
                  "Founded and led Ferdasoft, developing Nome—Music & Maps, a multifaceted application for iOS, WatchOS, CarPlay, and Web. Nome was featured in Apple’s 'Our Favorites' and 'Hot New Apps' and received significant media coverage from outlets like Product Hunt and iMore.",
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
          {
            title: "Leadership",
            values: [
              {
                icon: Icons.KaleidoscopeIcon,
                title: "Khoury College of Computer Sciences Kaleidoscope",
                description:
                  "Run operations for Khoury College’s club council, managing funding, approving events, and supporting 40+ student organizations. Liaise between clubs and the Dean’s Office to coordinate resources, promote events, and improve student engagement.",
                subheader: "Operations Lead",
                link: "https://markefontenot.notion.site/Welcome-to-Kaleidoscope-30ff5648b2344623bb5a9c7a7e3dc674",
              },
            ],
          },
          {
            title: "Freelance",
            values: [
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
                  "Responsive, beautifully designed website for NU Macro, a global macro investing club I co-founded and lead. Built from scratch to showcase research, strategy, and community—deployed with Vercel and optimized for clarity, speed, and accessibility.",
                platforms: ["Web", "Cloud"],
                languages: ["Next.js", "TypeScript"],
                link: "https://numacro.vercel.app/",
              },
              {
                title: "Oculi",
                description:
                  "Accessibility framework for SwiftUI that enabled visually impaired users to navigate Apple devices using only their head and eyes. Winner of the Apple WWDC 2022 Swift Student Challenge.",
                languages: ["Swift", "SwiftUI", "CoreML", "Vision"],
                link: "https://github.com/evancrow/Oculi",
              },
              {
                title: "NUPact",
                description:
                  "Application providing real-time analytics and weekly predictions on Northeastern University gym usage patterns. Deployed with Vercel using a Supabase backend.",
                platforms: ["iOS", "Web"],
                languages: ["Swift", "SwiftUI", "React", "TypeScript", "SQL"],
                link: "https://nupact.vercel.app/",
              },

              {
                title: "Tutorstand",
                description:
                  "Scheduling application that connects students with free volunteer tutors.",
                platforms: ["Web"],
                link: "https://tutorstand.com",
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
                  "Invented an innovative accessibility software, Oculi, using Vision and CoreML—enabling motor-impaired users to control Apple devices using only their head and eyes.",
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
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </Section>
  );
};

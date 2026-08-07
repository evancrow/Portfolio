import type { Entry } from "./types";

export const work: Entry[] = [
  {
    icon: "apple",
    title: "Apple",
    subheader: "Software Engineer",
    tier: "primary",
    platforms: ["iOS", "iPadOS", "visionOS", "macOS"],
    languages: ["Swift", "SwiftUI", "Objective-C", "C++"],
    link: "https://apple.com/",
  },
  {
    icon: "stealth",
    title: "Stealth",
    subheader: "Founding Engineer",
    tier: "primary",
    description:
      "Founding engineer at a stealth AI startup. Built the product end-to-end across agentic systems, native apps, web, backend, and developer SDKs. Architected the production stack: agent swarms, persistent state, real-time event delivery, and isolated execution sandboxes. Designed the core primitives powering autonomous agents: scheduling, cost governance, approval workflows, persistent memory, and tool integration.",
    platforms: ["Web", "Cloud", "iOS", "macOS"],
    languages: ["TypeScript", "Python", "Swift", "Rust"],
  },
  {
    icon: "exa",
    title: "Exa.ai",
    subheader: "Member of Technical Staff",
    tier: "primary",
    description:
      "Built Exa's /answer endpoint, the **first RAG system to clear 90%+ on SimpleQA, beating OpenAI**, Perplexity, and DeepSeek. Engineered crawling infrastructure indexing billions of URLs. Led fullstack on Exa Websets, a platform for AI-driven sourcing and verification. Drove **multi-million-dollar** enterprise deals.",
    link: "https://exa.ai/",
    platforms: ["Web", "Cloud"],
    languages: ["Python", "TypeScript", "Rust"],
  },
  {
    icon: "snowflake",
    title: "Snowflake",
    subheader: "Software Engineer Intern",
    tier: "legacy",
    description:
      "**Youngest engineering intern** at Snowflake. **Founding engineer on Snowflake Notebooks**, the company's ML and data-analysis platform, building client and server infrastructure used across ML, Data Marketplace, Modeling, and Query teams.",
    platforms: ["Web", "Cloud"],
    languages: ["TypeScript", "Golang", "Node.js", "Python", "SQL"],
    link: "https://www.snowflake.com/",
  },
  {
    icon: "neeva",
    title: "Neeva",
    subheader: "Software Engineer",
    tier: "legacy",
    description:
      "Core engineer on the **world's first generative-AI search application**. Led iOS development on the Neeva browser, shipping to the App Store with **1,000+ five-star reviews**.",
    platforms: ["iOS", "iPadOS", "macOS", "Web", "Android"],
    languages: ["Swift", "SwiftUI", "Combine", "Kotlin", "TypeScript"],
  },
  {
    icon: "ferdasoft",
    title: "Ferdasoft",
    subheader: "Founder & Head of Engineering",
    tier: "legacy",
    description:
      "Founded and led Ferdasoft, building **Nome - Music & Maps** for iOS, WatchOS, CarPlay, and Web. **Featured by Apple** in 'Our Favorites' and 'Hot New Apps', with coverage from Product Hunt and iMore.",
    platforms: ["iOS", "WatchOS", "Apple CarPlay", "Web"],
    languages: ["Swift", "SwiftUI", "UIKit", "JavaScript"],
  },
  {
    icon: "trivory",
    title: "Trivory",
    subheader: "Software Engineer & Designer",
    tier: "legacy",
    description:
      "Designed and shipped Apple-platform applications for **20,000+ users** across Portland Public Schools.",
    platforms: ["iOS"],
    languages: ["Swift", "SwiftUI", "Apache Cordova"],
    link: "https://trivory.com",
  },
  {
    icon: "travsolo",
    title: "TravSolo",
    subheader: "Co-Founder & Head of Engineering",
    tier: "legacy",
    description:
      "Co-founder and head of engineering. Led app development and shipped revenue-generating features. Partnered with the CEO to **raise $100k+** in capital.",
    platforms: ["iOS"],
    languages: ["Swift", "UIKit"],
    link: "https://travsolo.com",
  },
];

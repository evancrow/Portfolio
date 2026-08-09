export const site = {
  name: "Evan Crow",
  title: "Evan Crow",
  tagline: "Founder & Software Engineer",
  hero: "Member of Technical Staff at Exa, builder, and designer. Based in San Francisco, California.",
  bio: "I'm Evan Crow, working on AI to push frontier technology and science forward and to improve how we live and work. Outside of work, I spend my time skiing, hiking, and reading about economics, policy, science, philosophy, and how it all connects.",
  url: "https://evanwcrow.com",
  /** Drives the footer nav column and the in-page anchor targets, in page order. Connect no
   * longer gets its own section — it folds into the footer, which is where those links now live. */
  sections: [
    { id: "work", label: "Work" },
    { id: "projects", label: "Projects" },
    { id: "about", label: "About" },
  ],
} as const;

import React from "react";
import "./About.css";
import Section from "../Components/Section/Section";
import { SectionCardGrid } from "../Components/Section/SectionCard/SectionCard";
import { Icons } from "../Icons/Icons";

export const About = () => {
  return (
    <Section primary="About" id="About">
      <div className="bodyText">
        Hi there! I’m Evan Crow, a software engineer and founder passionate
        about building thoughtful, high-impact technology. I’m especially
        interested in the future of AI, search, distributed systems, and design.
        Outside of work, I spend my time skiing, hiking, making music, exploring
        financial systems, and digging into economic theory. I'm always looking
        to collaborate with others who are curious, driven, and working on
        interesting problems. Please feel free to reach out if you’d like to
        connect, or discuss interesting opportunities.
      </div>

      <SectionCardGrid
        cards={[
          {
            title: "Education",
            values: [
              {
                icon: Icons.NortheasternIcon,
                title: "Northeastern University",
                subheader: "Graduating 2027",
                description: "Computer Science & Economics",
              },
            ],
          },
          {
            title: "Skills",
            values: [
              {
                icon: Icons.SwiftIcon,
                title: "Swift & SwiftUI",
                disableModal: true,
              },

              {
                icon: Icons.TypeScriptIcon,
                title: "TypeScript",
                disableModal: true,
              },
              {
                icon: Icons.PythonIcon,
                title: "Python",
                disableModal: true,
              },
              {
                icon: Icons.GitIcon,
                title: "Git & CI/CD",
                disableModal: true,
              },
              {
                title: "AI/ML",
                disableModal: true,
              },
              {
                title: "Search Systems",
                disableModal: true,
              },
              {
                title: "Large-Scale Infrastructure",
                disableModal: true,
              },
              {
                title: "Architecture Design",
                disableModal: true,
              },
              {
                title: "UX Design",
                disableModal: true,
              },
              {
                title: "Leadership",
                disableModal: true,
              },
              {
                title: "Problem-Solving",
                disableModal: true,
              },
              {
                title: "VC Fundraising",
                disableModal: true,
              },
            ],
          },
        ]}
      />

      <div className="sectionSpacer">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="70"
          height="77"
          viewBox="0 0 70 77"
          fill="none"
        >
          <path
            opacity="0.705373"
            d="M68.6114 53.3709C30.4733 2.96096 61.308 75.995 25.0209 49.2673C11.8312 45.8046 4.60263 7.06366 18.6716 60.2355C31.7694 21.5774 46.1397 45.7039 30.3739 15.9867C24.0029 54.9268 10.7447 36.9712 1 11.9781C48.0744 61.2745 30.1137 46.6341 12.5614 76C20.7782 28.4399 63.9972 2.62164 16.0164 32.558C8.97353 32.8872 67.1552 46.4791 15.3167 1"
            stroke="#1E1E1E"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </Section>
  );
};

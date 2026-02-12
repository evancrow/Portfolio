import "./Contact.css";
import "../Components/Section/Section.css";
import Section from "../Components/Section/Section";
import { ValueRow } from "../Components/Section/SectionCard/SectionCard";
import { Icons } from "../Icons/Icons";
import { Mail, Github, Download } from "lucide-react";

export const Contact = () => {
  return (
    <Section primary="Connect" id="Connect">
      <div className="contact values">
        <ValueRow
          {...{
            iconComponent: (
              <div style={{ width: 40, height: 40, borderRadius: 5, backgroundColor: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mail size={22} strokeWidth={1.5} color="white" />
              </div>
            ),
            title: "Email",
            description: "evanwcrow@gmail.com",
            link: "mailto:evanwcrow@gmail.com",
            disableModal: true,
          }}
        />
        <ValueRow
          {...{
            icon: Icons.LinkedInIcon,
            title: "LinkedIn",
            description: "linkedin.com/in/evan-crow",
            link: "https://www.linkedin.com/in/evan-crow/",
            disableModal: true,
          }}
        />
        <ValueRow
          {...{
            iconComponent: (
              <div style={{ width: 40, height: 40, borderRadius: 5, backgroundColor: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Github size={22} strokeWidth={1.5} color="white" />
              </div>
            ),
            title: "GitHub",
            description: "github.com/evancrow",
            link: "https://github.com/evancrow",
            disableModal: true,
          }}
        />
        <ValueRow
          {...{
            iconComponent: (
              <div style={{ width: 40, height: 40, borderRadius: 5, backgroundColor: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Download size={22} strokeWidth={1.5} color="white" />
              </div>
            ),
            title: "Download Resume",
            link: "./static/Resume.pdf",
            download: "EvanCrow_Resume.pdf",
            disableModal: true,
          }}
        />
      </div>
    </Section>
  );
};

import "./Contact.css";
import "../Components/Section/Section.css";
import Section from "../Components/Section/Section";
import { ValueRow } from "../Components/Section/SectionCard/SectionCard";
import { Icons } from "../Icons/Icons";

export const Contact = () => {
  return (
    <Section primary="Connect" id="Connect">
      <div className="contact values">
        <ValueRow
          {...{
            icon: Icons.EmailIcon,
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
            icon: Icons.GitHubIcon,
            title: "GitHub",
            description: "github.com/evancrow",
            link: "https://github.com/evancrow",
            disableModal: true,
          }}
        />
        <ValueRow
          {...{
            icon: Icons.DownloadIcon,
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

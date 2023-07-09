import React from "react";
import "./Header.css";

const NavItem = ({ title }: { title: string }) => {
  function scrollToSection() {
    // Scroll smoothly to the section using the title as the id.
    document.getElementById(title)?.scrollIntoView({
      behavior: "smooth",
    });
  }

  return (
    <button className="NavItem" onClick={scrollToSection}>
      <p>{title}</p>
    </button>
  );
};

function Header() {
  return (
    <div className="Header">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="42"
        height="28"
        viewBox="0 0 42 28"
        fill="none"
      >
        <path
          d="M6.48 5.72V11.16H15.28V16.4H6.48V21.92H15.28V27.16H0V0.479999H15.28V5.72H6.48Z"
          fill="#1E1E1E"
        />
        <path
          d="M39.0394 20.88L41.2794 23.12C38.5994 26.28 35.6394 27.64 31.5194 27.64C27.7994 27.64 24.6394 26.28 22.3594 23.72C20.1194 21.2 18.7994 17.56 18.7994 13.84C18.7994 5.84 24.1994 0 31.5594 0C33.9594 0 36.3194 0.639999 38.2394 1.8C39.3194 2.48 40.0394 3.12 41.3594 4.56L39.0394 6.72C36.4394 4.04 34.4794 3.08 31.6394 3.08C26.1994 3.08 22.2394 7.6 22.2394 13.84C22.2394 20.04 26.2794 24.56 31.7994 24.56C34.7194 24.56 36.9594 23.4 39.0394 20.88Z"
          fill="#1E1E1E"
        />
      </svg>

      <div className="Nav">
        <NavItem title="About" />
        <NavItem title="Work" />
        <NavItem title="Contact" />
      </div>
    </div>
  );
}

export default Header;

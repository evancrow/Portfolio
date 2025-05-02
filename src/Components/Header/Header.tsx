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
      <div className="Nav">
        <NavItem title="Work" />
        <NavItem title="About" />
        <NavItem title="Connect" />
      </div>
    </div>
  );
}

export default Header;

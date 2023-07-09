import "./PageNav.css";

const PageNavItem = ({ title }: { title: string }) => {
  return (
    <div className="PageNavItem">
      <p>{title}</p>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M23.0859 17.5466C23.0859 18.1872 22.5859 18.6716 22.0078 18.6716C21.4141 18.6716 20.9453 18.1559 20.9453 17.5934V10.0622L21.1328 3.62469L18.6328 6.37469L2.10156 22.8903C1.88281 23.1247 1.61719 23.2184 1.35156 23.2184C0.773438 23.2184 0.257812 22.6872 0.257812 22.1247C0.257812 21.8591 0.367188 21.5934 0.585938 21.3747L17.1016 4.84344L19.8516 2.34344L12.6484 2.53094H5.88281C5.30469 2.53094 4.82031 2.06219 4.82031 1.48407C4.82031 0.92157 5.25781 0.42157 5.92969 0.42157H21.9141C22.6172 0.42157 23.0547 0.89032 23.0547 1.56219L23.0859 17.5466Z"
          fill="#1E1E1E"
        />
      </svg>
    </div>
  );
};

function PageNav() {
  return (
    <div className="PageNav">
      <PageNavItem title="About" />
      <PageNavItem title="Work" />
      <PageNavItem title="Contact" />
    </div>
  );
}

export default PageNav;

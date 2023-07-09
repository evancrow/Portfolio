import React from "react";
import "./Section.css";

const Section = ({
  children,
  primary,
  id,
  secondary,
}: {
  children?: React.ReactNode;
  primary: string;
  secondary?: string;
  id?: string;
}) => {
  return (
    <div className="section" id={id}>
      <p className="sectionTitle">
        <span style={{ fontWeight: 900 }}>{primary} </span>
        <span style={{ fontWeight: 400 }}>{secondary}</span>
      </p>
      {children}
    </div>
  );
};

export default Section;

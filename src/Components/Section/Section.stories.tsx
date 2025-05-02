import React from "react";
import Section from "./Section";
import "../index.css";

export default {
  title: "Section",
  component: Section,
};

export const Basic = () => (
  <Section primary="Section" secondary="Title">
    <div></div>
  </Section>
);

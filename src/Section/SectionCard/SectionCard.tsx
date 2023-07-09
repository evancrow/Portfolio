/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import "./SectionCard.css";

export interface Value {
  icon?: string;
  title: string;
  subheader?: string;
  description?: string;
  time?: string;
  platforms?: string[];
  languages?: string[];
  link?: string;
  download?: string;
}

export interface SectionCardProps {
  title: string;
  values: Value[];
}

export const ValueRowMetadata = ({
  header,
  values,
}: {
  header: string;
  values: string[];
}) => {
  return (
    <div className="valueRowMetadata">
      <p className="valueRowMetadataHeader">{header}</p>
      <div className="metadataValues">
        {values.map((value) => (
          <p className="metadataValue">{value}</p>
        ))}
      </div>
    </div>
  );
};

export const ValueRow = (props: Value) => {
  const content = (
    <div
      className={`
        valueRow
        ${props.link === undefined ? "" : "tappable"}
        `}
    >
      <div className="valueHeader">
        {props.icon && (
          <img
            src={props.icon}
            style={{
              width: 40,
              height: 40,
              borderRadius: 5,
            }}
          />
        )}

        <div className="valueCopy">
          <p className="valueTitle">{props.title}</p>
          {props.subheader && (
            <p className="valueSubheader">{props.subheader}</p>
          )}
        </div>
      </div>

      <p className="valueDescription">{props.description}</p>

      {props.time && <ValueRowMetadata header="Time" values={[props.time]} />}

      {props.platforms && (
        <ValueRowMetadata header="Platforms" values={props.platforms} />
      )}

      {props.languages && (
        <ValueRowMetadata header="Languages" values={props.languages} />
      )}
    </div>
  );

  return (
    <div>
      {props.link ? (
        <a
          href={props.link}
          download={props.download}
          target="_blank"
          rel="noreferrer"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
};

export const SectionCard = (props: SectionCardProps) => {
  return (
    <div className="sectionCard">
      <p className="sectionCardTitle">{props.title}</p>
      <div className="values">
        {props.values.map((value) => (
          <ValueRow {...value} />
        ))}
      </div>
    </div>
  );
};

export const SectionCardGrid = ({ cards }: { cards: SectionCardProps[] }) => {
  return (
    <div className="sectionCardGrid">
      {cards.map((value) => (
        <SectionCard {...value} />
      ))}
    </div>
  );
};

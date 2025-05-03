import "./SectionCard.css";
import Modal from "../../Modal/Modal";
import { useEffect, useRef, useState } from "react";

export interface Value {
  icon?: string;
  title: string;
  subheader?: string;
  description?: string;
  time?: string;
  platforms?: string[];
  languages?: string[];
  skills?: string[];
  link?: string;
  download?: string;
  disableModal?: boolean;
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
        {values.map((value, index) => (
          <p key={index} className="metadataValue">
            {value}
          </p>
        ))}
      </div>
    </div>
  );
};

export const ValueRow = (props: Value) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showViewMore, setShowViewMore] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  // Check if the description is long enough to warrant a "View more" button.
  useEffect(() => {
    if (descriptionRef.current && props.description) {
      // If description is over 3 lines (approx 120 chars) or if element is over 60px tall.
      const isLongDescription =
        props.description.length > 120 ||
        descriptionRef.current.scrollHeight > 60;

      setShowViewMore(isLongDescription);
    }
  }, [props.description]);

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (props.disableModal && props.link) {
      window.open(props.link, "_blank");
      return;
    }

    if (props.disableModal) {
      return;
    }

    openModal(e);
  };

  const content = (
    <div
      className={`valueRow ${
        props.disableModal && !props.link ? "" : "tappable"
      }`}
      onClick={handleCardClick}
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

        <div
          className="valueCopy"
          style={{
            marginTop: props.subheader ? 11 : 1,
          }}
        >
          <p className="valueTitle">{props.title}</p>
          {props.subheader && (
            <p className="valueSubheader">{props.subheader}</p>
          )}
        </div>
      </div>

      {props.description && (
        <div className="descriptionContainer">
          <p
            ref={descriptionRef}
            className={`valueDescription ${showViewMore ? "truncated" : ""}`}
          >
            {props.description}
          </p>
          {showViewMore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openModal(e);
              }}
              className="viewMoreButton"
            >
              View more
            </button>
          )}
        </div>
      )}

      {props.time && <ValueRowMetadata header="Time" values={[props.time]} />}

      {props.platforms && (
        <ValueRowMetadata header="Platforms" values={props.platforms} />
      )}

      {props.languages && (
        <ValueRowMetadata header="Languages" values={props.languages} />
      )}

      {props.skills && (
        <ValueRowMetadata header="Skills" values={props.skills} />
      )}
    </div>
  );

  return (
    <div>
      {content}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          value={props}
        />
      )}
    </div>
  );
};

export const SectionCard = (props: SectionCardProps) => {
  return (
    <div className="sectionCard">
      <p className="sectionCardTitle">{props.title}</p>
      <div className="values">
        {props.values.map((value, index) => (
          <ValueRow key={index} {...value} />
        ))}
      </div>
    </div>
  );
};

export const SectionCardGrid = ({ cards }: { cards: SectionCardProps[] }) => {
  return (
    <div className="sectionCardGrid">
      {cards.map((card, index) => (
        <div key={index}>
          <SectionCard {...card} />
          {card !== cards[cards.length - 1] && (
            <div style={{ height: "30px" }}></div>
          )}
        </div>
      ))}
    </div>
  );
};

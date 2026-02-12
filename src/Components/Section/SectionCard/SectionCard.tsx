import "./SectionCard.css";
import Modal from "../../Modal/Modal";
import React, { useEffect, useRef, useState } from "react";

/** Parses **bold** markdown syntax into <strong> elements. */
export function parseDescription(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

/**
  Truncates text while preserving all **bold** segments.
  @param text - Raw description string with optional **bold** markers.
  @param maxVisible - Visible character budget (excludes ** markers, default 250).
  @returns Truncated string with bold markers intact.
*/
function smartTruncateDescription(text: string, maxVisible = 250): string {
  const visibleText = text.replace(/\*\*/g, "");
  if (visibleText.length <= maxVisible) return text;

  // No bold segments: simple truncation.
  const boldPattern = /\*\*(.*?)\*\*/g;
  const boldMatches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = boldPattern.exec(text)) !== null) {
    boldMatches.push(match);
  }
  if (boldMatches.length === 0) {
    return text.slice(0, maxVisible).trimEnd() + "...";
  }

  // Split text into plain and bold segments in order.
  const segments: { raw: string; visible: number; isBold: boolean }[] = [];
  let lastEnd = 0;
  for (const m of boldMatches) {
    if (m.index! > lastEnd) {
      const plain = text.slice(lastEnd, m.index!);
      segments.push({ raw: plain, visible: plain.length, isBold: false });
    }
    segments.push({ raw: m[0], visible: m[1].length, isBold: true });
    lastEnd = m.index! + m[0].length;
  }
  if (lastEnd < text.length) {
    const trailing = text.slice(lastEnd);
    segments.push({ raw: trailing, visible: trailing.length, isBold: false });
  }

  // Budget: reserve space for all bold visible text, distribute rest to plain.
  // Account for " ... " separators (5 chars each) between truncated/skipped segments.
  const totalBoldVisible = segments
    .filter((s) => s.isBold)
    .reduce((sum, s) => sum + s.visible, 0);
  const plainSegCount = segments.filter((s) => !s.isBold).length;
  const separatorBudget = plainSegCount * 5;
  const plainBudget = maxVisible - totalBoldVisible - separatorBudget;
  let plainUsed = 0;
  let result = "";

  for (const seg of segments) {
    if (seg.isBold) {
      result += seg.raw;
    } else {
      const remaining = Math.max(0, plainBudget - plainUsed);
      if (remaining > 0) {
        const slice = seg.raw.slice(0, remaining);
        const wasTruncated = slice.length < seg.raw.length;
        result += wasTruncated ? slice.trimEnd() + " ... " : slice;
        plainUsed += slice.length;
      } else {
        // Plain segment fully skipped — insert separator.
        result += " ... ";
      }
    }
  }

  // Strip any trailing separators, then add a single clean ellipsis.
  return result.replace(/(\s*\.{3}\s*)+$/, "").trimEnd() + "...";
}

export interface Value {
  icon?: string;
  iconComponent?: React.ReactNode;
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
  const [truncateLength, setTruncateLength] = useState(250);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  // Check if the description is long enough to warrant a "View more" button.
  useEffect(() => {
    if (descriptionRef.current && props.description) {
      // If description exceeds 3 visible lines.
      const isLongDescription =
        props.description.replace(/\*\*/g, "").length > 180 ||
        descriptionRef.current.scrollHeight > 75;

      setShowViewMore(isLongDescription);

      // Compute a visible-char budget that fits 3 lines in the actual column width.
      if (isLongDescription) {
        const width = descriptionRef.current.clientWidth || 350;
        const charsPerLine = Math.floor(width / 7.5);
        setTruncateLength(charsPerLine * 3);
      }
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
        {props.iconComponent ? (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {props.iconComponent}
          </div>
        ) : props.icon ? (
          <img
            src={props.icon}
            alt={props.title}
            style={{
              width: 40,
              height: 40,
              borderRadius: 5,
            }}
          />
        ) : null}

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
            {showViewMore
              ? parseDescription(smartTruncateDescription(props.description, truncateLength))
              : parseDescription(props.description)}
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

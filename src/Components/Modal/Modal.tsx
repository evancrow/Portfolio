import { useEffect, useRef, useState } from "react";
import { Value, ValueRowMetadata } from "../Section/SectionCard/SectionCard";
import "./Modal.css";
import "../Section/SectionCard/SectionCard.css";

function Modal({
  isOpen,
  onClose,
  value: data,
}: {
  isOpen: boolean;
  onClose: () => void;
  value: Value;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
      document.documentElement.style.overflowY = "hidden";

      setTimeout(() => {
        setIsAnimating(true);
      }, 10);
    } else {
      document.body.classList.remove("modal-open");
      document.documentElement.style.overflowY = "auto";

      setIsAnimating(false);
    }

    return () => {
      document.body.classList.remove("modal-open");
      document.documentElement.style.overflowY = "auto";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className={`Modal ${isAnimating ? "show" : ""}`} onClick={handleClose}>
      <div className="modalOverlay" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalHeaderContent">
            {data.icon && <img src={data.icon} className="modalIcon" alt="" />}
            <div>
              <h2>{data.title}</h2>
              {data.subheader && <h3>{data.subheader}</h3>}
            </div>
          </div>
          <button className="closeButton" onClick={handleClose}>
            &times;
          </button>
        </div>

        <div className="modalBody">
          {data.description && <p>{data.description}</p>}

          {data.platforms && (
            <ValueRowMetadata header="Platforms" values={data.platforms} />
          )}

          {data.languages && (
            <ValueRowMetadata header="Languages" values={data.languages} />
          )}

          {data.link && (
            <a
              href={data.link}
              target="_blank"
              rel="noopener noreferrer"
              className="modalLink"
            >
              View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;

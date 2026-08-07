import type { ReactNode } from "react";

/**
   Renders `**bold**` markers as <strong> elements.
   @param text - Description string with optional bold markers.
   @returns The text with bold segments wrapped, or the raw string if there are none.
*/
export function renderRichText(text: string): ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

/**
   Splits a description into sentences for the modal's paragraph layout.
   @param text - Description string.
   @returns One entry per sentence.
*/
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[\w*]{3,}\.)\s+(?=[A-Z])/);
}

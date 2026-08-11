import type { ReactNode } from "react";

const RICH_TEXT_PATTERN = /\*\*(.+?)\*\*|\*(.+?)\*|\n/g;

/**
   Renders `**bold**`, `*italic*`, and `\n` line breaks as their corresponding elements.
   @param text - Description string with optional bold/italic markers and newlines.
   @returns The text with rich segments wrapped, or the raw string if there are none.
*/
export function renderRichText(text: string): ReactNode {
  const pattern = new RegExp(RICH_TEXT_PATTERN);
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    if (match[0] === "\n") {
      nodes.push(<br key={key++} />);
    } else if (match[1] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {match[1]}
        </strong>
      );
    } else {
      nodes.push(<em key={key++}>{match[2]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (nodes.length === 0) return text;
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}

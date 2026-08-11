import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Same latin-subset files `next/font/google` would resolve for Newsreader — the icon's
 *  New York stand-in — fetched directly since ImageResponse needs raw font bytes, not a CSS var. */
const NEWSREADER_REGULAR =
  "https://fonts.gstatic.com/s/newsreader/v26/cY9qfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBCzBDXXD9JVF438weI_wC-ZD.woff";
const NEWSREADER_SEMIBOLD =
  "https://fonts.gstatic.com/s/newsreader/v26/cY9qfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBCzBDXXD9JVF438wpojwC-ZD.woff";

const [newsreaderRegular, newsreaderSemibold] = await Promise.all([
  fetch(NEWSREADER_REGULAR).then((res) => res.arrayBuffer()),
  fetch(NEWSREADER_SEMIBOLD).then((res) => res.arrayBuffer()),
]);

/** Rendered from the hero copy so the social card can't drift from the page. Mirrors
 *  `icon.svg`: paper ground, ink New York-style text, and its glass-dome glow rising off the bottom. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 100px",
          background:
            "radial-gradient(ellipse 900px 640px at 50% 118%, rgba(142,168,245,0.85) 0%, rgba(142,168,245,0.35) 55%, rgba(142,168,245,0) 100%), radial-gradient(ellipse 640px 440px at 74% 112%, rgba(196,138,240,0.45) 0%, rgba(196,138,240,0) 100%), #f9f9f9",
          color: "#0a0a0c",
        }}
      >
        <div
          style={{
            fontFamily: "Newsreader",
            fontWeight: 600,
            fontSize: 108,
            letterSpacing: -2,
          }}
        >
          {site.name}
        </div>
        <div
          style={{
            fontFamily: "Newsreader",
            fontWeight: 400,
            fontSize: 36,
            marginTop: 24,
            textAlign: "left",
            lineHeight: 1.4,
          }}
        >
          {site.hero}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Newsreader",
          data: newsreaderRegular,
          weight: 400,
          style: "normal",
        },
        {
          name: "Newsreader",
          data: newsreaderSemibold,
          weight: 600,
          style: "normal",
        },
      ],
    }
  );
}

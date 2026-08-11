import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Rendered from the hero copy so the social card can't drift from the page. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 100px",
          background:
            "radial-gradient(circle at 25% 25%, rgba(139,92,246,0.35) 0%, rgba(255,255,255,0) 55%), radial-gradient(circle at 80% 70%, rgba(251,113,133,0.3) 0%, rgba(255,255,255,0) 55%), #ffffff",
          color: "#08081d",
        }}
      >
        <div style={{ fontSize: 108, fontWeight: 700, letterSpacing: -2 }}>
          {site.name}
        </div>
        <div
          style={{
            fontSize: 36,
            marginTop: 24,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {site.hero}
        </div>
      </div>
    ),
    size
  );
}

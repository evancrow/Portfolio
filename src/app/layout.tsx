import type { Metadata, Viewport } from "next";
import { Newsreader } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";
import { links } from "@/content/links";

/**
 * Non-Apple fallback only: `--font-display` puts `ui-serif`/"New York" first, so Apple
 * platforms never fetch this file. `preload: false` keeps it off the critical path everywhere
 * else too, since it only ever paints after the system-font check fails.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  preload: false,
  display: "swap",
});

/** `cover` lets content reach under notches/home-indicators, with `env(safe-area-inset-*)`
 * padding pulling anything that needs to clear of them back in — the footer's dome and credit
 * line, in particular. */
export const viewport: Viewport = {
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s | ${site.name}`,
  },
  description: site.tagline,
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: site.url,
    siteName: site.name,
    title: site.title,
    description: site.tagline,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.tagline,
  },
};

/** Schema.org Person, built from the same content the page renders. */
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  url: site.url,
  jobTitle: site.tagline,
  description: site.bio,
  sameAs: links
    .filter((link) => link.link?.startsWith("http"))
    .map((link) => link.link),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`h-full ${newsreader.variable} antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </body>
    </html>
  );
}

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

/** Measures the strip of screen the layout viewport does not cover (iOS Safari's floating URL
 *  bar), and publishes it as `--bleed`/`--fold`. Inline/blocking and gated to avoid forced-layout
 *  storms during a toolbar-fold `resize` on iOS.
 *  Rationale: docs/ios-viewport-bleed.md § MEASURE_BLEED: measuring the strip */
const MEASURE_BLEED = `(function(){
var s=document.createElement('style');document.head.appendChild(s);var last=-1,lastW=innerWidth;
function px(v){var p=document.createElement('div');p.style.cssText='position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:'+v;document.body.appendChild(p);var h=p.getBoundingClientRect().height;p.remove();return h}
function apply(force){
var w=innerWidth;if(!force&&w===lastW)return;lastW=w;
var lvh=px('100lvh'),svh=px('100svh'),screenH=(window.screen&&screen.height)||0,fold=Math.max(0,Math.round(lvh-svh));
var strip=fold>1&&screenH>lvh?Math.min(screenH-lvh-px('env(safe-area-inset-top)'),2*fold):0;
strip=Math.max(0,Math.round(strip));
if(strip===last)return;last=strip;
s.textContent=strip>0?':root{--bleed:'+strip+'px;--fold:'+fold+'px;--pin-position:static;--pin-anim:stage-pin}':':root{--bleed:'+strip+'px;--fold:'+fold+'px}'}
apply(true);addEventListener('resize',function(){apply(false)});addEventListener('orientationchange',function(){apply(true)})})()`;

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
        <script dangerouslySetInnerHTML={{ __html: MEASURE_BLEED }} />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </body>
    </html>
  );
}

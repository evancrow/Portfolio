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

/**
 * Measures the strip of screen the layout viewport does not cover, and publishes it as `--bleed`.
 *
 * iOS Safari's floating URL bar sits over the page rather than beside it, and the page paints into that
 * strip whenever there is scroll left below. So the pinned panels are given that much overhang and the
 * reader is stopped that far short of the end. It is not a length anyone can write down: it differs per
 * device and per orientation, and no CSS exposes it, `env(safe-area-inset-*)` included, which reports 0
 * here even under `viewport-fit: cover`.
 *
 * What can be measured is the screen and the viewport at its tallest, and the difference between them is
 * the chrome at both ends together. The top of it comes off where the inset will admit to a figure and
 * is left in where it will not, which over-reserves rather than under-reserves: too much overhang is
 * field nobody sees and a little more scroll held back, where too little is bare paper under the bar.
 *
 * `lvh > svh` is the whole of the browser check, and it is about the behaviour rather than about the
 * browser: those two are equal wherever the chrome does not collapse, which is every desktop, so this
 * works out at zero there without anything having to know which engine it is running in. That same
 * inequality is also what gates `.stage-pin`'s mechanism in `globals.css` — `--pin-position`/`--pin-anim`
 * are only ever written here alongside a non-zero `--bleed`, so the pin only ever leaves `sticky` where
 * the strip it exists to clear is real.
 *
 * Inline and blocking, at the top of the body, because every panel's height is a function of this and a
 * value that arrives a frame late is a page that visibly resizes on load.
 *
 * Published through a stylesheet of its own rather than as an inline style on the root, which is the
 * same value by a route React is not watching. Setting it on the element directly is an attribute the
 * server did not render, and hydration compares the two and reports the difference.
 *
 * Rewritten only when the number changes, which is the difference between this being free and it being
 * a stutter. `resize` fires all through a scroll on iOS as the bar folds, and assigning to the sheet
 * invalidates style for the whole document whether or not the text differs: every panel on the page was
 * being laid out again mid-fling.
 */
const MEASURE_BLEED = `(function(){
var s=document.createElement('style');document.head.appendChild(s);var last=-1;
function px(v){var p=document.createElement('div');p.style.cssText='position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:'+v;document.body.appendChild(p);var h=p.getBoundingClientRect().height;p.remove();return h}
function apply(){
var lvh=px('100lvh'),svh=px('100svh'),screenH=(window.screen&&screen.height)||0,fold=lvh-svh;
var strip=fold>1&&screenH>lvh?Math.min(screenH-lvh-px('env(safe-area-inset-top)'),2*fold):0;
strip=Math.max(0,Math.round(strip));
if(strip===last)return;last=strip;
s.textContent=strip>0?':root{--bleed:'+strip+'px;--pin-position:static;--pin-anim:stage-pin}':':root{--bleed:'+strip+'px}'}
apply();addEventListener('resize',apply);addEventListener('orientationchange',apply)})()`;

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

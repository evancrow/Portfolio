# Portfolio

Evan Crow's personal site — [evanwcrow.com](https://evanwcrow.com). Next.js 16 (App Router) + React 19 + Tailwind v4, with a custom WebGL "fluted glass" effect used for the hero, the awards/projects edge, and the footer's overscroll dome.

## Stack

- **Next.js 16** — App Router, `src/app`
- **React 19** / **TypeScript**
- **Tailwind v4** — theme tokens live in `src/app/globals.css`
- **Radix UI** (`@radix-ui/react-dialog`) for the entry modal
- Custom WebGL2 renderer for the glass effect (`src/components/fluted-glass`)

## Commands

```bash
npm run dev        # start dev server (also serves the glass lab, see below)
npm run build       # production build
npm run start        # serve the production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run format        # prettier --write .
```

Node version is pinned in `.nvmrc` (24); `package.json` requires `>=20.9`.

### The glass lab

`src/app/lab/page.dev.tsx` is a dev-only playground for tuning `FlutedGlass` presets — sliders for every shape/glass/light/interaction knob, live preview, exports the resulting preset object. `next.config.ts` excludes the `dev.tsx` extension in production, so `/lab` doesn't exist in the build — absent from the route manifest, not just unlinked. It only resolves under `next dev`.

## Hosting (Vercel)

The site deploys to Vercel. `.vercel/` is gitignored (created locally by `vercel link`/`vercel dev`). To deploy:

- Push to the connected Git branch and Vercel builds automatically, or
- `vercel` (preview) / `vercel --prod` (production) via the Vercel CLI, if the project is linked locally

Build command is the default `next build`; no special env vars are required.

## Making common changes

### Site copy / metadata

`src/content/site.ts` — name, title, tagline, hero blurb, bio, and the `sections` array that drives both the footer nav and in-page anchor IDs.

Other content lives in `src/content/`: `work.ts`, `projects.ts`, `awards.ts`, `education.ts`, `links.ts`. All are arrays of `Entry` (defined in `src/content/types.ts`) — one shape shared by every card-rendering section. `description` supports `**bold**` markers via `src/lib/rich-text.tsx`.

### Section ordering

Page composition is explicit in `src/app/page.tsx`:

```tsx
<CrossfadeStage from={<Hero />} to={<WorkIntro />} phases={{ gap: 0.05, in: 0.05, tail: 0.05 }} />
<Work />
<AwardsProjects />
<About />
<Footer />
```

Reorder sections by reordering these components. If you add/remove/rename a section, also update `site.sections` in `src/content/site.ts` — that generates the footer nav links and the anchor IDs `CrossfadeStage` and in-page links target. "Connect" has no section of its own — those links live in the footer.

### Fonts

Set in `@theme` in `src/app/globals.css`:

```css
--font-display:
  ui-serif, "New York", var(--font-newsreader), Iowan Old Style, Palatino, Georgia, serif;
```

The design is built around **New York** (via `ui-serif` on Apple platforms). `Newsreader` (loaded in `src/app/layout.tsx` via `next/font/google`, `preload: false`) is the fallback for platforms where `ui-serif` doesn't resolve to New York — it never loads on Apple devices. To change the typeface, either swap the whole stack or just change the Google Font fallback (update both the `Newsreader` import in `layout.tsx` and the `var(--font-newsreader)` reference — keep the CSS variable name in sync).

Nearly everything uses `font-display`; there's no separate body/heading font.

### Font sizes

No fixed type scale — headings and body text use fluid sizing with Tailwind arbitrary values and `clamp()`, tuned per section (comments in `Hero.tsx` reference the source design frame dimensions). E.g.:

```tsx
// Hero.tsx
<h1 className="text-[clamp(2.75rem,8.466vw,9.5rem)] ...">
```

Resize a heading by adjusting the three clamp values directly at the call site (`Hero.tsx`, `About.tsx`, `AwardsProjects.tsx`, `Footer.tsx`, `Work.tsx`) — there's no shared scale to edit centrally. Small UI text (metadata, labels) tends to use plain `text-[Nem]` or `text-[Npx]` relative to its container instead.

### Colors

Theme tokens, also in the `@theme` block of `globals.css`:

| Token               | Value               | Use                                 |
| ------------------- | ------------------- | ----------------------------------- |
| `--color-paper`     | `#f9f9f9`           | page background                     |
| `--color-ink`       | `#0a0a0c`           | primary text                        |
| `--color-ink-hover` | `#242428`           | hover state on ink-colored elements |
| `--color-mute`      | `#6c6c76`           | secondary/meta text                 |
| `--color-hair`      | `#e7e7ec`           | hairline borders                    |
| `--color-surface`   | `hsl(30deg 4% 96%)` | subtle surface fill                 |

Tailwind generates utilities from these automatically (`bg-paper`, `text-ink`, `border-hair`, etc.). Glass shape colors (the blobs/glows behind the flutes) are separate — see below.

### The fluted-glass effect

Lives entirely in `src/components/fluted-glass/`. It's a real-time WebGL2 shader: colored shapes ("shapes") sit behind a refractive flute field ("glass"), lit by a configurable key light, and everything responds to pointer movement ("interaction").

Every panel on the site is one `<FlutedGlass>` spread from a preset:

| Preset   | Used by                              | What it is                                                                                                                                                                                                                                 |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `hero`   | `hero/Hero.tsx`                      | The periwinkle arch rising out of the bottom edge of the first screen                                                                                                                                                                      |
| `footer` | `layout/Footer.tsx`                  | The dome that grows on overscroll. Also takes a `reveal` ref, driven by `layout/useOverscrollReveal.ts`                                                                                                                                    |
| `accent` | `awards-projects/AwardsProjects.tsx` | The band bleeding off the right edge of the awards list. Ships no shapes of its own — `awards-projects/accents.ts` builds them per entry from the `accent`/`accentSoft` fields on the `Entry`, and the spread overrides `shapes` with them |

Files:

- **`presets.ts`** — the three above, and only those. Each carries a long comment explaining why its numbers are what they are; that comment is the record, so change numbers and comment together.
- **`types.ts`** — every tunable knob (`GlassShape`, `GlassConfig`, `CurveConfig`, `LightConfig`, `InteractionConfig`, `QualityConfig`), documented inline, plus `DEFAULTS` — the single table of fallbacks that both `resolveConfig` and the lab's sliders read.
- **`gl/shaders/`** — the GLSL (field, glass refraction, blur passes).

**Flat vs. curved.** A panel with no `glass.curve` is a flat sheet: the flutes run straight across at one width. Adding `glass.curve` wraps them around a cylinder, so they foreshorten toward each rim and roll around it as `curve.drive` asks (`scroll`, `pointer` or `ambient`). There's no separate mode flag — the presence of the block _is_ the switch, and everything in `CurveConfig` (`rimAngle`, `edgeFade`, `turnsPerViewport`, …) only means anything inside it. `accent` is the site's only curved panel.

To tweak a panel's look, edit its preset. To explore visually first, run `npm run dev` and open `/lab` — the tabs are the three shipped presets, sliders cover every knob, and the panel at the right re-renders live. Copy the JSON block at the bottom of the sidebar back into `presets.ts`. (Presets that ship no shapes, i.e. `accent`, get a stand-in pair in the lab so there's something on screen to tune.)

Key knobs for changing the _feel_ of glass rather than just color:

- `glass.pitch` / `glass.flutes` — flute width (fixed px) vs. flute count (scales with container width)
- `glass.ior` / `glass.thickness` — how strongly light bends/displaces
- `glass.roundness` — how lens-like each flute is
- `glass.curve` — flat sheet vs. curved, per above
- `light.angle` / `light.intensity` / `light.sharpness` — the specular highlight
- `interaction.pull` / shape-level `pull` — how strongly shapes lean toward the pointer (higher = more parallax between layers)

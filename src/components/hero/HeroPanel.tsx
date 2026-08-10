"use client";

import type { ReactNode } from "react";
import { FlutedGlass, presets, useTouchField } from "@/components/fluted-glass";

/**
 * `useTouchField` reads a runtime-published CSS variable (`--bleed`), so it has to run in a
 * client component. Split out from `Hero` so the headline/copy stay server-rendered as a plain
 * child, rather than pulling the whole hero into the client bundle for one hook.
 */
export function HeroPanel({ children }: { children: ReactNode }) {
  const shapes = useTouchField(presets.hero.shapes);

  return (
    <FlutedGlass
      {...presets.hero}
      shapes={shapes}
      className="h-full"
      fallback="linear-gradient(to top, #8ea8f5 0%, rgba(142,168,245,0) 55%)"
    >
      {children}
    </FlutedGlass>
  );
}

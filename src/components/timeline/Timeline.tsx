"use client";

/**
 * Full-screen blank-paper view opened from Work's "Open the Timeline" control, and the transition
 * that gets there and back.
 *
 * Not scroll-driven like `CrossfadeStage` — there's no scroll to drive it with, since the page
 * underneath stays exactly where it was. Instead this is one opacity transition on an opaque
 * overlay: fading it in reads as the page dissolving to blank paper, and fading it out reveals the
 * page again, untouched, at the same scroll offset. "Close the Timeline" fades in on its own delay
 * so it arrives a beat after the paper has settled, rather than riding in with it.
 *
 * Portals to `document.body` rather than rendering in place: the page wrapper's `--lift` (the
 * footer's overscroll reveal) is a real `transform`, and a transformed ancestor becomes the
 * containing block for `position: fixed` descendants, which would break this overlay's `inset-0`.
 *
 * Real content (`TimelineView`) mounts alongside the close control once the dissolve is under
 * way — flutes derived from `work.ts`/`education.ts`, pan, zoom, all live there. This file stays
 * the shell: portal, phase state machine, focus trap, scroll save/restore.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";
import { TimelineView } from "./TimelineView";

type Phase = "closed" | "opening" | "open" | "closing";

export function Timeline({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("closed");
  // Mirrors `open` from the previous render so a change can be caught during render itself —
  // React's sanctioned way to adjust state from a prop change without the extra commit (and the
  // `react-hooks/set-state-in-effect` violation) a same-tick `useEffect` would cost here.
  const [prevOpen, setPrevOpen] = useState(open);
  const closeRef = useRef<HTMLButtonElement>(null);
  const savedScrollY = useRef(0);
  const savedFocus = useRef<HTMLElement | null>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    setPhase(open ? "opening" : "closing");
  }

  const active = phase !== "closed";

  // Locks the page for the whole time the dialog is present (opening through closing), and
  // unconditionally reverses both on the way out — including a real unmount, not just a `phase`
  // change, since `active` going false is exactly what that looks like from here.
  useEffect(() => {
    if (!active) return;

    document.documentElement.style.overflow = "hidden";
    const root = document.getElementById("page-root");
    root?.setAttribute("inert", "");

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = "";
      root?.removeAttribute("inert");
    };
  }, [active, onClose]);

  // One-time setup for the entrance: capture where to return to, then flip to "open" next frame
  // so the mount frame (opacity 0) and the transition's start frame are never the same paint.
  useEffect(() => {
    if (phase !== "opening") return;

    savedScrollY.current = window.scrollY;
    savedFocus.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      setPhase("open");
      closeRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Correct the scroll offset while still fully opaque, so the page is already right on the
  // reveal's first visible frame rather than catching up after.
  useEffect(() => {
    if (phase !== "closing") return;
    if (window.scrollY !== savedScrollY.current) {
      window.scrollTo(0, savedScrollY.current);
    }
  }, [phase]);

  if (phase === "closed") return null;

  // False for "opening" (the pre-transition frame) and "closing"; true only once fully "open".
  const visible = phase === "open";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Timeline"
      className="bg-paper fixed inset-0 z-50 flex flex-col transition-opacity duration-[550ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
      style={{ opacity: visible ? 1 : 0 }}
      onTransitionEnd={(e) => {
        if (e.propertyName !== "opacity" || e.target !== e.currentTarget) return;
        if (phase !== "closing") return;
        setPhase("closed");
        savedFocus.current?.focus({ preventScroll: true });
      }}
    >
      <div className="shrink-0 pt-[5vh] pl-[var(--gutter-left)]">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="font-display inline-flex items-center gap-1 text-[clamp(1rem,1.3vw,1.15rem)] leading-[1.4] hover:text-mute"
          style={{
            opacity: visible ? 1 : 0,
            // Delay lives on `opacity` alone, so it only ever affects the entrance — an ongoing
            // hover's `color` transition never inherits a stale 420ms lag from mount.
            transition: visible
              ? "opacity 300ms cubic-bezier(0.65,0,0.35,1) 420ms, color 300ms ease-out"
              : "opacity 200ms cubic-bezier(0.65,0,0.35,1), color 300ms ease-out",
          }}
        >
          <ArrowLeft aria-hidden="true" className="size-[0.8em]" />
          Close the Timeline
        </button>
      </div>
      {/* Same delayed entrance as the close control, so the real content settles in a beat after
          the paper does rather than riding in with it. */}
      <div
        className="mt-[0.5vh] min-h-0 flex-1"
        style={{
          opacity: visible ? 1 : 0,
          transition: visible
            ? "opacity 300ms cubic-bezier(0.65,0,0.35,1) 420ms"
            : "opacity 200ms cubic-bezier(0.65,0,0.35,1)",
        }}
      >
        <TimelineView />
      </div>
    </div>,
    document.body,
  );
}

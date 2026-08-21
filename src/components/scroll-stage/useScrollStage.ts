"use client";

/**
 * One shared per-frame scheduler for every pinned scroll stage on the page.
 *
 * Each stage (`CrossfadeStage`, `AwardsProjects`) used to run its own independent
 * `requestAnimationFrame` loop: read live geometry (`getBoundingClientRect`, `offsetHeight`),
 * then immediately write styles from it. With two stages mounted, the browser had to run stage
 * A's read, stage A's write (dirties layout), stage B's read (forces the layout stage A just
 * dirtied), stage B's write — a forced synchronous layout wedged into every single scroll frame,
 * for as long as both were on screen.
 *
 * Registering a `measure` (reads only) and a `commit` (writes only) here instead means every
 * stage's reads run before any stage's writes, every frame — eliminating that interleave by
 * construction rather than by accident.
 *
 * Deliberately narrow: `range()` (each stage's occasional, resize-driven pin-geometry write) and
 * the scroll/resize listeners that trigger it stay on each stage — neither runs every frame, so
 * neither was contributing to the per-frame interleave this exists to remove. Centralizing only
 * the part that actually runs on every frame of a scroll gesture is what keeps this small.
 */

type Callback = () => void;

const measures = new Set<Callback>();
const commits = new Set<Callback>();
let queued = 0;

function runFrame() {
  queued = 0;
  for (const measure of measures) measure();
  for (const commit of commits) commit();
}

/**
 * Requests the next shared frame. A no-op if one is already queued, so every stage's scroll
 * handler piggybacks on the same frame rather than each scheduling (and cancelling) their own.
 */
export function requestStageFrame() {
  if (queued) return;
  queued = requestAnimationFrame(runFrame);
}

/**
 * Registers a stage's per-frame work and returns the function that unregisters it — call that
 * from the stage's own effect cleanup. Registration order sets read/write order within a frame,
 * but every `measure` still runs before every `commit` regardless, which is the guarantee that
 * matters here.
 */
export function registerStage(measure: Callback, commit: Callback): () => void {
  measures.add(measure);
  commits.add(commit);
  return () => {
    measures.delete(measure);
    commits.delete(commit);
  };
}

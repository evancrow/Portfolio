"use client";

/** One shared per-frame scheduler for every pinned scroll stage (`CrossfadeStage`,
 *  `AwardsProjects`): runs every registered `measure` before any `commit`, every frame, so two
 *  stages mounted at once can't force a synchronous layout off of each other.
 *  Rationale: docs/pinned-scroll-stages.md § Why a shared scheduler */

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

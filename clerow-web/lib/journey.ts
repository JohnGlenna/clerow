// The 90-day plan overlay — a time-bound narrative layered on top of "The Climb"
// (lib/ladder.ts). The ladder answers *what* to do next; the journey answers
// *where am I in the plan* — Day N of 90, which of three 30-day phases I'm in,
// and which 30/60/90 checkpoints I've reached. Pure (no I/O): the route feeds it
// the brand's start day, today, and the built ladder. The anchor is the brand's
// created_at (day 0), so no schema/migration is needed.

import type { Ladder, LevelState } from "./ladder";

export const JOURNEY_DAYS = 90;

// The five ladder levels grouped into three 30-day phases. Each phase owns a
// contiguous slice of the climb, so "reaching the day-30 checkpoint" lines up
// with "finishing the Foundations/On-page levels".
const PHASE_DEFS: { label: string; blurb: string; levels: number[] }[] = [
  { label: "Get found", blurb: "Foundations & on-page — make AI able to find and quote you.", levels: [1, 2] },
  { label: "Get cited", blurb: "Authority & the pages that win your big buyer questions.", levels: [3, 4] },
  { label: "Win & measure", blurb: "Re-scan, bank the gains, and keep the streak going.", levels: [5] },
];

export type JourneyPhase = {
  index: number; // 0-based
  label: string;
  blurb: string;
  levels: number[];
  levelsDone: number;
  levelsTotal: number;
  state: "done" | "active" | "upcoming";
  checkpointDay: number; // the day this phase's checkpoint falls on (30/60/90)
  reached: boolean; // dayNumber has passed this checkpoint
};

export type Journey = {
  dayNumber: number; // 1-based day in the plan (≥1; can exceed JOURNEY_DAYS)
  totalDays: number;
  daysLeft: number; // clamped ≥0
  pct: number; // 0–100 progress through the 90 days
  complete: boolean; // past day 90
  phases: JourneyPhase[];
  currentPhase: number; // index of the active phase
  levelsDone: number;
  levelsTotal: number;
};

// Whole calendar days from `a` to `b` (both YYYY-MM-DD), via UTC midnight so DST
// never shifts the count. Negative if b is before a.
function daysBetween(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return Math.round((tb - ta) / 86_400_000);
}

// Build the 90-day journey from the brand's start day, today (both YYYY-MM-DD in
// the brand's timezone), and the built ladder.
export function buildJourney(startDay: string, today: string, ladder: Ladder): Journey {
  const dayNumber = Math.max(1, daysBetween(startDay, today) + 1);
  const stateByLevel = new Map<number, LevelState>(ladder.levels.map((l) => [l.level, l.state]));
  const isDone = (lvl: number) => stateByLevel.get(lvl) === "done";

  const phases: JourneyPhase[] = PHASE_DEFS.map((p, i) => {
    const levelsDone = p.levels.filter(isDone).length;
    const levelsTotal = p.levels.length;
    const isActive = p.levels.includes(ladder.currentLevel) && levelsDone < levelsTotal;
    const state: JourneyPhase["state"] = levelsDone === levelsTotal ? "done" : isActive ? "active" : "upcoming";
    const checkpointDay = (i + 1) * 30;
    return { index: i, label: p.label, blurb: p.blurb, levels: p.levels, levelsDone, levelsTotal, state, checkpointDay, reached: dayNumber >= checkpointDay };
  });

  // The active phase is the first not-done one; if all are done, the last.
  const firstOpen = phases.findIndex((p) => p.state !== "done");
  const currentPhase = firstOpen === -1 ? phases.length - 1 : firstOpen;

  const levelsDone = ladder.levels.filter((l) => l.state === "done").length;

  return {
    dayNumber,
    totalDays: JOURNEY_DAYS,
    daysLeft: Math.max(0, JOURNEY_DAYS - dayNumber),
    pct: Math.min(100, Math.round((dayNumber / JOURNEY_DAYS) * 100)),
    complete: dayNumber > JOURNEY_DAYS,
    phases,
    currentPhase,
    levelsDone,
    levelsTotal: ladder.levels.length,
  };
}

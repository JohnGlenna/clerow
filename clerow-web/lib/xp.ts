// Lifetime XP → level. The streak is the hero loss-aversion mechanic; XP is the
// complementary accumulation one — a number that only ever goes up, banked from
// every completed quest (it survives a broken streak and survives archiving).
//
// Lifetime XP is derived, not stored: it's the sum of `xp` over a brand's done
// tasks (see /api/dashboard). This module is the pure level math on top of that.
//
// Curve: each level costs a little more than the last, so early levels arrive
// fast (rewarding) and later ones feel earned. span(L) = BASE + (L-1)*GROWTH.

const BASE = 100; // XP to go from level 1 → 2
const GROWTH = 25; // each subsequent level costs this much more

// Playful titles by band, so a level reads as a rank, not just a number.
const TITLES: { min: number; title: string }[] = [
  { min: 1, title: "Rookie" },
  { min: 3, title: "Climber" },
  { min: 6, title: "Contender" },
  { min: 10, title: "Challenger" },
  { min: 15, title: "Authority" },
  { min: 22, title: "Legend" },
];

export type LevelInfo = {
  level: number; // 1-based
  total: number; // lifetime XP
  intoLevel: number; // XP earned within the current level
  span: number; // XP the current level spans (intoLevel → next level)
  pct: number; // 0–100 progress to the next level
  title: string;
};

const spanFor = (level: number) => BASE + (level - 1) * GROWTH;

function titleFor(level: number): string {
  let t = TITLES[0].title;
  for (const band of TITLES) if (level >= band.min) t = band.title;
  return t;
}

// Walk levels, subtracting each level's span from the remaining XP, until the
// remainder no longer covers the next level. O(level) — levels stay small.
export function levelFromXp(totalXp: number): LevelInfo {
  const total = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;
  let remaining = total;
  let span = spanFor(level);
  while (remaining >= span) {
    remaining -= span;
    level += 1;
    span = spanFor(level);
  }
  return {
    level,
    total,
    intoLevel: remaining,
    span,
    pct: Math.min(100, Math.round((remaining / span) * 100)),
    title: titleFor(level),
  };
}

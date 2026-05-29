// Duolingo-style streak logic.
//
// A "streak day" is a brand-local calendar day on which the user completed at
// least one task (`tasks.completed_at`). Miss a day and the streak resets to 0
// — unless a banked freeze auto-bridges it.
//
// The streak can't be purely derived because a freeze is *spent*: we must
// remember the freeze balance and which missed days a freeze already covered.
// So `evaluateStreak` is a deterministic roll-forward over *finalized* days
// (everything strictly before today) that mutates only the freeze state; the
// current/longest counts are then derived from the effective day set
// (completions ∪ frozen days). Re-running it the same day is idempotent.

export type StreakState = {
  current: number;
  longest: number;
  freezes: number;
  frozenDates: string[]; // YYYY-MM-DD days a freeze bridged
  lastEvaluatedDate: string | null; // YYYY-MM-DD, last finalized day
};

export type StreakResult = StreakState & { activeToday: boolean };

export const MAX_FREEZES = 2;
export const FREEZE_EARN_EVERY = 7; // earn one freeze each 7-day milestone

// A Date → "YYYY-MM-DD" in the given IANA timezone. en-CA formats as ISO date.
export function dayKey(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Add `n` whole days to a "YYYY-MM-DD" string (UTC math; date-only, DST-safe).
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// Length of the consecutive effective-day run ending at `endDay`.
function backwalk(endDay: string, effective: (d: string) => boolean): number {
  let run = 0;
  let d = endDay;
  while (effective(d)) {
    run++;
    d = addDays(d, -1);
  }
  return run;
}

export function evaluateStreak(
  prev: StreakState,
  completedAt: (string | null | undefined)[],
  now: Date,
  tz: string,
): StreakResult {
  const today = dayKey(now, tz);
  const yesterday = addDays(today, -1);

  const completionDays = new Set<string>();
  for (const ts of completedAt) {
    if (ts) completionDays.add(dayKey(new Date(ts), tz));
  }

  let freezes = prev.freezes;
  const frozen = new Set(prev.frozenDates);
  let longest = prev.longest;
  const isEffective = (d: string) => completionDays.has(d) || frozen.has(d);

  // Where finalized processing begins: the day after the last finalized day, or
  // (first run) the earliest completion day so historical milestones are awarded.
  let start: string;
  if (prev.lastEvaluatedDate) {
    start = addDays(prev.lastEvaluatedDate, 1);
  } else {
    const sorted = [...completionDays].sort();
    start = sorted.length ? sorted[0] : today;
  }

  // Streak entering `start`, reconstructed from already-finalized effective days.
  let aliveRun = backwalk(addDays(start, -1), isEffective);

  const earn = () => {
    if (aliveRun > 0 && aliveRun % FREEZE_EARN_EVERY === 0) {
      freezes = Math.min(MAX_FREEZES, freezes + 1);
    }
  };

  // Finalize each past day [start .. yesterday].
  for (let d = start; d <= yesterday; d = addDays(d, 1)) {
    if (isEffective(d)) {
      aliveRun++;
      earn();
    } else if (aliveRun > 0 && freezes > 0) {
      // Bridge the missed day with a freeze; the streak survives.
      freezes--;
      frozen.add(d);
      aliveRun++;
      earn();
    } else {
      aliveRun = 0;
    }
    if (aliveRun > longest) longest = aliveRun;
  }

  // Today is provisional (the day isn't over): completing extends the streak now;
  // not completing leaves it alive-but-at-risk until tomorrow's finalize.
  const activeToday = completionDays.has(today);
  const current = activeToday ? aliveRun + 1 : aliveRun;
  if (current > longest) longest = current;

  // Never move the finalized cursor backwards.
  const lastEvaluatedDate =
    prev.lastEvaluatedDate && prev.lastEvaluatedDate > yesterday
      ? prev.lastEvaluatedDate
      : yesterday;

  return {
    current,
    longest,
    freezes,
    frozenDates: [...frozen].sort(),
    lastEvaluatedDate,
    activeToday,
  };
}

export const EMPTY_STREAK: StreakState = {
  current: 0,
  longest: 0,
  freezes: 0,
  frozenDates: [],
  lastEvaluatedDate: null,
};

// Daily quest generation.
//
// A Duolingo streak needs something to do every day. Each brand-local day we
// surface up to DAILY_QUEST_COUNT "Today's quests" picked from the brand's real
// signals — prompt gaps, competitors ranked above them, source/citation gaps —
// falling back to evergreen AEO actions so there is always a way to keep the
// streak. Generation is idempotent per day: we only top up to the target count
// and never re-suggest a title that's already an open task.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TaskRow } from "./supabase/database.types";

type DB = SupabaseClient<Database>;

export const DAILY_QUEST_COUNT = 2;

export type DailySignals = {
  company: string;
  industry: string;
  primaryPrompt: string | null;
  promptGaps: string[]; // prompt texts you don't yet win
  competitorsAhead: string[]; // competitor names ranked above you
  sourceGaps: string[]; // citation domains worth getting listed on
};

export type Candidate = { title: string; meta: string; xp: number; impact: string };

// Highest-impact first. The picker takes the first candidates whose titles
// aren't already open tasks, so ordering is the priority.
export function buildDailyCandidates(s: DailySignals): Candidate[] {
  const out: Candidate[] = [];

  for (const comp of s.competitorsAhead) {
    out.push({
      title: `Publish a comparison page: ${s.company} vs ${comp}`,
      meta: "≈ 45 min · impact: very high",
      xp: 200,
      impact: "very high",
    });
  }
  for (const src of s.sourceGaps) {
    out.push({
      title: `Get listed on ${src}`,
      meta: "≈ 20 min · impact: high",
      xp: 80,
      impact: "high",
    });
  }
  for (const prompt of s.promptGaps) {
    out.push({
      title: `Improve your answer for: "${prompt}"`,
      meta: "≈ 30 min · impact: high",
      xp: 60,
      impact: "high",
    });
  }
  if (s.primaryPrompt) {
    out.push({
      title: `Add an FAQ answering "${s.primaryPrompt}"`,
      meta: "≈ 10 min · impact: high",
      xp: 50,
      impact: "high",
    });
  }

  // Evergreen fallbacks — always keep at least these available.
  out.push(
    {
      title: `Re-scan ${s.company || "your site"} to track today's movement`,
      meta: "≈ 2 min · impact: medium",
      xp: 15,
      impact: "medium",
    },
    {
      title: "Answer a relevant question on Reddit",
      meta: "≈ 15 min · impact: high",
      xp: 60,
      impact: "high",
    },
    {
      title: "Post a customer win on LinkedIn",
      meta: "≈ 15 min · impact: medium",
      xp: 35,
      impact: "medium",
    },
  );

  return out;
}

// Ensure today's quests exist (up to DAILY_QUEST_COUNT). Returns only the rows
// it inserted, so the caller can append them to the tasks it already loaded
// without a second read.
export async function ensureDailyQuests(
  db: DB,
  brandId: string,
  today: string, // YYYY-MM-DD, brand-local
  signals: DailySignals,
  existingTasks: TaskRow[],
): Promise<TaskRow[]> {
  const todays = existingTasks.filter((t) => t.for_date === today);
  const needed = DAILY_QUEST_COUNT - todays.length;
  if (needed <= 0) return [];

  // Don't re-suggest a title that's already a today's quest or an open task.
  const taken = new Set(
    existingTasks.filter((t) => t.for_date === today || !t.done).map((t) => t.title),
  );

  const picks: Candidate[] = [];
  for (const c of buildDailyCandidates(signals)) {
    if (taken.has(c.title)) continue;
    taken.add(c.title);
    picks.push(c);
    if (picks.length >= needed) break;
  }
  if (picks.length === 0) return [];

  const { data, error } = await db
    .from("tasks")
    .insert(
      picks.map((c) => ({
        brand_id: brandId,
        title: c.title,
        meta: c.meta,
        xp: c.xp,
        impact: c.impact,
        source: "daily",
        for_date: today,
      })),
    )
    .select();
  if (error) throw new Error(`Failed to seed daily quests: ${error.message}`);
  return data ?? [];
}

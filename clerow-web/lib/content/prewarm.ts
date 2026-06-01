// Background content pre-warm — generate the active Climb level's "Make content"
// drafts ahead of time and cache them on the task rows, so opening a box is
// instant instead of showing "Generating your content…".
//
// Runs best-effort after a dashboard load (via next/server `after`), so it never
// blocks the response. Idempotent: tasks that already have cached content are
// skipped, and individual failures are swallowed — a box that didn't warm just
// falls back to live generation on click. Deterministic Level-1 audit fixes
// (robots.txt / llms.txt) are never warmed; they're built on the fly already.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import type { Ladder } from "../ladder";
import type { BrandProfile } from "../types";
import { generateFixContent } from "./generate";

type DB = SupabaseClient<Database>;
type BrandRow = Database["public"]["Tables"]["brands"]["Row"];

function toProfile(b: BrandRow): BrandProfile {
  return {
    url: b.url,
    company: b.company,
    industry: b.industry,
    description: b.description,
    location: b.location,
    audience: b.audience,
    competitors: b.competitors,
    differentiators: b.differentiators,
    geos: b.geos,
    enrichNotes: b.enrich_notes,
  };
}

// Generate + cache content for the active level's LLM-backed tasks that aren't
// cached yet. `db` should be a service-role client so it stays valid after the
// HTTP response is flushed.
export async function prewarmActiveLevel(db: DB, brand: BrandRow, ladder: Ladder): Promise<void> {
  const active = ladder.levels.find((l) => l.state === "active");
  if (!active) return;

  // Persisted, LLM-backed tasks only — audit-* keys are deterministic + instant.
  const candidates = active.tasks.filter((t) => t.id && !t.key.startsWith("audit-"));
  if (candidates.length === 0) return;

  const ids = candidates.map((t) => t.id!) as string[];
  const { data: rows } = await db.from("tasks").select("id, content").in("id", ids);
  const cached = new Set((rows ?? []).filter((r) => r.content).map((r) => r.id));
  const todo = candidates.filter((t) => !cached.has(t.id!));
  if (todo.length === 0) return;

  const profile = toProfile(brand);
  await Promise.allSettled(
    todo.map(async (t) => {
      try {
        const { content } = await generateFixContent({ brand: profile, title: t.title, detail: t.detail });
        await db.from("tasks").update({ content, content_at: new Date().toISOString() }).eq("id", t.id!);
      } catch {
        // Best-effort warm; the content route will generate live on click.
      }
    }),
  );
}

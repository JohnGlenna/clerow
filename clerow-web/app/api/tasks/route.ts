import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSubscription, isSubscribed } from "@/lib/billing/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveBrandId(supabase: SupabaseClient<Database>, userId: string) {
  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", userId)
    .eq("is_prospect", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return brand?.id ?? null;
}

// List archived tasks (the Archive view), newest archive first. A task lands here
// when the user explicitly archives a completed quest to clear it from the active
// lists — `done` quests that haven't been archived still live on the Quests page.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const brandId = await resolveBrandId(supabase, user.id);
  if (!brandId) return NextResponse.json({ tasks: [] });

  const { data } = await supabase
    .from("tasks")
    .select("id, title, meta, xp, impact, source, completed_at, archived_at, for_date")
    .eq("brand_id", brandId)
    .eq("archived", true)
    .order("archived_at", { ascending: false, nullsFirst: false })
    .limit(500);

  return NextResponse.json({ tasks: data ?? [] });
}

// Create a task (e.g. "Add as quest" from a prompt's GEO step). Idempotent on an
// open task with the same title, so re-adding the same step returns the existing
// quest instead of duplicating it.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const brandId = await resolveBrandId(supabase, user.id);
  if (!brandId) return NextResponse.json({ error: "No brand to attach the quest to" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("tasks")
    .select("*")
    .eq("brand_id", brandId)
    .eq("title", title)
    .eq("done", false)
    .limit(1)
    .maybeSingle();
  if (existing) return NextResponse.json({ task: existing, created: false });

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      brand_id: brandId,
      title,
      meta: String(body.meta ?? ""),
      xp: Number.isFinite(body.xp) ? Math.trunc(body.xp) : 0,
      impact: String(body.impact ?? "medium"),
      source: String(body.source ?? "prompt"),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data, created: true });
}

// Update a task's `done` and/or `archived` state. Stamping `completed_at` is what
// feeds the streak — a brand-local day with any completion counts toward it.
// `done` and `archived` are independent: archiving a completed quest keeps its
// `done`/`completed_at` (so it never costs the user streak or XP), it just clears
// it from the active lists. RLS scopes the update to the signed-in user's own
// tasks, so a foreign id simply matches 0 rows.
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const now = new Date().toISOString();
  const update: Database["public"]["Tables"]["tasks"]["Update"] = {};
  if ("done" in body) {
    const done = Boolean(body.done);
    // Free-frontier guard (defense-in-depth): a non-subscriber may not complete a
    // paywalled ladder task. Locked tasks are never seeded for a normal free user
    // (no id to PATCH), but a churned ex-subscriber can still hold stale level 3–5
    // ladder rows — reject those so the boundary holds off the happy path too.
    if (done) {
      const { data: t } = await supabase.from("tasks").select("source, level").eq("id", id).maybeSingle();
      if (t?.source === "ladder" && (t.level ?? 0) >= 3 && !isSubscribed(await getSubscription(supabase, user.id))) {
        return NextResponse.json(
          { error: "This task requires a Clerow Premium subscription." },
          { status: 402 },
        );
      }
    }
    update.done = done;
    update.completed_at = done ? now : null;
  }
  if ("archived" in body) {
    const archived = Boolean(body.archived);
    update.archived = archived;
    update.archived_at = archived ? now : null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing to update (send done and/or archived)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select("id, done, completed_at, archived, archived_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ task: data });
}

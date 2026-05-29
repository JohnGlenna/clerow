import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveBrandId(supabase: SupabaseClient<Database>, userId: string) {
  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return brand?.id ?? null;
}

// List completed tasks (the Archive view), newest completion first.
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
    .select("id, title, meta, xp, impact, source, completed_at, for_date")
    .eq("brand_id", brandId)
    .eq("done", true)
    .order("completed_at", { ascending: false, nullsFirst: false })
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

// Toggle a task's completion. Stamping `completed_at` is what feeds the streak —
// a brand-local day with any completion counts toward it. RLS scopes the update
// to the signed-in user's own tasks, so a foreign id simply matches 0 rows.
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  const done = Boolean(body.done);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("tasks")
    .update({ done, completed_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id, done, completed_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ task: data });
}

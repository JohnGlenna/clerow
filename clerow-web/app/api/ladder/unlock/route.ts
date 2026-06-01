import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleLadderContext } from "@/lib/scan/ladderContext";
import { buildLadder, ensureLadderTasks } from "@/lib/ladder";
import { getSubscription, isSubscribed } from "@/lib/billing/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Free, instant "Unlock Level N": reveal a level's tasks without a scan. The
// ladder for every level is already computed deterministically from the last
// scan's stored data, so unlocking is just seeding that level's tasks into the
// DB. Subscription-gated, but no AI cost. Lets subscribers jump ahead.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!isSubscribed(await getSubscription(supabase, user.id))) {
    return NextResponse.json({ error: "Subscription required to unlock levels." }, { status: 402 });
  }

  const body = await req.json().catch(() => ({}));
  const level = typeof body?.level === "number" ? body.level : null;
  if (!level || level < 1) return NextResponse.json({ error: "Invalid level." }, { status: 400 });

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, done, archived, ladder_key")
    .eq("brand_id", brand.id);

  const { ctx } = await assembleLadderContext(supabase, brand);
  const existing = new Map<string, { id: string; done: boolean; resolved: boolean }>();
  for (const t of tasks ?? [])
    if (t.ladder_key) existing.set(t.ladder_key, { id: t.id, done: t.done, resolved: t.done || t.archived });

  // unlockedThrough = the requested level: every incomplete level up to it becomes
  // "open" and gets its tasks seeded.
  const ladder = buildLadder(ctx, existing, level);
  await ensureLadderTasks(supabase, brand.id, ladder, new Set(existing.keys()));

  return NextResponse.json({ ok: true, unlockedThrough: level });
}

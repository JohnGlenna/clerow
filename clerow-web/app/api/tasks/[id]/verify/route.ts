import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshSiteAudit } from "@/lib/audit/ensure";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A re-fetch of a few of the user's own pages (homepage, robots.txt, llms.txt,
// sitemap) — no LLM, no engine scan. Generous timeout for slow sites.
export const maxDuration = 30;

async function resolveBrand(supabase: SupabaseClient<Database>, userId: string) {
  const { data: brand } = await supabase
    .from("brands")
    .select("id, url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return brand ?? null;
}

// POST: confirm a Level-1 technical fix actually shipped to the user's site.
// Re-runs the SAME lightweight crawl (refreshSiteAudit → auditSite) that created
// the task and reads the matching check — so verification can't drift from the
// task. Only audit-* tasks are mechanically checkable; everything else returns
// verifiable:false and the UI hides the button. This never changes the task's
// done state — completion stays self-reported; this only reassures the user.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const brand = await resolveBrand(supabase, user.id);
  if (!brand) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const { id } = await ctx.params;
  const { data: task } = await supabase
    .from("tasks")
    .select("ladder_key")
    .eq("id", id)
    .eq("brand_id", brand.id)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  // Audit tasks carry a ladder_key like "audit-h1"; the matching SiteCheck.id is
  // the suffix ("h1"). Anything else isn't fetch-verifiable.
  const key = task.ladder_key ?? "";
  if (!key.startsWith("audit-")) return NextResponse.json({ verifiable: false });
  const checkId = key.slice("audit-".length);

  const audit = await refreshSiteAudit(supabase, brand.id, brand.url);
  const check = audit.checks.find((c) => c.id === checkId);
  if (!check) return NextResponse.json({ verifiable: false });

  return NextResponse.json({
    verifiable: true,
    live: check.status === "pass",
    detail: check.detail,
  });
}

// The Outbox tab's "Run pipeline now" button — same engine as the daily cron,
// triggered on demand to top up the ready-to-send queue.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { runProspectPipeline } from "@/lib/prospect/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { maxScans?: number; discover?: boolean };
  const maxScans = Math.min(Math.max(Number(body.maxScans) || 3, 1), 6);

  const admin = createAdminClient();
  const summary = await runProspectPipeline(admin, {
    maxScans,
    discover: body.discover !== false,
    timeBudgetMs: 240_000,
  });
  return NextResponse.json(summary);
}

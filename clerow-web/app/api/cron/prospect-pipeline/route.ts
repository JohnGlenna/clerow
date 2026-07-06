import { NextResponse } from "next/server";

import { runProspectPipeline } from "@/lib/prospect/pipeline";
import { getAutoScansEnabled } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Pro plan + Fluid compute allows 800s — room for ~10 fresh scans per run now
// that scans run on low reasoning effort with capped answers. The pipeline's
// time-budget check bails out cleanly if a run gets slow.
export const maxDuration = 800;

// Daily prospect autopilot: discover new leads (brreg + Product Hunt), run the
// quality gate, scan survivors, and fill the Outbox tab with ready-to-send
// drafts. Invoked by Vercel Cron (Authorization: Bearer <CRON_SECRET>); also
// runnable manually with the same header. Safe to re-run — processed leads
// leave the 'new' queue, and scans are cached per domain for 14 days.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  // Founder kill switch (Admin → Prospect Scanner). When off, the cron still
  // fires on schedule but no-ops cheaply — no discovery, no scans, no spend.
  if (!(await getAutoScansEnabled(admin))) {
    return NextResponse.json({ skipped: true, reason: "auto-scans disabled" });
  }

  // 10 × 6 cron runs = 60 fresh scans/day, slightly ahead of the 50/day send
  // cap so the Outbox never starves (see mailer.ts dailySendCap).
  const summary = await runProspectPipeline(admin, {
    maxScans: Number(process.env.PROSPECT_PIPELINE_MAX_SCANS) || 10,
    timeBudgetMs: 720_000,
  });
  return NextResponse.json(summary);
}

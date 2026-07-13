// Auto-send drip: sends ONE ready outreach draft per invocation, so pacing
// comes entirely from the cron schedule (vercel.json: every 10 min, weekdays
// ~09:00–17:00 Oslo time ≈ 48 ticks/day, under the 50/24h cap in mailer.ts).
// Picks the OLDEST 'scanned' lead first — fresh drafts sit at the back of the
// queue, so there is always a review window in the Outbox to edit or Skip a
// draft before the drip reaches it. Gated by the founder's auto-send switch
// (Admin → Outbox), which is OFF by default and separate from auto-scans.
// Invoked by Vercel Cron (Authorization: Bearer <CRON_SECRET>); also runnable
// manually with the same header. `?dryRun=1` reports what would be sent.

import { NextResponse } from "next/server";

import { dailySendCap, gmailConfigured } from "@/lib/prospect/mailer";
import { unpackEmail } from "@/lib/prospect/persist";
import { EMAIL_RE, sendToLead, sentInLast24h } from "@/lib/prospect/sendLead";
import { getAutoSendEnabled } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// How many queue-front leads to consider per tick. Leads with an unusable
// draft or address are skipped (left for manual review), not rejected — a
// small window keeps one bad lead from stalling the whole drip.
const CANDIDATES = 5;

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

  if (!(await getAutoSendEnabled(admin))) {
    return NextResponse.json({ skipped: true, reason: "auto-send disabled" });
  }
  if (!gmailConfigured()) {
    return NextResponse.json(
      { error: "Sending is not configured — set GMAIL_USER and GMAIL_APP_PASSWORD" },
      { status: 500 },
    );
  }

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

  // Cheap pre-check so a capped day no-ops without touching scans. sendToLead
  // re-checks atomically enough for our single-sender reality.
  const [sentToday, cap] = [await sentInLast24h(admin), dailySendCap()];
  if (sentToday >= cap) {
    return NextResponse.json({ skipped: true, reason: "daily send cap reached", sentToday, cap });
  }

  const { data: leads, error: leadsError } = await admin
    .from("leads")
    .select("id, name, website_key, email")
    .eq("status", "scanned")
    .not("email", "is", null)
    .order("updated_at", { ascending: true })
    .limit(CANDIDATES);
  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });
  if (!leads?.length) {
    return NextResponse.json({ skipped: true, reason: "no leads ready to send", sentToday, cap });
  }

  // Newest scan per domain (same join the Outbox uses).
  const { data: scans, error: scansError } = await admin
    .from("prospect_scans")
    .select("website_key, email_copy, created_at")
    .in("website_key", leads.map((l) => l.website_key))
    .order("created_at", { ascending: false });
  if (scansError) return NextResponse.json({ error: scansError.message }, { status: 500 });
  const copyByKey = new Map<string, string | null>();
  for (const s of scans ?? []) {
    if (!copyByKey.has(s.website_key)) copyByKey.set(s.website_key, s.email_copy);
  }

  // First candidate with a valid address AND a complete draft wins. No human
  // reviews these sends, so anything questionable stays in the Outbox instead.
  const skipped: { leadId: string; name: string; reason: string }[] = [];
  for (const lead of leads) {
    const to = (lead.email ?? "").trim();
    if (!EMAIL_RE.test(to)) {
      skipped.push({ leadId: lead.id, name: lead.name, reason: "invalid recipient address" });
      continue;
    }
    const { subject, body } = unpackEmail(copyByKey.get(lead.website_key) ?? null);
    if (!subject.trim() || !body.trim()) {
      skipped.push({ leadId: lead.id, name: lead.name, reason: "draft missing or incomplete" });
      continue;
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        wouldSend: { leadId: lead.id, name: lead.name, to, subject, body },
        skipped,
        sentToday,
        cap,
      });
    }

    const result = await sendToLead(admin, { leadId: lead.id, to, subject, body });
    if (!result.ok) {
      // Send failure: report and stop — do NOT fall through to the next lead,
      // or a broken SMTP setup would burn the whole candidate window per tick.
      return NextResponse.json(
        { error: `Send failed: ${result.message}`, lead: { leadId: lead.id, name: lead.name }, skipped },
        { status: result.reason === "cap-reached" ? 429 : 502 },
      );
    }
    return NextResponse.json({
      sent: { leadId: lead.id, name: lead.name, to, subject },
      skipped,
      sentToday: result.sentToday,
      cap: result.cap,
    });
  }

  return NextResponse.json({
    skipped: true,
    reason: "no sendable drafts in the queue front",
    details: skipped,
    sentToday,
    cap,
  });
}

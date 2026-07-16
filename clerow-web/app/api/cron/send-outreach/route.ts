// Auto-send drip: sends up to MAX_PER_TICK outreach emails per invocation
// (vercel.json: every 10 min, weekdays ~09:00–17:00 Oslo ≈ 48 ticks/day,
// 48 × 5 = 240 capacity under the 200/24h cap in mailer.ts — the cap is the
// real limit, re-checked atomically per send).
//
// Each lead gets a 3-email sequence, all through this cron:
//   email 1  the reviewed LLM draft (oldest 'scanned' lead first — fresh
//            drafts sit at the back, so there is always a review window in
//            the Outbox to edit or Skip before the drip reaches them)
//   email 2  +3 days — fixed template (email.ts followupEmail), threaded reply
//   email 3  +2 more days — fixed template, threaded reply
// Due follow-ups send BEFORE new first-touches. Flipping a lead to
// replied/customer/rejected stops its sequence; step 3 is terminal.
//
// Gated by the founder's auto-send switch (Admin → Outbox), OFF by default.
// Invoked by Vercel Cron (Authorization: Bearer <CRON_SECRET>); also runnable
// manually with the same header. `?dryRun=1` reports the batch it would send.

import { NextResponse } from "next/server";

import { listFollowups } from "@/lib/prospect/followups";
import { dailySendCap, gmailConfigured } from "@/lib/prospect/mailer";
import { unpackEmail } from "@/lib/prospect/persist";
import { EMAIL_RE, sendToLead, sentInLast24h } from "@/lib/prospect/sendLead";
import { getAutoSendEnabled } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sends per cron tick. 48 ticks/day × 5 ≥ the 200/day cap, so a fully loaded
// queue can actually reach the cap while each tick stays a small burst.
const MAX_PER_TICK = 5;

// How many queue-front first-touch leads to consider. Leads with an unusable
// draft or address are skipped (left for manual review), not rejected — a
// small window keeps one bad lead from stalling the whole drip.
const CANDIDATES = 8;

type Sendable = {
  leadId: string;
  name: string;
  to: string;
  subject: string;
  body: string;
  step: 1 | 2 | 3;
  inReplyTo?: string;
};

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
  const budget = Math.min(MAX_PER_TICK, cap - sentToday);

  const skipped: { leadId: string; name: string; reason: string }[] = [];
  const batch: Sendable[] = [];

  // 1) Due follow-ups first — fixed templates, no review needed (the Outbox
  //    Follow-ups card previews these exact strings ahead of time).
  const followups = await listFollowups(admin, { dueOnly: true, limit: budget * 2 });
  for (const f of followups) {
    if (batch.length >= budget) break;
    if (!EMAIL_RE.test(f.email.trim())) {
      skipped.push({ leadId: f.leadId, name: f.name, reason: "invalid recipient address" });
      continue;
    }
    batch.push({
      leadId: f.leadId,
      name: f.name,
      to: f.email.trim(),
      subject: f.subject,
      body: f.body,
      step: f.step,
      inReplyTo: f.inReplyTo ?? undefined,
    });
  }

  // 2) First touches: oldest 'scanned' leads with a valid address AND a
  //    complete draft. No human reviews these sends, so anything questionable
  //    stays in the Outbox instead.
  if (batch.length < budget) {
    const { data: leads, error: leadsError } = await admin
      .from("leads")
      .select("id, name, website_key, email")
      .eq("status", "scanned")
      .not("email", "is", null)
      .order("updated_at", { ascending: true })
      .limit(CANDIDATES);
    if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });

    if (leads?.length) {
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

      for (const lead of leads) {
        if (batch.length >= budget) break;
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
        batch.push({ leadId: lead.id, name: lead.name, to, subject, body, step: 1 });
      }
    }
  }

  if (!batch.length) {
    return NextResponse.json({
      skipped: true,
      reason: "nothing sendable (no due follow-ups, no ready drafts)",
      details: skipped,
      sentToday,
      cap,
    });
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldSend: batch.map(({ leadId, name, to, subject, step }) => ({ leadId, name, to, subject, step })),
      skipped,
      sentToday,
      cap,
    });
  }

  const sent: { leadId: string; name: string; to: string; subject: string; step: number }[] = [];
  let tally = { sentToday, cap };
  for (const item of batch) {
    const result = await sendToLead(admin, item);
    if (!result.ok) {
      // Send failure: report and stop — do NOT keep going, or a broken SMTP
      // setup would burn the whole batch (and the queue) in one tick.
      return NextResponse.json(
        {
          error: `Send failed: ${result.message}`,
          lead: { leadId: item.leadId, name: item.name },
          sent,
          skipped,
        },
        { status: result.reason === "cap-reached" ? 429 : 502 },
      );
    }
    tally = { sentToday: result.sentToday, cap: result.cap };
    sent.push({ leadId: item.leadId, name: item.name, to: item.to, subject: item.subject, step: item.step });
  }

  return NextResponse.json({ sent, skipped, ...tally });
}

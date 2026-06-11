// The Outbox feed: every lead the pipeline (or a manual scan) left at status
// 'scanned', joined with its newest scan's draft email — everything the tab
// needs to review and one-click send.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { dailySendCap, gmailConfigured } from "@/lib/prospect/mailer";
import { unpackEmail } from "@/lib/prospect/persist";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type OutboxRow = {
  leadId: string;
  name: string;
  website: string;
  websiteKey: string;
  email: string | null;
  source: string;
  scanId: string;
  mentionedCount: number;
  totalPrompts: number;
  topCompetitor: string | null;
  language: string;
  subject: string;
  body: string;
  scanCreatedAt: string;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const { data: leads, error: leadsError } = await admin
    .from("leads")
    .select("id, name, website, website_key, email, source")
    .eq("status", "scanned")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });

  // Newest scan per domain (same join the Discover tab uses).
  const keys = (leads ?? []).map((l) => l.website_key);
  const scanByKey = new Map<string, Record<string, unknown>>();
  if (keys.length) {
    const { data: scans, error: scansError } = await admin
      .from("prospect_scans")
      .select("id, website_key, mentioned_count, total_prompts, competitors, language, email_copy, created_at")
      .in("website_key", keys)
      .order("created_at", { ascending: false });
    if (scansError) return NextResponse.json({ error: scansError.message }, { status: 500 });
    for (const s of scans ?? []) {
      if (!scanByKey.has(s.website_key)) scanByKey.set(s.website_key, s as Record<string, unknown>);
    }
  }

  const rows: OutboxRow[] = [];
  for (const lead of leads ?? []) {
    const scan = scanByKey.get(lead.website_key);
    if (!scan) continue; // 'scanned' without a stored scan — shouldn't happen
    const competitors = Array.isArray(scan.competitors) ? (scan.competitors as { name?: string }[]) : [];
    const email = unpackEmail((scan.email_copy as string | null) ?? null);
    rows.push({
      leadId: lead.id,
      name: lead.name,
      website: lead.website,
      websiteKey: lead.website_key,
      email: lead.email,
      source: lead.source,
      scanId: String(scan.id),
      mentionedCount: Number(scan.mentioned_count) || 0,
      totalPrompts: Number(scan.total_prompts) || 0,
      topCompetitor: competitors[0]?.name ?? null,
      language: String(scan.language || "no"),
      subject: email.subject,
      body: email.body,
      scanCreatedAt: String(scan.created_at),
    });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ count: sentToday }, { count: queued }] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }).gte("emailed_at", since),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  return NextResponse.json({
    rows,
    sentToday: sentToday ?? 0,
    cap: dailySendCap(),
    queued: queued ?? 0,
    sendConfigured: gmailConfigured(),
  });
}

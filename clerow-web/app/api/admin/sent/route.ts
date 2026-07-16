// Sent-email history for the admin Sent tab: every outreach email that
// actually went out (outreach_sends log — first touches AND drip follow-ups),
// newest first, joined with its lead so the UI can link back.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { dailySendCap } from "@/lib/prospect/mailer";
import { sentInLast24h } from "@/lib/prospect/sendLead";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type SentRow = {
  id: string;
  leadId: string;
  name: string;
  website: string;
  websiteKey: string;
  leadStatus: string;
  toEmail: string;
  step: number;
  subject: string;
  body: string;
  sentAt: string;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const [{ data: sends, error }, { count: total }, sentToday] = await Promise.all([
    admin
      .from("outreach_sends")
      .select("id, lead_id, step, to_email, subject, body, sent_at, leads (name, website, website_key, status)")
      .order("sent_at", { ascending: false })
      .limit(200),
    admin.from("outreach_sends").select("id", { count: "exact", head: true }),
    sentInLast24h(admin),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: SentRow[] = (sends ?? []).map((s) => {
    // Supabase types the joined relation as an array even for a to-one FK.
    const lead = (Array.isArray(s.leads) ? s.leads[0] : s.leads) as
      | { name: string; website: string; website_key: string; status: string }
      | undefined;
    return {
      id: s.id,
      leadId: s.lead_id,
      name: lead?.name ?? "(deleted lead)",
      website: lead?.website ?? "",
      websiteKey: lead?.website_key ?? "",
      leadStatus: lead?.status ?? "",
      toEmail: s.to_email,
      step: s.step,
      subject: s.subject,
      body: s.body,
      sentAt: s.sent_at,
    };
  });

  return NextResponse.json({ rows, total: total ?? 0, sentToday, cap: dailySendCap() });
}

// One-click send from the Outbox tab: ships the (possibly edited) draft
// through the founder's Gmail and promotes the lead to 'emailed'. Cap check,
// SMTP send and status flip live in lib/prospect/sendLead (shared with the
// auto-send drip cron); this route only does auth, validation and HTTP.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { gmailConfigured } from "@/lib/prospect/mailer";
import { EMAIL_RE, sendToLead } from "@/lib/prospect/sendLead";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!gmailConfigured()) {
    return NextResponse.json(
      { error: "Sending is not configured — set GMAIL_USER and GMAIL_APP_PASSWORD" },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  let body: { to?: string; subject?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const to = (body.to || "").trim();
  const subject = (body.subject || "").trim();
  const text = (body.body || "").trim();
  if (!EMAIL_RE.test(to)) return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 });
  if (!subject || !text) return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: lead, error: leadError } = await admin
    .from("leads")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const result = await sendToLead(admin, { leadId: id, to, subject, body: text });
  if (!result.ok) {
    if (result.reason === "cap-reached") {
      return NextResponse.json({ error: result.message }, { status: 429 });
    }
    return NextResponse.json({ error: `Send failed: ${result.message}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sentToday: result.sentToday, cap: result.cap });
}

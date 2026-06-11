// One-click send from the Outbox tab: ships the (possibly edited) draft
// through the founder's Gmail and promotes the lead to 'emailed'. A rolling
// 24h send cap protects the sending domain's reputation.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { dailySendCap, gmailConfigured, sendOutreachEmail } from "@/lib/prospect/mailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

  const cap = dailySendCap();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: sentToday } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("emailed_at", since);
  if ((sentToday ?? 0) >= cap) {
    return NextResponse.json(
      { error: `Daily send cap reached (${cap} per 24h) — protects your sender reputation` },
      { status: 429 },
    );
  }

  try {
    await sendOutreachEmail({ to, subject, body: text });
  } catch (e) {
    return NextResponse.json(
      { error: `Send failed: ${e instanceof Error ? e.message : "unknown error"}` },
      { status: 502 },
    );
  }

  await admin
    .from("leads")
    .update({
      status: "emailed",
      email: to,
      emailed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, sentToday: (sentToday ?? 0) + 1, cap });
}

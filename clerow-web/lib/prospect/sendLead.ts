// Shared send core for outreach email: rolling-24h cap check → Gmail SMTP →
// promote the lead to 'emailed'. Used by both the manual Outbox Send button
// and the auto-send drip cron so cap and status behavior can't drift.

import type { createAdminClient } from "@/lib/supabase/admin";

import { dailySendCap, sendOutreachEmail } from "./mailer";

type Admin = ReturnType<typeof createAdminClient>;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type SendLeadResult =
  | { ok: true; sentToday: number; cap: number }
  | { ok: false; reason: "cap-reached" | "send-failed"; message: string };

/** Outreach emails sent in the rolling last 24h (the unit the cap counts). */
export async function sentInLast24h(admin: Admin): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("emailed_at", since);
  return count ?? 0;
}

export async function sendToLead(
  admin: Admin,
  opts: { leadId: string; to: string; subject: string; body: string },
): Promise<SendLeadResult> {
  const cap = dailySendCap();
  const sentToday = await sentInLast24h(admin);
  if (sentToday >= cap) {
    return {
      ok: false,
      reason: "cap-reached",
      message: `Daily send cap reached (${cap} per 24h) — protects your sender reputation`,
    };
  }

  try {
    await sendOutreachEmail({ to: opts.to, subject: opts.subject, body: opts.body });
  } catch (e) {
    return {
      ok: false,
      reason: "send-failed",
      message: e instanceof Error ? e.message : "unknown error",
    };
  }

  // `email` is written back because the sender may have corrected the address.
  await admin
    .from("leads")
    .update({
      status: "emailed",
      email: opts.to,
      emailed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.leadId);

  return { ok: true, sentToday: sentToday + 1, cap };
}

// Shared send core for outreach email: rolling-24h cap check → Gmail SMTP →
// log the send + advance the lead's sequence state. Used by the manual Outbox
// Send button (step 1) and the auto-send drip cron (steps 1–3) so cap and
// status behavior can't drift.

import type { Transporter } from "nodemailer";

import type { createAdminClient } from "@/lib/supabase/admin";

import { dailySendCap, isSmtpAuthError, sendOutreachEmail } from "./mailer";

type Admin = ReturnType<typeof createAdminClient>;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type SendLeadResult =
  | { ok: true; sentToday: number; cap: number }
  | { ok: false; reason: "cap-reached" | "send-failed"; message: string; authFailure?: boolean };

/** Outreach emails sent in the rolling last 24h (the unit the cap counts).
 *  Counts outreach_sends rows, so drip follow-ups use the same budget. */
export async function sentInLast24h(admin: Admin): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("outreach_sends")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", since);
  return count ?? 0;
}

export async function sendToLead(
  admin: Admin,
  opts: {
    leadId: string;
    to: string;
    subject: string;
    body: string;
    /** Drip position of THIS send (1 = first touch). Defaults to 1. */
    step?: 1 | 2 | 3;
    /** Message-ID of email 1 — makes follow-ups thread as replies in Gmail. */
    inReplyTo?: string;
    /** Pooled SMTP connection for batch sends (one login per batch, not per
     *  email). The caller owns and closes it. */
    transporter?: Transporter;
  },
): Promise<SendLeadResult> {
  const step = opts.step ?? 1;
  const cap = dailySendCap();
  const sentToday = await sentInLast24h(admin);
  if (sentToday >= cap) {
    return {
      ok: false,
      reason: "cap-reached",
      message: `Daily send cap reached (${cap} per 24h) — protects your sender reputation`,
    };
  }

  let messageId: string | null = null;
  try {
    messageId = await sendOutreachEmail(
      {
        to: opts.to,
        subject: opts.subject,
        body: opts.body,
        inReplyTo: opts.inReplyTo,
      },
      opts.transporter,
    );
  } catch (e) {
    return {
      ok: false,
      reason: "send-failed",
      message: e instanceof Error ? e.message : "unknown error",
      authFailure: isSmtpAuthError(e),
    };
  }

  const now = new Date().toISOString();
  // First touch flips status and pins the thread id; follow-ups only advance
  // the step so a lead a human moved to replied/customer is never touched.
  // `email` is written back because the sender may have corrected the address.
  const patch =
    step === 1
      ? {
          status: "emailed",
          email: opts.to,
          emailed_at: now,
          smtp_message_id: messageId,
          sequence_step: 1,
          last_emailed_at: now,
          updated_at: now,
        }
      : { sequence_step: step, last_emailed_at: now, updated_at: now };
  await admin.from("leads").update(patch).eq("id", opts.leadId);

  // Full send log — powers the admin Sent view and the 24h cap count.
  await admin.from("outreach_sends").insert({
    lead_id: opts.leadId,
    step,
    to_email: opts.to,
    subject: opts.subject,
    body: opts.body,
    message_id: messageId,
    sent_at: now,
  });

  return { ok: true, sentToday: sentToday + 1, cap };
}

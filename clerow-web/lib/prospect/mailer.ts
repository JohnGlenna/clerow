// Outreach sender: plain-text email through John's own Google Workspace
// account (smtp.gmail.com + app password). Sending through the real account —
// not a bulk ESP — keeps replies in the normal inbox and the message in Sent,
// and plain text is the best-deliverability shape for 1:1 cold email.

import nodemailer from "nodemailer";

export function gmailConfigured(): boolean {
  return !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
}

/** Max outreach sends per rolling 24h — protect the domain's sender reputation.
 *  Raised 30 → 50 → 200 (2026-07, deliberate call to scale the 3-email drip;
 *  follow-ups count against the same cap). This is aggressive for one
 *  Workspace mailbox — watch bounces/spam replies daily and drop the env var
 *  (PROSPECT_DAILY_SEND_CAP, no deploy needed) at the first sign of trouble. */
export function dailySendCap(): number {
  return Number(process.env.PROSPECT_DAILY_SEND_CAP) || 200;
}

/** Sends one plain-text email; returns the SMTP Message-ID (used to thread
 *  follow-ups). Pass `inReplyTo` (a stored Message-ID) to send as a reply. */
export async function sendOutreachEmail(opts: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
}): Promise<string | null> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD are not set");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from: `${process.env.GMAIL_FROM_NAME || "John"} <${user}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
    ...(opts.inReplyTo ? { inReplyTo: opts.inReplyTo, references: opts.inReplyTo } : {}),
  });
  return info.messageId ?? null;
}

// Outreach sender: plain-text email through John's own Google Workspace
// account (smtp.gmail.com + app password). Sending through the real account —
// not a bulk ESP — keeps replies in the normal inbox and the message in Sent,
// and plain text is the best-deliverability shape for 1:1 cold email.

import nodemailer, { type Transporter } from "nodemailer";

export function gmailConfigured(): boolean {
  return !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
}

/** Max outreach sends per rolling 24h — protect the domain's sender reputation.
 *  History: 30 → 50 → 200 (2026-07-16) → 80. The 200 experiment lasted one
 *  day: Google locked SMTP logins at ~197 sends/24h (534 WebLoginRequired,
 *  2026-07-17). Hold 80 clean for 1–2 weeks, then ramp stepwise via the env
 *  var (PROSPECT_DAILY_SEND_CAP, no deploy) while watching bounces and spam
 *  replies — never jump straight back up. */
export function dailySendCap(): number {
  return Number(process.env.PROSPECT_DAILY_SEND_CAP) || 80;
}

function smtpAuth(): { user: string; pass: string } {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD are not set");
  }
  return { user, pass };
}

/** Pooled transporter: ONE SMTP login for a whole batch. The per-email
 *  transporter we used before meant up to ~240 fresh AUTHs/day from Vercel's
 *  rotating IPs — a pattern Google reads as credential abuse (it contributed
 *  to the 2026-07-17 lock). Callers own the lifecycle: close() when done. */
export function createOutreachTransporter(): Transporter {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 1,
    maxMessages: 20,
    auth: smtpAuth(),
  });
}

/** True when Gmail rejected the LOGIN itself (534/535, e.g. WebLoginRequired)
 *  rather than an individual message — the signal to stop retrying entirely
 *  until a human unlocks the account in a browser. */
export function isSmtpAuthError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const { code, responseCode } = e as Error & { code?: string; responseCode?: number };
  if (code === "EAUTH") return true;
  if (responseCode === 534 || responseCode === 535) return true;
  return /invalid login|WebLoginRequired/i.test(e.message);
}

/** Sends one plain-text email; returns the SMTP Message-ID (used to thread
 *  follow-ups). Pass `inReplyTo` (a stored Message-ID) to send as a reply.
 *  Pass `transporter` to reuse a pooled connection across a batch (the caller
 *  closes it); without one, a single-use transporter is built and torn down. */
export async function sendOutreachEmail(
  opts: {
    to: string;
    subject: string;
    body: string;
    inReplyTo?: string;
  },
  transporter?: Transporter,
): Promise<string | null> {
  const { user } = smtpAuth();
  const own = !transporter;
  const t =
    transporter ??
    nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: smtpAuth(),
    });

  try {
    const info = await t.sendMail({
      from: `${process.env.GMAIL_FROM_NAME || "John"} <${user}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.body,
      ...(opts.inReplyTo ? { inReplyTo: opts.inReplyTo, references: opts.inReplyTo } : {}),
    });
    return info.messageId ?? null;
  } finally {
    if (own) t.close();
  }
}

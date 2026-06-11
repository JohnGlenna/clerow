// Outreach sender: plain-text email through John's own Google Workspace
// account (smtp.gmail.com + app password). Sending through the real account —
// not a bulk ESP — keeps replies in the normal inbox and the message in Sent,
// and plain text is the best-deliverability shape for 1:1 cold email.

import nodemailer from "nodemailer";

export function gmailConfigured(): boolean {
  return !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
}

/** Max outreach sends per rolling 24h — protect the domain's sender reputation. */
export function dailySendCap(): number {
  return Number(process.env.PROSPECT_DAILY_SEND_CAP) || 30;
}

export async function sendOutreachEmail(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
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

  await transporter.sendMail({
    from: `${process.env.GMAIL_FROM_NAME || "John"} <${user}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
  });
}

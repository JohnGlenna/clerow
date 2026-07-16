// The drip follow-up queue, shared by the send-outreach cron and the admin
// Outbox API so the UI preview and the actual outgoing mail are the SAME
// strings — what John sees in the Follow-ups card is exactly what sends.
//
// Schedule: email 2 goes out 3 days after email 1, email 3 goes out 2 days
// after email 2. A lead leaves the queue when a human flips its status
// (replied/customer/rejected) or when sequence_step reaches 3.

import type { createAdminClient } from "@/lib/supabase/admin";

import { followupEmail } from "./email";
import { unpackEmail } from "./persist";
import type { Lang } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

/** Days to wait after the previous send, keyed by the step about to go out. */
export const FOLLOWUP_DELAY_DAYS: Record<2 | 3, number> = { 2: 3, 3: 2 };

export type FollowupCandidate = {
  leadId: string;
  name: string;
  website: string;
  websiteKey: string;
  email: string;
  /** The step about to be sent (2 or 3). */
  step: 2 | 3;
  dueAt: string;
  due: boolean;
  language: Lang;
  /** "Re: <original subject>" — threads under email 1 in the recipient's inbox. */
  subject: string;
  body: string;
  /** Message-ID of email 1 (null for leads emailed before threading existed). */
  inReplyTo: string | null;
};

/** Every lead with a follow-up ahead of it, soonest first. `dueOnly` keeps
 *  just the ones the cron may send right now. */
export async function listFollowups(
  admin: Admin,
  opts: { dueOnly?: boolean; limit?: number } = {},
): Promise<FollowupCandidate[]> {
  const { data: leads, error } = await admin
    .from("leads")
    .select("id, name, website, website_key, email, sequence_step, last_emailed_at, smtp_message_id")
    .eq("status", "emailed")
    .in("sequence_step", [1, 2])
    .not("email", "is", null)
    .not("last_emailed_at", "is", null)
    .order("last_emailed_at", { ascending: true })
    .limit(opts.limit ?? 200);
  if (error) throw new Error(`followup queue query failed: ${error.message}`);
  if (!leads?.length) return [];

  // Newest scan per domain — language + the original subject to thread under.
  const keys = [...new Set(leads.map((l) => l.website_key))];
  const scanByKey = new Map<string, { language: string | null; email_copy: string | null }>();
  const { data: scans, error: scansError } = await admin
    .from("prospect_scans")
    .select("website_key, language, email_copy, created_at")
    .in("website_key", keys)
    .order("created_at", { ascending: false });
  if (scansError) throw new Error(`followup scan join failed: ${scansError.message}`);
  for (const s of scans ?? []) {
    if (!scanByKey.has(s.website_key)) scanByKey.set(s.website_key, s);
  }

  const now = Date.now();
  const out: FollowupCandidate[] = [];
  for (const lead of leads) {
    const step = (lead.sequence_step + 1) as 2 | 3;
    const dueAt = new Date(
      new Date(lead.last_emailed_at).getTime() + FOLLOWUP_DELAY_DAYS[step] * 24 * 60 * 60 * 1000,
    );
    const due = dueAt.getTime() <= now;
    if (opts.dueOnly && !due) continue;

    const scan = scanByKey.get(lead.website_key);
    const language: Lang = scan?.language === "en" ? "en" : "no";
    const original = unpackEmail(scan?.email_copy ?? null).subject.trim();
    out.push({
      leadId: lead.id,
      name: lead.name,
      website: lead.website,
      websiteKey: lead.website_key,
      email: lead.email,
      step,
      dueAt: dueAt.toISOString(),
      due,
      language,
      subject: original ? `Re: ${original}` : `Clerow – ${lead.name}`,
      body: followupEmail(step, language),
      inReplyTo: lead.smtp_message_id ?? null,
    });
  }
  return out;
}

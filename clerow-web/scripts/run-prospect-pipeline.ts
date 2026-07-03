// Drive the prospect pipeline locally until the Outbox has a target number of
// ready-to-send mails. Run from clerow-web: npx tsx scripts/run-prospect-pipeline.ts [target]
//
// Discovery is skipped (the 'new' queue is deep); each round does a few fresh
// scans, then we recount how many leads are actually visible in the Outbox
// (status 'scanned' + contact email + a scan with draft copy).
import "./_loadenv";

import { runProspectPipeline } from "../lib/prospect/pipeline";
import { fetchText } from "../lib/audit/site";
import { pickContactEmail } from "../lib/prospect/qualify";
import { createAdminClient } from "../lib/supabase/admin";

const TARGET = Number(process.argv[2]) || 10;
const MAX_ROUNDS = 12;

const admin = createAdminClient();

async function outboxReady(): Promise<{ name: string; email: string; websiteKey: string }[]> {
  const { data, error } = await admin
    .from("leads")
    .select("name, email, website_key")
    .eq("status", "scanned")
    .not("email", "is", null);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: scans, error: scanErr } = await admin
    .from("prospect_scans")
    .select("website_key")
    .in("website_key", rows.map((r) => r.website_key))
    .not("email_copy", "is", null);
  if (scanErr) throw new Error(scanErr.message);
  const withCopy = new Set((scans ?? []).map((s) => s.website_key));
  return rows
    .filter((r) => withCopy.has(r.website_key))
    .map((r) => ({ name: r.name, email: r.email as string, websiteKey: r.website_key }));
}

// One-off repair: scanned leads whose qualify-found email was clobbered by a
// later discovery upsert (bug fixed in lib/leads/store.ts) — re-find it on
// their homepage and put it back.
async function recoverWipedEmails(): Promise<void> {
  const { data, error } = await admin
    .from("leads")
    .select("id, name, website, website_key")
    .eq("status", "scanned")
    .is("email", null)
    .gt("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if (error) throw new Error(error.message);
  for (const lead of data ?? []) {
    const href = /^https?:\/\//i.test(lead.website) ? lead.website : `https://${lead.website}`;
    try {
      const fetched = await fetchText(href);
      if (!fetched?.text) continue;
      const email = pickContactEmail(fetched.text, lead.website_key);
      if (!email) continue;
      await admin.from("leads").update({ email, updated_at: new Date().toISOString() }).eq("id", lead.id).is("email", null);
      console.warn(`  recovered ${lead.website_key} → ${email}`);
    } catch {
      console.warn(`  could not re-crawl ${lead.website_key}`);
    }
  }
}

async function main() {
  console.warn("Recovering emails wiped by the discovery-upsert bug…");
  await recoverWipedEmails();

  let ready = await outboxReady();
  console.warn(`Outbox ready: ${ready.length}/${TARGET}`);

  for (let round = 1; ready.length < TARGET && round <= MAX_ROUNDS; round++) {
    console.warn(`\n— Round ${round}: scanning up to 3 fresh prospects…`);
    const summary = await runProspectPipeline(admin, {
      maxScans: 3,
      discover: false,
      timeBudgetMs: 15 * 60 * 1000,
    });
    for (const s of summary.scanned) console.warn(`  scanned ${s.websiteKey} (${s.mentionedCount}/${s.totalPrompts} mentions)`);
    for (const r of summary.rejected) console.warn(`  rejected ${r.websiteKey}: ${r.reason}`);
    for (const e of summary.errors) console.warn(`  ERROR ${e.websiteKey || e.name}: ${e.error}`);
    ready = await outboxReady();
    console.warn(`Outbox ready: ${ready.length}/${TARGET} (queue: ${summary.queued})`);
  }

  console.warn("\n=== OUTBOX READY ===");
  for (const r of ready) console.warn(`  ${r.name} <${r.email}> — ${r.websiteKey}`);
}

void main();

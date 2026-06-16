// The autopilot engine behind the Outbox: discover fresh leads, run the
// quality gate, scan the survivors, and leave everything as status 'scanned'
// with a draft email — ready for one-click send in the Outbox tab.
//
// Invoked by the daily cron AND the Outbox "Run pipeline" button — same code,
// so the two can't behave differently. Per-lead failures never abort the run;
// transient errors leave the lead 'new' for the next run, quality-gate
// failures park it as 'rejected' permanently.

import { directoryUrls, fetchDirectory } from "@/lib/leads/directory";
import {
  fetchBetaList,
  fetchBrreg,
  fetchProductHunt,
  fetchTheHub,
  fetchYCombinator,
  productHuntConfigured,
} from "@/lib/leads/sources";
import { persistAndAnnotate } from "@/lib/leads/store";
import type { CandidateLead, LeadSource, TheHubCountry } from "@/lib/leads/types";
import type { createAdminClient } from "@/lib/supabase/admin";

import { findRecentScan, insertProspectScan, promoteLeadScanned } from "./persist";
import { qualifyLead } from "./qualify";
import { runProspectScan } from "./scan";

type Admin = ReturnType<typeof createAdminClient>;

export type PipelineOptions = {
  /** Fresh (paid) scans per run; cached-scan promotions don't count. */
  maxScans?: number;
  /** Hard wall-clock budget — stay inside the function timeout. */
  timeBudgetMs?: number;
  /** Skip source discovery and only process the existing 'new' queue. */
  discover?: boolean;
};

export type PipelineSummary = {
  /** Leads fetched from sources this run (incl. already-known ones). */
  discovered: number;
  scanned: { name: string; websiteKey: string; mentionedCount: number; totalPrompts: number; cached: boolean }[];
  rejected: { name: string; websiteKey: string; reason: string }[];
  errors: { name: string; websiteKey: string; error: string }[];
  /** 'new' leads still waiting after this run. */
  queued: number;
  ranOutOfTime: boolean;
};

const DEFAULT_MAX_SCANS = 5;
const DEFAULT_TIME_BUDGET_MS = 240_000;
// How many 'new' leads one run will even look at (cache checks + qualify).
const PICKUP_LIMIT = 60;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Brreg discovery filters — same knobs as the Discover tab, env-configurable
// so the cron prospects the niches John actually targets.
function brregParams() {
  return {
    from: daysAgo(Number(process.env.PROSPECT_PIPELINE_LOOKBACK_DAYS) || 30),
    naering: process.env.PROSPECT_PIPELINE_NAERING || "62,73",
    kommune: process.env.PROSPECT_PIPELINE_KOMMUNE || undefined,
    page: 0,
  };
}

// Which sources the cron discovers from — env-toggleable without a deploy.
const DEFAULT_PIPELINE_SOURCES = "brreg,producthunt,thehub,ycombinator,betalist,directory";
function enabledSources(): Set<string> {
  return new Set(
    (process.env.PROSPECT_PIPELINE_SOURCES || DEFAULT_PIPELINE_SOURCES)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

// Stateless rotation cursor: advances every hour, so sources without date
// filters or sort control (The Hub pages, directory URLs) get swept fully
// over successive cron runs instead of refetching the same slice.
function hourIndex(): number {
  return Math.floor(Date.now() / 3_600_000);
}

const THEHUB_COUNTRIES: TheHubCountry[] = ["NO", "SE", "DK"];

// The Hub has no "newest first": fetch page 1 to learn the page count, then a
// rotating page so the whole directory is covered over time.
async function theHubCandidates(): Promise<CandidateLead[]> {
  const out: CandidateLead[] = [];
  for (const country of THEHUB_COUNTRIES) {
    const first = await fetchTheHub(country, 1);
    out.push(...first.candidates);
    const totalPages = first.page?.totalPages ?? 1;
    if (totalPages > 1) {
      const rotating = 2 + (hourIndex() % (totalPages - 1));
      out.push(...(await fetchTheHub(country, rotating)).candidates);
    }
  }
  return out;
}

// Two directory pages per run, rotating through the configured list.
async function directoryCandidates(): Promise<CandidateLead[]> {
  const urls = directoryUrls();
  if (!urls.length) return [];
  const start = hourIndex() % urls.length;
  const targets = [...new Set([urls[start], urls[(start + 1) % urls.length]])];
  const out: CandidateLead[] = [];
  for (const url of targets) {
    out.push(...(await fetchDirectory(url)).candidates);
  }
  return out;
}

async function discoverLeads(admin: Admin): Promise<{ count: number; errors: string[] }> {
  let count = 0;
  const errors: string[] = [];
  const enabled = enabledSources();

  const persist = async (source: LeadSource, candidates: CandidateLead[]) => {
    const withSite = candidates.filter((c) => c.website);
    count += (await persistAndAnnotate(admin, source, withSite)).length;
  };

  // Every source is independent: one failing never blocks the others.
  const runs: [LeadSource, () => Promise<CandidateLead[]>][] = [
    ["brreg", async () => (await fetchBrreg(brregParams())).candidates],
    ["producthunt", async () => (await fetchProductHunt()).candidates],
    ["thehub", theHubCandidates],
    ["ycombinator", async () => (await fetchYCombinator()).candidates],
    ["betalist", async () => (await fetchBetaList()).candidates],
    ["directory", directoryCandidates],
  ];

  for (const [source, fetcher] of runs) {
    if (!enabled.has(source)) continue;
    if (source === "producthunt" && !productHuntConfigured()) continue;
    try {
      await persist(source, await fetcher());
    } catch (e) {
      errors.push(`${source} discovery failed: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return { count, errors };
}

export async function runProspectPipeline(
  admin: Admin,
  opts: PipelineOptions = {},
): Promise<PipelineSummary> {
  const started = Date.now();
  const maxScans = opts.maxScans ?? DEFAULT_MAX_SCANS;
  const budget = opts.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;

  const summary: PipelineSummary = {
    discovered: 0,
    scanned: [],
    rejected: [],
    errors: [],
    queued: 0,
    ranOutOfTime: false,
  };

  if (opts.discover !== false) {
    const d = await discoverLeads(admin);
    summary.discovered = d.count;
    for (const err of d.errors) summary.errors.push({ name: "(discovery)", websiteKey: "", error: err });
  }

  const { data: queue, error: queueError } = await admin
    .from("leads")
    .select("id, name, website, website_key, email, meta")
    .eq("status", "new")
    .order("created_at", { ascending: false })
    .limit(PICKUP_LIMIT);
  if (queueError) {
    summary.errors.push({ name: "(queue)", websiteKey: "", error: queueError.message });
    return summary;
  }

  let freshScans = 0;
  for (const lead of queue ?? []) {
    if (Date.now() - started > budget) {
      summary.ranOutOfTime = true;
      break;
    }

    try {
      const meta = lead.meta as { niche?: string; tagline?: string } | null;
      const cached = await findRecentScan(admin, lead.website_key);

      // A lead can only reach the Outbox if we have an address to send to.
      // Resolve one up front: use the registry's email, else qualify the site
      // to discover one. Reuse this gate for the fresh scan below so we never
      // qualify the same lead twice.
      let gate: Awaited<ReturnType<typeof qualifyLead>> | null = null;
      let email = lead.email;
      if (!email) {
        gate = await qualifyLead({
          name: lead.name,
          website: lead.website,
          nicheHint: meta?.niche ?? meta?.tagline ?? null,
        });
        if (!gate.ok) {
          await admin
            .from("leads")
            .update({ status: "rejected", reject_reason: gate.reason, updated_at: new Date().toISOString() })
            .eq("id", lead.id)
            .eq("status", "new");
          summary.rejected.push({ name: lead.name, websiteKey: lead.website_key, reason: gate.reason });
          continue;
        }
        // The gate often finds a contact address the registry didn't have.
        email = gate.contactEmail;
        if (email) {
          await admin
            .from("leads")
            .update({ email, updated_at: new Date().toISOString() })
            .eq("id", lead.id)
            .is("email", null);
        }
      }

      // No address found anywhere — nothing to send, so never scan or promote
      // it. Reject permanently rather than parking it in the Outbox empty.
      if (!email) {
        const reason = "no contact email found";
        await admin
          .from("leads")
          .update({ status: "rejected", reject_reason: reason, updated_at: new Date().toISOString() })
          .eq("id", lead.id)
          .eq("status", "new");
        summary.rejected.push({ name: lead.name, websiteKey: lead.website_key, reason });
        continue;
      }

      // A recent scan (manual or from a previous run) is free — promote it
      // straight into the Outbox without re-scanning.
      if (cached) {
        await promoteLeadScanned(admin, lead.website_key);
        summary.scanned.push({
          name: lead.name,
          websiteKey: lead.website_key,
          mentionedCount: Number(cached.mentioned_count) || 0,
          totalPrompts: Number(cached.total_prompts) || 0,
          cached: true,
        });
        continue;
      }

      if (freshScans >= maxScans) continue; // keep sweeping for cached hits only

      // Need category/language for the fresh scan — qualify if we haven't yet.
      if (!gate) {
        gate = await qualifyLead({
          name: lead.name,
          website: lead.website,
          nicheHint: meta?.niche ?? meta?.tagline ?? null,
        });
        if (!gate.ok) {
          await admin
            .from("leads")
            .update({ status: "rejected", reject_reason: gate.reason, updated_at: new Date().toISOString() })
            .eq("id", lead.id)
            .eq("status", "new");
          summary.rejected.push({ name: lead.name, websiteKey: lead.website_key, reason: gate.reason });
          continue;
        }
      }

      const result = await runProspectScan({
        brand: lead.name,
        website: lead.website,
        category: gate.category,
        language: gate.language,
      });
      await insertProspectScan(admin, result);
      await promoteLeadScanned(admin, result.websiteKey);
      freshScans++;
      summary.scanned.push({
        name: lead.name,
        websiteKey: lead.website_key,
        mentionedCount: result.mentionedCount,
        totalPrompts: result.totalPrompts,
        cached: false,
      });
    } catch (e) {
      // Transient (model/network/DB hiccup): lead stays 'new', retried next run.
      summary.errors.push({
        name: lead.name,
        websiteKey: lead.website_key,
        error: e instanceof Error ? e.message : "unknown error",
      });
    }
  }

  const { count } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  summary.queued = count ?? 0;

  return summary;
}

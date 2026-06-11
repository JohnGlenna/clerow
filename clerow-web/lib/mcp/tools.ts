// Clerow MCP tools — thin wrappers over the existing GEO engine so an agent can
// read a brand's visibility, pull the prioritized ladder, generate ready-to-ship
// files/content, and mark tasks done (keeping the streak). The agent does the
// repo writes; Clerow only supplies data + content.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import type { Database, SubscriptionRow } from "../supabase/database.types";
import { loadBrandSnapshot, aggregateCompetitors, type BrandSnapshot } from "../scan/snapshot";
import { computeEngineDeltas, buildDeltaNarrative } from "../scan/delta";
import { diffScans, describeChange } from "../scan/diff";
import { ensureSiteAudit, refreshSiteAudit } from "../audit/ensure";
import { evidenceForCheck, type SiteAudit } from "../audit/site";
import { claimScan, releaseScan, claimActive } from "../scan/claim";
import { buildLadder, ensureLadderTasks, projectLockedGain, LADDER_DEPTH, type Ladder, type LadderTask } from "../ladder";
import { assembleLadderContext } from "../scan/ladderContext";
import { buildContentBrief, buildSiteContext, buildScanInsight, buildVoiceContext } from "../content/generate";
import { buildOffsiteDraft } from "../content/offsite";
import { deterministicTaskContent } from "../content/files";
import { getSubscription, isSubscribed } from "../billing/subscription";
import { scanTopPrompts, MAX_SCAN_PROMPTS } from "../scan/run";
import { synthesizeAndStore } from "../scan/synthesize";
import { planFromSub, enginesForPlan, assertBudget, budgetStatus, BudgetExceededError } from "../billing/limits";
import { costForEngines } from "../billing/cost";
import { enabledEngines } from "../engines";
import type { BrandProfile } from "../types";

type Db = SupabaseClient<Database>;
type BrandRow = Database["public"]["Tables"]["brands"]["Row"];

const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });
const json = (o: unknown) => text(JSON.stringify(o, null, 2));
const fail = (s: string) => ({ content: [{ type: "text" as const, text: s }], isError: true });

// Pull the resolved {userId, brandId, keyId} the auth wrapper stashed in authInfo.extra.
function authOf(
  authInfo: { extra?: Record<string, unknown> } | undefined,
): { userId: string; brandId: string | null; keyId: string | null } | null {
  const e = authInfo?.extra as { userId?: string; brandId?: string | null; keyId?: string | null } | undefined;
  return e?.userId ? { userId: e.userId, brandId: e.brandId ?? null, keyId: e.keyId ?? null } : null;
}

// --- MCP usage log: one mcp_events row per tool call (admin metrics) ---
// Recorded via after() so it never delays the response, and the insert is
// swallowed on failure so logging can never break a tool call.
function logToolCall(tool: string, auth: ReturnType<typeof authOf>, t0: number, ok: boolean) {
  if (!auth) return; // unauthenticated — the request was rejected anyway
  const row = {
    user_id: auth.userId,
    brand_id: auth.brandId,
    key_id: auth.keyId,
    tool,
    ok,
    duration_ms: Date.now() - t0,
  };
  after(async () => {
    try {
      await createAdminClient().from("mcp_events").insert(row);
    } catch {
      // best-effort only
    }
  });
}

// Wrap a tool handler with usage logging. Works for both server.tool arities —
// (extra) and (args, extra) — because `extra` is always the last argument.
function logged<A extends unknown[], R>(tool: string, handler: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const extra = args[args.length - 1] as { authInfo?: { extra?: Record<string, unknown> } } | undefined;
    const auth = authOf(extra?.authInfo);
    const t0 = Date.now();
    try {
      const result = await handler(...args);
      logToolCall(tool, auth, t0, !(result as { isError?: boolean } | null)?.isError);
      return result;
    } catch (err) {
      logToolCall(tool, auth, t0, false);
      throw err;
    }
  };
}

type Ctx = { admin: Db; userId: string; brandId: string; brand: BrandRow; sub: SubscriptionRow | null; subscribed: boolean };

async function resolveCtx(
  authInfo: { extra?: Record<string, unknown> } | undefined,
): Promise<{ ok: true; ctx: Ctx } | { ok: false; result: ReturnType<typeof fail> }> {
  const auth = authOf(authInfo);
  if (!auth) return { ok: false, result: fail("Unauthorized — invalid Clerow API key.") };
  if (!auth.brandId) return { ok: false, result: fail("No brand connected yet. Run your first scan in Clerow, then retry.") };
  const admin = createAdminClient();
  const { data: brand } = await admin.from("brands").select("*").eq("id", auth.brandId).maybeSingle();
  if (!brand) return { ok: false, result: fail("Brand not found for this key.") };
  // Premium subscribers get the whole climb through the MCP (same as the dashboard);
  // free users are scoped to the frontier (Level 1 + one Level 2 taster). The sub
  // rides along so budget-aware tools don't re-fetch it.
  const sub = await getSubscription(admin, auth.userId);
  return { ok: true, ctx: { admin, userId: auth.userId, brandId: auth.brandId, brand, sub, subscribed: isSubscribed(sub) } };
}

// A scan is "in progress" when the brand row holds a fresh claim (set the moment
// run_full_scan accepts) OR a scans row is still status='running' — the claim
// covers the gap before the first scans row exists. `lastScan` carries the most
// recent scan's outcome so a FAILED background scan is visible to a polling
// agent (status 'error' + the error text) instead of silently never landing.
type ScanStatus = {
  inProgress: boolean;
  startedAt: string | null;
  lastScan: { status: string; startedAt: string | null; finishedAt: string | null; error?: string } | null;
};
async function scanStatus(admin: Db, brand: BrandRow): Promise<ScanStatus> {
  const { data } = await admin
    .from("scans")
    .select("status, started_at, finished_at, error")
    .eq("brand_id", brand.id)
    .order("started_at", { ascending: false })
    .limit(1);
  const last = data?.[0];
  const lastScan = last
    ? { status: last.status, startedAt: last.started_at, finishedAt: last.finished_at, ...(last.error ? { error: last.error } : {}) }
    : null;
  const since = Date.now() - 5 * 60 * 1000;
  const running = last?.status === "running" && last.started_at != null && new Date(last.started_at).getTime() >= since;
  if (claimActive(brand.scan_claimed_at)) return { inProgress: true, startedAt: brand.scan_claimed_at, lastScan };
  return { inProgress: !!running, startedAt: running ? last!.started_at : null, lastScan };
}

// Market/source changes since the previous scan (lib/scan/diff.ts), computed
// lazily — one result_brands query for the previous standings, and ONLY here in
// the MCP path (the dashboard hot path never pays it). Null until an engine has
// been scanned twice or when nothing changed.
async function loadScanChanges(admin: Db, s: BrandSnapshot) {
  const prev = s.previous;
  if (!prev) return null;
  const prevIds = Object.keys(prev.engineByResult);
  const { data: prevRb } = await admin.from("result_brands").select("*").in("scan_result_id", prevIds).order("rank");
  const prevCompetitors = aggregateCompetitors(prevRb ?? [], new Map(Object.entries(prev.engineByResult)), prevIds.length);
  const items = diffScans(
    { citedDomainEngines: prev.citedDomainEngines, competitors: prevCompetitors },
    { citedDomainEngines: s.citedDomainEngines, competitors: s.competitors },
  );
  if (items.length === 0) return null;
  return { since: prev.scannedAt, items: items.map((c) => ({ ...c, summary: describeChange(c) })) };
}

function brandProfile(b: BrandRow): BrandProfile {
  return {
    url: b.url,
    company: b.company,
    industry: b.industry,
    description: b.description,
    location: b.location,
    audience: b.audience,
    competitors: b.competitors,
    differentiators: b.differentiators,
    geos: b.geos,
    enrichNotes: b.enrich_notes,
  };
}

// A subscriber gets the whole climb through the MCP; a free user is scoped to the
// frontier — all of Level 1 ("Foundations") plus one Level 2 ("structure") taster,
// with the rest worked after upgrading in the dashboard. The note explains which.
function tierNote(subscribed: boolean) {
  return subscribed
    ? "You're on Clerow Premium — the full climb (Levels 1–5) is available right here in the MCP, every level unlocked. Work them in order for the best results; your progress syncs to the dashboard automatically."
    : "The Clerow MCP is free and covers the foundations — all of Level 1 plus your first Level 2 (on-page structure) task. The rest of Level 2 and Levels 3–5 — authority & citations, winning buyer queries, and measuring — require a Clerow Premium subscription and are worked in the dashboard.";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Find a task in the built ladder by its row id OR its stable ladder key
// ("audit-robots-ai") — agents find the key friendlier than a UUID.
function findLadderTask(ladder: Ladder, ref: string): { level: number; task: LadderTask } | null {
  for (const l of ladder.levels) {
    const task = l.tasks.find((t) => t.id === ref || t.key === ref);
    if (task) return { level: l.level, task };
  }
  return null;
}

// A task beyond the free frontier gets this friendly pointer rather than an error
// the calling agent would choke on. Only ever reached for a non-subscriber.
function higherLevel(level: number | null) {
  return text(
    `This task is beyond the free tier (Level ${level ?? "2+"}), which requires a Clerow Premium subscription. The free MCP covers Level 1 plus one Level 2 taster — upgrade in the Clerow dashboard to unlock the rest of the climb.`,
  );
}

// Build the same ladder the dashboard shows (idempotently seeds active/open levels).
// A subscriber gets the WHOLE climb at once through the MCP — unlockedThrough is the
// full ladder depth, so every level is "open" and seeded on the first call, no
// dashboard "unlock" required. (The dashboard then derives its own unlockedThrough
// from the highest seeded ladder task, so this shows up as unlocked there too.) A
// free user is pinned to the frontier (subscribed=false, unlockedThrough=0 — which
// also re-locks a churned ex-subscriber's stale higher-level tasks).
async function loadLadder(admin: Db, brand: BrandRow, subscribed: boolean) {
  const { data: tasks } = await admin.from("tasks").select("*").eq("brand_id", brand.id);
  const { ctx, audit, snapshot } = await assembleLadderContext(admin, brand);
  const unlockedThrough = subscribed ? LADDER_DEPTH : 0;
  const existing = new Map<string, { id: string; done: boolean; resolved: boolean }>();
  for (const t of tasks ?? [])
    if (t.ladder_key) existing.set(t.ladder_key, { id: t.id, done: t.done, resolved: t.done || t.archived });
  const pre = buildLadder(ctx, existing, unlockedThrough, subscribed);
  const inserted = await ensureLadderTasks(admin, brand.id, pre, new Set(existing.keys()));
  for (const r of inserted)
    if (r.ladder_key) existing.set(r.ladder_key, { id: r.id, done: r.done, resolved: r.done || r.archived });
  return {
    ladder: buildLadder(ctx, existing, unlockedThrough, subscribed),
    primaryPrompt: ctx.primaryPrompt,
    competitorsAhead: ctx.competitorsAhead,
    audit,
    // Scan signal for the content brief: domains AI cites + the multi-model verdict.
    citedSources: ctx.sourceGaps,
    scanInsight: buildScanInsight(snapshot.synthesis),
    // Consensus counts for the offsite drafts ("3 of the 5 models cite X").
    sourceEngines: ctx.sourceEngines,
    modelsScanned: ctx.modelsScanned,
  };
}

export function registerTools(server: McpServer) {
  // --- READ: multi-model visibility (the moat) ---
  server.tool(
    "get_visibility",
    "Get the brand's current AI visibility across engines (ChatGPT, Claude, Perplexity, Gemini): per-engine visibility %, rank, sentiment, the competitors ranked above them, and the domains AI cites. Also: scan status (poll after run_full_scan — scan.inProgress flips false when done; check scan.lastScan.status, 'error' means it failed), what CHANGED since the previous scan (delta + headline = your own standings story; changes = market/source moves), and scansRemaining for subscribers.",
    logged("get_visibility", async (extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand, sub, subscribed } = r.ctx;
      const [s, scan] = await Promise.all([loadBrandSnapshot(admin, r.ctx.brandId), scanStatus(admin, brand)]);
      const budget = subscribed ? await budgetStatus(admin, r.ctx.userId, planFromSub(sub), new Date()) : null;

      // Scan-over-scan story (only once an engine has been scanned twice):
      // delta/headline = the brand's own standings; changes = market/source moves.
      const narrative = buildDeltaNarrative(s);
      const changes = await loadScanChanges(admin, s);

      return json({
        brand: { company: brand.company, url: brand.url },
        scannedAt: s.scannedAt,
        scan,
        score: s.score,
        ...(narrative.headline ? { headline: narrative.headline } : {}),
        ...(s.previous
          ? {
              delta: {
                sinceScannedAt: s.previous.scannedAt,
                overall: { from: s.previous.score.overall, to: s.score.overall },
                engines: computeEngineDeltas(s).filter((d) => d.kind !== "unchanged"),
                lines: narrative.lines,
              },
            }
          : {}),
        ...(changes ? { changes } : {}),
        engines: s.engines.map((e) => ({ engine: e.label, visibility: e.visibility, position: e.position, sentiment: e.sentiment, locked: e.locked })),
        competitors: s.competitors.map((c) => ({ name: c.name, rank: c.rank, visibility: c.visibility, isYou: c.isYou })),
        citedDomains: s.citedDomains,
        primaryPrompt: s.primaryPromptText,
        ...(budget ? { scansRemaining: budget.scansLeft } : {}),
      });
    }),
  );

  // --- READ: the prioritized task ladder (current level) ---
  server.tool(
    "list_tasks",
    "List the brand's actionable GEO tasks (id, title, detail, level, impact, xp) plus a summary of every level. On the free tier these are all of Level 1 ('Foundations', the technical quick wins to get read & cited by AI) plus one Level 2 ('on-page structure') taster; on Clerow Premium it's the full climb. Use get_task_content to get what to ship, then complete_task.",
    logged("list_tasks", async (extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { subscribed } = r.ctx;
      const { ladder } = await loadLadder(r.ctx.admin, r.ctx.brand, subscribed);
      // Every seeded task (id present, not locked) is, by construction, actionable
      // for this user — ensureLadderTasks never seeds a locked task. Free: Level 1
      // (then + the one Level 2 taster). Premium: the active level (+ any unlocked).
      const actionable = ladder.levels
        .flatMap((l) => l.tasks.map((t) => ({ ...t, level: l.level })))
        .filter((t) => t.id && !t.locked);
      const gain = subscribed ? null : projectLockedGain(ladder);
      return json({
        currentLevel: ladder.currentLevel,
        levels: ladder.levels.map((l) => ({ level: l.level, title: l.title, state: l.state, done: l.doneCount, total: l.total })),
        activeTasks: actionable.map((t) => ({
          id: t.id,
          key: t.key,
          title: t.title,
          detail: t.detail,
          level: t.level,
          impact: t.impact,
          xp: t.xp,
          done: t.done,
          ...(t.targetUrl ? { targetUrl: t.targetUrl, ...(t.targetIsNew ? { targetIsNew: true } : {}) } : {}),
        })),
        estimatedUpgradeGain: gain && gain.overall > 0 ? `Finishing the locked levels in the dashboard is worth an est. +${gain.overall}% AI visibility.` : null,
        note: tierNote(subscribed),
      });
    }),
  );

  // --- READ: technical site audit (Level-1 gaps) ---
  const AUDIT_REFRESH_MIN_MS = 5 * 60 * 1000;
  server.tool(
    "get_site_audit",
    "Audit the brand's own website for technical/on-page GEO gaps: crawlability, robots.txt for AI crawlers, llms.txt, HTTPS, title, H1, meta description, structured data. Returns each check with a concrete fix plus the observed HTTP status. Pass refresh:true to re-crawl the live site right now (free, no scan budget; rate-limited to once per 5 minutes) — use it to verify a fix you just deployed without spending a premium scan.",
    {
      refresh: z
        .boolean()
        .optional()
        .describe("Re-crawl the site now instead of serving the cached audit (free; throttled to once per 5 minutes)"),
    },
    logged("get_site_audit", async ({ refresh }, extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand } = r.ctx;

      // A forced refresh re-crawls immediately (it's just HTTP fetches — free),
      // throttled so a retrying agent can't hammer the user's site.
      const lastAt = brand.site_audited_at ? new Date(brand.site_audited_at).getTime() : 0;
      const throttled = !!refresh && Date.now() - lastAt < AUDIT_REFRESH_MIN_MS;
      let refreshed = false;
      let audit;
      if (refresh && !throttled) {
        try {
          audit = await refreshSiteAudit(admin, brand.id, brand.url);
          refreshed = true;
        } catch {
          audit = await ensureSiteAudit(admin, brand); // keep the cached one
        }
      } else {
        audit = await ensureSiteAudit(admin, brand);
      }
      if (!audit) return fail("Couldn't audit the site right now.");

      const statusFor = (id: string) => evidenceForCheck(audit, id)?.httpStatus;
      return json({
        url: audit.url,
        fetchedAt: audit.fetchedAt,
        refreshed,
        ...(throttled ? { note: "Audit was refreshed less than 5 minutes ago — serving that recent result." } : {}),
        checks: audit.checks.map((c) => ({
          id: c.id,
          label: c.label,
          status: c.status,
          detail: c.detail,
          ...(statusFor(c.id) !== undefined ? { httpStatus: statusFor(c.id) } : {}),
          ...(c.blockedBy ? { blockedBy: c.blockedBy } : {}),
          fix: c.fix,
        })),
      });
    }),
  );

  // --- ACT: generate the ready-to-ship artifact for a task ---
  server.tool(
    "get_task_content",
    "Get what to ship for a task id (from list_tasks). Returns an actual robots.txt or llms.txt file when relevant, or — for a technical fix like a server error, a missing tag, or no server-side HTML — the diagnostic steps to apply; otherwise a brief (the GEO writing rules plus the brand/competitor context) for YOU (the calling agent) to write the finished, repo-aware content from. Covers your available tasks (free: Level 1 + the Level 2 taster; Premium: the full climb).",
    { taskId: z.string().describe('A task id from list_tasks, or its stable key (e.g. "audit-robots-ai")') },
    logged("get_task_content", async ({ taskId }, extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand, subscribed } = r.ctx;

      const { ladder, primaryPrompt, competitorsAhead, audit, citedSources, scanInsight, sourceEngines, modelsScanned } = await loadLadder(admin, brand, subscribed);
      const found = findLadderTask(ladder, taskId);
      const match: LadderTask | undefined = found?.task;

      // Resolve the task's level/lock (for the tier gate), its title/detail, and
      // its ladder_key — falling back to the stored task row if it isn't in the
      // built ladder. The ladder's `locked` flag (built with this user's
      // subscription) is authoritative: a subscriber gets everything; a free
      // user gets the frontier.
      let level = found?.level ?? null;
      let title = match?.title;
      let detail = match?.detail ?? "";
      let locked = match?.locked ?? false;
      let key = match?.key ?? "";
      if (!match) {
        const q = admin.from("tasks").select("title, meta, level, ladder_key").eq("brand_id", brand.id);
        const { data: row } = await (UUID_RE.test(taskId) ? q.eq("id", taskId) : q.eq("ladder_key", taskId)).maybeSingle();
        if (!row) return fail("Task not found for this brand.");
        title = row.title;
        detail = row.meta;
        level = row.level;
        key = row.ladder_key ?? "";
        locked = !subscribed && row.level !== 1; // non-ladder fallback: free → only Level 1
      }
      if (locked) return higherLevel(level);
      if (!title) return fail("Task not found for this brand.");

      // Deterministic, no-LLM content (robots.txt/llms.txt files, or the audit's
      // diagnostic steps for a technical code/infra fix). Shared with the
      // dashboard's content route so the two can't drift apart.
      const ready = deterministicTaskContent(key, brand, audit);
      if (ready) return text(ready);

      // Off-site tasks get a deterministic ~80%-ready draft (pitch email, listing
      // copy, community-answer plan) seeded INTO the brief, so the agent polishes
      // and hands over something sendable instead of writing from advice.
      const offsiteSeed =
        match?.channel === "offsite"
          ? (buildOffsiteDraft(key, {
              brand: brandProfile(brand),
              primaryPrompt: primaryPrompt?.text,
              sourceEngines,
              modelsScanned,
              competitorsAhead,
              targetUrl: match.targetUrl,
            }) ?? undefined)
          : undefined;

      // Otherwise hand the calling agent a brief and let IT write the content
      // (repo-aware, and the MCP spends no model call of its own).
      const brief = buildContentBrief({
        brand: brandProfile(brand),
        title,
        detail,
        promptText: primaryPrompt?.text,
        intent: primaryPrompt?.intent,
        targetUrl: match?.targetUrl ? `${match.targetUrl}${match.targetIsNew ? " (create this new page)" : ""}` : undefined,
        competitorsAhead,
        siteContext: buildSiteContext(audit?.crawl),
        citedSources,
        scanInsight,
        brandVoice: buildVoiceContext(brand.about),
        offsiteSeed,
      });
      // Off-site authority tasks (Reddit, directories, press) can't be shipped as a
      // repo PR — make that explicit so the agent hands the draft to the user instead
      // of claiming it published it.
      if (match?.channel === "offsite") {
        return text(
          `> NOTE: This is an off-site task — you (the agent) cannot publish it. ${offsiteSeed ? "Polish the ~80%-ready draft inside the brief (fill its <find: …> slots)" : "Write the draft per the brief below"}, then give it to the user to post/send manually at the relevant third-party site, and call complete_task once they confirm.\n\n${brief}`,
        );
      }
      return text(brief);
    }),
  );

  // --- ACT: mark a task done (keeps the streak / earns XP) ---
  server.tool(
    "complete_task",
    "Mark a task done after the agent has shipped it. Stamps completion so it keeps the user's Clerow streak and awards XP. For audit-backed tasks (key starting with \"audit-\") Clerow VERIFIES first: it re-crawls the live site (free) and refuses completion with the observed evidence if the check still fails — fix and retry, or pass force:true when the fix is deployed but a cache/CDN hasn't propagated yet. Covers your available tasks (free: Level 1 + the Level 2 taster; Premium: the full climb).",
    {
      taskId: z.string().describe('A task id from list_tasks, or its stable key (e.g. "audit-robots-ai")'),
      force: z
        .boolean()
        .optional()
        .describe("Complete even though live verification still fails (use only when the fix is deployed and you're waiting on cache/CDN propagation)"),
    },
    logged("complete_task", async ({ taskId, force }, extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand, subscribed } = r.ctx;
      // Gate to the user's tier before mutating — don't mark a paywalled task done.
      // Use the built ladder's `locked` flag (authoritative; a subscriber gets
      // everything, a free user the frontier, and a churned ex-subscriber's stale
      // higher-level tasks re-lock), with a level-only fallback for any non-ladder row.
      const { ladder } = await loadLadder(admin, brand, subscribed);
      const found = findLadderTask(ladder, taskId);
      const match = found?.task;
      let locked = match?.locked ?? false;
      let level = found?.level ?? null;
      let rowId = match?.id ?? (UUID_RE.test(taskId) ? taskId : null);
      let key = match?.key ?? "";
      if (!match) {
        const q = admin.from("tasks").select("id, level, ladder_key").eq("brand_id", brand.id);
        const { data: row } = await (UUID_RE.test(taskId) ? q.eq("id", taskId) : q.eq("ladder_key", taskId)).maybeSingle();
        if (!row) return fail("Task not found for this brand.");
        rowId = row.id;
        level = row.level;
        key = row.ladder_key ?? "";
        locked = !subscribed && row.level !== 1;
      }
      if (locked) return higherLevel(level);
      if (!rowId) return fail("Task not found for this brand.");

      // Verify-on-complete: an audit-backed task can be checked against reality —
      // re-crawl the live site (free HTTP fetches, always fresh: completion is
      // exactly when freshness matters) and look at the matching check. A failing
      // check BLOCKS completion (with the observed evidence) unless force:true;
      // an unknown check or a failed crawl counts as unverifiable, not failed, so
      // a mid-deploy site can't deadlock the agent.
      let verified: boolean | null = null;
      let evidence: Record<string, unknown> | null = null;
      if (key.startsWith("audit-")) {
        let audit: SiteAudit | null = null;
        try {
          audit = await refreshSiteAudit(admin, brand.id, brand.url);
        } catch {
          audit = null; // unverifiable
        }
        const check = audit?.checks.find((c) => `audit-${c.id}` === key);
        if (audit && check && check.status !== "unknown") {
          const e = evidenceForCheck(audit, check.id);
          evidence = {
            checkId: check.id,
            status: check.status,
            detail: check.detail,
            ...(e?.httpStatus !== undefined ? { httpStatus: e?.httpStatus } : {}),
            ...(e?.bodySnippet ? { bodySnippet: e.bodySnippet } : {}),
          };
          verified = check.status === "pass";
          if (!verified && !force) {
            return json({
              ok: false,
              verified: false,
              evidence,
              message: `Not completed — Clerow re-crawled the live site just now and the "${check.label}" check still ${check.status === "warn" ? "warns" : "fails"}: ${check.detail} Fix it and call complete_task again, or pass force:true if the fix is deployed and you're waiting on cache/CDN propagation.`,
            });
          }
        }
      }

      const { data, error } = await admin
        .from("tasks")
        .update({ done: true, completed_at: new Date().toISOString() })
        .eq("id", rowId)
        .eq("brand_id", brand.id)
        .select("id, title, xp, done")
        .maybeSingle();
      if (error) return fail(`Couldn't complete the task: ${error.message}`);
      if (!data) return fail("Task not found for this brand.");

      const message =
        verified === true
          ? `Completed "${data.title}" (+${data.xp} XP) — verified against the live site: the check now passes. Streak kept for today.`
          : verified === false
            ? `Completed "${data.title}" (+${data.xp} XP) with force — the live check still fails. Re-verify later with get_site_audit refresh:true. Streak kept for today.`
            : key.startsWith("audit-")
              ? `Completed "${data.title}" (+${data.xp} XP). Couldn't verify against the live site right now (crawl unavailable) — taking your word for it. Streak kept for today.`
              : `Completed "${data.title}" (+${data.xp} XP). (Self-reported — this task type isn't crawl-verifiable.) Streak kept for today.`;
      return json({ ok: true, verified, ...(evidence ? { evidence } : {}), task: data, message });
    }),
  );

  // --- ACT: run the full multi-model scan (Premium; budget-limited) ---
  server.tool(
    "run_full_scan",
    "Start the full Clerow scan across ALL AI models (ChatGPT, Claude, Perplexity, Gemini, Grok) for the brand's top buyer questions. PREMIUM ONLY — it uses one of the subscription's monthly scans (hard budget cap). Returns IMMEDIATELY with status 'started'; the scan runs in the background for ~1–2 minutes. Poll get_visibility: when scan.inProgress flips false and scannedAt updates, the fresh standings + multi-model verdict are in. Do NOT call run_full_scan again while one is running — a retry is rejected and would otherwise double-spend the budget. To read existing standings WITHOUT spending a scan, use get_visibility.",
    logged("run_full_scan", async (extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand, userId, sub, subscribed } = r.ctx;

      if (!subscribed) {
        return text(
          "Running a full multi-model scan is a Clerow Premium feature. The free MCP can still run the cheap site audit (get_site_audit) and read your current standings (get_visibility). Upgrade in the Clerow dashboard to scan all 5 AI models from here.",
        );
      }
      const plan = planFromSub(sub);
      const engines = enabledEngines(enginesForPlan(plan));
      if (engines.length === 0) return fail("No AI engines are configured on the server.");

      // Count the prompts this scan will cover (primary first, then volume) for the
      // upfront budget guard. runPromptScan re-checks the budget per prompt.
      const { data: promptRows } = await admin
        .from("prompts")
        .select("id")
        .eq("brand_id", brand.id)
        .order("is_primary", { ascending: false })
        .order("volume", { ascending: false })
        .limit(MAX_SCAN_PROMPTS);
      const promptCount = promptRows?.length ?? 0;
      if (promptCount === 0) return fail("No prompts to scan yet. Run your first scan in the Clerow dashboard.");

      // Budget guard (the money cap) — refuse cleanly before spending anything.
      let budget;
      try {
        budget = await assertBudget(admin, userId, plan, costForEngines(engines) * promptCount, new Date());
      } catch (err) {
        if (err instanceof BudgetExceededError) {
          return text("You're out of full scans for this month on your plan — they reset next billing cycle, or upgrade in the dashboard for more.");
        }
        throw err;
      }

      // Atomic claim: exactly one concurrent caller (MCP retry, dashboard, cron)
      // wins; everyone else gets the friendly "already running" answer instead of
      // spending a second scan. Released in the background job's finally.
      if (!(await claimScan(admin, brand.id))) {
        return text("A scan is already running for this brand — poll get_visibility; scan.inProgress flips false when it's done. Don't start another one.");
      }

      // Run the actual scan AFTER responding — the work takes ~1–2 minutes, which
      // outlives most MCP clients' request timeouts (the old inline version made
      // timed-out-but-succeeded scans look retryable). Same steps as before:
      // (1) refresh the cheap site audit (re-crawls the grounding data), then
      // (2) scan the top prompts across all engines (shared scanTopPrompts), then
      // (3) synthesize each scan so the multi-model verdict feeds the briefs.
      after(async () => {
        try {
          try {
            await refreshSiteAudit(admin, brand.id, brand.url);
          } catch {
            // best-effort — the prior audit stays.
          }
          const scanIds = await scanTopPrompts(admin, brand.id, engines);
          for (const id of scanIds) {
            try {
              await synthesizeAndStore(admin, id);
            } catch {
              // Non-fatal — the scores are saved; the verdict just stays null.
            }
          }
        } finally {
          await releaseScan(admin, brand.id);
        }
      });

      return json({
        ok: true,
        status: "started",
        scanning: { models: engines.length, prompts: promptCount },
        estimatedSeconds: 90,
        scansRemaining: Math.max(0, budget.scansLeft - 1),
        message:
          "Full multi-model scan started in the background (~1–2 min). Poll get_visibility — when scan.inProgress is false and scannedAt has updated, the fresh standings, cited sources, and multi-model verdict are in (list_tasks and get_task_content reflect them too). Do NOT call run_full_scan again; a retry while this runs is rejected.",
      });
    }),
  );
}

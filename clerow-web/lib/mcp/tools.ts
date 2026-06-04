// Clerow MCP tools — thin wrappers over the existing GEO engine so an agent can
// read a brand's visibility, pull the prioritized ladder, generate ready-to-ship
// files/content, and mark tasks done (keeping the streak). The agent does the
// repo writes; Clerow only supplies data + content.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "../supabase/database.types";
import { loadBrandSnapshot } from "../scan/snapshot";
import { ensureSiteAudit, refreshSiteAudit } from "../audit/ensure";
import { buildLadder, ensureLadderTasks, projectLockedGain, type LadderTask } from "../ladder";
import { assembleLadderContext } from "../scan/ladderContext";
import { buildContentBrief, buildSiteContext, buildScanInsight } from "../content/generate";
import { deterministicTaskContent } from "../content/files";
import { getSubscription, isSubscribed } from "../billing/subscription";
import { scanTopPrompts, MAX_SCAN_PROMPTS } from "../scan/run";
import { synthesizeAndStore } from "../scan/synthesize";
import { planFromSub, enginesForPlan, assertBudget, BudgetExceededError } from "../billing/limits";
import { costForEngines } from "../billing/cost";
import { enabledEngines } from "../engines";
import type { BrandProfile } from "../types";

type Db = SupabaseClient<Database>;
type BrandRow = Database["public"]["Tables"]["brands"]["Row"];

const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });
const json = (o: unknown) => text(JSON.stringify(o, null, 2));
const fail = (s: string) => ({ content: [{ type: "text" as const, text: s }], isError: true });

// Pull the resolved {userId, brandId} the auth wrapper stashed in authInfo.extra.
function authOf(authInfo: { extra?: Record<string, unknown> } | undefined): { userId: string; brandId: string | null } | null {
  const e = authInfo?.extra as { userId?: string; brandId?: string | null } | undefined;
  return e?.userId ? { userId: e.userId, brandId: e.brandId ?? null } : null;
}

type Ctx = { admin: Db; userId: string; brandId: string; brand: BrandRow; subscribed: boolean };

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
  // free users are scoped to the frontier (Level 1 + one Level 2 taster).
  const subscribed = isSubscribed(await getSubscription(admin, auth.userId));
  return { ok: true, ctx: { admin, userId: auth.userId, brandId: auth.brandId, brand, subscribed } };
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
    ? "You're on Clerow Premium — the full climb (Levels 1–5) is available here. Work the active level's tasks in order; unlock levels ahead from the dashboard."
    : "The Clerow MCP is free and covers the foundations — all of Level 1 plus your first Level 2 (on-page structure) task. The rest of Level 2 and Levels 3–5 — authority & citations, winning buyer queries, and measuring — require a Clerow Premium subscription and are worked in the dashboard.";
}

// A task beyond the free frontier gets this friendly pointer rather than an error
// the calling agent would choke on. Only ever reached for a non-subscriber.
function higherLevel(level: number | null) {
  return text(
    `This task is beyond the free tier (Level ${level ?? "2+"}), which requires a Clerow Premium subscription. The free MCP covers Level 1 plus one Level 2 taster — upgrade in the Clerow dashboard to unlock the rest of the climb.`,
  );
}

// Build the same ladder the dashboard shows (idempotently seeds active/open levels).
// A subscriber gets the full climb (real unlockedThrough, nothing locked); a free
// user is pinned to the frontier (subscribed=false, unlockedThrough=0 — which also
// re-locks a churned ex-subscriber's stale higher-level tasks).
async function loadLadder(admin: Db, brand: BrandRow, subscribed: boolean) {
  const { data: tasks } = await admin.from("tasks").select("*").eq("brand_id", brand.id);
  const { ctx, audit, snapshot } = await assembleLadderContext(admin, brand);
  const unlockedThrough = !subscribed
    ? 0
    : (tasks ?? []).reduce(
        (max, t) => (t.source === "ladder" && (t.level ?? 0) > max ? t.level ?? 0 : max),
        0,
      );
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
  };
}

export function registerTools(server: McpServer) {
  // --- READ: multi-model visibility (the moat) ---
  server.tool(
    "get_visibility",
    "Get the brand's current AI visibility across engines (ChatGPT, Claude, Perplexity, Gemini): per-engine visibility %, rank, sentiment, the competitors ranked above them, and the domains AI cites.",
    async (extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const s = await loadBrandSnapshot(r.ctx.admin, r.ctx.brandId);
      return json({
        brand: { company: r.ctx.brand.company, url: r.ctx.brand.url },
        scannedAt: s.scannedAt,
        score: s.score,
        engines: s.engines.map((e) => ({ engine: e.label, visibility: e.visibility, position: e.position, sentiment: e.sentiment, locked: e.locked })),
        competitors: s.competitors.map((c) => ({ name: c.name, rank: c.rank, visibility: c.visibility, isYou: c.isYou })),
        citedDomains: s.citedDomains,
        primaryPrompt: s.primaryPromptText,
      });
    },
  );

  // --- READ: the prioritized task ladder (current level) ---
  server.tool(
    "list_tasks",
    "List the brand's actionable GEO tasks (id, title, detail, level, impact, xp) plus a summary of every level. On the free tier these are all of Level 1 ('Foundations', the technical quick wins to get read & cited by AI) plus one Level 2 ('on-page structure') taster; on Clerow Premium it's the full climb. Use get_task_content to get what to ship, then complete_task.",
    async (extra) => {
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
        activeTasks: actionable.map((t) => ({ id: t.id, key: t.key, title: t.title, detail: t.detail, level: t.level, impact: t.impact, xp: t.xp, done: t.done })),
        estimatedUpgradeGain: gain && gain.overall > 0 ? `Finishing the locked levels in the dashboard is worth an est. +${gain.overall}% AI visibility.` : null,
        note: tierNote(subscribed),
      });
    },
  );

  // --- READ: technical site audit (Level-1 gaps) ---
  server.tool(
    "get_site_audit",
    "Audit the brand's own website for technical/on-page GEO gaps: crawlability, robots.txt for AI crawlers, llms.txt, HTTPS, title, H1, meta description, structured data. Returns each check with a concrete fix.",
    async (extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const audit = await ensureSiteAudit(r.ctx.admin, r.ctx.brand);
      if (!audit) return fail("Couldn't audit the site right now.");
      return json({
        url: audit.url,
        fetchedAt: audit.fetchedAt,
        checks: audit.checks.map((c) => ({ id: c.id, label: c.label, status: c.status, detail: c.detail, fix: c.fix })),
      });
    },
  );

  // --- ACT: generate the ready-to-ship artifact for a task ---
  server.tool(
    "get_task_content",
    "Get what to ship for a task id (from list_tasks). Returns an actual robots.txt or llms.txt file when relevant, or — for a technical fix like a server error, a missing tag, or no server-side HTML — the diagnostic steps to apply; otherwise a brief (the GEO writing rules plus the brand/competitor context) for YOU (the calling agent) to write the finished, repo-aware content from. Covers your available tasks (free: Level 1 + the Level 2 taster; Premium: the full climb).",
    { taskId: z.string().describe("A task id from list_tasks") },
    async ({ taskId }, extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand, subscribed } = r.ctx;

      const { ladder, primaryPrompt, competitorsAhead, audit, citedSources, scanInsight } = await loadLadder(admin, brand, subscribed);
      const containing = ladder.levels.find((l) => l.tasks.some((t) => t.id === taskId));
      const match: LadderTask | undefined = containing?.tasks.find((t) => t.id === taskId);

      // Resolve the task's level/lock (for the tier gate), its title/detail, and
      // its ladder_key — falling back to the stored task row if it isn't in the
      // built ladder. The ladder's `locked` flag (built with this user's
      // subscription) is authoritative: a subscriber gets everything; a free
      // user gets the frontier.
      let level = containing?.level ?? null;
      let title = match?.title;
      let detail = match?.detail ?? "";
      let locked = match?.locked ?? false;
      let key = match?.key ?? "";
      if (!match) {
        const { data: row } = await admin.from("tasks").select("title, meta, level, ladder_key").eq("id", taskId).eq("brand_id", brand.id).maybeSingle();
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

      // Otherwise hand the calling agent a brief and let IT write the content
      // (repo-aware, and the MCP spends no model call of its own).
      const brief = buildContentBrief({
        brand: brandProfile(brand),
        title,
        detail,
        promptText: primaryPrompt?.text,
        intent: primaryPrompt?.intent,
        competitorsAhead,
        siteContext: buildSiteContext(audit?.crawl),
        citedSources,
        scanInsight,
      });
      // Off-site authority tasks (Reddit, directories, press) can't be shipped as a
      // repo PR — make that explicit so the agent hands the draft to the user instead
      // of claiming it published it.
      if (match?.channel === "offsite") {
        return text(
          `> NOTE: This is an off-site task — you (the agent) cannot publish it. Write the draft per the brief below, then give it to the user to post manually at the relevant third-party site, and call complete_task once they confirm.\n\n${brief}`,
        );
      }
      return text(brief);
    },
  );

  // --- ACT: mark a task done (keeps the streak / earns XP) ---
  server.tool(
    "complete_task",
    "Mark a task done after the agent has shipped it. Stamps completion so it keeps the user's Clerow streak and awards XP. Covers your available tasks (free: Level 1 + the Level 2 taster; Premium: the full climb).",
    { taskId: z.string().describe("A task id from list_tasks") },
    async ({ taskId }, extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand, subscribed } = r.ctx;
      // Gate to the user's tier before mutating — don't mark a paywalled task done.
      // Use the built ladder's `locked` flag (authoritative; a subscriber gets
      // everything, a free user the frontier, and a churned ex-subscriber's stale
      // higher-level tasks re-lock), with a level-only fallback for any non-ladder row.
      const { ladder } = await loadLadder(admin, brand, subscribed);
      const containing = ladder.levels.find((l) => l.tasks.some((t) => t.id === taskId));
      const match = containing?.tasks.find((t) => t.id === taskId);
      let locked = match?.locked ?? false;
      let level = containing?.level ?? null;
      if (!match) {
        const { data: row } = await admin.from("tasks").select("level").eq("id", taskId).eq("brand_id", brand.id).maybeSingle();
        if (!row) return fail("Task not found for this brand.");
        level = row.level;
        locked = !subscribed && row.level !== 1;
      }
      if (locked) return higherLevel(level);
      const { data, error } = await admin
        .from("tasks")
        .update({ done: true, completed_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("brand_id", brand.id)
        .select("id, title, xp, done")
        .maybeSingle();
      if (error) return fail(`Couldn't complete the task: ${error.message}`);
      if (!data) return fail("Task not found for this brand.");
      return json({ ok: true, task: data, message: `Completed "${data.title}" (+${data.xp} XP). Streak kept for today.` });
    },
  );

  // --- ACT: run the full multi-model scan (Premium; budget-limited) ---
  server.tool(
    "run_full_scan",
    "Run the full Clerow scan across ALL AI models (ChatGPT, Claude, Perplexity, Gemini, Grok) for the brand's top buyer questions, then return the fresh standings + multi-model verdict. PREMIUM ONLY — it uses one of the subscription's monthly scans (hard budget cap) and takes ~1–2 minutes (it runs to completion before returning). To read existing standings WITHOUT spending a scan, use get_visibility instead.",
    async (extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand, userId } = r.ctx;

      // Premium gate — re-fetch the sub to derive the plan's engines + budget.
      const sub = await getSubscription(admin, userId);
      if (!isSubscribed(sub)) {
        return text(
          "Running a full multi-model scan is a Clerow Premium feature. The free MCP can still run the cheap site audit (get_site_audit) and read your current standings (get_visibility). Upgrade in the Clerow dashboard to scan all 5 AI models from here.",
        );
      }
      const plan = planFromSub(sub);
      const engines = enabledEngines(enginesForPlan(plan));
      if (engines.length === 0) return fail("No AI engines are configured on the server.");

      // Don't start a scan while one is already running for this brand.
      const inFlightSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count: running } = await admin
        .from("scans")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", brand.id)
        .eq("status", "running")
        .gte("started_at", inFlightSince);
      if (running && running > 0) {
        return text("A scan is already running for this brand — give it a moment, then check get_visibility.");
      }

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
      try {
        await assertBudget(admin, userId, plan, costForEngines(engines) * promptCount, new Date());
      } catch (err) {
        if (err instanceof BudgetExceededError) {
          return text("You're out of full scans for this month on your plan — they reset next billing cycle, or upgrade in the dashboard for more.");
        }
        throw err;
      }

      // (1) Refresh the cheap site audit (also re-crawls the grounding data), then
      // (2) scan the top prompts across all engines (shared scanTopPrompts), then
      // (3) synthesize each scan now so the multi-model verdict is ready
      // immediately — it feeds get_task_content's brief.
      try {
        await refreshSiteAudit(admin, brand.id, brand.url);
      } catch {
        // best-effort — the prior audit stays.
      }
      const scanIds = await scanTopPrompts(admin, brand.id, engines);
      if (scanIds.length === 0) return fail("The scan didn't complete — all engines failed for every prompt. Try again shortly.");
      for (const id of scanIds) {
        try {
          await synthesizeAndStore(admin, id);
        } catch {
          // Non-fatal — the scores are saved; the verdict just stays null.
        }
      }

      // Return the fresh standings (mirrors get_visibility) + the new verdict.
      const s = await loadBrandSnapshot(admin, brand.id);
      return json({
        ok: true,
        scanned: { models: engines.length, prompts: scanIds.length },
        scannedAt: s.scannedAt,
        score: s.score,
        engines: s.engines.map((e) => ({ engine: e.label, visibility: e.visibility, position: e.position, sentiment: e.sentiment, locked: e.locked })),
        competitors: s.competitors.map((c) => ({ name: c.name, rank: c.rank, visibility: c.visibility, isYou: c.isYou })),
        citedDomains: s.citedDomains,
        synthesis: s.synthesis,
        message:
          "Full multi-model scan complete. Standings, cited sources, and the multi-model verdict are updated — list_tasks and get_task_content now reflect the fresh data.",
      });
    },
  );
}

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
import { ensureSiteAudit } from "../audit/ensure";
import { buildLadder, ensureLadderTasks, type LadderContext, type LadderTask } from "../ladder";
import { generateFixContent } from "../content/generate";
import { buildRobotsTxt, buildLlmsTxt } from "../content/files";
import { getSubscription, isSubscribed } from "../billing/subscription";
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

type Ctx = { admin: Db; userId: string; brandId: string; brand: BrandRow };

async function resolveCtx(
  authInfo: { extra?: Record<string, unknown> } | undefined,
): Promise<{ ok: true; ctx: Ctx } | { ok: false; result: ReturnType<typeof fail> }> {
  const auth = authOf(authInfo);
  if (!auth) return { ok: false, result: fail("Unauthorized — invalid Clerow API key.") };
  if (!auth.brandId) return { ok: false, result: fail("No brand connected yet. Run your first scan in Clerow, then retry.") };
  const admin = createAdminClient();
  const { data: brand } = await admin.from("brands").select("*").eq("id", auth.brandId).maybeSingle();
  if (!brand) return { ok: false, result: fail("Brand not found for this key.") };
  return { ok: true, ctx: { admin, userId: auth.userId, brandId: auth.brandId, brand } };
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

async function isPaid(admin: Db, userId: string): Promise<boolean> {
  return isSubscribed(await getSubscription(admin, userId));
}

// Build the same ladder the dashboard shows (idempotently seeds the active level).
async function loadLadder(admin: Db, brand: BrandRow) {
  const snapshot = await loadBrandSnapshot(admin, brand.id);
  const [{ data: prompts }, { data: tasks }] = await Promise.all([
    admin.from("prompts").select("*").eq("brand_id", brand.id),
    admin.from("tasks").select("*").eq("brand_id", brand.id),
  ]);
  const audit = await ensureSiteAudit(admin, brand);
  const you = snapshot.competitors.find((c) => c.isYou);
  const yourRank = you?.rank ?? Number.POSITIVE_INFINITY;
  const primaryPromptRow = (prompts ?? []).find((p) => p.id === snapshot.primaryPromptId);
  const ctx: LadderContext = {
    company: brand.company,
    audit,
    primaryPrompt:
      snapshot.primaryPromptText && primaryPromptRow
        ? { text: snapshot.primaryPromptText, intent: primaryPromptRow.intent }
        : null,
    competitorsAhead: snapshot.competitors.filter((c) => !c.isYou && c.rank < yourRank).map((c) => c.name),
    sourceGaps: snapshot.citedDomains.slice(0, 5),
    promptGaps: (prompts ?? [])
      .filter((p) => p.is_tracked && p.id !== snapshot.primaryPromptId)
      .map((p) => p.text)
      .slice(0, 5),
  };
  const existing = new Map<string, { id: string; done: boolean; resolved: boolean }>();
  for (const t of tasks ?? [])
    if (t.ladder_key) existing.set(t.ladder_key, { id: t.id, done: t.done, resolved: t.done || t.archived });
  const pre = buildLadder(ctx, existing);
  const inserted = await ensureLadderTasks(admin, brand.id, pre, new Set(existing.keys()));
  for (const r of inserted)
    if (r.ladder_key) existing.set(r.ladder_key, { id: r.id, done: r.done, resolved: r.done || r.archived });
  return { ladder: buildLadder(ctx, existing), primaryPrompt: ctx.primaryPrompt, competitorsAhead: ctx.competitorsAhead };
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
    "List the brand's prioritized GEO tasks ('The Climb'). Returns the current active level's tasks (id, title, detail, impact, xp) plus a summary of every level. Use get_task_content to generate what to ship, then complete_task.",
    async (extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { ladder } = await loadLadder(r.ctx.admin, r.ctx.brand);
      const active = ladder.levels.find((l) => l.state === "active");
      return json({
        currentLevel: ladder.currentLevel,
        levels: ladder.levels.map((l) => ({ level: l.level, title: l.title, state: l.state, done: l.doneCount, total: l.total })),
        activeTasks: (active?.tasks ?? []).map((t) => ({ id: t.id, key: t.key, title: t.title, detail: t.detail, impact: t.impact, xp: t.xp, done: t.done })),
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

  // --- ACT: generate the ready-to-ship artifact for a task (paid) ---
  server.tool(
    "get_task_content",
    "Generate the finished, ready-to-ship content/file for a task id (from list_tasks). Returns an actual robots.txt or llms.txt file when relevant, otherwise copy-paste-ready Markdown (FAQ + JSON-LD, comparison page, landing/how-to draft). Requires an active Clerow subscription.",
    { taskId: z.string().describe("A task id from list_tasks") },
    async ({ taskId }, extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand, userId } = r.ctx;
      if (!(await isPaid(admin, userId)))
        return fail("Content generation requires an active Clerow subscription. Reading tasks and the audit is free.");

      const { ladder, primaryPrompt, competitorsAhead } = await loadLadder(admin, brand);
      const match: LadderTask | undefined = ladder.levels.flatMap((l) => l.tasks).find((t) => t.id === taskId);

      // Deterministic files for the technical fixes.
      const key = match?.key ?? "";
      if (key.includes("llms")) return text(buildLlmsTxt(brand));
      if (key.includes("robots")) return text(buildRobotsTxt(brand));

      // Fall back to the brand's stored task row if it isn't in the active ladder.
      let title = match?.title;
      let detail = match?.detail ?? "";
      if (!title) {
        const { data: row } = await admin.from("tasks").select("title, meta").eq("id", taskId).eq("brand_id", brand.id).maybeSingle();
        if (!row) return fail("Task not found for this brand.");
        title = row.title;
        detail = row.meta;
      }

      const { content } = await generateFixContent({
        brand: brandProfile(brand),
        title,
        detail,
        promptText: primaryPrompt?.text,
        intent: primaryPrompt?.intent,
        competitorsAhead,
      });
      return text(content);
    },
  );

  // --- ACT: mark a task done (keeps the streak / earns XP) (paid) ---
  server.tool(
    "complete_task",
    "Mark a task done after the agent has shipped it. Stamps completion so it keeps the user's Clerow streak and awards XP. Requires an active Clerow subscription.",
    { taskId: z.string().describe("A task id from list_tasks") },
    async ({ taskId }, extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand, userId } = r.ctx;
      if (!(await isPaid(admin, userId)))
        return fail("Completing tasks via MCP requires an active Clerow subscription.");
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
}

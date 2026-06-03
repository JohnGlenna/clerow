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
import { buildLadder, ensureLadderTasks, type LadderTask } from "../ladder";
import { assembleLadderContext } from "../scan/ladderContext";
import { buildContentBrief } from "../content/generate";
import { buildRobotsTxt, buildLlmsTxt } from "../content/files";
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

// The MCP is free but deliberately scoped to Level 1 ("Foundations") — the rest
// of the climb lives in the paid Clerow dashboard. A task above Level 1 gets this
// friendly pointer rather than an error the calling agent would choke on.
const LEVEL1_ONLY_NOTE =
  "The Clerow MCP is free but covers Level 1 (Foundations) only. Levels 2–5 — on-page & structure, authority & citations, winning buyer queries, and measuring — require a Clerow Premium subscription and are worked in the dashboard.";

function higherLevel(level: number | null) {
  return text(
    `This task is part of Level ${level ?? "2+"}, which requires a Clerow Premium subscription. The free MCP covers Level 1 (Foundations) only — upgrade in the Clerow dashboard to unlock Levels 2–5.`,
  );
}

// Build the same ladder the dashboard shows (idempotently seeds active/open levels).
async function loadLadder(admin: Db, brand: BrandRow) {
  const { data: tasks } = await admin.from("tasks").select("*").eq("brand_id", brand.id);
  const { ctx } = await assembleLadderContext(admin, brand);
  const unlockedThrough = (tasks ?? []).reduce(
    (max, t) => (t.source === "ladder" && (t.level ?? 0) > max ? t.level ?? 0 : max),
    0,
  );
  const existing = new Map<string, { id: string; done: boolean; resolved: boolean }>();
  for (const t of tasks ?? [])
    if (t.ladder_key) existing.set(t.ladder_key, { id: t.id, done: t.done, resolved: t.done || t.archived });
  const pre = buildLadder(ctx, existing, unlockedThrough);
  const inserted = await ensureLadderTasks(admin, brand.id, pre, new Set(existing.keys()));
  for (const r of inserted)
    if (r.ladder_key) existing.set(r.ladder_key, { id: r.id, done: r.done, resolved: r.done || r.archived });
  return { ladder: buildLadder(ctx, existing, unlockedThrough), primaryPrompt: ctx.primaryPrompt, competitorsAhead: ctx.competitorsAhead };
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
    "List the brand's free Level 1 ('Foundations') GEO tasks — the technical quick wins to get read & cited by AI (id, title, detail, impact, xp) — plus a summary of every level (Levels 2–5 live in the Clerow dashboard). Use get_task_content to get what to ship, then complete_task.",
    async (extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { ladder } = await loadLadder(r.ctx.admin, r.ctx.brand);
      const level1 = ladder.levels.find((l) => l.level === 1);
      return json({
        currentLevel: ladder.currentLevel,
        levels: ladder.levels.map((l) => ({ level: l.level, title: l.title, state: l.state, done: l.doneCount, total: l.total })),
        activeTasks: (level1?.tasks ?? []).map((t) => ({ id: t.id, key: t.key, title: t.title, detail: t.detail, impact: t.impact, xp: t.xp, done: t.done })),
        note: LEVEL1_ONLY_NOTE,
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
    "Get what to ship for a Level 1 task id (from list_tasks). Returns an actual robots.txt or llms.txt file when relevant, otherwise a brief — the GEO writing rules plus the brand/competitor context — for YOU (the calling agent) to write the finished, repo-aware content from. Free; covers Level 1 only.",
    { taskId: z.string().describe("A task id from list_tasks") },
    async ({ taskId }, extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand } = r.ctx;

      const { ladder, primaryPrompt, competitorsAhead } = await loadLadder(admin, brand);
      const containing = ladder.levels.find((l) => l.tasks.some((t) => t.id === taskId));
      const match: LadderTask | undefined = containing?.tasks.find((t) => t.id === taskId);

      // Resolve the task's level (for the Level-1 gate) and its title/detail —
      // falling back to the stored task row if it isn't in the built ladder.
      let level = containing?.level ?? null;
      let title = match?.title;
      let detail = match?.detail ?? "";
      if (!match) {
        const { data: row } = await admin.from("tasks").select("title, meta, level").eq("id", taskId).eq("brand_id", brand.id).maybeSingle();
        if (!row) return fail("Task not found for this brand.");
        title = row.title;
        detail = row.meta;
        level = row.level;
      }
      if (level !== 1) return higherLevel(level);
      if (!title) return fail("Task not found for this brand.");

      // Deterministic files for the technical fixes — no model call needed.
      const key = match?.key ?? "";
      if (key.includes("llms")) return text(buildLlmsTxt(brand));
      if (key.includes("robots")) return text(buildRobotsTxt(brand));

      // Otherwise hand the calling agent a brief and let IT write the content
      // (repo-aware, and the free MCP spends no model call of its own).
      const brief = buildContentBrief({
        brand: brandProfile(brand),
        title,
        detail,
        promptText: primaryPrompt?.text,
        intent: primaryPrompt?.intent,
        competitorsAhead,
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

  // --- ACT: mark a task done (keeps the streak / earns XP) (paid) ---
  server.tool(
    "complete_task",
    "Mark a Level 1 task done after the agent has shipped it. Stamps completion so it keeps the user's Clerow streak and awards XP. Free; covers Level 1 only.",
    { taskId: z.string().describe("A task id from list_tasks") },
    async ({ taskId }, extra) => {
      const r = await resolveCtx(extra.authInfo);
      if (!r.ok) return r.result;
      const { admin, brand } = r.ctx;
      // Gate to Level 1 before mutating — don't mark a higher-level task done.
      const { data: row } = await admin.from("tasks").select("level").eq("id", taskId).eq("brand_id", brand.id).maybeSingle();
      if (!row) return fail("Task not found for this brand.");
      if (row.level !== 1) return higherLevel(row.level);
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

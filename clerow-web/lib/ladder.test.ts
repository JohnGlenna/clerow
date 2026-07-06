import { describe, expect, it } from "vitest";

import { buildLadder, refreshLadderTaskContent, type LadderContext } from "./ladder";
import type { SiteAudit, SiteCheck, SiteCheckFix } from "./audit/site";

const aFix = (title: string): SiteCheckFix => ({ title, detail: "d", minutes: 20, impact: "medium", xp: 35, steps: [] });
const check = (id: string, status: SiteCheck["status"], fixTitle?: string): SiteCheck => ({
  id,
  label: id,
  status,
  detail: "found",
  fix: fixTitle ? aFix(fixTitle) : null,
});

const audit = (checks: SiteCheck[]): SiteAudit => ({ url: "https://acme.com/", fetchedAt: "2026-06-11T00:00:00Z", ok: true, checks });

const ctx = (checks: SiteCheck[]): LadderContext => ({
  company: "Acme",
  url: "https://acme.com",
  audit: audit(checks),
  primaryPrompt: null,
  competitorsAhead: [],
  sourceGaps: [],
  promptGaps: [],
});

const levelTasks = (c: LadderContext, level: number) =>
  buildLadder(c, new Map()).levels.find((l) => l.level === level)!.tasks;

describe("target-page resolution", () => {
  const page = (url: string) => ({ url, title: null, description: null, text: "" });
  const crawl = (pages: string[]) => ({ robotsTxt: null, sitemapUrls: [], home: page("https://acme.com/"), pages: pages.map(page) });

  it("targets the rival-specific compare page, never a different rival's vs-page", () => {
    const c: LadderContext = {
      ...ctx([]),
      audit: { ...audit([]), crawl: crawl(["https://acme.com/compare/acme-vs-profound"]) },
      primaryPrompt: { text: "best geo tools", intent: "solution" },
      competitorsAhead: ["LLMOmetrics", "Profound"],
    };
    const tasks = levelTasks(c, 4);
    // The existing Profound vs-page belongs to the Profound task only…
    expect(tasks.find((t) => t.key === "l4-compare-profound")?.targetUrl).toBe("https://acme.com/compare/acme-vs-profound");
    // …while the LLMOmetrics task suggests creating its own page.
    const llmo = tasks.find((t) => t.key === "l4-compare-llmometrics")!;
    expect(llmo.targetUrl).toBe("https://acme.com/compare/acme-vs-llmometrics");
    expect(llmo.targetIsNew).toBe(true);
  });

  it("targets the audited homepage for graded l2 checks (the page the grader read)", () => {
    const c: LadderContext = {
      ...ctx([check("l2-eeat", "fail", "Add sourced stats")]),
      primaryPrompt: { text: "best geo tools", intent: "solution" },
    };
    // Even with a crawled inner page that better matches the prompt…
    c.audit = { ...c.audit!, crawl: crawl(["https://acme.com/best-geo-tools"]) };
    expect(levelTasks(c, 2).find((t) => t.key === "l2-eeat")?.targetUrl).toBe("https://acme.com/");
  });
});

describe("XP stays in sync with the spec", () => {
  it("refreshLadderTaskContent rewrites a row whose xp drifted from its spec", async () => {
    // The graded l2-eeat check carries a "high" (60 XP) fix; the seeded row
    // still holds the generic-era 35 XP even though title/meta/impact match.
    const highFix: SiteCheckFix = { title: "Add sourced stats", detail: "d", minutes: 30, impact: "high", xp: 60, steps: [] };
    const graded: SiteCheck = { id: "l2-eeat", label: "E-E-A-T signals", status: "fail", detail: "found", fix: highFix };
    const ladder = buildLadder(ctx([graded]), new Map([["l2-eeat", { id: "t1", done: false, resolved: false }]]));
    const t = ladder.levels.find((l) => l.level === 2)!.tasks.find((x) => x.key === "l2-eeat")!;
    const updates: Record<string, unknown>[] = [];
    const db = { from: () => ({ update: (u: Record<string, unknown>) => ({ eq: async () => { updates.push(u); return {}; } }) }) };
    const changed = await refreshLadderTaskContent(db as never, ladder, [
      { id: "t1", ladder_key: "l2-eeat", title: t.title, meta: t.meta, impact: t.impact, xp: 35 },
    ]);
    expect(changed).toBe(1);
    expect(updates[0].xp).toBe(60);
  });
});

describe("buildLadder wiring for the new checks", () => {
  it("turns a failing schema-honesty check into a Level-2 task", () => {
    const tasks = levelTasks(ctx([check("schema-honesty", "warn", "Back up your review schema — or remove it")]), 2);
    expect(tasks.some((t) => t.key === "audit-schema-honesty")).toBe(true);
  });

  it("turns a failing l2-claim-consistency grade into a Level-2 task with a target", () => {
    const tasks = levelTasks(ctx([check("l2-claim-consistency", "fail", "Fix the contradictions across your pages")]), 2);
    const task = tasks.find((t) => t.key === "l2-claim-consistency");
    expect(task).toBeDefined();
    expect(task!.targetUrl).toBe("https://acme.com/"); // falls back to the audited homepage
  });

  it("resolves the exact file URL for audit fixes", () => {
    const tasks = levelTasks(ctx([check("robots-ai", "fail", "Let AI crawlers read your site")]), 1);
    expect(tasks.find((t) => t.key === "audit-robots-ai")?.targetUrl).toBe("https://acme.com/robots.txt");
  });
});

describe("paywalled-task redaction for free users", () => {
  // A ctx rich enough to build insight-bearing tasks at every paid level.
  const richCtx = (): LadderContext => ({
    ...ctx([]),
    primaryPrompt: { text: "best geo tools 2026", intent: "solution" },
    competitorsAhead: ["Ahrefs Brand Radar"],
    sourceGaps: ["ahrefs.com", "semrush.com"],
    promptGaps: ["geo vs seo"],
  });

  const allTasks = (subscribed: boolean, existing = new Map<string, { id: string; done: boolean; resolved: boolean }>()) =>
    buildLadder(richCtx(), existing, 0, subscribed).levels.flatMap((l) => l.tasks.map((t) => ({ ...t, level: l.level })));

  it("replaces every unresolved locked task's insight fields with placeholders", () => {
    const locked = allTasks(false).filter((t) => t.locked && !t.resolved);
    expect(locked.length).toBeGreaterThan(0);
    for (const t of locked) {
      expect(t.key).toMatch(/^locked-l\d+-\d+$/);
      expect(t.title).toMatch(/^Locked /);
      expect(t.detail).not.toContain("Target:");
      expect(t.steps).toEqual([]);
      expect(t.targetUrl).toBeNull();
    }
    const serialized = JSON.stringify(locked);
    expect(serialized).not.toContain("ahrefs");
    expect(serialized).not.toContain("semrush");
  });

  it("keeps the Level 2 taster's real spec", () => {
    const taster = buildLadder(richCtx(), new Map(), 0, false).levels.find((l) => l.level === 2)!.tasks[0];
    expect(taster.locked).toBe(false);
    expect(taster.title).not.toMatch(/^Locked /);
  });

  it("redacts nothing for a subscriber", () => {
    const tasks = allTasks(true);
    expect(tasks.some((t) => t.locked)).toBe(false);
    expect(tasks.some((t) => t.title.startsWith("Locked "))).toBe(false);
  });

  it("keeps the level-banner teasers (findings) intact for free users", () => {
    const freeLevels = buildLadder(richCtx(), new Map(), 0, false).levels;
    const paidLevels = buildLadder(richCtx(), new Map(), 0, true).levels;
    expect(freeLevels.map((l) => l.findings)).toEqual(paidLevels.map((l) => l.findings));
  });

  it("keeps a churned user's resolved locked tasks readable (real key + title)", () => {
    const existing = new Map([["l3-source-ahrefs-com", { id: "t1", done: true, resolved: true }]]);
    const done = allTasks(false, existing).find((t) => t.id === "t1")!;
    expect(done.locked).toBe(true);
    expect(done.key).toBe("l3-source-ahrefs-com");
    expect(done.title).not.toMatch(/^Locked /);
  });

  it("refreshLadderTaskContent never writes locked specs back to the DB", async () => {
    const existing = new Map([["l3-source-ahrefs-com", { id: "t1", done: true, resolved: true }]]);
    const ladder = buildLadder(richCtx(), existing, 0, false);
    let writes = 0;
    const db = { from: () => ({ update: () => ({ eq: async () => { writes++; return {}; } }) }) };
    const changed = await refreshLadderTaskContent(db as never, ladder, [
      // Resolved locked task whose stored title drifted from the spec: without
      // the guard this would be rewritten.
      { id: "t1", ladder_key: "l3-source-ahrefs-com", title: "an old title", meta: "m", impact: "low" },
      // Stale seeded row for an unresolved locked task: its real key no longer
      // matches any spec (keys are redacted), so it must be ignored too.
      { id: "t2", ladder_key: "l3-source-semrush-com", title: "an old title", meta: "m", impact: "low" },
    ]);
    expect(changed).toBe(0);
    expect(writes).toBe(0);
  });
});

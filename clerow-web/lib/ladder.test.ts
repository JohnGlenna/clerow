import { describe, expect, it } from "vitest";

import { buildLadder, type LadderContext } from "./ladder";
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

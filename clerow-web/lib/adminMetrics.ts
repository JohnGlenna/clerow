// Admin/investor metrics — every number on /admin/* and /investors/[token].
// All reads go through the service-role client (auth.users + RLS-less tables),
// so this module is server-only: import it from server components / API routes,
// never from client components.
//
// Scale note: everything is computed per request from narrow, window-bounded
// selects — fine at tens-to-hundreds of users. listUsers pagination should be
// swapped for a SQL count function past a few thousand users.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import type { Database } from "./supabase/database.types";
import { PLANS, isPlanKey, planForPriceId } from "./billing/plans";

type Db = SupabaseClient<Database>;

export type ChartPoint = { label: string; value: number };

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES = new Set(["active", "trialing"]); // mirror lib/billing/subscription.ts

// ---------- time bucketing ----------

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
const shortDay = (t: number) => {
  const d = new Date(t);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

// Daily buckets for the last `days` days (zero-filled, oldest first).
export function bucketByDay(timestamps: (string | null | undefined)[], days: number, now = Date.now()): ChartPoint[] {
  const start = now - (days - 1) * DAY_MS;
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    if (!ts) continue;
    const t = new Date(ts).getTime();
    if (t >= start - DAY_MS) counts.set(dayKey(t), (counts.get(dayKey(t)) ?? 0) + 1);
  }
  const out: ChartPoint[] = [];
  for (let i = 0; i < days; i++) {
    const t = start + i * DAY_MS;
    out.push({ label: shortDay(t), value: counts.get(dayKey(t)) ?? 0 });
  }
  return out;
}

// Weekly buckets for the last `weeks` weeks (zero-filled, oldest first; label =
// the week's start day).
export function bucketByWeek(timestamps: (string | null | undefined)[], weeks: number, now = Date.now()): ChartPoint[] {
  const end = now;
  const out: ChartPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const wEnd = end - i * 7 * DAY_MS;
    const wStart = wEnd - 7 * DAY_MS;
    let n = 0;
    for (const ts of timestamps) {
      if (!ts) continue;
      const t = new Date(ts).getTime();
      if (t > wStart && t <= wEnd) n++;
    }
    out.push({ label: shortDay(wStart + DAY_MS), value: n });
  }
  return out;
}

// Weekly points of "how many were live at that moment" — for cumulative paying
// customers and the MRR trend (lifetime = [created_at, canceled_at)).
function weeklyAt<T>(rows: T[], weeks: number, valueAt: (rows: T[], t: number) => number, now = Date.now()): ChartPoint[] {
  const out: ChartPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const t = now - i * 7 * DAY_MS;
    out.push({ label: shortDay(t), value: valueAt(rows, t) });
  }
  return out;
}

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

// ---------- raw loads ----------

type UserLite = { id: string; email: string | null; createdAt: string };

// All auth users (id, email, created_at). Pagination loop — swap for a SQL
// count/window function if the user base outgrows this.
async function listAllUsers(admin: Db): Promise<UserLite[]> {
  const out: UserLite[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    for (const u of data.users) out.push({ id: u.id, email: u.email ?? null, createdAt: u.created_at });
    if (data.users.length < 1000) break;
  }
  return out;
}

type SubRow = {
  user_id: string;
  status: string;
  plan: string | null;
  price_id: string | null;
  created_at: string;
  canceled_at: string | null;
  cancel_at_period_end: boolean;
};

function planPrice(sub: Pick<SubRow, "plan" | "price_id">): number {
  const key = isPlanKey(sub.plan) ? sub.plan : planForPriceId(sub.price_id);
  return key ? PLANS[key].price : 0;
}

// A subscription's lifetime for time-series math: [created_at, canceled_at).
// Approximate (one row per user; a resubscribe reopens the same row) but honest
// at this scale.
function liveAt(sub: SubRow, t: number): boolean {
  if (new Date(sub.created_at).getTime() > t) return false;
  if (sub.canceled_at && new Date(sub.canceled_at).getTime() <= t) return false;
  return true;
}

// ---------- the payloads ----------

export type InvestorMetrics = {
  asOf: string;
  totals: {
    users: number;
    payingCustomers: number;
    mrrUsd: number;
    monthlyChurnPct: number | null; // null = no subscribers at window start yet
    weeklyActiveBrands: number;
    tasksCompleted: number;
    aiAnswersAnalyzed: number;
  };
  series: {
    signupsWeekly: ChartPoint[];
    payingCumulativeWeekly: ChartPoint[];
    mrrWeekly: ChartPoint[];
    tasksWeekly: ChartPoint[];
  };
};

export type AdminMetrics = {
  investor: InvestorMetrics;
  totals: {
    activatedUsers: number; // users with a brand connected
    trialing: number;
    atRiskMrrUsd: number; // active but cancel_at_period_end or still trialing
    monthlyActiveBrands: number;
    scanCost90dUsd: number;
  };
  planMix: { plan: string; count: number; mrrUsd: number }[];
  series: {
    newSubsWeekly: ChartPoint[];
    cancellationsWeekly: ChartPoint[];
    tasksDaily: ChartPoint[];
    scansDaily: ChartPoint[];
    activeBrandsDaily: ChartPoint[];
    mcpCallsDaily: ChartPoint[];
  };
  churn: {
    canceledTotal: number;
    reasons: { reason: string; count: number }[];
    feedback: { reason: string; detail: string | null; plan: string | null; createdAt: string }[];
  };
  recentUsers: { email: string | null; createdAt: string; company: string | null; subStatus: string | null; plan: string | null }[];
  streaks: { brandsOnStreak: number; top: { company: string | null; current: number; longest: number }[] };
  mcp: {
    totalCalls30d: number;
    usersEver: number;
    perTool: { tool: string; calls: number; errorPct: number; medianMs: number }[];
    perUser: { email: string | null; company: string | null; calls7d: number; calls30d: number; lastCall: string }[];
    legacyKeyUsers: { email: string | null; lastUsedAt: string }[]; // used keys before mcp_events existed
  };
};

const WEEKS = 12;
const DAYS = 30;

async function loadAll(admin: Db) {
  const now = Date.now();
  const since90 = new Date(now - 90 * DAY_MS).toISOString();
  const since30 = new Date(now - 30 * DAY_MS).toISOString();

  const [users, brands, subs, feedback, tasks, scans, scanResultCount, taskTotal, streaks, mcpEvents, apiKeys] =
    await Promise.all([
      listAllUsers(admin),
      admin.from("brands").select("id, user_id, company, created_at").then((r) => r.data ?? []),
      admin
        .from("subscriptions")
        .select("user_id, status, plan, price_id, created_at, canceled_at, cancel_at_period_end")
        .then((r) => (r.data ?? []) as SubRow[]),
      admin
        .from("cancellation_feedback")
        .select("reason, detail, plan, created_at")
        .order("created_at", { ascending: false })
        .limit(100)
        .then((r) => r.data ?? []),
      admin
        .from("tasks")
        .select("brand_id, completed_at")
        .not("completed_at", "is", null)
        .gte("completed_at", since90)
        .limit(20000)
        .then((r) => r.data ?? []),
      admin
        .from("scans")
        .select("brand_id, started_at, status, tier, est_cost")
        .gte("started_at", since90)
        .limit(20000)
        .then((r) => r.data ?? []),
      admin
        .from("scan_results")
        .select("id", { count: "exact", head: true })
        .then((r) => r.count ?? 0),
      admin
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .not("completed_at", "is", null)
        .then((r) => r.count ?? 0),
      admin
        .from("brand_streak")
        .select("brand_id, current_streak, longest_streak")
        .order("current_streak", { ascending: false })
        .limit(500)
        .then((r) => r.data ?? []),
      admin
        .from("mcp_events")
        .select("user_id, brand_id, tool, ok, duration_ms, created_at")
        .gte("created_at", since30)
        .order("created_at", { ascending: false })
        .limit(20000)
        .then((r) => r.data ?? []),
      admin
        .from("api_keys")
        .select("user_id, last_used_at")
        .not("last_used_at", "is", null)
        .then((r) => r.data ?? []),
    ]);

  return { now, users, brands, subs, feedback, tasks, scans, scanResultCount, taskTotal, streaks, mcpEvents, apiKeys };
}

function buildInvestor(d: Awaited<ReturnType<typeof loadAll>>): InvestorMetrics {
  const { now, users, subs, tasks, taskTotal, scanResultCount } = d;

  const paying = subs.filter((s) => ACTIVE_STATUSES.has(s.status));
  const mrr = paying.reduce((sum, s) => sum + planPrice(s), 0);

  // Monthly churn: of the subscriptions live 30 days ago, what share canceled since?
  const t0 = now - 30 * DAY_MS;
  const liveAtStart = subs.filter((s) => liveAt(s, t0));
  const canceledSince = liveAtStart.filter((s) => s.canceled_at && new Date(s.canceled_at).getTime() > t0);
  const monthlyChurnPct = liveAtStart.length > 0 ? Math.round((canceledSince.length / liveAtStart.length) * 1000) / 10 : null;

  const weekAgo = now - 7 * DAY_MS;
  const weeklyActiveBrands = new Set(
    tasks.filter((t) => t.completed_at && new Date(t.completed_at).getTime() > weekAgo).map((t) => t.brand_id),
  ).size;

  return {
    asOf: new Date(now).toISOString(),
    totals: {
      users: users.length,
      payingCustomers: paying.length,
      mrrUsd: mrr,
      monthlyChurnPct,
      weeklyActiveBrands,
      tasksCompleted: taskTotal,
      aiAnswersAnalyzed: scanResultCount,
    },
    series: {
      signupsWeekly: bucketByWeek(users.map((u) => u.createdAt), WEEKS, now),
      payingCumulativeWeekly: weeklyAt(subs, WEEKS, (rows, t) => rows.filter((s) => liveAt(s, t)).length, now),
      mrrWeekly: weeklyAt(subs, WEEKS, (rows, t) => rows.filter((s) => liveAt(s, t)).reduce((sum, s) => sum + planPrice(s), 0), now),
      tasksWeekly: bucketByWeek(d.tasks.map((t) => t.completed_at), WEEKS, now),
    },
  };
}

export async function loadInvestorMetrics(): Promise<InvestorMetrics> {
  const admin = createAdminClient();
  return buildInvestor(await loadAll(admin));
}

export async function loadAdminMetrics(): Promise<AdminMetrics> {
  const admin = createAdminClient();
  const d = await loadAll(admin);
  const { now, users, brands, subs, feedback, tasks, scans, streaks, mcpEvents, apiKeys } = d;

  const emailByUser = new Map(users.map((u) => [u.id, u.email]));
  const brandById = new Map(brands.map((b) => [b.id, b]));
  const brandByUser = new Map(brands.map((b) => [b.user_id, b]));
  const subByUser = new Map(subs.map((s) => [s.user_id, s]));

  const paying = subs.filter((s) => ACTIVE_STATUSES.has(s.status));
  const atRiskMrr = paying
    .filter((s) => s.cancel_at_period_end || s.status === "trialing")
    .reduce((sum, s) => sum + planPrice(s), 0);

  // Plan mix over currently-paying subs.
  const planMixMap = new Map<string, { count: number; mrrUsd: number }>();
  for (const s of paying) {
    const key = (isPlanKey(s.plan) ? PLANS[s.plan].name : s.plan) ?? "unknown";
    const cur = planMixMap.get(key) ?? { count: 0, mrrUsd: 0 };
    planMixMap.set(key, { count: cur.count + 1, mrrUsd: cur.mrrUsd + planPrice(s) });
  }

  // Churn reasons (survey).
  const reasonMap = new Map<string, number>();
  for (const f of feedback) reasonMap.set(f.reason, (reasonMap.get(f.reason) ?? 0) + 1);

  // Active brands per day = brands that completed ≥1 task that day (the honest
  // habit signal — brand_snapshots won't do, the cron writes one for every
  // subscriber daily regardless of activity).
  const taskDayByBrand = new Map<string, string>(); // `${brand}|${day}` dedup
  const activeBrandDays: string[] = [];
  for (const t of tasks) {
    if (!t.completed_at) continue;
    const k = `${t.brand_id}|${dayKey(new Date(t.completed_at).getTime())}`;
    if (!taskDayByBrand.has(k)) {
      taskDayByBrand.set(k, t.completed_at);
      activeBrandDays.push(t.completed_at);
    }
  }
  const monthAgo = now - 30 * DAY_MS;
  const monthlyActiveBrands = new Set(
    tasks.filter((t) => t.completed_at && new Date(t.completed_at).getTime() > monthAgo).map((t) => t.brand_id),
  ).size;

  // MCP aggregations (events are the last 30 days).
  const weekAgo = now - 7 * DAY_MS;
  const perToolMap = new Map<string, { calls: number; errors: number; durations: number[] }>();
  const perUserMap = new Map<string, { brandId: string | null; calls7d: number; calls30d: number; lastCall: string }>();
  for (const e of mcpEvents) {
    const tool = perToolMap.get(e.tool) ?? { calls: 0, errors: 0, durations: [] };
    tool.calls++;
    if (!e.ok) tool.errors++;
    if (e.duration_ms != null) tool.durations.push(e.duration_ms);
    perToolMap.set(e.tool, tool);

    const u = perUserMap.get(e.user_id) ?? { brandId: e.brand_id, calls7d: 0, calls30d: 0, lastCall: e.created_at };
    u.calls30d++;
    if (new Date(e.created_at).getTime() > weekAgo) u.calls7d++;
    if (e.created_at > u.lastCall) u.lastCall = e.created_at;
    perUserMap.set(e.user_id, u);
  }
  // Keys used before mcp_events existed: show them so early MCP adopters aren't invisible.
  const legacyKeyUsers = new Map<string, string>();
  for (const k of apiKeys) {
    if (!k.last_used_at || perUserMap.has(k.user_id)) continue;
    const prev = legacyKeyUsers.get(k.user_id);
    if (!prev || k.last_used_at > prev) legacyKeyUsers.set(k.user_id, k.last_used_at);
  }

  const recentUsers = [...users]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 25)
    .map((u) => ({
      email: u.email,
      createdAt: u.createdAt,
      company: brandByUser.get(u.id)?.company ?? null,
      subStatus: subByUser.get(u.id)?.status ?? null,
      plan: subByUser.get(u.id)?.plan ?? null,
    }));

  return {
    investor: buildInvestor(d),
    totals: {
      activatedUsers: new Set(brands.map((b) => b.user_id)).size,
      trialing: subs.filter((s) => s.status === "trialing").length,
      atRiskMrrUsd: atRiskMrr,
      monthlyActiveBrands,
      scanCost90dUsd: Math.round(scans.reduce((sum, s) => sum + (s.est_cost ?? 0), 0) * 100) / 100,
    },
    planMix: [...planMixMap.entries()].map(([plan, v]) => ({ plan, ...v })),
    series: {
      newSubsWeekly: bucketByWeek(subs.map((s) => s.created_at), WEEKS, now),
      cancellationsWeekly: bucketByWeek(subs.map((s) => s.canceled_at), WEEKS, now),
      tasksDaily: bucketByDay(tasks.map((t) => t.completed_at), DAYS, now),
      scansDaily: bucketByDay(scans.map((s) => s.started_at), DAYS, now),
      activeBrandsDaily: bucketByDay(activeBrandDays, DAYS, now),
      mcpCallsDaily: bucketByDay(mcpEvents.map((e) => e.created_at), DAYS, now),
    },
    churn: {
      canceledTotal: subs.filter((s) => s.status === "canceled").length,
      reasons: [...reasonMap.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
      feedback: feedback.map((f) => ({ reason: f.reason, detail: f.detail, plan: f.plan, createdAt: f.created_at })),
    },
    recentUsers,
    streaks: {
      brandsOnStreak: streaks.filter((s) => s.current_streak > 0).length,
      top: streaks
        .slice(0, 10)
        .filter((s) => s.current_streak > 0 || s.longest_streak > 0)
        .map((s) => ({
          company: brandById.get(s.brand_id)?.company ?? null,
          current: s.current_streak,
          longest: s.longest_streak,
        })),
    },
    mcp: {
      totalCalls30d: mcpEvents.length,
      usersEver: perUserMap.size + legacyKeyUsers.size,
      perTool: [...perToolMap.entries()]
        .map(([tool, v]) => ({
          tool,
          calls: v.calls,
          errorPct: v.calls ? Math.round((v.errors / v.calls) * 100) : 0,
          medianMs: median(v.durations),
        }))
        .sort((a, b) => b.calls - a.calls),
      perUser: [...perUserMap.entries()]
        .map(([userId, v]) => ({
          email: emailByUser.get(userId) ?? null,
          company: (v.brandId ? brandById.get(v.brandId)?.company : brandByUser.get(userId)?.company) ?? null,
          calls7d: v.calls7d,
          calls30d: v.calls30d,
          lastCall: v.lastCall,
        }))
        .sort((a, b) => b.calls30d - a.calls30d),
      legacyKeyUsers: [...legacyKeyUsers.entries()].map(([userId, lastUsedAt]) => ({
        email: emailByUser.get(userId) ?? null,
        lastUsedAt,
      })),
    },
  };
}

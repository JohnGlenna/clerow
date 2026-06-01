// Per-plan cost ceilings, enforced server-side so paid AI calls can never
// outrun subscription revenue. Resolves a subscription into the engines it may
// scan and its monthly API-cost budget. See lib/billing/plans.ts + cost.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import { PAID_ENGINES, type EngineId } from "../engines";
import { PLANS, isPlanKey, type PlanKey } from "./plans";
import { costForEngines } from "./cost";
import type { Database, SubscriptionRow } from "../supabase/database.types";

type DB = SupabaseClient<Database>;

// Plan key from a subscription row (null when unknown — callers should already
// have confirmed isSubscribed()).
export function planFromSub(sub: SubscriptionRow | null): PlanKey | null {
  return sub && isPlanKey(sub.plan) ? sub.plan : null;
}

// The engines a plan is entitled to scan — a prefix of PAID_ENGINES order
// (chatgpt, claude, perplexity, gemini, grok). All paid plans now get all 5.
export function enginesForPlan(plan: PlanKey | null): EngineId[] {
  const max = plan ? PLANS[plan].maxEngines : PAID_ENGINES.length;
  return PAID_ENGINES.slice(0, max);
}

// Max prompt-scans per brand per rolling 24h for the plan (0 when unknown).
export function dailyScanLimit(plan: PlanKey | null): number {
  return plan ? PLANS[plan].dailyScans : 0;
}

// ---- Monthly API-cost budget (the real COGS guard) ----

export class BudgetExceededError extends Error {
  constructor(public readonly status: BudgetStatus) {
    super("Monthly scan budget exceeded");
    this.name = "BudgetExceededError";
  }
}

export type BudgetStatus = {
  ceiling: number; // $ this plan may spend per period
  spent: number; // $ already spent this period
  remaining: number; // $ left
  scansLeft: number; // ≈ remaining / one full scan for the plan
  scanCost: number; // $ of one full (per-plan engines) scan
};

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // rolling 30-day window

// Total est_cost the user has spent across all their brands' scans this period.
export async function spentThisPeriod(db: DB, userId: string, now: Date): Promise<number> {
  const since = new Date(now.getTime() - PERIOD_MS).toISOString();
  const { data } = await db
    .from("scans")
    .select("est_cost, brands!inner(user_id)")
    .eq("brands.user_id", userId)
    .gte("started_at", since);
  return (data ?? []).reduce((sum, r) => sum + (Number(r.est_cost) || 0), 0);
}

export async function budgetStatus(db: DB, userId: string, plan: PlanKey | null, now: Date): Promise<BudgetStatus> {
  const ceiling = plan ? PLANS[plan].monthlyBudgetUsd : 0;
  const spent = await spentThisPeriod(db, userId, now);
  const remaining = Math.max(0, ceiling - spent);
  const scanCost = costForEngines(enginesForPlan(plan));
  const scansLeft = scanCost > 0 ? Math.floor(remaining / scanCost) : 0;
  return { ceiling, spent, remaining, scansLeft, scanCost };
}

// Throw BudgetExceededError if a scan costing `plannedCost` would exceed budget.
export async function assertBudget(
  db: DB,
  userId: string,
  plan: PlanKey | null,
  plannedCost: number,
  now: Date,
): Promise<BudgetStatus> {
  const status = await budgetStatus(db, userId, plan, now);
  if (plannedCost > status.remaining) throw new BudgetExceededError(status);
  return status;
}

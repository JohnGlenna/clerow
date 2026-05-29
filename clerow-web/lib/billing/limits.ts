// Per-plan cost ceilings, enforced server-side so paid AI calls can never
// outrun subscription revenue. Resolves a subscription into the engines it may
// scan and how many scans it gets per day. See lib/billing/plans.ts for values.
import { PAID_ENGINES, type EngineId } from "../engines";
import { PLANS, isPlanKey, type PlanKey } from "./plans";
import type { SubscriptionRow } from "../supabase/database.types";

// Plan key from a subscription row (null when unknown — callers should already
// have confirmed isSubscribed()).
export function planFromSub(sub: SubscriptionRow | null): PlanKey | null {
  return sub && isPlanKey(sub.plan) ? sub.plan : null;
}

// The engines a plan is entitled to scan — a prefix of PAID_ENGINES order
// (chatgpt, claude, perplexity, [gemini]). Founder gets the first 3.
export function enginesForPlan(plan: PlanKey | null): EngineId[] {
  const max = plan ? PLANS[plan].maxEngines : PAID_ENGINES.length;
  return PAID_ENGINES.slice(0, max);
}

// Max prompt-scans per brand per rolling 24h for the plan (0 when unknown).
export function dailyScanLimit(plan: PlanKey | null): number {
  return plan ? PLANS[plan].dailyScans : 0;
}

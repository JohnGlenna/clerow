// Single source of truth for Clerow's subscription plans. The display copy
// matches the paywall in components/dashboard/AppShell.tsx; the Stripe price IDs
// come from env so they never drift between checkout and the UI.

export type PlanKey = "founder" | "team" | "enterprise";

export type Plan = {
  key: PlanKey;
  name: string;
  /** Monthly price in whole dollars (display only). */
  price: number;
  /** Env var holding the Stripe recurring price ID. */
  priceEnv: string;
  /** Enterprise is sales-led — no self-serve Checkout. */
  checkout: boolean;
  /** How many AI models this plan may scan (prefix of PAID_ENGINES order). */
  maxEngines: number;
  /** Max prompt-scans per brand per rolling 24h (legacy hint; budget is the real cap). */
  dailyScans: number;
  /** Monthly API-cost ceiling in USD — the real per-plan COGS guard, enforced in
   *  limits.ts against summed scan est_cost. Founder $29 plan caps at $5 of spend. */
  monthlyBudgetUsd: number;
};

// `maxEngines` + `monthlyBudgetUsd` are the cost ceiling per plan, enforced
// server-side (see lib/billing/limits.ts + cost.ts). Tune as COGS/pricing demand.
export const PLANS: Record<PlanKey, Plan> = {
  founder:    { key: "founder",    name: "Founder",        price: 29,  priceEnv: "STRIPE_PRICE_FOUNDER",    checkout: true,  maxEngines: 3, dailyScans: 25,   monthlyBudgetUsd: 5 },
  team:       { key: "team",       name: "Marketing Team", price: 89,  priceEnv: "STRIPE_PRICE_TEAM",       checkout: true,  maxEngines: 5, dailyScans: 100,  monthlyBudgetUsd: 13 },
  enterprise: { key: "enterprise", name: "Enterprise",     price: 249, priceEnv: "STRIPE_PRICE_ENTERPRISE", checkout: false, maxEngines: 5, dailyScans: 1000, monthlyBudgetUsd: 35 },
};

export function isPlanKey(value: unknown): value is PlanKey {
  return value === "founder" || value === "team" || value === "enterprise";
}

// Resolve a plan's Stripe price ID at request time (server-only — reads env).
export function priceIdFor(plan: PlanKey): string {
  const id = process.env[PLANS[plan].priceEnv];
  if (!id) throw new Error(`${PLANS[plan].priceEnv} is not set`);
  return id;
}

// Reverse lookup: map a Stripe price ID back to a plan key (used by the webhook).
export function planForPriceId(priceId: string | null | undefined): PlanKey | null {
  if (!priceId) return null;
  for (const plan of Object.values(PLANS)) {
    if (process.env[plan.priceEnv] === priceId) return plan.key;
  }
  return null;
}

// Estimated API cost per scan, in USD. This is the COGS model behind the per-plan
// monthly budget (see plans.ts `monthlyBudgetUsd` + limits.ts). Numbers are rough
// 2026 estimates for an answer query (with web search) plus the Perplexity-sonar
// detection ("LLM-as-judge") pass we run per engine result. Tune as real usage
// data lands — they're intentionally in one place.

import type { EngineId } from "../engines";

// Cost of one answer query (web-search-grounded) per engine.
const ANSWER_COST: Record<EngineId, number> = {
  chatgpt: 0.05, // gpt-5.4 (medium reasoning effort, ≤4k output) + web_search
  claude: 0.035, // claude-sonnet-4-5 + web search
  gemini: 0.02, // + google_search grounding
  perplexity: 0.012, // sonar
  grok: 0.02, // estimate (not yet enabled)
};

// Each engine result is run through one Perplexity-sonar detection pass.
const DETECTION_COST = 0.006;

// Estimated USD to scan ONE prompt across the given engines (answer + detection).
export function costForEngines(engineIds: EngineId[]): number {
  return engineIds.reduce((sum, id) => sum + (ANSWER_COST[id] ?? 0.02) + DETECTION_COST, 0);
}

// Round to cents for storage/display.
export function roundUsd(n: number): number {
  return Math.round(n * 100) / 100;
}

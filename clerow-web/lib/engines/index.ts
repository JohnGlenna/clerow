import type { AIEngine, EngineId } from "./types";
import { PerplexityEngine } from "./perplexity";
import { OpenAIEngine } from "./openai";
import { AnthropicEngine } from "./anthropic";
import { GeminiEngine } from "./gemini";

// Locked stub — interface-ready engines that aren't wired yet. They appear in
// the dashboard as "upgrade to unlock" and throw if a scan tries to run them.
function lockedEngine(id: EngineId, label: string): AIEngine {
  return {
    id,
    label,
    enabled: false,
    async query() {
      throw new Error(`${label} engine is not enabled yet (paid tier).`);
    },
  };
}

// Each real engine reports `enabled` from whether its API key is present, so a
// missing key surfaces as a locked model in the UI rather than a runtime crash.
export const ENGINES: Record<EngineId, AIEngine> = {
  perplexity: PerplexityEngine,
  chatgpt: OpenAIEngine,
  claude: AnthropicEngine,
  gemini: GeminiEngine,
  grok: lockedEngine("grok", "Grok"),
};

export function getEngine(id: EngineId): AIEngine {
  const engine = ENGINES[id];
  if (!engine) throw new Error(`Unknown engine: ${id}`);
  return engine;
}

// Display metadata shared by every surface that renders an engine (dashboard
// models card, prompt detail, reports). One source of truth for brand colors.
export const ENGINE_META: Record<EngineId, { swatch: string; letter: string }> = {
  chatgpt: { swatch: "#10A37F", letter: "C" },
  claude: { swatch: "#D97706", letter: "A" },
  perplexity: { swatch: "#1CB0F6", letter: "P" },
  gemini: { swatch: "#4285F4", letter: "G" },
  grok: { swatch: "#111827", letter: "X" },
};

// Engines that run on the free scan (one prompt, one engine).
export const FREE_ENGINES: EngineId[] = ["perplexity"];

// Engines the paid scan runs across, in display order. Filtered to whichever
// currently have a configured API key via `enabledEngines`.
export const PAID_ENGINES: EngineId[] = ["chatgpt", "claude", "perplexity", "gemini"];

// Of the given engine ids, those that are actually runnable right now (key set).
export function enabledEngines(ids: EngineId[]): EngineId[] {
  return ids.filter((id) => ENGINES[id]?.enabled);
}

export type { AIEngine, EngineId } from "./types";

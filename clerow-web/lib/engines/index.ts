import type { AIEngine, EngineId } from "./types";
import { PerplexityEngine } from "./perplexity";

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

export const ENGINES: Record<EngineId, AIEngine> = {
  perplexity: PerplexityEngine,
  chatgpt: lockedEngine("chatgpt", "ChatGPT"),
  claude: lockedEngine("claude", "Claude"),
  gemini: lockedEngine("gemini", "Gemini"),
  grok: lockedEngine("grok", "Grok"),
};

export function getEngine(id: EngineId): AIEngine {
  const engine = ENGINES[id];
  if (!engine) throw new Error(`Unknown engine: ${id}`);
  return engine;
}

// Engines that run on the free scan.
export const FREE_ENGINES: EngineId[] = ["perplexity"];

export type { AIEngine, EngineId } from "./types";

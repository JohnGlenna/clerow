// Pluggable AI-engine adapter interface. The free scan runs one engine
// (Perplexity); the paid scan runs several. Adding an engine = implement this
// interface and register it in ./index.ts — no changes to the scan pipeline.

export type EngineId = "perplexity" | "chatgpt" | "claude" | "gemini" | "grok";

export type EngineAnswer = {
  /** The model's prose recommendation answer. */
  text: string;
  /** Sources the model cited, when available. */
  citations: { url: string; title: string }[];
};

export type QueryOpts = {
  /**
   * Low-latency mode for user-facing interactive scans (the onboarding reveal):
   * engines that support it trade money for speed (e.g. OpenAI's priority
   * service tier at 2× token price). Background/cron scans leave this off.
   */
  priority?: boolean;
};

export interface AIEngine {
  id: EngineId;
  /** Display label shown in the UI (e.g. the Step 2 result table). */
  label: string;
  /** Whether this engine is wired up and allowed to run. */
  enabled: boolean;
  /** Send a buyer prompt and return the recommendation answer + citations. */
  query(prompt: string, signal?: AbortSignal, opts?: QueryOpts): Promise<EngineAnswer>;
}

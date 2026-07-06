// The Prospect Scanner's ONLY model client: OpenAI Chat Completions on
// gpt-5.4-mini with low reasoning effort, raw fetch (no SDK), no web-search
// tool. This is a high-volume internal prospecting tool — every scan must stay
// well under $0.01, so keep it on the mini tier and don't add other providers.
// None of the pipeline's calls (classify a homepage, list brands, write 150
// words) needs more than low effort, and reasoning tokens bill as output.
//
// Reasoning-model notes: temperature is not configurable (API rejects it), and
// max_completion_tokens includes the hidden reasoning tokens — budgets below
// leave headroom for them.

const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.PROSPECT_MODEL || "gpt-5.4-mini";
const REASONING_EFFORT = "low";

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return key;
}

export type ChatOpts = {
  system: string;
  user: string;
  /** When set, sent as response_format json_schema (strict) and the reply is JSON. */
  jsonSchema?: { name: string; schema: object };
  /** max_completion_tokens — includes reasoning tokens, so budget generously. */
  maxTokens?: number;
  signal?: AbortSignal;
};

const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// One raw call. Returns "" when the model produced no visible text — with
// reasoning models that usually means the hidden reasoning consumed the whole
// max_completion_tokens budget (finish_reason "length").
async function callOnce(opts: ChatOpts, maxTokens: number): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: REASONING_EFFORT,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      ...(opts.jsonSchema
        ? {
            response_format: {
              type: "json_schema",
              json_schema: { name: opts.jsonSchema.name, strict: true, schema: opts.jsonSchema.schema },
            },
          }
        : {}),
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`OpenAI API error ${res.status}: ${text.slice(0, 500)}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

export async function chatCompletion(opts: ChatOpts): Promise<string> {
  let maxTokens = opts.maxTokens ?? 2500;
  let lastError: Error = new Error("OpenAI returned an empty answer");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** attempt);
    try {
      const content = await callOnce(opts, maxTokens);
      if (content) return content;
      // Empty answer: most likely the reasoning ate the token budget — retry
      // with double the headroom.
      lastError = new Error("OpenAI returned an empty answer");
      maxTokens *= 2;
    } catch (e) {
      const err = e as Error & { status?: number };
      const retryable =
        err.name === "TypeError" || // network hiccup
        err.status === 429 ||
        (err.status !== undefined && err.status >= 500);
      if (!retryable || opts.signal?.aborted) throw err;
      lastError = err;
    }
  }
  throw lastError;
}

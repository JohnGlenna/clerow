// The Prospect Scanner's ONLY model client: OpenAI Chat Completions on
// gpt-5.4-mini with medium reasoning effort, raw fetch (no SDK), no web-search
// tool. This is a high-volume internal prospecting tool — every scan must stay
// well under $0.01, so keep it on the mini tier and don't add other providers.
//
// Reasoning-model notes: temperature is not configurable (API rejects it), and
// max_completion_tokens includes the hidden reasoning tokens — budgets below
// leave headroom for them.

const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.PROSPECT_MODEL || "gpt-5.4-mini";
const REASONING_EFFORT = "medium";

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

export async function chatCompletion(opts: ChatOpts): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: REASONING_EFFORT,
      max_completion_tokens: opts.maxTokens ?? 2500,
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
    throw new Error(`OpenAI API error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned an empty answer");
  }
  return content.trim();
}

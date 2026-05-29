// Thin wrapper over the Perplexity Chat Completions API.
// Docs: https://docs.perplexity.ai/api-reference/chat-completions
//
// We use chat completions (not the /search endpoint) because Clerow needs the
// AI-generated *recommendation answer* ("the best X are A, B, C…") plus its
// citations — that prose is what we scan for brand/competitor mentions.

const API_URL = "https://api.perplexity.ai/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type PerplexityResult = {
  content: string;
  citations: { url: string; title: string }[];
};

export type PerplexityOptions = {
  model?: string;
  messages: ChatMessage[];
  /** When set, asks Perplexity to return JSON matching this JSON Schema. */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  signal?: AbortSignal;
};

function apiKey(): string {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error("PERPLEXITY_API_KEY is not set");
  return key;
}

// Perplexity returns citations as either `search_results: [{title,url}]`
// (newer) or `citations: ["https://…"]` (older). Normalize both.
function extractCitations(data: any): { url: string; title: string }[] {
  if (Array.isArray(data?.search_results)) {
    return data.search_results
      .filter((r: any) => r?.url)
      .map((r: any) => ({ url: String(r.url), title: String(r.title ?? r.url) }));
  }
  if (Array.isArray(data?.citations)) {
    return data.citations
      .filter(Boolean)
      .map((u: any) => ({ url: String(u), title: String(u) }));
  }
  return [];
}

export async function perplexityChat(opts: PerplexityOptions): Promise<PerplexityResult> {
  const body: Record<string, unknown> = {
    model: opts.model ?? "sonar",
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
  };
  if (opts.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { schema: opts.jsonSchema },
    };
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Perplexity API error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  return { content, citations: extractCitations(data) };
}

// Parse a JSON object/array from a model response, tolerating code fences or
// surrounding prose (Perplexity occasionally ignores response_format).
export function parseJsonLoose<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Strip ```json fences if present.
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        return JSON.parse(fence[1].trim()) as T;
      } catch {
        /* fall through */
      }
    }
    // Grab the first {...} or [...] block.
    const obj = trimmed.match(/[[{][\s\S]*[\]}]/);
    if (obj) return JSON.parse(obj[0]) as T;
    throw new Error("Could not parse JSON from model response");
  }
}

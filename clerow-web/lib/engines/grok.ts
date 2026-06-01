import type { AIEngine, EngineAnswer } from "./types";

// Grok via xAI's Agent Tools API (OpenAI-compatible Responses shape) with the
// built-in web_search tool, so the answer reflects what Grok recommends with live
// search — not a stale training-data guess. Model is env-overridable (XAI_MODEL).
// (xAI retired the legacy /v1/chat/completions Live Search `search_parameters`,
// which now 410s; grok-4.3 is valid here on /v1/responses.)
// Docs: https://docs.x.ai/docs/guides/tools/overview

const API_URL = "https://api.x.ai/v1/responses";
const MODEL = process.env.XAI_MODEL || "grok-4.3";

const SYSTEM =
  "You are a helpful assistant answering a real person's question. " +
  "Recommend specific products, tools, or brands by name, as you normally would. " +
  "Be concrete and name the leading options.";

type Citation = { url: string; title: string };

function apiKey(): string {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY is not set");
  return key;
}

// The Responses API returns an `output` array; assistant prose lives in
// `output_text` content parts, each carrying `url_citation` annotations.
function extractText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part?.type === "output_text" && typeof part.text === "string") parts.push(part.text);
    }
  }
  return parts.join("\n").trim();
}

function extractCitations(data: any): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const item of data?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const part of item.content ?? []) {
      for (const ann of part?.annotations ?? []) {
        if (ann?.type === "url_citation" && ann.url && !seen.has(ann.url)) {
          seen.add(ann.url);
          out.push({ url: String(ann.url), title: String(ann.title ?? ann.url) });
        }
      }
    }
  }
  return out;
}

export const GrokEngine: AIEngine = {
  id: "grok",
  label: "Grok",
  get enabled() {
    return !!process.env.XAI_API_KEY;
  },

  async query(prompt: string, signal?: AbortSignal): Promise<EngineAnswer> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: SYSTEM,
        input: prompt,
        tools: [{ type: "web_search" }],
      }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`xAI API error ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = await res.json();
    return { text: extractText(data), citations: extractCitations(data) };
  },
};

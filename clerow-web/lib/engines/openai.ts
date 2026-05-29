import type { AIEngine, EngineAnswer } from "./types";

// ChatGPT via the OpenAI Responses API with the built-in web_search tool, so the
// answer reflects what ChatGPT actually recommends with browsing on — not a
// stale training-data guess. Model is env-overridable (OPENAI_MODEL).
// Docs: https://platform.openai.com/docs/guides/tools-web-search

const API_URL = "https://api.openai.com/v1/responses";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

const SYSTEM =
  "You are a helpful assistant answering a real person's question. " +
  "Recommend specific products, tools, or brands by name, as you normally would. " +
  "Be concrete and name the leading options.";

type Citation = { url: string; title: string };

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
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

export const OpenAIEngine: AIEngine = {
  id: "chatgpt",
  label: "ChatGPT",
  get enabled() {
    return !!process.env.OPENAI_API_KEY;
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
        tools: [{ type: "web_search_preview" }],
        // Force a browse so the answer reflects ChatGPT-with-search (what a real
        // user sees), not a stale training-data guess.
        tool_choice: { type: "web_search_preview" },
      }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI API error ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = await res.json();
    return { text: extractText(data), citations: extractCitations(data) };
  },
};

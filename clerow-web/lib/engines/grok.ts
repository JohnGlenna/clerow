import type { AIEngine, EngineAnswer } from "./types";

// Grok via the xAI API (OpenAI-compatible chat completions). Model is
// env-overridable (XAI_MODEL); default is a current grok-4.20 id (xAI retired the
// older dated ids and the legacy Live Search `search_parameters`, which now 410s
// and requires the Agent Tools API — a future upgrade if we want live web
// grounding for Grok). For now Grok answers from its own knowledge.
// Docs: https://docs.x.ai/docs/guides/tools/overview

const API_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = process.env.XAI_MODEL || "grok-4.20-0309-non-reasoning";

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

// xAI returns OpenAI-shaped choices; Live Search adds a top-level `citations`
// array of URL strings.
function extractCitations(data: any): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const c of data?.citations ?? []) {
    const url = typeof c === "string" ? c : c?.url;
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push({ url: String(url), title: String((typeof c === "object" && c?.title) || url) });
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
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`xAI API error ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = await res.json();
    const text: string = (data?.choices?.[0]?.message?.content ?? "").trim();
    return { text, citations: extractCitations(data) };
  },
};

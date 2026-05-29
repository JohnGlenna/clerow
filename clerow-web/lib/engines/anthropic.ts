import type { AIEngine, EngineAnswer } from "./types";

// Claude via the Anthropic Messages API with the server-side web_search tool, so
// the answer matches what Claude recommends with browsing enabled. Model is
// env-overridable (ANTHROPIC_MODEL).
// Docs: https://docs.anthropic.com/en/docs/build-with-claude/tool-use/web-search-tool

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

const SYSTEM =
  "You are a helpful assistant answering a real person's question. " +
  "Recommend specific products, tools, or brands by name, as you normally would. " +
  "Be concrete and name the leading options.";

type Citation = { url: string; title: string };

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return key;
}

// Claude streams the answer as `text` blocks (with inline `citations`) plus
// `web_search_tool_result` blocks listing the pages it read. Pull URLs from both.
function parse(data: any): EngineAnswer {
  const texts: string[] = [];
  const citations: Citation[] = [];
  const seen = new Set<string>();
  const addCite = (url?: unknown, title?: unknown) => {
    const u = typeof url === "string" ? url : "";
    if (u && !seen.has(u)) {
      seen.add(u);
      citations.push({ url: u, title: String(title ?? u) });
    }
  };

  for (const block of data?.content ?? []) {
    if (block?.type === "text") {
      if (typeof block.text === "string") texts.push(block.text);
      for (const c of block.citations ?? []) addCite(c?.url, c?.title);
    } else if (block?.type === "web_search_tool_result") {
      for (const r of block.content ?? []) addCite(r?.url, r?.title);
    }
  }

  return { text: texts.join("").trim(), citations };
}

export const AnthropicEngine: AIEngine = {
  id: "claude",
  label: "Claude",
  get enabled() {
    return !!process.env.ANTHROPIC_API_KEY;
  },

  async query(prompt: string, signal?: AbortSignal): Promise<EngineAnswer> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey(),
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 500)}`);
    }

    return parse(await res.json());
  },
};

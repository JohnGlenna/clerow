import type { AIEngine, EngineAnswer, QueryOpts } from "./types";

// ChatGPT via the OpenAI Responses API with the built-in web_search tool, so the
// answer reflects what ChatGPT actually recommends with browsing on — not a
// stale training-data guess. Model is env-overridable (OPENAI_MODEL).
// Docs: https://platform.openai.com/docs/guides/tools-web-search

const API_URL = "https://api.openai.com/v1/responses";
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4";

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

  async query(prompt: string, signal?: AbortSignal, opts?: QueryOpts): Promise<EngineAnswer> {
    const call = async (maxOutputTokens: number, tuned: boolean) => {
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
          // Low search_context_size: less retrieved text to reason over per
          // search — a large latency lever at no ranking cost for "name the
          // leading options" queries. (Dropped with the other knobs on the
          // bare retry if the API rejects it.)
          tools: [tuned ? { type: "web_search", search_context_size: "low" } : { type: "web_search" }],
          // Force a browse so the answer reflects ChatGPT-with-search (what a real
          // user sees), not a stale training-data guess.
          tool_choice: { type: "web_search" },
          // Medium = the API default and the closest match to the consumer app's
          // answer depth. "low" produced generic top-3 picks that diverged from
          // what ChatGPT actually recommends, which breaks the product's core
          // promise — visibility standings users can verify themselves.
          reasoning: { effort: "medium" },
          // Cost ceiling only (reasoning bills as output at $15/M). Must leave
          // room for reasoning + full prose: at 1200 the visible answer was
          // truncated after ~80 tokens and the ranking was built from a cut-off
          // top-3 list.
          max_output_tokens: maxOutputTokens,
          ...(tuned && {
            // Same recommendations, less essay padding — fewer output tokens to
            // generate, so answers land faster (and cheaper) on every scan.
            text: { verbosity: "low" },
            // Bound the browsing session: unbounded medium-effort browsing ran
            // ~100s per query (multi-site pricing digs). 3 quick searches over a
            // small context matches the consumer app's 2–4 search behavior.
            max_tool_calls: 3,
            // Interactive scans (onboarding reveal) pay 2× token price for the
            // fast lane; background/cron scans stay on the default tier.
            ...(opts?.priority && { service_tier: "priority" }),
          }),
        }),
        signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`OpenAI API error ${res.status}: ${text.slice(0, 500)}`);
      }
      return res.json();
    };

    // If the API ever rejects the latency knobs (400), a scan must not fail
    // over a tuning flag — retry bare.
    let data = await call(4000, true).catch((err) => {
      if (err instanceof Error && err.message.includes("OpenAI API error 400")) return call(4000, false);
      throw err;
    });
    // Never build a ranking from a silently cut-off answer: one retry with more
    // room, then take whatever we have (partial beats failing the scan).
    if (data?.status === "incomplete" && data?.incomplete_details?.reason === "max_output_tokens") {
      data = await call(8000, true).catch(() => data);
    }
    return { text: extractText(data), citations: extractCitations(data) };
  },
};

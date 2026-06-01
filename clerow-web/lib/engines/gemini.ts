import type { AIEngine, EngineAnswer } from "./types";

// Gemini via the Google Generative Language API with Google Search grounding, so
// the answer reflects what Gemini recommends against the live web. Model is
// env-overridable (GEMINI_MODEL); accepts GEMINI_API_KEY or GOOGLE_API_KEY.
// Docs: https://ai.google.dev/gemini-api/docs/grounding

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM =
  "You are a helpful assistant answering a real person's question. " +
  "Recommend specific products, tools, or brands by name, as you normally would. " +
  "Be concrete and name the leading options.";

type Citation = { url: string; title: string };

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set");
  return key;
}

// Answer text is in candidate.content.parts[].text; grounded sources are in
// candidate.groundingMetadata.groundingChunks[].web.{uri,title}.
function parse(data: any): EngineAnswer {
  const cand = data?.candidates?.[0];
  const text = (cand?.content?.parts ?? [])
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();

  const citations: Citation[] = [];
  const seen = new Set<string>();
  for (const chunk of cand?.groundingMetadata?.groundingChunks ?? []) {
    const web = chunk?.web;
    if (web?.uri && !seen.has(web.uri)) {
      seen.add(web.uri);
      citations.push({ url: String(web.uri), title: String(web.title ?? web.uri) });
    }
  }

  return { text, citations };
}

export const GeminiEngine: AIEngine = {
  id: "gemini",
  label: "Gemini",
  get enabled() {
    return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  },

  async query(prompt: string, signal?: AbortSignal): Promise<EngineAnswer> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 500)}`);
    }

    return parse(await res.json());
  },
};

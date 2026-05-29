import { perplexityChat } from "../perplexity/client";
import type { AIEngine, EngineAnswer } from "./types";

// Perplexity Sonar — search-grounded, returns citations. This is the free-scan
// engine. We pose the prompt the way a real buyer would, then detect mentions
// in the answer downstream.
export const PerplexityEngine: AIEngine = {
  id: "perplexity",
  label: "Perplexity",
  enabled: true,

  async query(prompt: string, signal?: AbortSignal): Promise<EngineAnswer> {
    const { content, citations } = await perplexityChat({
      model: "sonar",
      temperature: 0.2,
      signal,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant answering a real person's question. " +
            "Recommend specific products, tools, or brands by name, as you normally would. " +
            "Be concrete and name the leading options.",
        },
        { role: "user", content: prompt },
      ],
    });
    return { text: content, citations };
  },
};

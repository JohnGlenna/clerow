import { perplexityChat, parseJsonLoose } from "../perplexity/client";
import type { BrandProfile, DiscoveredPrompt } from "../types";
import type { PromptIntent, PromptVolume } from "../supabase/database.types";
import { discoverViaGrok } from "./discoverGrok";

// "We don't ask random prompts. We discover yours." — generate the buyer
// prompts a real customer in this brand's category would ask an AI, tagged by
// intent + estimated volume, and flag the single most relevant one (used for
// the free scan).

const INTENTS: PromptIntent[] = ["solution", "compare", "problem", "branded"];
const VOLUMES: PromptVolume[] = ["high", "medium", "low", "rising"];

const SCHEMA = {
  type: "object",
  properties: {
    prompts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          intent: { type: "string", enum: INTENTS },
          volume: { type: "string", enum: VOLUMES },
          primary: { type: "boolean" },
        },
        required: ["text", "intent", "volume"],
      },
    },
  },
  required: ["prompts"],
};

type RawPrompt = { text: string; intent: string; volume: string; primary?: boolean };

function profileBlock(b: BrandProfile): string {
  return [
    `Company: ${b.company}`,
    `Website: ${b.url}`,
    `Industry / category: ${b.industry}`,
    `What they do: ${b.description}`,
    b.audience.length ? `Customers: ${b.audience.join(", ")}` : "",
    b.competitors.length ? `Known competitors: ${b.competitors.join(", ")}` : "",
    b.differentiators.length ? `Differentiators: ${b.differentiators.join(", ")}` : "",
    b.geos.length ? `Target geographies: ${b.geos.join(", ")}` : "",
    b.enrichNotes ? `Extra context: ${b.enrichNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function coerceIntent(v: string): PromptIntent {
  return (INTENTS as string[]).includes(v) ? (v as PromptIntent) : "solution";
}
function coerceVolume(v: string): PromptVolume {
  return (VOLUMES as string[]).includes(v) ? (v as PromptVolume) : "medium";
}

// Discover the brand's buyer prompts. Prefer Grok's live web search (the most
// faithful "what do buyers actually ask" signal); fall back to the Perplexity
// generator if xAI isn't configured or the call fails.
export async function discoverPrompts(brand: BrandProfile): Promise<DiscoveredPrompt[]> {
  if (process.env.XAI_API_KEY) {
    try {
      return await discoverViaGrok(brand);
    } catch {
      // fall through to Perplexity
    }
  }
  return discoverViaPerplexity(brand);
}

async function discoverViaPerplexity(brand: BrandProfile): Promise<DiscoveredPrompt[]> {
  const { content } = await perplexityChat({
    model: "sonar",
    temperature: 0.3,
    jsonSchema: SCHEMA,
    messages: [
      {
        role: "system",
        content:
          "You are an AEO (Answer Engine Optimization) strategist. Given a company profile, " +
          "produce the real questions that this company's potential customers would type into an " +
          "AI assistant (ChatGPT, Perplexity, etc.) when researching what to buy — the kind of " +
          "questions where this company SHOULD show up as a recommendation. " +
          "Cover a mix of intents: 'solution' (e.g. \"best X for Y\"), 'compare' (e.g. \"A vs B\", " +
          "\"alternatives to X\"), 'problem' (e.g. \"how do I ...\"), and 'branded' (e.g. \"X review\"). " +
          "Do NOT include the company's own name except in 'branded' prompts. " +
          "Estimate each prompt's search volume (high/medium/low/rising). " +
          "Mark exactly ONE prompt as primary: the single highest-value, high-volume 'solution' or " +
          "'compare' query most likely to surface competitors. Return 20–30 prompts.",
      },
      { role: "user", content: profileBlock(brand) },
    ],
  });

  let raw: RawPrompt[];
  try {
    raw = parseJsonLoose<{ prompts: RawPrompt[] }>(content).prompts;
  } catch {
    raw = [];
  }

  const prompts: DiscoveredPrompt[] = raw
    .filter((p) => p && typeof p.text === "string" && p.text.trim())
    .map((p) => ({
      text: p.text.trim(),
      intent: coerceIntent(p.intent),
      volume: coerceVolume(p.volume),
      isPrimary: Boolean(p.primary),
    }));

  // Fallback if the model returned nothing usable.
  if (prompts.length === 0) {
    const cat = brand.industry || brand.description || "this category";
    prompts.push(
      { text: `best ${cat}`, intent: "solution", volume: "high", isPrimary: true },
      {
        text: brand.competitors[0] ? `alternatives to ${brand.competitors[0]}` : `top ${cat} tools`,
        intent: "compare",
        volume: "high",
        isPrimary: false,
      },
    );
  }

  // Guarantee exactly one primary: prefer a model-flagged one, else the first
  // high-volume solution/compare prompt, else the first prompt.
  if (!prompts.some((p) => p.isPrimary)) {
    const pick =
      prompts.find((p) => p.volume === "high" && (p.intent === "solution" || p.intent === "compare")) ??
      prompts.find((p) => p.intent === "solution") ??
      prompts[0];
    pick.isPrimary = true;
  } else {
    // Keep only the first primary flag.
    let seen = false;
    for (const p of prompts) {
      if (p.isPrimary && !seen) seen = true;
      else p.isPrimary = false;
    }
  }

  return prompts;
}

import { perplexityChat, parseJsonLoose } from "../perplexity/client";

// Single-step onboarding only asks for a URL. To run a useful scan we still need
// a brand name (so detection can find "you") and a category + competitors (so
// prompt discovery is on-target). Perplexity is search-grounded, so we let it
// look the site up and infer the profile. Falls back to domain-derived values
// if the lookup returns nothing usable.

export type UrlEnrichment = {
  company: string;
  industry: string;
  description: string;
  competitors: string[];
};

const SCHEMA = {
  type: "object",
  properties: {
    company: { type: "string" },
    industry: { type: "string" },
    description: { type: "string" },
    competitors: { type: "array", items: { type: "string" } },
  },
  required: ["company"],
};

function hostname(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .trim();
}

// "acme.com" → "Acme" — a reasonable company name when lookup fails.
function companyFromHost(host: string): string {
  const label = host.split(".")[0] || host;
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : host;
}

export async function enrichFromUrl(url: string, signal?: AbortSignal): Promise<UrlEnrichment> {
  const host = hostname(url);
  const fallback: UrlEnrichment = {
    company: companyFromHost(host),
    industry: "",
    description: "",
    competitors: [],
  };

  try {
    const { content } = await perplexityChat({
      model: "sonar",
      temperature: 0,
      jsonSchema: SCHEMA,
      signal,
      messages: [
        {
          role: "system",
          content:
            "You research a company from its website. Given a URL, identify: the company/product " +
            "name (as it brands itself), its industry/category, a one-line description of what it " +
            "does, and 3–6 direct competitors. Use what you can find about the site. If you truly " +
            "cannot find it, infer conservatively from the domain name. Return only the JSON object.",
        },
        { role: "user", content: `Website: ${url}\nDomain: ${host}` },
      ],
    });

    const parsed = parseJsonLoose<Partial<UrlEnrichment>>(content);
    return {
      company: String(parsed.company ?? "").trim() || fallback.company,
      industry: String(parsed.industry ?? "").trim(),
      description: String(parsed.description ?? "").trim(),
      competitors: Array.isArray(parsed.competitors)
        ? parsed.competitors.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 6)
        : [],
    };
  } catch {
    return fallback;
  }
}

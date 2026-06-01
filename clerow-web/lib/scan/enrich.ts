import { perplexityChat, parseJsonLoose } from "../perplexity/client";

// Single-step onboarding only asks for a URL. To run a useful scan we still need
// a brand name (so detection can find "you") and a category + competitors (so
// prompt discovery is on-target). We GROUND this on the brand's own homepage —
// the company name is taken from what the site calls itself (og:site_name / JSON-LD
// Organization / the domain), NEVER guessed or "corrected" by the model (which used
// to turn "vlvet.co" into "Velvet.Co"). The model only fills industry/description/
// competitors, from the real page content.

export type UrlEnrichment = {
  company: string;
  industry: string;
  description: string;
  competitors: string[];
};

// The model fills these only — company is derived deterministically from the site.
const SCHEMA = {
  type: "object",
  properties: {
    industry: { type: "string" },
    description: { type: "string" },
    competitors: { type: "array", items: { type: "string" } },
  },
  required: [],
};

const SYSTEM =
  "You analyze a company strictly from its OWN website content (provided below) and the exact company " +
  "name you are given. Identify: its industry/category, a one-line factual description of what it does " +
  "and who it's for, and 3–6 real, direct competitors. Rules: base everything ONLY on the provided page " +
  "content; do NOT use or alter the company name in your output; do NOT invent facts or competitors the " +
  "page doesn't support. Return only the JSON object {industry, description, competitors}.";

const TIMEOUT_MS = 8000;
const UA = "Mozilla/5.0 (compatible; ClerowAudit/1.0; +https://clerow.com/bot)";

function hostname(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").trim();
}

// "vlvet.co" → "Vlvet" — faithful to the domain (just title-cased), never re-spelled.
function companyFromHost(host: string): string {
  const label = host.split(".")[0] || host;
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : host;
}

async function fetchHomepage(url: string, signal?: AbortSignal): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const u = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const res = await fetch(u, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": UA, accept: "text/html" } });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

function firstMatch(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

// Pull the brand's own name + page signals from the homepage HTML.
function extractIdentity(html: string): { name: string; title: string; metaDescription: string; h1: string; text: string } {
  const ogSite = firstMatch(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, " ").trim();
  const metaDescription =
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    firstMatch(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);

  // JSON-LD Organization name (only within a block that mentions Organization).
  let ldName = "";
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const block = m[1];
    if (/"@type"\s*:\s*"[^"]*Organization[^"]*"/i.test(block)) {
      ldName = firstMatch(block, /"name"\s*:\s*"([^"]+)"/);
      if (ldName) break;
    }
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2500);

  // Faithful name: the site's own (og:site_name / Organization), else domain-derived.
  const name = ogSite || ldName || "";
  return { name, title, metaDescription, h1, text };
}

export async function enrichFromUrl(url: string, signal?: AbortSignal): Promise<UrlEnrichment> {
  const host = hostname(url);
  const html = await fetchHomepage(url, signal);
  const id = html ? extractIdentity(html) : { name: "", title: "", metaDescription: "", h1: "", text: "" };
  // Company is deterministic & faithful — never the model's guess.
  const company = id.name || companyFromHost(host);

  const empty: UrlEnrichment = { company, industry: "", description: "", competitors: [] };
  // No page content to ground on (blocked/JS-only site) → keep the faithful name,
  // skip the model guess (the screenshot-upload path can enrich later).
  if (!id.text && !id.title) return empty;

  try {
    const { content } = await perplexityChat({
      model: "sonar",
      temperature: 0,
      jsonSchema: SCHEMA,
      signal,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            `COMPANY NAME (exact, do not change): ${company}`,
            `WEBSITE: ${url}`,
            id.title ? `PAGE TITLE: ${id.title}` : "",
            id.metaDescription ? `META DESCRIPTION: ${id.metaDescription}` : "",
            id.h1 ? `MAIN HEADING: ${id.h1}` : "",
            id.text ? `\nHOMEPAGE TEXT:\n${id.text}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const parsed = parseJsonLoose<Partial<UrlEnrichment>>(content);
    return {
      company,
      industry: String(parsed.industry ?? "").trim(),
      description: String(parsed.description ?? "").trim(),
      competitors: Array.isArray(parsed.competitors)
        ? parsed.competitors.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 6)
        : [],
    };
  } catch {
    return empty;
  }
}

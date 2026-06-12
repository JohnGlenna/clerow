// Generic startup-hub directory scraper: fetch a coworking space / accelerator
// portfolio page, collect the external links, and let the mini model match
// them to the member companies named in the page text. One scraper covers
// every Nordic hub — extend the page list via PROSPECT_DIRECTORY_URLS instead
// of writing per-hub code.

import { fetchText } from "@/lib/audit/site";
import { chatCompletion } from "@/lib/prospect/openai";

import type { CandidateLead } from "./types";

// Member/portfolio pages verified to render company links server-side —
// JS-only directories (startuplab.no, sting.co, mesh.as, …) can't be scraped
// this way; only add pages where the links exist in the static HTML.
const DEFAULT_DIRECTORY_URLS = [
  "https://alliance.vc/portfolio",
  "https://www.investinor.no/portefolje",
  "https://www.antler.co/portfolio",
  "https://skyfall.vc",
  "https://nordicmakers.vc",
];

/** The configured directory pages: defaults + PROSPECT_DIRECTORY_URLS (comma/whitespace-separated). */
export function directoryUrls(): string[] {
  const extra = (process.env.PROSPECT_DIRECTORY_URLS ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
  return [...new Set([...DEFAULT_DIRECTORY_URLS, ...extra])];
}

// Hosts that are never a member company's own site: socials, tools, and the
// asset/CDN hosts that site builders sprinkle through static HTML.
const NON_COMPANY_HOST =
  /linkedin|facebook|instagram|twitter|x\.com|youtube|tiktok|github|medium|crunchbase|notion|typeform|mailchimp|hubspot|google|apple|spotify|vimeo|webflow|squarespace|wix|eventbrite|meetup|slack|calendly|framer|gstatic|fonts\.|cdn|cloudfront|unsplash|prismic|sanity|contentful|hsforms|cookiebot|vercel|netlify|amazonaws|jsdelivr|polyfill|intellimize|airtable|gmpg\.org|outlook|office\.com|meshcommunity/i;

const MAX_LINKS = 150;
const MAX_TEXT_CHARS = 8000;

/** Unique external origins linked from the page, minus social/tool hosts and the page's own. */
export function extractExternalLinks(html: string, pageUrl: string): string[] {
  let ownHost = "";
  try {
    ownHost = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    return [];
  }
  const out = new Set<string>();
  for (const m of html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)) {
    try {
      const u = new URL(m[1]);
      const host = u.hostname.replace(/^www\./, "");
      // Drop the page's own domain including subdomains (app.hub.tld etc.).
      if (host === ownHost || host.endsWith(`.${ownHost}`)) continue;
      if (!host.includes(".") || NON_COMPANY_HOST.test(host)) continue;
      out.add(`${u.protocol}//${u.hostname}`);
      if (out.size >= MAX_LINKS) break;
    } catch {
      // not a parseable URL — skip
    }
  }
  return [...out];
}

// Light visible-text extraction — enough for the model to match names to links.
function pageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

const EXTRACT_SCHEMA = {
  name: "directory_companies",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["companies"],
    properties: {
      companies: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "website"],
          properties: {
            name: { type: "string" },
            website: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const EXTRACT_SYSTEM =
  "You extract member/portfolio companies from a startup hub, coworking space, or accelerator " +
  "web page. You get the page's visible text and the list of external websites it links to. " +
  "Return every company that is listed on the page as a member, resident, alumni, or portfolio " +
  "company AND whose own website appears in the link list — use that exact URL. Skip the hub " +
  "itself, sponsors, partners, investors, news sites, event pages, and software tools. " +
  "Use each company's display name from the page; if a linked company isn't named in the text, " +
  "derive the name from its domain. Never invent websites that are not in the link list.";

/** Scrape one directory page → candidate leads. Throws on fetch failure so callers can report it. */
export async function fetchDirectory(
  url: string,
  signal?: AbortSignal,
): Promise<{ candidates: CandidateLead[] }> {
  const fetched = await fetchText(url);
  if (!fetched || !fetched.ok) {
    throw new Error(`directory fetch failed (${fetched ? `HTTP ${fetched.status}` : "network"})`);
  }

  const links = extractExternalLinks(fetched.text, url);
  if (!links.length) return { candidates: [] };

  const reply = await chatCompletion({
    system: EXTRACT_SYSTEM,
    user:
      `Directory page: ${url}\n\n` +
      `External links found on the page:\n${links.join("\n")}\n\n` +
      `Visible page text:\n${pageText(fetched.text)}`,
    jsonSchema: EXTRACT_SCHEMA,
    maxTokens: 4000,
    signal,
  });

  let parsed: { companies?: { name?: unknown; website?: unknown }[] };
  try {
    parsed = JSON.parse(reply);
  } catch {
    throw new Error("directory extraction returned invalid JSON");
  }

  const allowed = new Set(links.map((l) => l.toLowerCase()));
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // validated upstream
  }

  const candidates: CandidateLead[] = [];
  for (const c of parsed.companies ?? []) {
    const name = typeof c.name === "string" ? c.name.trim().slice(0, 80) : "";
    const website = typeof c.website === "string" ? c.website.trim() : "";
    let origin = "";
    try {
      origin = new URL(website).origin.toLowerCase();
    } catch {
      continue;
    }
    // The model must pick from the real link list — drop anything it made up.
    if (!name || !allowed.has(origin)) continue;
    candidates.push({
      name,
      website,
      email: null,
      phone: null,
      meta: { directoryUrl: url, directoryHost: host },
    });
  }
  return { candidates };
}

// Quality gate for the autopilot pipeline: decide whether a discovered lead is
// worth a (paid) scan BEFORE spending the 8 model calls. Catches the three
// failure modes that plague the raw registry data — dead/unreachable sites,
// parked or empty placeholders, and "wrong website" rows (a Facebook page or a
// site that clearly belongs to someone else).
//
// A rejection is PERMANENT (lead → status 'rejected' with the reason); a
// transient failure (OpenAI hiccup) throws instead, so the lead stays 'new'
// and is retried on the next run.

import { fetchText, toCrawledPage } from "@/lib/audit/site";

import { normalizeWebsite } from "./aggregate";
import { chatCompletion } from "./openai";
import type { Lang } from "./types";

export type QualifyInput = {
  /** Company name as discovered (registry org name, PH product name…). */
  name: string;
  website: string;
  /** Source hint for the category (brreg niche, PH tagline) — fallback only. */
  nicheHint?: string | null;
};

export type QualifyResult =
  | { ok: true; category: string; language: Lang; contactEmail: string | null }
  | { ok: false; reason: string };

// Hosts that are never the prospect's own site — social profiles, directories,
// app stores. Outreach about "your website's AI visibility" makes no sense here.
const BLOCKED_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "youtube.com",
  "google.com",
  "apps.apple.com",
  "play.google.com",
  "github.com",
  "gulesider.no",
  "proff.no",
  "1881.no",
  "finn.no",
  "mittanbud.no",
];

function isBlockedHost(key: string): boolean {
  return BLOCKED_HOSTS.some((b) => key === b || key.endsWith(`.${b}`));
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Junk that matches the email regex in raw HTML: asset filenames, tracking
// SDK hosts, placeholder addresses, no-reply senders.
const SKIP_EMAIL = /no-?reply|example\.|sentry|wixpress|w3\.org|schema\.org|\.(png|jpe?g|svg|webp|gif|css|js)$/i;

/** Best contact email found in the raw homepage HTML (mailto: included). */
export function pickContactEmail(html: string, websiteKey: string): string | null {
  const found = [...new Set((html.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase()))].filter(
    (e) => !SKIP_EMAIL.test(e),
  );
  if (!found.length) return null;
  const bare = websiteKey.replace(/^www\./, "");
  return found.find((e) => e.split("@")[1] === bare || e.split("@")[1]?.endsWith(`.${bare}`)) ?? found[0];
}

const JUDGE_SCHEMA = {
  name: "lead_qualify",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["verdict", "reason", "category", "language"],
    properties: {
      verdict: { type: "string", enum: ["ok", "parked", "mismatch", "thin"] },
      reason: { type: "string" },
      category: { type: "string" },
      language: { type: "string", enum: ["no", "en"] },
    },
  },
} as const;

const JUDGE_SYSTEM =
  "You vet companies for cold outreach about their website's visibility in AI assistants. " +
  "You get a company name and the REAL content of the homepage on their registered website. Judge ONLY from that content. " +
  "VERDICT: 'ok' = a real business site that plausibly belongs to this company (brand names rarely match registry org names exactly — a different trading name on a coherent business site is still 'ok'). " +
  "'parked' = placeholder, under construction, domain-for-sale, default hosting page. " +
  "'mismatch' = the site clearly belongs to a DIFFERENT business than the named company. " +
  "'thin' = no real content about what the business offers (bare contact page, empty shell). " +
  "REASON: one short sentence. " +
  "CATEGORY: what a buyer would type when searching for this kind of business, in the site's own language — short, specific, include the city only for local services (e.g. 'regnskapsfører i Kristiansand', 'project management software'). Empty string if not 'ok'. " +
  "LANGUAGE: 'no' if the site is mainly Norwegian, else 'en'.";

/** Gate one lead. Rejections are permanent; transient model errors throw. */
export async function qualifyLead(input: QualifyInput): Promise<QualifyResult> {
  const key = normalizeWebsite(input.website);
  if (!key || !key.includes(".")) return { ok: false, reason: "invalid website" };
  if (isBlockedHost(key)) {
    return { ok: false, reason: `${key} is a social/directory link, not their own site` };
  }

  const href = /^https?:\/\//i.test(input.website.trim())
    ? input.website.trim()
    : `https://${input.website.trim()}`;
  const fetched = await fetchText(href);
  const page = toCrawledPage(href, fetched);
  if (!page) {
    return { ok: false, reason: `site unreachable or empty (HTTP ${fetched?.status ?? "error"})` };
  }
  if (!page.title && !page.description && page.text.length < 80) {
    return { ok: false, reason: "no readable content (JS-only shell or empty page)" };
  }

  const contactEmail = pickContactEmail(fetched!.text, key);

  const user = [
    `Company name: ${input.name}`,
    `Registry/source hint: ${input.nicheHint || "(none)"}`,
    `Homepage URL: ${page.url}`,
    `Page title: ${page.title ?? "(none)"}`,
    `Meta description: ${page.description ?? "(none)"}`,
    `Visible page text (truncated):\n${page.text}`,
  ].join("\n\n");

  const reply = await chatCompletion({ system: JUDGE_SYSTEM, user, jsonSchema: JUDGE_SCHEMA });
  const parsed = JSON.parse(reply) as {
    verdict: "ok" | "parked" | "mismatch" | "thin";
    reason: string;
    category: string;
    language: Lang;
  };

  if (parsed.verdict !== "ok") {
    return { ok: false, reason: `${parsed.verdict}: ${parsed.reason}`.slice(0, 300) };
  }
  const category = parsed.category.trim() || input.nicheHint?.trim() || "";
  if (!category) return { ok: false, reason: "could not determine a buyer category" };

  return { ok: true, category, language: parsed.language === "en" ? "en" : "no", contactEmail };
}

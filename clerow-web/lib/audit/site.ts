// Lightweight site audit — the ONLY place Clerow looks at the user's own site
// (the scan pipeline only queries AI engines). Fetches the homepage HTML plus
// /robots.txt, /llms.txt and /sitemap.xml and derives a handful of concrete,
// fixable on-page/technical signals that power Level 1–2 of "The Climb".
//
// Deliberately dependency-free: a few server-side fetches + tolerant regex over
// raw HTML (AI crawlers read raw HTML too, so this matches what they see). Every
// check degrades to status "unknown" on a timeout/4xx so the dashboard never
// breaks on a slow or hostile site. Grounded in the installed technical-seo-
// checker / on-page-seo-auditor / schema-markup-generator skill knowledge.

import { impactXp, type GeoStep } from "../geoSteps";

export type CheckStatus = "pass" | "fail" | "warn" | "unknown";

// The fix a failing/warning check becomes — shaped so the ladder can turn it
// straight into a task (same fields as a GeoStep).
export type SiteCheckFix = {
  title: string;
  detail: string;
  minutes: number;
  impact: GeoStep["impact"];
  xp: number;
};

export type SiteCheck = {
  id: string; // stable id, e.g. "robots-ai", "h1", "meta-description"
  label: string;
  status: CheckStatus;
  detail: string; // what we found, plain language
  fix: SiteCheckFix | null; // present when status is fail/warn
};

export type SiteAudit = {
  url: string;
  fetchedAt: string; // ISO
  ok: boolean; // did the homepage fetch succeed
  checks: SiteCheck[];
};

const TIMEOUT_MS = 8000;
const UA =
  "Mozilla/5.0 (compatible; ClerowAudit/1.0; +https://clerow.com/bot) AppleWebKit/537.36";

// The AI answer-engine crawlers we want robots.txt to allow.
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"];

type Fetched = { ok: boolean; status: number; text: string };

async function fetchText(u: string): Promise<Fetched | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(u, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,text/plain,*/*" },
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text };
  } catch {
    return null; // network error / timeout / abort
  } finally {
    clearTimeout(timer);
  }
}

function normalizeUrl(raw: string): { href: string; origin: string; https: boolean } | null {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withScheme);
    return { href: u.href, origin: u.origin, https: u.protocol === "https:" };
  } catch {
    return null;
  }
}

const fix = (
  title: string,
  detail: string,
  minutes: number,
  impact: GeoStep["impact"],
): SiteCheckFix => ({ title, detail, minutes, impact, xp: impactXp(impact) });

// --- individual signal derivations (all pure, given fetched text) ------------

function checkCrawlable(home: Fetched | null): SiteCheck {
  if (!home) {
    return {
      id: "crawlable",
      label: "Homepage reachable by crawlers",
      status: "fail",
      detail: "Your homepage didn't respond to our crawler (timeout or blocked).",
      fix: fix(
        "Make your homepage respond to crawlers",
        "Our crawler couldn't load your homepage. AI answer-engine bots likely hit the same wall — and a page they can't fetch can never be cited. Check that your server responds quickly and doesn't block non-browser user-agents.",
        45,
        "very high",
      ),
    };
  }
  if (!home.ok) {
    return {
      id: "crawlable",
      label: "Homepage reachable by crawlers",
      status: "fail",
      detail: `Your homepage returned HTTP ${home.status} to our crawler.`,
      fix: fix(
        "Fix the error your homepage returns to crawlers",
        `Your homepage returned HTTP ${home.status} to a plain (non-JS) request. AI crawlers and search bots often don't run JavaScript, so they may get the same error and can't read or cite you. Server-render the key content (or return valid HTML to bot user-agents).`,
        60,
        "very high",
      ),
    };
  }
  return { id: "crawlable", label: "Homepage reachable by crawlers", status: "pass", detail: "Your homepage loads and returns HTML.", fix: null };
}

function checkHttps(https: boolean): SiteCheck {
  return https
    ? { id: "https", label: "HTTPS", status: "pass", detail: "Your site is served over HTTPS.", fix: null }
    : {
        id: "https",
        label: "HTTPS",
        status: "fail",
        detail: "Your site isn't served over HTTPS — a hard trust signal for both search and AI.",
        fix: fix(
          "Serve your site over HTTPS",
          "Add a TLS certificate (most hosts do this free) and redirect all http:// traffic to https://. AI engines and Google treat non-HTTPS sites as low-trust.",
          30,
          "high",
        ),
      };
}

function checkRobots(robots: Fetched | null): SiteCheck {
  if (!robots || robots.status === 404 || !robots.text.trim()) {
    return {
      id: "robots-ai",
      label: "robots.txt for AI crawlers",
      status: "fail",
      detail: "No robots.txt found — AI crawlers have no explicit allow rule.",
      fix: fix(
        "Add a robots.txt that allows AI crawlers",
        `Create /robots.txt allowing the AI answer-engine bots (${AI_CRAWLERS.join(", ")}) with "Allow: /", and link your sitemap. If a bot can't crawl you, it can't cite you.`,
        10,
        "medium",
      ),
    };
  }
  const txt = robots.text.toLowerCase();
  // Crude but effective: a global agent blocking the whole site.
  const blocksAll = /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*(\n|$)/.test(txt);
  const blockedAi = AI_CRAWLERS.filter((b) =>
    new RegExp(`user-agent:\\s*${b.toLowerCase()}[\\s\\S]*?disallow:\\s*/\\s*(\\n|$)`).test(txt),
  );
  if (blocksAll || blockedAi.length) {
    return {
      id: "robots-ai",
      label: "robots.txt for AI crawlers",
      status: "fail",
      detail: blocksAll
        ? "robots.txt blocks all crawlers from your site."
        : `robots.txt blocks these AI crawlers: ${blockedAi.join(", ")}.`,
      fix: fix(
        "Unblock AI crawlers in robots.txt",
        `Remove the "Disallow: /" rules that stop ${AI_CRAWLERS.join(", ")} and allow them to crawl your key pages. Blocked bots can never recommend you.`,
        10,
        "high",
      ),
    };
  }
  return { id: "robots-ai", label: "robots.txt for AI crawlers", status: "pass", detail: "robots.txt is present and doesn't block AI crawlers.", fix: null };
}

function checkLlms(llms: Fetched | null): SiteCheck {
  const present = !!llms && llms.ok && llms.text.trim().length > 0;
  return present
    ? { id: "llms-txt", label: "llms.txt", status: "pass", detail: "You publish an llms.txt roadmap for language models.", fix: null }
    : {
        id: "llms-txt",
        label: "llms.txt",
        status: "fail",
        detail: "No llms.txt found — there's no LLM-facing roadmap of your site.",
        fix: fix(
          "Add an llms.txt file",
          "Publish /llms.txt: a short, plain-text summary of what your product is, who it's for, and links to your key pages (home, pricing, comparisons, FAQ). It's a sitemap written for language models.",
          15,
          "medium",
        ),
      };
}

function checkSitemap(sitemap: Fetched | null, robots: Fetched | null): SiteCheck {
  const present =
    (!!sitemap && sitemap.ok && sitemap.text.includes("<")) ||
    (!!robots && /sitemap:\s*http/i.test(robots.text));
  return present
    ? { id: "sitemap", label: "Sitemap", status: "pass", detail: "A sitemap is published.", fix: null }
    : {
        id: "sitemap",
        label: "Sitemap",
        status: "warn",
        detail: "No sitemap.xml found.",
        fix: fix(
          "Publish a sitemap and submit it to Bing",
          "Generate /sitemap.xml, reference it from robots.txt, and submit it to Bing Webmaster Tools — ChatGPT's search leans on the Bing index.",
          15,
          "low",
        ),
      };
}

function tagText(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

function checkTitle(html: string): SiteCheck {
  const title = tagText(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title) {
    return {
      id: "title",
      label: "Page title",
      status: "fail",
      detail: "Your homepage has no <title> tag.",
      fix: fix("Add a clear, specific <title>", "Write a 30–60 character title that names what you do and for whom — it's the first thing both search and AI read.", 10, "medium"),
    };
  }
  if (title.length < 15 || title.length > 65) {
    return {
      id: "title",
      label: "Page title",
      status: "warn",
      detail: `Your title is ${title.length} characters (aim for ~30–60).`,
      fix: fix("Tighten your <title>", "Rewrite the title to ~30–60 characters, leading with what you do and for whom.", 10, "low"),
    };
  }
  return { id: "title", label: "Page title", status: "pass", detail: `Title looks good: "${title.slice(0, 60)}".`, fix: null };
}

function checkH1(html: string): SiteCheck {
  const count = (html.match(/<h1[\s>]/gi) || []).length;
  if (count === 0) {
    return {
      id: "h1",
      label: "H1 heading",
      status: "fail",
      detail: "No H1 heading found on your homepage.",
      fix: fix("Add a single clear H1", "Give the page one H1 that states, in plain words, what you do — answer-engines use it as the page's headline claim.", 10, "medium"),
    };
  }
  if (count > 1) {
    return {
      id: "h1",
      label: "H1 heading",
      status: "warn",
      detail: `Found ${count} H1s — a page should have exactly one.`,
      fix: fix("Use exactly one H1", "Keep a single H1 as the page's headline and demote the rest to H2/H3 so the structure is unambiguous.", 10, "low"),
    };
  }
  return { id: "h1", label: "H1 heading", status: "pass", detail: "Your homepage has exactly one H1.", fix: null };
}

function checkMetaDescription(html: string): SiteCheck {
  const re = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i;
  const alt = /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i;
  const desc = tagText(html, re) ?? tagText(html, alt);
  if (!desc) {
    return {
      id: "meta-description",
      label: "Meta description",
      status: "fail",
      detail: "No meta description on your homepage.",
      fix: fix("Add a meta description", "Add a 120–160 character meta description that summarizes the page in a sentence an engine could quote.", 10, "low"),
    };
  }
  return { id: "meta-description", label: "Meta description", status: "pass", detail: "A meta description is present.", fix: null };
}

function jsonLdTypes(html: string): string[] {
  const types: string[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    for (const t of m[1].match(/"@type"\s*:\s*"([^"]+)"/g) || []) {
      const name = t.match(/"@type"\s*:\s*"([^"]+)"/);
      if (name) types.push(name[1]);
    }
  }
  return [...new Set(types)];
}

function checkSchema(html: string): SiteCheck {
  const types = jsonLdTypes(html);
  if (types.length === 0) {
    return {
      id: "schema",
      label: "Structured data (schema)",
      status: "fail",
      detail: "No JSON-LD structured data found on your homepage.",
      fix: fix(
        "Add JSON-LD structured data",
        "Add Organization and SoftwareApplication (or Product) JSON-LD, plus FAQPage on a page with a Q&A block. Schema feeds your brand entity straight into the AI knowledge graph.",
        25,
        "medium",
      ),
    };
  }
  return { id: "schema", label: "Structured data (schema)", status: "pass", detail: `Structured data present: ${types.slice(0, 5).join(", ")}.`, fix: null };
}

// --- the audit -------------------------------------------------------------

export async function auditSite(rawUrl: string): Promise<SiteAudit> {
  const fetchedAt = new Date().toISOString();
  const norm = normalizeUrl(rawUrl);
  if (!norm) {
    return { url: rawUrl, fetchedAt, ok: false, checks: [] };
  }

  const [home, robots, llms, sitemap] = await Promise.all([
    fetchText(norm.href),
    fetchText(`${norm.origin}/robots.txt`),
    fetchText(`${norm.origin}/llms.txt`),
    fetchText(`${norm.origin}/sitemap.xml`),
  ]);

  const checks: SiteCheck[] = [
    checkCrawlable(home),
    checkHttps(norm.https),
    checkRobots(robots),
    checkLlms(llms),
    checkSitemap(sitemap, robots),
  ];

  const html = home?.ok ? home.text : "";
  if (html) {
    checks.push(checkTitle(html), checkH1(html), checkMetaDescription(html), checkSchema(html));
  } else {
    // Couldn't read the HTML — mark on-page checks unknown rather than failing.
    for (const [id, label] of [
      ["title", "Page title"],
      ["h1", "H1 heading"],
      ["meta-description", "Meta description"],
      ["schema", "Structured data (schema)"],
    ] as const) {
      checks.push({ id, label, status: "unknown", detail: "Couldn't fetch your homepage HTML to check this.", fix: null });
    }
  }

  return { url: norm.href, fetchedAt, ok: !!home?.ok, checks };
}

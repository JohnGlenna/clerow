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
  // Concrete, ordered actions shown as the "What to do" checklist in the task
  // modal. Optional — tasks without authored steps fall back to `detail`.
  steps: string[];
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
  steps: string[] = [],
): SiteCheckFix => ({ title, detail, minutes, impact, xp: impactXp(impact), steps });

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
        [
          "Open your homepage in a private window — confirm it loads fast and returns HTML (not an error or endless spinner).",
          "Check your host/CDN/WAF (Cloudflare, Vercel, etc.) for rules that block non-browser user-agents or rate-limit bots.",
          "Allow the AI crawler user-agents (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`) through any firewall or bot-protection.",
          "Re-scan — Clerow confirms your homepage now responds to crawlers.",
        ],
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
        [
          `Reproduce it: \`curl -A "GPTBot" https://yoursite.com\` — you'll see the same HTTP ${home.status} the bots get.`,
          "Fix the underlying error (bad redirect, auth wall, geo-block, or a JS-only shell that returns no HTML).",
          "Make sure the response is a 200 with real HTML content for bot user-agents.",
          "Re-scan to confirm crawlers get a clean page.",
        ],
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
          [
            "Enable a free TLS certificate (Let's Encrypt — most hosts like Cloudflare, Vercel and Netlify do this in one click).",
            "Add a permanent 301 redirect from all `http://` URLs to `https://`.",
            "Update internal links, canonical tags and your sitemap to the `https://` URLs.",
            "Re-scan to confirm HTTPS is live.",
          ],
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
        [
          "Create a `/robots.txt` at your site root.",
          "Add explicit allow rules for `GPTBot`, `ClaudeBot`, `PerplexityBot` and `Google-Extended`.",
          "Link your sitemap with a `Sitemap:` line.",
          "Re-scan — Clerow confirms all 5 crawlers can reach your key pages.",
        ],
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
        [
          "Open your existing `/robots.txt`.",
          "Remove any `Disallow: /` lines under `User-agent: *` or the AI bots (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`).",
          "Add explicit `Allow: /` rules for those AI crawlers.",
          "Re-scan to confirm the bots are no longer blocked.",
        ],
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
          [
            "Create a `/llms.txt` at your site root (Clerow generates a ready-to-use one below).",
            "Lead with a one-line summary of what you do and who it's for.",
            "List your strongest pages — home, pricing, comparison and FAQ — each with a one-line description.",
            "Re-scan to confirm models pick it up.",
          ],
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
          [
            "Generate a `/sitemap.xml` listing your important pages (most CMSs and frameworks do this automatically).",
            "Reference it from `/robots.txt` with a `Sitemap:` line.",
            "Submit it in Bing Webmaster Tools — ChatGPT search leans on the Bing index.",
            "Re-scan to confirm the sitemap is detected.",
          ],
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
      fix: fix("Add a clear, specific <title>", "Write a 30–60 character title that names what you do and for whom — it's the first thing both search and AI read.", 10, "medium", [
        "Add a `<title>` tag inside your homepage `<head>`.",
        "Write 30–60 characters that name what you do and for whom (e.g. \"Acme — invoicing software for freelancers\").",
        "Lead with the concrete value, not a tagline.",
        "Re-scan to confirm the title is read correctly.",
      ]),
    };
  }
  if (title.length < 15 || title.length > 65) {
    return {
      id: "title",
      label: "Page title",
      status: "warn",
      detail: `Your title is ${title.length} characters (aim for ~30–60).`,
      fix: fix("Tighten your <title>", "Rewrite the title to ~30–60 characters, leading with what you do and for whom.", 10, "low", [
        "Trim or expand your `<title>` to ~30–60 characters.",
        "Lead with what you do and for whom; drop filler words.",
        "Keep your brand name at the end, not the start.",
        "Re-scan to confirm.",
      ]),
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
      fix: fix("Add a single clear H1", "Give the page one H1 that states, in plain words, what you do — answer-engines use it as the page's headline claim.", 10, "medium", [
        "Add one `<h1>` near the top of your homepage.",
        "State, in plain words, what you do — not a clever slogan.",
        "Make sure there's only one `<h1>`; demote any others to `<h2>`.",
        "Re-scan to confirm.",
      ]),
    };
  }
  if (count > 1) {
    return {
      id: "h1",
      label: "H1 heading",
      status: "warn",
      detail: `Found ${count} H1s — a page should have exactly one.`,
      fix: fix("Use exactly one H1", "Keep a single H1 as the page's headline and demote the rest to H2/H3 so the structure is unambiguous.", 10, "low", [
        "Pick the one heading that best states what the page is about — keep it as `<h1>`.",
        "Change every other `<h1>` to `<h2>` or `<h3>`.",
        "Keep headings in a logical order (h1 → h2 → h3).",
        "Re-scan to confirm a single H1.",
      ]),
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
      fix: fix("Add a meta description", "Add a 120–160 character meta description that summarizes the page in a sentence an engine could quote.", 10, "low", [
        "Add a `<meta name=\"description\">` tag to your homepage `<head>`.",
        "Write 120–160 characters summarizing the page in one quotable sentence.",
        "Include the core thing you do and who it's for.",
        "Re-scan to confirm.",
      ]),
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

// Readable text remaining after scripts/styles/tags are stripped — i.e. what a
// crawler that doesn't run JS actually sees.
function visibleTextLen(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

function checkSsr(home: Fetched | null): SiteCheck {
  if (!home || !home.ok) {
    return { id: "ssr", label: "Server-rendered content", status: "unknown", detail: "Couldn't fetch your homepage HTML to check this.", fix: null };
  }
  const textLen = visibleTextLen(home.text);
  const scriptCount = (home.text.match(/<script[\s>]/gi) || []).length;
  // A JS shell: almost no readable text in the raw HTML, but plenty of scripts.
  if (textLen < 300 && scriptCount >= 1) {
    return {
      id: "ssr",
      label: "Server-rendered content",
      status: "warn",
      detail: `Your homepage's raw HTML has very little readable text (${textLen} chars) — it looks rendered client-side by JavaScript.`,
      fix: fix(
        "Server-render the content AI bots read",
        "Several AI crawlers (notably GPTBot) don't run JavaScript — they see only your raw HTML. Server-side render or pre-render your key content (or return static HTML to bot user-agents) so the facts you want cited are in the initial response. Test with View Source: if the facts aren't there, the bot never sees them.",
        60,
        "high",
        [
          "Open your homepage and choose \"View Source\" — check whether your key facts/copy are actually in the raw HTML.",
          "If they're missing, enable server-side rendering or pre-rendering for those pages (SSR/SSG/prerender).",
          "Confirm the important text is present in the initial HTML response, not injected later by JS.",
          "Re-scan to confirm bots can read your content.",
        ],
      ),
    };
  }
  return { id: "ssr", label: "Server-rendered content", status: "pass", detail: "Your homepage delivers readable content in the raw HTML.", fix: null };
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
        [
          "Add an `Organization` JSON-LD block (name, url, logo, sameAs links to your profiles) to your homepage.",
          "Add `SoftwareApplication` or `Product` JSON-LD describing what you offer.",
          "Add `FAQPage` JSON-LD wherever you have a Q&A block.",
          "Validate with Google's Rich Results Test, then re-scan.",
        ],
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
    checks.push(checkTitle(html), checkH1(html), checkMetaDescription(html), checkSchema(html), checkSsr(home));
  } else {
    // Couldn't read the HTML — mark on-page checks unknown rather than failing.
    for (const [id, label] of [
      ["title", "Page title"],
      ["h1", "H1 heading"],
      ["meta-description", "Meta description"],
      ["schema", "Structured data (schema)"],
      ["ssr", "Server-rendered content"],
    ] as const) {
      checks.push({ id, label, status: "unknown", detail: "Couldn't fetch your homepage HTML to check this.", fix: null });
    }
  }

  return { url: norm.href, fetchedAt, ok: !!home?.ok, checks };
}

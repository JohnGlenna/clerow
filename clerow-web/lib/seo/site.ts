// Shared SEO/GEO site constants — the single source of truth for our canonical
// URL, brand name, and the description we want AI engines to repeat about us.
// Used by app/robots.ts, app/sitemap.ts, app/layout.tsx, and components/seo/JsonLd.tsx.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://clerow.com").replace(/\/+$/, "");
export const SITE_NAME = "Clerow";

// One-sentence, fact-dense, answer-first definition (playbook §4 inverted pyramid).
// Keep this exact wording in sync with public/llms.txt and the homepage hero.
export const SITE_TAGLINE = "Get your brand recommended by AI.";
export const SITE_DESCRIPTION =
  "Clerow is an AI visibility (GEO/AEO) tool that scans your website across all 5 major AI answer engines — ChatGPT, Claude, Perplexity, Gemini, and Grok — shows exactly where they recommend competitors instead of you, and turns the gaps into daily, gamified fixes.";

// Private/app surfaces that should not be indexed by any crawler.
export const PRIVATE_PATHS = ["/dashboard", "/api/", "/auth/", "/onboarding", "/connect", "/connect-claude", "/share/"];

// Profiles AI engines use to corroborate the brand entity (schema.org sameAs).
export const SOCIAL_PROFILES = ["https://x.com/clerow"];

export const abs = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

import type { MetadataRoute } from "next";
import { AI_CRAWLERS } from "@/lib/content/files";
import { SITE_URL, PRIVATE_PATHS } from "@/lib/seo/site";

// Served at /robots.txt. Explicitly welcomes the AI answer-engine crawlers (the exact
// set Clerow audits for) so ChatGPT, Claude, Perplexity, Gemini and Grok can read us —
// while keeping the app/auth surfaces out of the index.
export default function robots(): MetadataRoute.Robots {
  const disallow = PRIVATE_PATHS;
  return {
    rules: [
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow })),
      { userAgent: "*", allow: "/", disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

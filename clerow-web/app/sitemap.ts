import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { COMPARE_PAGES } from "@/lib/seo/compare";

// Served at /sitemap.xml. Lists only the public, indexable marketing pages — the
// dashboard/auth/share surfaces are intentionally excluded (see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-06");
  const paths: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/best-geo-tools-2026", priority: 0.9 },
    { path: "/blog/geo-vs-seo", priority: 0.8 },
    { path: "/blog/how-to-optimize-website-for-chatgpt-perplexity-gemini", priority: 0.8 },
    { path: "/faq", priority: 0.8 },
    { path: "/pricing", priority: 0.8 },
    ...COMPARE_PAGES.map((c) => ({ path: `/compare/${c.slug}`, priority: 0.7 })),
  ];
  return paths.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority,
  }));
}

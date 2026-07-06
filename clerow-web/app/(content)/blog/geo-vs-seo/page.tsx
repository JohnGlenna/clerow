import type { Metadata } from "next";
import Link from "next/link";
import { StartButton } from "@/components/welcome/Cta";
import { JsonLd, faqPageSchema } from "@/components/seo/JsonLd";
import { SITE_NAME, abs } from "@/lib/seo/site";
import type { Faq } from "@/lib/seo/faq";

export const metadata: Metadata = {
  title: "GEO vs SEO: What's the Difference? (2026 Guide)",
  description:
    "GEO (Generative Engine Optimization) gets your brand recommended inside AI answers from ChatGPT, Claude, Perplexity, Gemini, and Grok; SEO ranks pages in Google's list of links. See how they differ, where they overlap, and how to start with GEO.",
  alternates: { canonical: "/blog/geo-vs-seo" },
  openGraph: {
    title: "GEO vs SEO: What's the Difference? (2026 Guide)",
    description:
      "How Generative Engine Optimization differs from SEO — and how to get your brand recommended by AI answer engines.",
    url: abs("/blog/geo-vs-seo"),
  },
};

const UPDATED = "July 2026";

const GARTNER_URL =
  "https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots-and-other-virtual-agents";

// Page-specific FAQ — kept local (the site-wide FAQ in lib/seo/faq.ts is about Clerow itself).
const PAGE_FAQS: Faq[] = [
  {
    q: "Is GEO replacing SEO?",
    a: "No. GEO extends SEO rather than replacing it. Google still drives most discovery traffic in 2026, but Gartner predicts classic search engine volume will drop 25% by 2026 as buyers shift to AI assistants — so brands increasingly need both.",
  },
  {
    q: "Does good SEO automatically give me good GEO?",
    a: "Only partially. Crawlability, HTTPS, and clean structure help both. But AI engines reward things classic SEO ignores: answer-first copy they can lift verbatim, honest comparison tables, llms.txt, being named on the third-party sources each engine already cites, and consistency of facts across the web.",
  },
  {
    q: "How do I measure GEO?",
    a: "Ask the engines your buyers' questions and record who gets named. Tools like Clerow automate this: they query ChatGPT, Claude, Perplexity, Gemini, and Grok with real buyer prompts, score your visibility per engine, and track how it moves after each fix you ship.",
  },
  {
    q: "How long does GEO take to work?",
    a: "Typically 2–6 weeks after shipping fixes, because AI engines need to re-crawl the web and refresh their sources. Search-grounded engines like Perplexity can pick changes up faster than model-memory answers.",
  },
];

const DIFFERENCES: { dim: string; seo: string; geo: string }[] = [
  { dim: "Where you win", seo: "A ranked list of blue links on Google", geo: "Being named inside the AI's answer itself" },
  { dim: "The 'result'", seo: "Positions 1–10; users click through", geo: "Often one recommendation — the engine picks for the user" },
  { dim: "Optimized for", seo: "Google's ranking algorithm", geo: "ChatGPT, Claude, Perplexity, Gemini, Grok" },
  { dim: "Core assets", seo: "Keyword pages, backlinks, Core Web Vitals", geo: "Answer-first pages, comparison tables, llms.txt, third-party citations" },
  { dim: "Measurement", seo: "Rank trackers, Search Console", geo: "Querying each engine with buyer prompts and recording mentions" },
  { dim: "Failure mode", seo: "Page 2 of Google", geo: "The AI recommends your competitor by name" },
];

export default function GeoVsSeoPage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "GEO vs SEO: What's the Difference?",
    description: metadata.description,
    dateModified: "2026-07-06",
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: abs("/blog/geo-vs-seo"),
  };

  return (
    <>
      <JsonLd data={[articleSchema, faqPageSchema(PAGE_FAQS)]} />
      <span className="eyebrow">Guide</span>
      <h1>GEO vs SEO: what&apos;s the difference?</h1>
      <p className="updated">Last updated: {UPDATED}</p>
      <p className="lede">
        <strong>GEO (Generative Engine Optimization)</strong> is the practice of getting your brand
        cited and recommended inside AI-generated answers from engines like ChatGPT, Claude,
        Perplexity, Gemini, and Grok. <strong>SEO (Search Engine Optimization)</strong> is the
        practice of ranking pages in Google&apos;s list of links. The difference matters because the
        two produce different winners: SEO gets you a position on a results page; GEO gets you{" "}
        <em>named in the answer</em> — often as the only recommendation a buyer ever sees.
      </p>

      <h2>Why GEO matters in 2026</h2>
      <p>
        Buyers increasingly ask an AI assistant instead of Googling.{" "}
        <a href={GARTNER_URL} target="_blank" rel="noopener noreferrer">
          Gartner predicts classic search engine volume will drop 25% by 2026
        </a>{" "}
        as AI chatbots and virtual agents absorb those queries. When a buyer asks ChatGPT
        &quot;best CRM for small teams&quot;, there is no page two — the engine names a handful of
        products, and everyone else is invisible. GEO (also called AEO, Answer Engine Optimization)
        is how you become one of the named.
      </p>

      <h2>GEO vs SEO: the key differences</h2>
      <table>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>SEO</th>
            <th>GEO</th>
          </tr>
        </thead>
        <tbody>
          {DIFFERENCES.map((r) => (
            <tr key={r.dim}>
              <th>{r.dim}</th>
              <td>{r.seo}</td>
              <td className="col-you">{r.geo}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Where GEO and SEO overlap</h2>
      <p>
        The foundations are shared: a crawlable site over HTTPS, one clear H1, a real meta
        description, structured data, and content that actually answers the question. If your SEO
        hygiene is good, you start GEO from a better place. Where they diverge is everything above
        the foundations — AI engines lift <em>answer-shaped</em> text (definitions, comparison
        tables, FAQs), lean on a small set of third-party sources they already trust, and reward an{" "}
        <code>llms.txt</code> file and robots.txt rules that welcome AI crawlers like GPTBot and
        PerplexityBot.
      </p>

      <h2>How to start with GEO</h2>
      <p>
        The loop that works: <strong>1)</strong> ask the engines your buyers&apos; real questions
        and record who they recommend; <strong>2)</strong> fix the foundations (AI-crawler
        robots.txt, llms.txt, server-rendered answer-first pages); <strong>3)</strong> ship the
        assets engines cite — honest comparison pages and FAQs; <strong>4)</strong> earn mentions on
        the sources each engine already cites; <strong>5)</strong> re-scan and measure the climb.{" "}
        <Link href="/">Clerow</Link> automates this loop for $29/month: it scans all 5 engines,
        shows where they recommend competitors instead of you, and turns each gap into a ranked
        daily fix — which you can ship yourself or hand to an AI agent via{" "}
        <Link href="/faq">Clerow&apos;s MCP server</Link>. For a wider look at the tooling, see{" "}
        <Link href="/best-geo-tools-2026">the best GEO tools in 2026</Link>.
      </p>

      <h2>GEO vs SEO: common questions</h2>
      {PAGE_FAQS.map((f) => (
        <div key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}

      <div className="content-cta">
        <h2>See where AI ranks you today</h2>
        <p>Your first scan and Level 1 fixes are free. Find out which engines recommend you — and which recommend your competitors.</p>
        <StartButton className="btn btn-primary">Get started</StartButton>
      </div>
    </>
  );
}

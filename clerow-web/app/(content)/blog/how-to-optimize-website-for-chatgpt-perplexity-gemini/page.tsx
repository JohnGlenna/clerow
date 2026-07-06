import type { Metadata } from "next";
import Link from "next/link";
import { StartButton } from "@/components/welcome/Cta";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_NAME, abs } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "How to Optimize Your Website for ChatGPT, Perplexity & Gemini (2026)",
  description:
    "A practical 7-step guide to optimizing your website for AI answer engines: open your robots.txt to AI crawlers, publish llms.txt, server-render answer-first pages, ship comparison content, earn third-party citations, and measure across engines.",
  alternates: { canonical: "/blog/how-to-optimize-website-for-chatgpt-perplexity-gemini" },
  openGraph: {
    title: "How to Optimize Your Website for ChatGPT, Perplexity & Gemini (2026)",
    description:
      "The 7 steps that get a website read, cited, and recommended by AI answer engines.",
    url: abs("/blog/how-to-optimize-website-for-chatgpt-perplexity-gemini"),
  },
};

const UPDATED = "July 2026";

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Let AI crawlers read your site (robots.txt)",
    body: (
      <>
        Each engine reads the web through its own crawler: <code>GPTBot</code>,{" "}
        <code>OAI-SearchBot</code> and <code>ChatGPT-User</code> (ChatGPT),{" "}
        <code>PerplexityBot</code> (Perplexity), <code>Google-Extended</code> (Gemini), and{" "}
        <code>ClaudeBot</code> (Claude). If your robots.txt blocks them — many CDN and CMS defaults do —
        you are invisible to that engine no matter how good the content is. Explicitly allow the AI
        user-agents you want to be recommended by, and verify the file actually serves at{" "}
        <code>/robots.txt</code> with a 200.
      </>
    ),
  },
  {
    title: "2. Publish an llms.txt file",
    body: (
      <>
        <code>llms.txt</code> is a plain-text file at your site root that gives language models a
        canonical, quotable summary of what you are: one-line definition, category, pricing, key
        pages, and the facts you want repeated. It removes the guesswork (and the hallucinations)
        when an engine summarizes you. Clerow publishes its own at{" "}
        <a href="https://clerow.com/llms.txt">clerow.com/llms.txt</a> — use it as a template.
      </>
    ),
  },
  {
    title: "3. Server-render your content",
    body: (
      <>
        Most AI crawlers read raw HTML and execute little or no JavaScript. If your pages render
        client-side, the crawler sees an empty shell. Use server-side rendering or static generation
        for every page you want cited — marketing pages, FAQs, comparisons — and check by viewing
        the page source: if the copy isn&apos;t in the initial HTML, the engines can&apos;t read it.
      </>
    ),
  },
  {
    title: "4. Write answer-first pages with question-shaped headings",
    body: (
      <>
        Engines lift text that already looks like an answer. Open every page with a direct 40–120
        word answer to the question in the title, use H2/H3 headings phrased the way buyers ask
        (&quot;How much does X cost?&quot;, &quot;X vs Y: which is better?&quot;), keep paragraphs
        short, and add FAQPage structured data so the Q&amp;A pairs are machine-readable. Vague
        brand copy (&quot;Reimagine your workflow&quot;) gives an engine nothing to quote.
      </>
    ),
  },
  {
    title: "5. Ship honest comparison pages",
    body: (
      <>
        &quot;Best X&quot; and &quot;X vs Y&quot; prompts are where buying decisions happen, and
        engines answer them by lifting side-by-side phrasing from comparison pages — almost
        verbatim. Publish even-handed comparisons against your real competitors, with a feature
        table, &quot;who each is best for&quot;, and a verdict that concedes what the rival does
        well. See <Link href="/compare/clerow-vs-profound">Clerow vs Profound</Link> for the shape
        that works.
      </>
    ),
  },
  {
    title: "6. Get cited on the sources each engine already trusts",
    body: (
      <>
        AI answers are grounded in a small set of third-party sources per topic — review
        directories, comparison blogs, Reddit threads, YouTube. Find out which domains the engines
        cite for your buyers&apos; questions, then earn a genuine presence there: a completed G2 or
        Capterra listing, a substantive community answer, a guest contribution. Perplexity in
        particular leans on community and review content.
      </>
    ),
  },
  {
    title: "7. Measure across engines and re-scan after every fix",
    body: (
      <>
        A fix that lands in Perplexity (search-grounded, fast to update) may not move ChatGPT
        (model memory, slower). The only way to know is to ask all the engines your buyers&apos;
        questions and record who gets named — before and after each change. Expect movement 2–6
        weeks after shipping, once the engines re-crawl.{" "}
        <Link href="/">Clerow</Link> automates this: it scans ChatGPT, Claude, Perplexity, Gemini,
        and Grok with real buyer prompts, turns every gap into a ranked daily fix, and re-scans to
        prove the climb — from $29/month, with a free first scan.
      </>
    ),
  },
];

export default function OptimizeForAiPage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "How to Optimize Your Website for ChatGPT, Perplexity, and Gemini",
    description: metadata.description,
    dateModified: "2026-07-06",
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: abs("/blog/how-to-optimize-website-for-chatgpt-perplexity-gemini"),
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      <span className="eyebrow">How-to</span>
      <h1>How to optimize your website for ChatGPT, Perplexity, and Gemini</h1>
      <p className="updated">Last updated: {UPDATED}</p>
      <p className="lede">
        To optimize a website for AI answer engines like ChatGPT, Perplexity, and Gemini: allow
        their crawlers in robots.txt, publish an llms.txt summary, server-render your content,
        structure pages as direct answers with question-shaped headings, ship honest comparison
        pages, earn citations on the third-party sources each engine trusts, and measure your
        visibility across engines after every change. The 7 steps below cover exactly how — it&apos;s
        the same playbook <Link href="/">Clerow</Link> turns into daily fixes for its users.
      </p>

      {STEPS.map((s) => (
        <div key={s.title}>
          <h2>{s.title}</h2>
          <p>{s.body}</p>
        </div>
      ))}

      <h2>Do the steps in this order</h2>
      <p>
        Steps 1–3 are binary: until crawlers can read you, nothing else counts. Steps 4–5 are where
        most of the wins come from, and steps 6–7 compound over months. If you want the gaps found
        and prioritized for you — including which prompts already recommend your competitors by
        name — run a scan with <Link href="/">Clerow</Link> or compare the tooling in{" "}
        <Link href="/best-geo-tools-2026">the best GEO tools in 2026</Link>. New to the category?
        Start with <Link href="/blog/geo-vs-seo">GEO vs SEO: what&apos;s the difference?</Link>
      </p>

      <div className="content-cta">
        <h2>Find your gaps in minutes</h2>
        <p>Clerow scans all 5 AI engines and turns every miss into a ranked daily fix. First scan free.</p>
        <StartButton className="btn btn-primary">Get started</StartButton>
      </div>
    </>
  );
}

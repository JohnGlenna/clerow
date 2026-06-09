// Canonical FAQ — answer-first, fact-dense Q&A (playbook §4). Single source for the
// homepage FAQ block, the /faq page, and the FAQPage JSON-LD on both, so the visible
// copy and the structured data can never drift.

export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: "What is Clerow?",
    a: "Clerow is an AI visibility (GEO/AEO) tool that scans your website across ChatGPT, Claude, Perplexity, Gemini, and Grok, shows exactly where they recommend competitors instead of you, and turns the gaps into daily, gamified fixes.",
  },
  {
    q: "What is GEO / AEO?",
    a: "GEO (Generative Engine Optimization), also called AEO (Answer Engine Optimization), is the practice of getting your brand cited and recommended inside AI-generated answers. It's like SEO, but for AI assistants such as ChatGPT and Perplexity instead of Google's list of blue links.",
  },
  {
    q: "Which AI models does Clerow track?",
    a: "Clerow tracks all 5 major AI answer engines: ChatGPT, Claude, Perplexity, Gemini, and Grok. A fix that lands in one engine doesn't always move another, so Clerow checks them together.",
  },
  {
    q: "How is Clerow different from traditional SEO tools?",
    a: "Traditional SEO tools optimize for Google's ranked list of links. Clerow optimizes for being named inside AI answers. It scores your visibility across 5 AI engines and turns each gap into a ranked task you can ship yourself — or have an AI agent ship for you through Clerow's MCP server.",
  },
  {
    q: "How much does Clerow cost?",
    a: "Clerow is $29 per month, self-serve, and you can cancel anytime. Your first scan (one engine) and all Level 1 foundation fixes are free.",
  },
  {
    q: "How long until my AI visibility improves?",
    a: "Most brands see movement within 2–6 weeks after shipping their fixes, because AI engines need to re-crawl the web. Clerow re-scans all 5 engines so you can measure the change and keep your streak going.",
  },
  {
    q: "Can an AI agent do the work for me?",
    a: "Yes. Clerow's Model Context Protocol (MCP) server lets Claude Code, Cursor, or any MCP client pull your prioritized tasks, generate the content, and ship the fixes — then Clerow re-checks all 5 models to prove it worked.",
  },
];

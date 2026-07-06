// Data for the honest "Clerow vs <rival>" comparison pages (playbook §2: the
// highest-leverage cornerstone asset for `compare` intent — LLMs lift side-by-side
// phrasing almost verbatim). Consumed by app/compare/[slug]/page.tsx, app/sitemap.ts,
// and public/llms.txt. Competitor cells are kept qualitative and based on public
// positioning as of the date below — no invented prices or numbers.

export const COMPARE_UPDATED = "July 2026";

export type CompareRow = { feature: string; clerow: string; rival: string };

export type ComparePage = {
  slug: string;
  rival: string;
  rivalIs: string;
  metaTitle: string;
  metaDescription: string;
  /** Answer-first definition paragraph — the first 60–120 words an engine can quote. */
  intro: string;
  rows: CompareRow[];
  clerowBestFor: string;
  rivalBestFor: string;
  verdict: string;
};

const CLEROW_PRICE = "$29/mo flat, self-serve, cancel anytime (free first scan)";

export const COMPARE_PAGES: ComparePage[] = [
  {
    slug: "clerow-vs-profound",
    rival: "Profound",
    rivalIs:
      "an enterprise AI-visibility analytics platform aimed at large brands and agencies, sold through custom/contact-sales pricing.",
    metaTitle: "Clerow vs Profound (2026): AI Visibility Tools Compared",
    metaDescription:
      "Clerow vs Profound compared for 2026. Clerow is a $29/mo self-serve GEO tool that turns AI-visibility gaps into daily fixes; Profound is an enterprise analytics platform. See the full feature table.",
    intro:
      "Clerow and Profound are both AI-visibility (GEO/AEO) tools that track whether AI answer engines recommend your brand. The core difference: Clerow is a $29/mo self-serve product that turns the gaps into concrete daily fixes you actually ship — with an MCP agent that can ship them for you — while Profound is an enterprise analytics platform priced through sales and built mainly for reporting AI visibility at scale. Clerow is best for founders and small teams who want to act; Profound suits large brands that need deep analytics and have a budget for it.",
    rows: [
      { feature: "Pricing", clerow: CLEROW_PRICE, rival: "Enterprise / custom (contact sales)" },
      { feature: "Engines tracked", clerow: "ChatGPT, Claude, Perplexity, Gemini, Grok (all 5)", rival: "Multiple major engines" },
      { feature: "Primary job", clerow: "Find gaps → fix them (action)", rival: "Measure & report visibility (analytics)" },
      { feature: "Turns gaps into tasks", clerow: "Yes — ranked daily quests with XP & streaks", rival: "Analytics-first; remediation is manual" },
      { feature: "Agent autopilot (MCP)", clerow: "Yes — Claude Code / Cursor ship fixes via MCP", rival: "Not a core feature" },
      { feature: "Generates ready-to-ship content", clerow: "Yes — robots.txt, llms.txt, FAQ & comparison drafts", rival: "No" },
      { feature: "Setup", clerow: "Paste a URL, scan in minutes", rival: "Sales-assisted onboarding" },
      { feature: "Best fit", clerow: "Founders, small teams, agencies", rival: "Enterprise brands & large agencies" },
    ],
    clerowBestFor:
      "Founders and small marketing teams who want to see where AI recommends competitors and actually fix it — cheaply, self-serve, with the work turned into a daily habit.",
    rivalBestFor:
      "Large brands and enterprise agencies that need deep, scalable AI-visibility analytics and reporting and have budget for an enterprise contract.",
    verdict:
      "Pick Clerow if you want an affordable tool that gets you doing the work and improving — including hands-off via an AI agent. Pick Profound if you're an enterprise that primarily needs analytics and reporting at scale.",
  },
  {
    slug: "clerow-vs-otterly",
    rival: "Otterly.AI",
    rivalIs:
      "an AI-search monitoring tool that tracks brand mentions and sentiment across AI answer engines on subscription tiers.",
    metaTitle: "Clerow vs Otterly.AI (2026): Which GEO Tool to Pick",
    metaDescription:
      "Clerow vs Otterly.AI compared for 2026. Both track your AI visibility; Clerow adds ranked daily fixes, generated content, and an MCP agent that ships changes. See the feature table.",
    intro:
      "Clerow and Otterly.AI both monitor how AI answer engines talk about your brand. The difference is what happens after the scan: Otterly.AI focuses on monitoring mentions, prompts, and sentiment, while Clerow turns each gap into a ranked daily task, drafts the fix (FAQ, comparison page, robots.txt, llms.txt), and can ship it for you through an MCP agent. Clerow tracks all five major engines — ChatGPT, Claude, Perplexity, Gemini, and Grok — and wraps the work in streaks and XP so visibility actually improves over weeks, not just gets reported.",
    rows: [
      { feature: "Pricing", clerow: CLEROW_PRICE, rival: "Subscription tiers" },
      { feature: "Engines tracked", clerow: "ChatGPT, Claude, Perplexity, Gemini, Grok (all 5)", rival: "Major AI search engines" },
      { feature: "Primary job", clerow: "Find gaps → fix them (action)", rival: "Monitor mentions & sentiment" },
      { feature: "Turns gaps into tasks", clerow: "Yes — ranked daily quests with XP & streaks", rival: "Monitoring-first" },
      { feature: "Agent autopilot (MCP)", clerow: "Yes — agents ship fixes via MCP", rival: "Not a core feature" },
      { feature: "Generates ready-to-ship content", clerow: "Yes", rival: "No" },
      { feature: "Habit / gamification layer", clerow: "Yes — streaks, points, daily tasks", rival: "No" },
      { feature: "Best fit", clerow: "Teams who want to act on the data", rival: "Teams who want to watch the data" },
    ],
    clerowBestFor:
      "Teams that want monitoring plus a clear, gamified path to actually fix what's holding their AI visibility back — with optional hands-off shipping via an agent.",
    rivalBestFor:
      "Teams whose main need is ongoing monitoring of brand mentions, prompts, and sentiment across AI search.",
    verdict:
      "Choose Clerow if you want the fixes done, not just the metrics tracked. Choose Otterly.AI if you primarily need lightweight, ongoing AI-search monitoring.",
  },
  {
    slug: "clerow-vs-llmometrics",
    rival: "LLMOmetrics",
    rivalIs:
      "an AI-visibility tracking platform (rebranded as GEO Metrics) that monitors brand prompts, citations, and sentiment across a wide set of AI models, sold on tiered subscriptions.",
    metaTitle: "Clerow vs LLMOmetrics (2026): AI Visibility Tools Compared",
    metaDescription:
      "Clerow vs LLMOmetrics (now GEO Metrics) compared for 2026. Clerow is a $29/mo GEO tool that turns AI-visibility gaps into daily fixes an agent can ship; LLMOmetrics is a monitoring-first tracker. See the feature table.",
    intro:
      "Clerow and LLMOmetrics (which now goes by GEO Metrics) are both AI-visibility (GEO/AEO) tools that track whether AI answer engines recommend your brand. The difference is what happens after the tracking: LLMOmetrics is monitoring-first — prompt tracking, citation analysis, sentiment, and recommendations across a wide set of models — while Clerow turns each gap into a ranked daily task with generated, ready-to-ship fixes, and an MCP agent (Claude Code, Cursor) that can ship them for you. Clerow is $29/mo flat and self-serve; LLMOmetrics is sold on tiered subscription plans.",
    rows: [
      { feature: "Pricing", clerow: CLEROW_PRICE, rival: "Tiered subscription plans" },
      { feature: "Engines tracked", clerow: "ChatGPT, Claude, Perplexity, Gemini, Grok (all 5)", rival: "Wide model coverage incl. Copilot, DeepSeek & AI Overviews" },
      { feature: "Primary job", clerow: "Find gaps → fix them (action)", rival: "Track prompts, citations & sentiment (monitoring)" },
      { feature: "Turns gaps into tasks", clerow: "Yes — ranked daily quests with XP & streaks", rival: "Recommendations; execution is manual" },
      { feature: "Agent autopilot (MCP)", clerow: "Yes — Claude Code / Cursor ship fixes via MCP", rival: "Not a core feature" },
      { feature: "Generates ready-to-ship content", clerow: "Yes — robots.txt, llms.txt, FAQ & comparison drafts", rival: "Content insights, not shipped files" },
      { feature: "Habit / gamification layer", clerow: "Yes — streaks, points, daily tasks", rival: "No" },
      { feature: "Best fit", clerow: "Founders & small teams who want to act", rival: "Teams who want broad-model monitoring dashboards" },
    ],
    clerowBestFor:
      "Founders and small marketing teams who want the gaps closed, not just charted — with the work broken into daily fixes and an AI agent that can ship them hands-free.",
    rivalBestFor:
      "Teams that want to monitor prompts, citations, and sentiment across the broadest possible set of AI models — including Copilot, DeepSeek, and Google AI Overviews — with dashboards and reporting.",
    verdict:
      "Pick Clerow if you want an affordable tool that gets the fixes shipped and measures the climb across the 5 major answer engines. Pick LLMOmetrics (GEO Metrics) if your main need is wide-coverage monitoring and reporting.",
  },
];

export const compareBySlug = (slug: string) => COMPARE_PAGES.find((c) => c.slug === slug);

# Clerow — What it is & how it works

## The one-liner
**Clerow — your daily streak to getting recommended by AI.**

Clerow scans your website, shows you exactly where AI answer engines (ChatGPT, Claude, Perplexity, Gemini, Grok) recommend your *competitors* instead of you, and turns fixing it into a daily habit with points, streaks, and progress tracking.

## The category
This is **AEO / GEO** — Answer Engine Optimization / Generative Engine Optimization. Think of it as SEO, but for being **cited and recommended by LLMs** instead of ranked by Google. As people increasingly ask AI chatbots "what's the best X for Y?" instead of Googling, whether AI recommends your brand becomes a real growth channel.

## The core loop
1. **Connect** your site / brand.
2. Clerow **queries AI engines** with prompts a real buyer would ask ("best CRM for small teams", "top running shoes for flat feet").
3. Clerow **detects** whether your brand is mentioned/recommended — and which competitors get recommended instead.
4. It turns those gaps into **concrete daily tasks** ("add an FAQ answering X", "get listed on Y", "publish a comparison page for Z").
5. Completing tasks earns **points and maintains your streak**. Your AI visibility is tracked over time as it improves.

## The differentiator
The **habit layer**. Most AEO tools hand you a passive dashboard you ignore. Clerow wraps gamification (streaks, points, daily tasks) around the insights so you actually *do the work* of improving your AI visibility.

## How it works under the hood
- **Multi-model scan** — Clerow runs your buyer-intent prompts across multiple AI models (up to 5), parses each answer for brand vs. competitor mentions, and synthesizes a verdict on where you stand. This multi-model standings view is the moat.
- **Site audit** — crawls your real site to find technical GEO gaps (robots.txt, llms.txt, schema markup, content structure that LLMs can/can't parse).
- **Task generation** — gaps become prioritized, actionable tasks. Content tasks come with either a deterministic file (e.g. robots.txt/llms.txt) or a content brief grounded in your actual crawled site + the live scan signal, so the output is specific to you.
- **Tiering** — free users get the foundations (Level 1 + a Level 2 taster); Premium unlocks the full climb and on-demand full scans.

## Where you use it
- **Web app** (primary surface) — the main dashboard for marketers, founders, and growth/SEO people, who work on desktop.
- **Mobile app** (companion) — for streak maintenance and notifications.
- **Clerow MCP server** — connect your AI coding agent (Claude Code, Cursor, any MCP client) directly to Clerow. It pulls your prioritized GEO tasks, generates ready-to-ship content/files, and marks tasks done to keep your streak — all without Clerow ever needing repo access (your agent does the writes/PRs). Auth is OAuth — paste the URL, sign in once in the browser, done.

## The tech (high level)
- **Web:** Next.js + TypeScript on Vercel
- **Mobile:** React Native + Expo (iOS + Android)
- **Backend:** Supabase (Postgres, Auth, Storage)
- **AI querying** across ChatGPT / Claude / Perplexity / Gemini / Grok — the core data-gathering engine
- **Payments:** Stripe (subscription SaaS)

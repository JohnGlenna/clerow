# Clerow — Project Context

## What Clerow is

**Clerow — your daily streak to getting recommended by AI.**

Clerow scans a customer's website, shows them exactly where AI answer engines (ChatGPT, Claude, Perplexity, etc.) recommend their competitors instead of them, and turns fixing it into a daily habit. Points, streaks, and progress are the core mechanic — the goal is to make the user *do the work* of improving their AI visibility, rather than handing them another passive dashboard they ignore.

This is the emerging category of AEO / GEO (Answer Engine Optimization / Generative Engine Optimization): SEO, but for being cited and recommended by LLMs instead of ranked by Google.

**The core loop:**
1. User connects their site / brand.
2. Clerow queries AI engines with prompts a real buyer might ask ("best CRM for small teams", "top running shoes for flat feet", etc.).
3. Clerow detects whether the user's brand is mentioned/recommended, and which competitors are recommended instead.
4. Clerow turns the gaps into concrete daily tasks ("add an FAQ answering X", "get listed on Y", "publish a comparison page for Z").
5. Completing tasks earns points and maintains the streak. Progress is tracked over time as AI visibility improves.

**The differentiator** is the habit layer — gamification (streaks, points, daily tasks) wrapped around AEO insights, so users actually act on the data.

## Tech stack

- **Mobile app:** React Native + TypeScript (Expo). iOS + Android, single codebase.
- **Web:** Next.js + TypeScript (App Router). Marketing site + the main web app.
- **Backend / database:** Supabase (Postgres, Auth, Storage, RLS).
- **Hosting:** Vercel for the web app and lightweight API routes.
- **AI engine querying:** the core data-gathering job — querying ChatGPT / Claude / Perplexity and parsing their answers for brand/competitor mentions. See "Open questions" below; this is the riskiest and most important technical piece.
- **Background jobs:** scans are scheduled and potentially long-running (many prompts × multiple engines). This needs a durable job runner with retries — likely Inngest or Trigger.dev. Vercel functions alone are not sufficient for the scan pipeline.
- **Payments / subscriptions:** TBD — this is a SaaS subscription product, so likely Stripe Billing (subscriptions, not one-off charges).
- **Analytics / events:** PostHog from day one. For a habit product, retention and streak analytics ARE the product metric — instrument from the start.

## Repo layout

Monorepo with two app codebases side by side plus reference folders. The leading underscore on reference folders means "this is not code, treat as read-only context."

```
clerow/
├── clerow-mobile/        React Native + TypeScript app (Expo, iOS + Android)
├── clerow-web/           Next.js web app (marketing + main app)
├── package.json          Root-level npm workspace
├── eslint.config.mjs     Shared ESLint baseline
├── .prettierrc           Shared formatting
└── CLAUDE.md             This file
```

**Where new code goes:**
- Mobile UI, screens, components, navigation → `clerow-mobile/`
- Web pages, marketing site, web app → `clerow-web/`
- Shared types, API clients, business logic both apps use → set up a shared package (e.g. `packages/shared/`) when the need is real, not before
- Supabase migrations, edge functions, database types → new code under the relevant workspace or a top-level `supabase/` folder

**Reference folders (`_spec`, `_design`):** read-only context, not loaded automatically. See "Reference documentation" below.

## Reference documentation

Detailed reference docs live in `_spec/` and `_design/` and are **not** loaded automatically — read them only when working on something they cover.

- `_spec/README.md` — index of product specs and reference docs. Read the relevant doc when implementing a feature it covers; don't load everything.
- `_design/README.md` — index of screen mockups by section. **Read the README first to know what's there, then open the specific image you need — never load all images at once.**
- `.claude/skills/geo-seo-expert/SKILL.md` — the canonical GEO/AEO playbook (how sites get cited by ChatGPT, Claude, Perplexity, Grok, Gemini). Auto-activates when working on the scan pipeline, `geoSteps.ts`, the content generator, the prompt set, or task generation. It is the single source the intent model in `clerow-web/lib/geoSteps.ts` and the writer `SYSTEM` prompt in `clerow-web/lib/content/generate.ts` are kept consistent with.

Anything truly durable (architecture decisions, data model, build conventions) belongs in CLAUDE.md itself, not in `_spec/`.

## Installed GEO/SEO skill suite

We've installed the full [`aaron-he-zhu/seo-geo-claude-skills`](https://github.com/aaron-he-zhu/seo-geo-claude-skills) collection — 20 markdown-only skills (no executable code; reviewed) covering the GEO/SEO lifecycle: **research** (keyword-research, competitor-analysis, content-gap-analysis, serp-analysis), **build** (geo-content-optimizer, schema-markup-generator, seo-content-writer, meta-tags-optimizer), **optimize** (on-page-seo-auditor, technical-seo-checker, internal-linking-optimizer, content-refresher), **monitor** (backlink-analyzer, rank-tracker, performance-reporter, alert-manager), and **cross-cutting** (content-quality-auditor = CORE-EEAT, domain-authority-auditor = CITE, entity-optimizer, memory-management). They auto-activate on matching tasks and complement our own `geo-seo-expert` playbook.

**Install layout (important for git):** `npx skills` writes the real skill files to `.agents/skills/<name>/` and junctions them into `.claude/skills/<name>/` so Claude Code can discover them. Only the real content in `.agents/skills/` and the `skills-lock.json` pin-file are committed; the `.claude/skills/*` junctions are machine-local and git-ignored (except our own `geo-seo-expert/`). **After cloning, run `npx skills install` to recreate the junctions** from `skills-lock.json`. To add or update skills: `npx skills add https://github.com/aaron-he-zhu/seo-geo-claude-skills --skill <name>`.

## Clerow MCP server

Clerow exposes a Model Context Protocol server so a user's AI agent (Claude Code, Cursor, any MCP client) can pull their prioritized GEO tasks, generate ready-to-ship files/content, and mark tasks done — keeping the streak. **Clerow returns content + data; the agent does the repo writes/PR** (Clerow never needs repo access).

- **Endpoint:** `POST <APP_URL>/api/mcp` (Streamable HTTP). Implemented with `mcp-handler` at `clerow-web/app/api/[transport]/route.ts` (basePath `/api`, SSE disabled).
- **Auth:** long-lived Clerow API key `clerow_sk_…`. Users mint/revoke keys in **Settings → Clerow MCP** (`/api/keys`); only a SHA-256 hash + prefix are stored (`api_keys` table, migration `0007`). The MCP resolves a presented key with the service-role admin client (`lib/apiKeys.ts` `resolveKey`) and stashes `{userId, brandId}` in `authInfo.extra`.
- **Tools** (`clerow-web/lib/mcp/tools.ts`): `get_visibility` (multi-model standings — the moat), `list_tasks` (the active Climb level), `get_site_audit` (technical gaps) — all free; `get_task_content` (deterministic robots.txt/llms.txt via `lib/content/files.ts`, else `generateFixContent`) and `complete_task` — gated to an active subscription.
- **Connect:** `claude mcp add --transport http clerow <APP_URL>/api/mcp --header "Authorization: Bearer <key>"`.
- **Env:** needs `SUPABASE_SERVICE_ROLE_KEY` (key resolution) and `ANTHROPIC_API_KEY` (content gen).
- **Not in v1:** triggering new multi-model scans from MCP (cost/latency) — re-scan stays a dashboard action; MCP can run the cheap site audit.

## Mobile build & release (EAS)

The mobile app uses Expo Application Services (EAS) for builds and submissions.

```bash
# Day-to-day dev client
eas build --platform ios --profile development

# Internal testing build (TestFlight / Play Internal)
eas build --platform ios --profile preview

# Production build + auto-submit to App Store Connect / Play Console
eas build --platform all --profile production --auto-submit
```

Notes:
- `--auto-submit` uploads the binary to the store; it does NOT push to testers or submit for review automatically — those remain manual steps.
- Apple Developer Program membership and App Store Connect API key must be set up under the company entity, not a personal Apple ID.
- Production submission is the LAST piece of infra to set up, not the first. Use `development` and `preview` profiles until you're actually ready to ship a real build.
- EAS profiles are configured in `clerow-mobile/eas.json`.

## Scope reality check

Clerow's hard part is not the app shell — it's the AI-querying-and-parsing pipeline and making the gamification loop genuinely sticky. Suggested staging:

1. **Web first.** This is a B2B SaaS tool; the buyers (marketers, founders, SEO/growth people) work on desktop. The web app is the primary surface. The mobile app is likely a companion for streak maintenance and notifications — build it second, not in parallel.
2. **The scan pipeline before the gamification.** Get "query the engines, detect brand vs competitor mentions, store results" working and trustworthy before layering points/streaks on top. The gamification is worthless if the underlying data is wrong.
3. **One engine before all engines.** Start with Perplexity (it has the cleanest API for this — search-grounded answers with citations). Add ChatGPT and Claude querying once the pattern and the parsing work. Each engine behaves differently (see Open questions).
4. **Manual scan before scheduled scans.** Get a user-triggered scan working end to end before building the scheduler, retries, and daily-task generation.
5. **Subscriptions last.** Stripe Billing once there's something worth paying for.

## Open questions / unresolved decisions

These need answers before architecture is locked:

- **How to query each engine, and whether API answers reflect what users actually see.** Perplexity has a clean API (Sonar models) returning search-grounded answers with citations — well-suited to this. But ChatGPT and Claude via their APIs do not browse identically to their consumer apps with web search enabled, so "what ChatGPT recommends" via API may differ from what a user sees in the ChatGPT app. Need to decide: query official APIs (consistent, cheaper, but may not match consumer experience), or drive the actual consumer products (matches what users see, but fragile, possibly against ToS, harder to scale). This decision shapes the entire data pipeline and the product's credibility. Resolve it early.
- **Prompt set design.** What queries does Clerow run to test a brand's visibility? Per-industry prompt templates? User-defined? AI-generated from the user's site? This is core product IP.
- **Brand/competitor mention detection.** Parsing an LLM's prose answer to reliably detect "was this brand recommended, and which competitors were" is non-trivial — needs its own approach (structured-output prompting, a classifier, or an LLM-as-judge step).
- **Cost model.** Each scan = many prompts × multiple engines × API costs. At scale this is a real COGS line. Pricing must cover it. Model this before committing to scan frequency.
- **Web vs mobile split.** What does the mobile app actually do that the web app doesn't? If it's just streak notifications, that's a thin reason to build a whole RN app on day one — consider whether mobile is v1 or v2.

## Working principles for this codebase

- Web is the primary surface; mobile is a companion. Don't build them at equal priority unless there's a clear reason.
- Get the scan/detection pipeline trustworthy before building gamification on top of it.
- The scan pipeline must be durable: retries, idempotency, partial-failure handling (one engine being down shouldn't fail the whole scan). No silent failures.
- Capture event data from day one — for a habit product, streak/retention analytics are the core metric.
- Don't run analytics queries against the production Supabase Postgres — keep a separate analytics path.
- Let the CLIs generate real project scaffolding (`create-expo-app`, `create-next-app`) on the dev machine. The placeholder package.json files in each workspace are stubs to be replaced, not maintained by hand.

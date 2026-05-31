---
name: geo-seo-expert
description: >-
  Expertise in GEO / AEO / AIO (Generative / Answer / AI-search Engine Optimization) —
  getting websites cited, summarized, and recommended by AI chatbots (ChatGPT, Claude,
  Perplexity, Grok, Gemini) rather than ranked on Google. Use when building or reasoning
  about Clerow's scan pipeline, geoSteps playbook, content generator, prompt set, or
  daily-task generation — or any time the question is "how does a site get recommended
  by AI?"
---

# GEO / SEO for AI Chatbots

The canonical playbook for **getting a website cited, summarized, and recommended by AI
answer engines** — ChatGPT, Claude, Perplexity, Grok, and Gemini. This is Clerow's
domain. The product scans a customer's site, finds where AI engines recommend
competitors instead, and turns the gaps into daily tasks; everything below is the
knowledge those tasks are built on.

Written platform-agnostic — it applies to **any brand Clerow scans**. warbls.com (an AI
music generator) appears at the end only as a worked example.

---

## 1. What GEO is, and how it differs from SEO

**GEO = AEO = AIO** — Generative / Answer / AI-search Engine Optimization. Three names
for the same goal: be the source an AI system finds, trusts, and quotes.

| | Traditional SEO | GEO |
|---|---|---|
| **Target** | Google's ranked list of 10 blue links | The synthesized answer an LLM generates |
| **Mechanism** | Keywords + backlinks + crawl/index | Probabilistic synthesis across sources |
| **Wins by** | Ranking higher than competitors | Being cited / named inside the answer |
| **Rewards** | Keyword match, link authority | Factual density, machine readability, cross-web consensus |

LLMs are **probabilistic engines that synthesize answers**, not rankers. They assemble a
response from data chunks they can extract, and they minimize hallucination by favoring
facts that **multiple sources agree on**. So the levers are different:

- **Factual density** — specific, quotable, verifiable facts (numbers, names, dates).
- **Machine readability** — structure an engine can lift directly (headings, lists, tables, schema).
- **Consensus** — the rest of the web (reviews, forums, directories) saying the same thing about you.

**SEO remains the foundation GEO builds on.** Fast, mobile-friendly, indexable, no crawl
errors, clean canonicals — if a page is invisible to crawlers it's invisible to AI. GEO
does not replace SEO; it adds an extraction-and-trust layer on top.

---

## 2. The intent model (mirrors `clerow-web/lib/geoSteps.ts`)

Clerow classifies every test prompt by **buyer intent**, and each intent has one
highest-leverage cornerstone asset. Keep this table in sync with the `PromptIntent`
union and `buildGeoSteps()` in `clerow-web/lib/geoSteps.ts` — the code and this doc are
two views of the same playbook.

| Intent | Example query | Cornerstone asset (highest leverage) | Why it works |
|---|---|---|---|
| `compare` | "Brand A vs Brand B", "best X" | **Comparison / alternatives page** with an honest feature table | LLMs pull comparison phrasing almost verbatim from side-by-side pages |
| `solution` | "best tool for [need]" | **Focused landing page** whose H1 + first paragraph answer the query, naming you as a top option | This is what models quote when recommending tools for a need |
| `problem` | "how do I [task]" | **How-to guide** that solves the task, with you as the natural tool | Gets you into the consideration set before buyers know your category |
| `branded` | "what is [Brand]" | **Branded FAQ** + clear "what we are / who it's for" section | For branded queries the model leans on your own site + third-party reviews; remove the guesswork |

Beyond the cornerstone, every prompt also gets the same compounding levers (also in `geoSteps.ts`):

- **Source-gap citations** — earn a presence on the third-party domains the engine
  already cited for that query (a listing, review, or substantive contribution). The
  single most actionable lever: get cited where the model already looks.
- **FAQ schema** — a `FAQPage`-marked Q&A block answering the exact query phrasing.
  Cheap, applies to every prompt, easy for an engine to lift.
- **Re-scan loop** — after shipping, re-scan in ~1–2 weeks (allow re-crawl) to measure
  movement and keep the streak.

---

## 3. Technical foundations — make the site crawlable by AI

If the bots can't read it, none of the content strategy matters.

### robots.txt — allow the AI crawlers

Don't block these unless there's a deliberate reason:

```
User-agent: GPTBot          # OpenAI training/crawl
User-agent: OAI-SearchBot   # ChatGPT search
User-agent: ClaudeBot       # Anthropic
User-agent: PerplexityBot   # Perplexity
User-agent: Google-Extended # Gemini / Google AI
Allow: /
```

A blocked crawler is the most common silent reason a site never gets cited. Audit this first.

### llms.txt — a roadmap for LLMs

A plain-text file at `https://example.com/llms.txt` summarizing the site, key pages, and
preferred brand description. Acts like a sitemap written for language models:

```
# Example Co
Site purpose: one-sentence, factual description of what the product does and for whom.
Key pages:
- /            : main product / instant value
- /pricing     : plans and prices (keep in sync with reality)
- /compare/... : honest comparisons vs named alternatives
- /learn       : guides and tutorials
- /faq         : frequently asked questions
```

Include summaries, FAQs, and the exact description you want models to repeat.

### Rendering

Many AI crawlers (notably `GPTBot`) **don't execute JavaScript reliably**. Use
**server-side rendering or static HTML** for any content you want cited. Test by viewing
page source (not the inspector) — if the facts aren't in the raw HTML, the bot may never
see them.

### Sitemaps & indexing

Submit a sitemap to **Bing** as well as Google — ChatGPT's search leans on the Bing
index. Keep canonical tags correct and fix crawl errors.

### Structured data (JSON-LD Schema.org)

Non-negotiable. Feeds entity data straight into the model's knowledge graph. Use the type
that fits each page:

- `SoftwareApplication` / `Product` — the app or product itself
- `FAQPage` — support and FAQ blocks
- `HowTo` — step-by-step tutorials
- `Article` / `BlogPosting` — guides and posts
- `Organization` — brand entity, sameAs links to profiles

---

## 4. Content strategy — write for comprehension and citation

### Answer-first (the inverted pyramid)

Put the **direct answer in the first 60–120 words**. Lead headings and pages with a
standalone, factual definition — not marketing fluff.

- ❌ "Get ready to unleash your inner rockstar with our revolutionary app."
- ✅ "Warbls is an AI music generator that creates original songs from a text prompt or lyrics, on web and iOS."

If the answer is buried under three paragraphs of fluff, the engine pulls from a
competitor whose answer is up top.

### High fact density

Replace vague words with specific numbers — they act as **high-confidence anchors** that
LLMs cite to avoid hallucinating.

- ❌ "lots of genres" → ✅ "supports over 50 genres"
- ❌ "fast" → ✅ "renders a full track in under 30 seconds"

Keep prices, versions, and feature lists exactly matching reality (and the App Store /
pricing page). Stale facts get dropped.

### E-E-A-T (Experience, Expertise, Authoritativeness, Trust)

Author bios, cited sources for stats, and **original insight** ("we tested 50 prompts
and found…"). First-hand data is uniquely quotable because no competitor has it.

### Conversational, question-targeted

Target the natural-language queries real buyers type into chatbots. Create pages /
sections answering "best X 2026", "how to [task]", "[Brand] vs [Rival]", "how does [X] work?".

### Fresh & dated

Add "Last Updated" timestamps and refresh core pages regularly. **Perplexity especially
favors recency.** Un-updated pages lose citations fast.

### AI-friendly formats

One clear H1; short paragraphs; H2/H3 structure; bullet lists; **comparison tables**
(LLMs heavily prioritize tabular data for "vs" queries); FAQ sections; numbered how-tos
where each step is one clear, actionable sentence.

---

## 5. Authority & consensus signals

The site alone isn't enough — the model wants to see the **rest of the web agree**.

- **Topical authority** — build clusters of related content around one subject area
  rather than scattering across everything.
- **Backlinks & mentions** — from reputable, on-topic sites. High domain authority
  correlates with AI citations. Internal linking creates a clear topical map.
- **Community seeding** — Reddit, Quora, LinkedIn, niche forums. AI models ingest these
  heavily; **Perplexity in particular** weights Reddit. Earn organic, positive mentions
  in the relevant communities.
- **Review syndication** — keep App Store / Trustpilot / G2 profiles active. Consistent
  high ratings + repeated feature mentions across review sites flag you as a trusted entity.
- **Co-citation** — link out to authoritative sources from your own content. Linking to
  high-trust domains maps your site into a more authoritative neighborhood.
- **Entity optimization** — mention the full brand name consistently with a stable
  description; get listed in directories (G2, Capterra, Product Hunt).

---

## 6. Per-engine cheat sheet

Each engine retrieves and weights differently. Clerow scans multiple engines because a
fix that lands one may not move another.

| Engine | What it weights most |
|---|---|
| **Perplexity** | Freshness + Reddit/community mentions + precise, quotable facts |
| **ChatGPT** | Strong **Bing** indexing + authoritative sources + structured data |
| **Claude** | Logical flow, depth, evidence-based reasoning — reward thorough, well-argued pages |
| **Gemini / Google** | Traditional SEO still carries heavy weight — technical performance, mobile, speed |
| **Grok** | Originality and genuine helpfulness — clear, useful, non-derivative content |

---

## 7. Measurement & iteration

- **Manual prompt testing** — ask each chatbot the target queries ("recommend tools
  for X") and note whether the brand appears and where. **Disable memory / personalization**
  for clean, repeatable tests.
- **Citation trackers** — Semrush AI tools, Profound, and similar for tracking mentions
  at scale.
- **AI-referral traffic** — monitor referrals coming from AI surfaces; update
  underperforming pages.
- **Re-scan cadence** — results aren't instant. Allow ~1–2 weeks for re-crawl after
  shipping changes, then re-scan to confirm movement. Consistent effort compounds over
  3–6 months. (This is exactly the re-scan step `geoSteps.ts` emits.)

---

## 8. How this maps onto Clerow

The code already speaks this language — when changing it, stay consistent with the
sections above:

- **`clerow-web/lib/geoSteps.ts`** — `buildGeoSteps()` is §2 in code: intent-keyed
  cornerstone asset → source-gap citations → FAQ schema → re-scan. The four intents and
  their cornerstone assets should match the §2 table exactly.
- **`clerow-web/lib/content/generate.ts`** — the `SYSTEM` prompt is a "senior AEO/GEO
  content writer." Its rules (answer-first, real Q&A pairs + `FAQPage` JSON-LD, honest
  comparison tables, no bracketed placeholders) are §3–§4 applied to generation.
- **Scan / detection logic** (`clerow-web/lib/scan/*`) — surfaces which competitors are
  recommended and which third-party domains were cited, feeding the source-gap lever.
- **`clerow-web/public/`** — where a customer-facing `robots.txt` / `llms.txt` example
  would live (none shipped yet).

### Worked example — warbls.com

warbls.com is an AI music generator (text/lyrics → song, plus remix and publish). Apply
the playbook:

- **Intent `compare`** → ship `/compare/warbls-vs-suno` and a "best AI music generators
  2026" page with an honest feature table (price, platforms, skill level).
- **Intent `solution`** → a `/text-to-music` landing page whose H1 answers "turn lyrics
  into a song with AI," naming Warbls as a top option in the first paragraph.
- **Intent `problem`** → a how-to guide: "How to make a song from a text prompt in 3 steps."
- **Source gaps** → if the engine cites `reddit.com` for music-AI queries, earn presence
  in r/aiMusic / r/ipadmusic; keep App Store reviews active.
- **Technical** → `robots.txt` allowing the AI crawlers, an `llms.txt` describing Warbls,
  `SoftwareApplication` + `FAQPage` schema, prices matching the App Store.
- **Fact density** → "supports over 50 genres," "renders in under 30 seconds" — not
  "lots of genres, fast."

### Opportunity (not in scope here)

This skill is the single source the runtime prompts implicitly encode. A future task
could enrich `geoSteps.ts` and the `generate.ts` `SYSTEM` prompt directly from these
sections so the human playbook and the generated tasks/content never drift. Flagged, not
done.

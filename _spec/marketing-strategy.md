# Clerow — Marketing strategy (first customers)

Decided 2026-06-09. We focus on **Tactic 2** (founder-led outreach with real scan data)
and **Tactic 4** (dogfood Clerow on clerow.com, build in public). **Tactic 5**
(SEO agencies as multiplier) comes later, after ~20 direct customers.

The core insight all tactics share: **the product generates its own sales pitch.**
A scan showing "ChatGPT recommends your competitors, not you" is the most
personalized outreach asset imaginable — not a cold email, a free audit with a
knife in it.

---

## Tactic 2 — Founder-led outreach with the prospect's actual scan results

**Goal:** first 10–20 paying customers, manually, and learn whether the pain is
real enough that people pay.

**Motion:**
1. Pick ONE niche we can run good buyer prompts for (B2B SaaS is the default:
   founders are reachable, care about this, and pay for tools). _Niche: TBD._
2. Run real multi-model scans on ~50 specific companies in that niche.
3. Email/DM the founder or head of growth with their actual numbers:

   > "We asked ChatGPT, Claude, and Perplexity 'best [their category] for
   > [their ICP]'. [Competitor A] and [Competitor B] came up in 9 of 12 answers.
   > You came up in 1. Here's the full breakdown."

4. Soft CTA → free scan on clerow.com. Offer the raw model answers verbatim.

**Tooling (built):** `clerow-web/scripts/prospect-probe.ts`
- `npx tsx scripts/prospect-probe.ts <url> [...]` or `--file prospects.txt [--prompts N]`
- DB-free. For each prospect URL it: enriches the brand from their own homepage
  (`enrichFromUrl`), discovers their real buyer prompts (`discoverPrompts`),
  queries every enabled engine live, runs the LLM-judge (`detectRanking`).
- Output: `outreach/<host>.md` — scan matrix (prompt × engine, who got named),
  competitor leaderboard, and a **drafted personalized cold email** using the
  real numbers.
- Needs the 5 model API keys in `clerow-web/.env.local`.

**Success signal:** replies and paid conversions from 50 emails. If 50
knife-twisting emails with real data convert zero, the pain or pricing is off —
learned in 2 weeks, not 6 months.

**First two weeks, concretely:** pick niche → 50 scans → 50 personalized emails
→ 2 leaderboard posts from the same data → methodology thread on LinkedIn/X.

---

## Tactic 4 — Dogfood Clerow on clerow.com, build in public

**Goal:** Clerow itself must be what AI models recommend for "how do I get my
brand recommended by ChatGPT" / "best GEO/AEO tools". The before/after journey
is the single most credible marketing asset this product can have.

**Motion:**
1. Keep doing GEO work on clerow.com using Clerow's own playbook (already
   started — see git history).
2. Track clerow.com's AI visibility over time with the probe script. Every run
   is a data point.
3. Publish the journey: "we used our own product to get recommended by AI —
   before/after with screenshots", posted on LinkedIn/X. The AEO conversation
   is loud and mostly evidence-free; we have evidence.

**Tooling (built):** `clerow-web/scripts/probe-clerow.ts`
- `npx tsx scripts/probe-clerow.ts` — queries all 5 engines with GEO buyer
  prompts, reports Clerow vs competitor mentions + cited domains.
- Every run appends one line per prompt × engine to
  `clerow-web/data/clerow-visibility-history.jsonl` (committed — it's the
  public proof) and prints a date-by-date trend bar chart.
- Cadence: run at least weekly; ideally after each meaningful GEO change so
  cause/effect is visible in the series.

---

## Tactic 5 — SEO agencies as multiplier (LATER)

Hold until ~20 direct customers. Every SEO agency is being asked "what about
ChatGPT?" and most have no answer. One agency white-labeling Clerow reports =
20 brands at once. Don't lead with this: agencies negotiate hard and we want
direct-customer learning first.

## Explicitly not doing (yet)

- **Paid ads** — category too new; we'd pay to educate.
- **Product Hunt as the plan** — fine as a one-day spike once the free scan
  converts; useless as a strategy.
- **Mobile app marketing** — web/desktop buyers are the customer; the app is
  retention, not acquisition.

---

## Admin dashboard (to build): "Growth" view

Internal-only dashboard turning the two tactics into a workflow. Data sources
already exist as files; the dashboard productizes them.

**Outreach pipeline (Tactic 2):**
- Prospect list: URL, brand, niche, status (`scanned → emailed → replied → trial → paid → dead`), date per stage.
- Per-prospect scan result inline: named in X/N answers, top competitors, link
  to the full matrix + the drafted email (today: `outreach/<host>.md`).
- "Probe new prospect" action = run `prospect-probe` server-side for a URL.
- Funnel counts: scanned / emailed / replied / converted — the only growth
  metric that matters right now.

**Clerow visibility tracker (Tactic 4):**
- Trend chart of `clerow-visibility-history.jsonl`: % of prompt × engine
  answers naming Clerow, by date, with per-engine breakdown.
- Annotations: mark GEO changes (commits/ship dates) on the timeline so
  before/after is screenshot-ready for build-in-public posts.
- Competitor frequency table: who the models name instead, trending.

**Implementation notes:**
- Lives in `clerow-web` behind an admin-only route (reuse existing auth; gate
  on an allowlisted user id or `is_admin` flag).
- Persistence: move prospect pipeline + probe history from files into Supabase
  tables (`growth_prospects`, `visibility_probes`) when the dashboard is built;
  the file formats above define the schema.
- The probe/scan code is already shared (`lib/engines`, `lib/scan/*`) — the
  dashboard only adds storage + UI, no new pipeline.

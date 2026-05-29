"use client";

import React from "react";
import { PageHead, PageStat } from "./AppShell";
import { GameIcon, type GameIconName } from "../GameIcon";

export function PageQuests() {
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const toggle = (k: string) => setOpen({ ...open, [k]: !open[k] });

  const daily: { id: string; title: string; time: string; impact: string; xp: number; ico: GameIconName; steps: string[] }[] = [
    { id: "d1", title: "Re-scan your domain", time: "1 min", impact: "low", xp: 15, ico: "cycle",
      steps: ["Click 'Re-scan now' on Overview", "Confirms today's streak ✓"] },
    { id: "d2", title: "Review 1 source recommendation", time: "5 min", impact: "medium", xp: 25, ico: "search",
      steps: ["Open Sources page", "Pick a row marked 'gap'", "Skim the 'Why it matters' note"] },
    { id: "d3", title: "Answer 1 thread on Reddit (r/projectmanagement)", time: "10 min", impact: "high", xp: 60, ico: "chat",
      steps: ["Pick a thread from your prompt watchlist", "Reply with substance — no link drops", "Add your domain to your profile bio"] },
    { id: "d4", title: "Post 1 LinkedIn update about a customer win", time: "8 min", impact: "medium", xp: 35, ico: "megaphone",
      steps: ["Pick a recent customer story", "Use this brief →", "Tag the customer's company"] },
    { id: "d5", title: "Check yesterday's position changes", time: "2 min", impact: "low", xp: 10, ico: "chart",
      steps: ["Open Overview → 'How each AI sees you'", "Note any movement", "Done"] },
  ];

  const active: {
    id: string; title: string; sub: string; done: number; total: number;
    xp: number; ico: GameIconName; impact: string; time: string; why: string; steps: string[];
  }[] = [
    {
      id: "a1",
      title: "Win the comparison-page prompts",
      sub: "Linear vs Jira, Linear vs Asana, Linear vs Notion",
      done: 2, total: 5, xp: 240, ico: "boxing",
      impact: "very high", time: "2–3 weeks",
      why: "Comparison pages drive 38% of your category's AI citations. You currently rank for 2 of 5.",
      steps: [
        "Ship /compare/linear-vs-jira (drafted ✓)",
        "Ship /compare/linear-vs-asana (drafted ✓)",
        "Ship /compare/linear-vs-notion (in progress)",
        "Submit all 3 to your sitemap.xml",
        "Wait 2 weeks for re-crawl, scan again",
      ],
    },
    {
      id: "a2",
      title: "Get cited on G2 + Capterra",
      sub: "You're missing from both — your top 2 rivals dominate them",
      done: 0, total: 4, xp: 320, ico: "office",
      impact: "very high", time: "1 week",
      why: "ChatGPT pulls comparison phrasing directly from G2. Each new listing typically adds 6–10 visibility points.",
      steps: [
        "Claim your G2 vendor profile",
        "Upload 3 product screenshots (from this brief)",
        "Request 5 reviews from happy customers",
        "Repeat for Capterra",
      ],
    },
    {
      id: "a3",
      title: "Ship the Reddit citation playbook",
      sub: "Show up in 3 high-signal threads per week",
      done: 1, total: 3, xp: 180, ico: "compass",
      impact: "high", time: "Ongoing",
      why: "Perplexity pulls 32% of your category's citations from Reddit. Founders ignoring Reddit is a massive opportunity.",
      steps: [
        "Subscribe to r/projectmanagement, r/startups, r/devops",
        "Set up 'monitor mentions' for Linear",
        "Reply substantively to 3 threads this week",
      ],
    },
    {
      id: "a4",
      title: "Add Product + FAQ schema to top 10 pages",
      sub: "Currently live on 4 of 10",
      done: 4, total: 10, xp: 200, ico: "bricks",
      impact: "high", time: "3 days",
      why: "Schema gives AI models structured citations. Each page typically adds 1–3 points across all models.",
      steps: [
        "We've drafted schema for all 10 pages — click the link",
        "Copy into your Next.js layout",
        "Validate with Google's Rich Results Test",
        "Re-run scan",
      ],
    },
  ];

  const milestones: { id: string; title: string; xp: number; progress: number; ico: GameIconName; desc: string }[] = [
    { id: "m1", title: "Reach position #1 in any model", xp: 500, progress: 0,  ico: "crown",  desc: "You're currently #2 in ChatGPT. Close the gap to Jira." },
    { id: "m2", title: "Hit visibility score of 80",     xp: 600, progress: 68, ico: "bullseye", desc: "You're at 68. +12 to go. Most founders take 8–12 weeks." },
    { id: "m3", title: "30-day scan streak",             xp: 300, progress: 40, ico: "flame",  desc: "12 days in, 18 to go. Don't break the chain." },
    { id: "m4", title: "Cited in all 5 AI models",       xp: 700, progress: 60, ico: "star",   desc: "Cited in 3. Gemini + AI Overviews require Team plan." },
  ];

  const impactColor = (k: string) =>
    ({
      low:         "#A8A8A8",
      medium:      "#1CB0F6",
      high:        "#F59E0B",
      "very high": "#E11D48",
    }[k] || "#A8A8A8");

  return (
    <>
      <PageHead
        title="Quests"
        sub="Tiny daily moves. Bigger weekly bets. Long-game milestones. This is what compounds."
        actions={
          <>
            <span className="streak-mini"><GameIcon name="flame" size={15} color="#F59E0B" /> 12</span>
            <button className="btn btn--ghost btn--sm">Filter</button>
          </>
        }
      />

      <div className="page-stats">
        <PageStat label="XP today"      value="+185"   sub="of 800 weekly goal" hi="success" />
        <PageStat label="Streak"        value="12"     sub="days · longest 18" hi="warn" />
        <PageStat label="Active quests" value="4"      sub="2 wins this week" />
        <PageStat label="Next reward"   value="Lvl 8"  sub="260 XP to SEO Mage" hi="accent" />
      </div>

      <h3 className="quest-section-h">
        <span><GameIcon name="calendar" size={18} /> Today&apos;s quests</span>
        <span className="quest-section-sub">refreshes 09:00 · 0/{daily.length} complete</span>
      </h3>
      <div className="quest-daily-grid">
        {daily.map((q) => (
          <div key={q.id} className="quest-daily">
            <div className="qd-head">
              <span className="qd-ico"><GameIcon name={q.ico} size={22} /></span>
              <span
                className={`qd-impact qd-impact--${q.impact.replace(" ", "-")}`}
                style={{
                  background: `color-mix(in oklab, ${impactColor(q.impact)} 18%, white)`,
                  color: impactColor(q.impact),
                }}
              >
                {q.impact}
              </span>
              <span className="qd-xp">+{q.xp} XP</span>
            </div>
            <div className="qd-title">{q.title}</div>
            <div className="qd-meta">{q.time}</div>
            <button className="qd-cta" onClick={() => toggle(q.id)}>
              {open[q.id] ? "Hide steps ↑" : "Show steps ↓"}
            </button>
            {open[q.id] && (
              <ul className="qd-steps">
                {q.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <h3 className="quest-section-h">
        <span><GameIcon name="target" size={18} /> Active quests</span>
        <span className="quest-section-sub">multi-step · this is what moves your score</span>
      </h3>
      <div className="quest-active-grid">
        {active.map((q) => {
          const pct = (q.done / q.total) * 100;
          return (
            <div key={q.id} className="quest-active">
              <div className="qa-head">
                <span className="qa-ico"><GameIcon name={q.ico} size={24} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 className="qa-title">{q.title}</h4>
                  <div className="qa-sub">{q.sub}</div>
                </div>
                <span className="qa-xp">+{q.xp} XP</span>
              </div>

              <div className="qa-meta">
                <span>
                  <span className="qa-meta-l">Impact</span>{" "}
                  <b style={{ color: impactColor(q.impact) }}>{q.impact}</b>
                </span>
                <span>
                  <span className="qa-meta-l">Time</span> <b>{q.time}</b>
                </span>
                <span>
                  <span className="qa-meta-l">Progress</span>{" "}
                  <b>
                    {q.done} / {q.total}
                  </b>
                </span>
              </div>

              <div className="qa-progress">
                <i style={{ width: `${pct}%` }} />
              </div>

              <div className="qa-why">
                <b>Why it matters:</b> {q.why}
              </div>

              <button className="qa-toggle" onClick={() => toggle(q.id)}>
                {open[q.id] ? "Hide playbook ↑" : "Show step-by-step playbook ↓"}
              </button>
              {open[q.id] && (
                <ol className="qa-steps">
                  {q.steps.map((s, i) => (
                    <li key={i} className={i < q.done ? "done" : ""}>
                      <span className="qa-tick">{i < q.done ? "✓" : i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>

      <h3 className="quest-section-h">
        <span><GameIcon name="mountain" size={18} /> Milestones</span>
        <span className="quest-section-sub">rare, big XP · what veterans chase</span>
      </h3>
      <div className="milestones-grid">
        {milestones.map((m) => (
          <div key={m.id} className="milestone">
            <div className="ms-head">
              <span className="ms-ico"><GameIcon name={m.ico} size={22} /></span>
              <span className="ms-xp">+{m.xp} XP</span>
            </div>
            <div className="ms-title">{m.title}</div>
            <div className="ms-desc">{m.desc}</div>
            <div className="ms-progress">
              <i style={{ width: `${m.progress}%` }} />
            </div>
            <div className="ms-progress-l">{m.progress}% there</div>
          </div>
        ))}
      </div>
    </>
  );
}

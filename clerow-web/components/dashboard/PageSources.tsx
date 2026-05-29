"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { GameIcon } from "../GameIcon";
import { PageHead, PageStat } from "./AppShell";

export function PageSources() {
  const router = useRouter();
  const navigate = (k: string) => router.push(`/dashboard/${k}`);

  const sources = [
    { domain: "reddit.com",       type: "UGC",       cited: 32, you: 0, comp: 14, fav: "Notion",  note: "r/projectmanagement + r/startups dominate citations.",         quest: 90 },
    { domain: "g2.com",           type: "Directory", cited: 24, you: 0, comp: 22, fav: "Asana",   note: "ChatGPT pulls comparison phrasing directly from G2.",          quest: 150 },
    { domain: "wikipedia.org",    type: "Editorial", cited: 18, you: 1, comp: 7,  fav: "Jira",    note: "You have a stub. Expand the 'Tools used by' section.",         quest: 60 },
    { domain: "ycombinator.com",  type: "Editorial", cited: 14, you: 3, comp: 5,  fav: "Jira",    note: "HN posts surface in 8 of your prompts.",                       quest: 0 },
    { domain: "producthunt.com",  type: "Directory", cited: 12, you: 1, comp: 4,  fav: "Notion",  note: "Refresh your PH listing — your screenshots are 2 years old.",  quest: 40 },
    { domain: "capterra.com",     type: "Directory", cited: 11, you: 0, comp: 18, fav: "Monday",  note: "Listing missing. High-impact, ~30 min to set up.",             quest: 120 },
    { domain: "youtube.com",      type: "UGC",       cited:  9, you: 0, comp: 11, fav: "ClickUp", note: "Sponsor 'Theo' or 'Fireship' — they're cited 3× this month.",  quest: 200 },
    { domain: "linkedin.com",     type: "UGC",       cited:  8, you: 4, comp: 6,  fav: "Asana",   note: "Your CEO posts get cited. Encourage more.",                    quest: 30 },
    { domain: "linear.app/blog",  type: "Yours",     cited:  6, you: 6, comp: 0,  fav: "—",       note: "All citations are yours. Ship more comparison posts.",         quest: 80 },
    { domain: "github.com",       type: "UGC",       cited:  5, you: 2, comp: 3,  fav: "Plane",   note: "Open-source repos near your space cite Plane more.",           quest: 50 },
    { domain: "indiehackers.com", type: "UGC",       cited:  4, you: 0, comp: 2,  fav: "Notion",  note: "Founder threads. Answer 2 with substance.",                    quest: 40 },
    { domain: "forbes.com",       type: "Editorial", cited:  3, you: 0, comp: 3,  fav: "Asana",   note: "Editorial gap. Pitch a guest post or get a quote in.",         quest: 100 },
  ];
  const typeCol = (t: string) =>
    ({
      UGC:        "#7C3AED",
      Directory:  "#F59E0B",
      Editorial:  "#1CB0F6",
      Yours:      "#58CC02",
      Competitor: "#E11D48",
    }[t] || "#A8A8A8");

  return (
    <>
      <PageHead
        title="Sources"
        sub="Where the AI models get their answers. Your most actionable page — and your competitors' biggest blind spot."
        actions={
          <>
            <button className="btn btn--ghost btn--sm">
              <Icon name="download" size={14} />
              Export
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => navigate("quests")}>
              Open quests →
            </button>
          </>
        }
      />

      <div className="page-stats">
        <PageStat label="Sources tracked" value="142" sub="across your category" />
        <PageStat label="You appear in"   value="18"  sub="13% coverage" hi="warn" />
        <PageStat label="Competitor gaps" value="9"   sub="they're cited, you aren't" hi="danger" />
        <PageStat label="Quick wins"      value="3"   sub="< 1h work each" hi="success" />
      </div>

      <div className="callout callout--accent">
        <span className="callout-ico"><GameIcon name="idea" size={20} color="#F59E0B" /></span>
        <div>
          <b>Sources are where you go to win.</b>
          <span>
            {" "}Prompts tell you you&apos;re losing. Sources tell you where to show up to start winning. Fix the top 3 gaps → est.{" "}
            <b style={{ color: "var(--accent-2)" }}>+18 visibility points</b>.
          </span>
        </div>
      </div>

      <div className="app-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="data-table">
          <div className="dt-head">
            <span style={{ flex: 1.8 }}>Source</span>
            <span style={{ flex: 0.8 }}>Type</span>
            <span style={{ flex: 0.7, textAlign: "center" }}>Cited</span>
            <span style={{ flex: 0.7, textAlign: "center" }}>You</span>
            <span style={{ flex: 0.7, textAlign: "center" }}>Top rival</span>
            <span style={{ flex: 1.5 }}>Why it matters</span>
            <span style={{ flex: 1, textAlign: "right" }}>Action</span>
          </div>
          {sources.map((s, i) => {
            const gap = s.cited > 0 && s.you === 0;
            const losing = s.you > 0 && s.comp > s.you;
            return (
              <div
                key={i}
                className={`dt-row ${gap ? "dt-row--invisible" : ""} ${losing ? "dt-row--losing" : ""}`}
              >
                <span style={{ flex: 1.8 }} className="dt-source">
                  <span className="source-fav" style={{ background: typeCol(s.type) }} />
                  <span>{s.domain}</span>
                </span>
                <span style={{ flex: 0.8 }}>
                  <span
                    className="src-type"
                    style={{
                      background: `color-mix(in oklab, ${typeCol(s.type)} 14%, white)`,
                      color: typeCol(s.type),
                      border: `1px solid color-mix(in oklab, ${typeCol(s.type)} 30%, transparent)`,
                    }}
                  >
                    {s.type}
                  </span>
                </span>
                <span style={{ flex: 0.7, textAlign: "center" }} className="dt-pos">{s.cited}%</span>
                <span
                  style={{
                    flex: 0.7,
                    textAlign: "center",
                    color: s.you === 0 ? "var(--danger)" : "var(--ink)",
                  }}
                  className="dt-pos"
                >
                  {s.you === 0 ? "0" : s.you}
                </span>
                <span style={{ flex: 0.7, textAlign: "center", fontSize: 12.5 }}>
                  <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{s.comp}</span>
                    {s.fav !== "—" && (
                      <span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 700 }}>{s.fav}</span>
                    )}
                  </span>
                </span>
                <span
                  style={{ flex: 1.5, fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500 }}
                >
                  {s.note}
                </span>
                <span style={{ flex: 1, textAlign: "right" }}>
                  {s.quest > 0 ? (
                    <button className="btn-quest" onClick={() => navigate("quests")}>
                      Make quest <b>+{s.quest} XP</b>
                    </button>
                  ) : (
                    <span className="dt-winning">Yours ✓</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

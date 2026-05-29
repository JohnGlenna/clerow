"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { GameIcon } from "../GameIcon";
import { MascotClerow } from "../Mascot";
import { PageHead } from "./AppShell";

export function PageReports() {
  const router = useRouter();
  const navigate = (k: string) => router.push(`/dashboard/${k}`);
  return (
    <>
      <PageHead
        title="Reports"
        sub="Auto-generated each Monday. Your accountability artifact — and your free distribution."
        actions={
          <>
            <button className="btn btn--ghost btn--sm">
              <Icon name="download" size={14} />
              Download PDF
            </button>
            <button className="btn btn--primary btn--sm">
              <Icon name="external" size={14} />
              Share link
            </button>
          </>
        }
      />

      <WeeklySummary onNavigate={navigate} />

      <h3 className="quest-section-h">
        <span><GameIcon name="world" size={18} /> Public share card</span>
        <span className="quest-section-sub">Clerow Wrapped · post to X, get distribution</span>
      </h3>
      <ShareCard />

      <h3 className="quest-section-h">
        <span><GameIcon name="folder" size={18} /> Past reports</span>
        <span className="quest-section-sub">12 weeks tracked</span>
      </h3>
      <PastReports />

      <h3 className="quest-section-h">
        <span><GameIcon name="office" size={18} /> White-label client reports</span>
        <span className="quest-section-sub">Team plan · for agencies</span>
      </h3>
      <WhiteLabelCard />
    </>
  );
}

function WeeklySummary({ onNavigate }: { onNavigate: (k: string) => void }) {
  const positions = [
    { model: "ChatGPT",    from: "#4", to: "#2", change: "+2", good: true },
    { model: "Claude",     from: "#3", to: "#3", change: "—",  good: null },
    { model: "Perplexity", from: "#3", to: "#4", change: "−1", good: false },
    { model: "Gemini",     from: "#6", to: "#5", change: "+1", good: true },
  ];
  return (
    <div className="report-card">
      <div className="report-header">
        <div>
          <div className="report-week-label">Week of Mar 16 · 2026</div>
          <h2 className="report-title">You climbed 2 spots in ChatGPT this week.</h2>
          <p className="report-sub">+8 visibility points · 5 quests shipped · streak intact</p>
        </div>
        <div className="report-score-tile">
          <span className="lbl">Score</span>
          <span className="num">
            68 <small style={{ color: "var(--success)" }}>+8</small>
          </span>
        </div>
      </div>

      <div className="report-grid">
        <div className="report-block">
          <h4><GameIcon name="chart" size={16} /> Position changes</h4>
          <div className="report-positions">
            {positions.map((p, i) => (
              <div key={i} className="rp-row">
                <span className="rp-model">{p.model}</span>
                <span className="rp-from">{p.from}</span>
                <span className="rp-arrow">→</span>
                <span className="rp-to">{p.to}</span>
                <span
                  className={`rp-change ${p.good === true ? "good" : p.good === false ? "bad" : ""}`}
                >
                  {p.change}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-block">
          <h4><GameIcon name="check" size={16} color="#58CC02" /> Quests shipped</h4>
          <ul className="report-list">
            <li>
              <span className="bullet bullet--success" /> FAQ schema added to homepage{" "}
              <b>+50 XP</b>
            </li>
            <li>
              <span className="bullet bullet--success" /> /compare/jira draft published{" "}
              <b>+200 XP</b>
            </li>
            <li>
              <span className="bullet bullet--success" /> 3 Reddit replies in r/projectmanagement{" "}
              <b>+90 XP</b>
            </li>
            <li>
              <span className="bullet bullet--success" /> Product schema on /features <b>+80 XP</b>
            </li>
            <li>
              <span className="bullet bullet--success" /> G2 listing claimed <b>+50 XP</b>
            </li>
          </ul>
        </div>

        <div className="report-block report-block--win">
          <h4><GameIcon name="trophy" size={16} /> Biggest win</h4>
          <p>
            <b>You overtook Asana in ChatGPT.</b> Two weeks ago you were 4th. The /compare/jira page + 5 Reddit answers did it. Asana hasn&apos;t shipped anything new in this prompt cluster for 6 weeks.
          </p>
        </div>

        <div className="report-block report-block--opp">
          <h4><GameIcon name="target" size={16} /> Biggest opportunity</h4>
          <p>
            <b>Get listed on G2 + Capterra.</b> Your top rival Jira pulls 22 citations from these directories. You pull 0. Estimated{" "}
            <b style={{ color: "var(--accent-2)" }}>+18 visibility points</b> within 4 weeks of listing.
          </p>
        </div>
      </div>

      <div className="report-next">
        <span className="next-label">Focus next week</span>
        <div className="next-tasks">
          <span className="next-task"><GameIcon name="quill" size={14} /> Ship /compare/notion (drafted)</span>
          <span className="next-task"><GameIcon name="office" size={14} /> Submit G2 + Capterra listings</span>
          <span className="next-task"><GameIcon name="chat" size={14} /> 5 Reddit replies (r/startups)</span>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => onNavigate("quests")}>
          Open quests <span className="arrow">→</span>
        </button>
      </div>
    </div>
  );
}

function ShareCard() {
  return (
    <div className="share-wrap">
      <div className="share-card">
        <div className="share-card-top">
          <div className="brand" style={{ fontSize: 18 }}>
            <MascotClerow size={28} /> Clerow Wrapped
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-3)",
              fontWeight: 700,
            }}
          >
            WEEK 11 · MAR 2026
          </span>
        </div>
        <div className="share-card-body">
          <div className="share-stat">
            <div className="big">↑ #6 → #2</div>
            <div className="lbl">in ChatGPT · last 30 days</div>
          </div>
          <div className="share-bottom">
            <div className="share-stat-mini">
              <div className="lbl">Visibility</div>
              <div className="val">+24%</div>
            </div>
            <div className="share-stat-mini">
              <div className="lbl">XP earned</div>
              <div className="val">2,840</div>
            </div>
            <div className="share-stat-mini">
              <div className="lbl">Streak</div>
              <div className="val"><GameIcon name="flame" size={15} color="#F59E0B" /> 12d</div>
            </div>
          </div>
        </div>
        <div className="share-card-foot">linear.app · powered by clerow.com</div>
      </div>

      <div className="share-actions">
        <h4>Share your climb</h4>
        <p>
          Solo founders posting their Clerow Wrapped on X get an avg{" "}
          <b>2.4k impressions</b>. Free distribution. We even draft the post.
        </p>
        <div className="share-buttons">
          <button className="btn btn--dark btn--sm">𝕏 Post to X</button>
          <button className="btn btn--ghost btn--sm">Copy image</button>
          <button className="btn btn--ghost btn--sm">
            <Icon name="external" size={12} />
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
}

function PastReports() {
  const past = [
    { wk: "Week of Mar 9",  score: 60, change: "+5", notes: "Reddit playbook launched" },
    { wk: "Week of Mar 2",  score: 55, change: "+4", notes: "Schema overhaul shipped" },
    { wk: "Week of Feb 23", score: 51, change: "+2", notes: "Steady week, 1 quest skipped" },
    { wk: "Week of Feb 16", score: 49, change: "+6", notes: "First comparison page live" },
    { wk: "Week of Feb 9",  score: 43, change: "+3", notes: "Onboarding completed" },
  ];
  return (
    <div className="app-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="data-table">
        <div className="dt-head">
          <span style={{ flex: 1.4 }}>Week</span>
          <span style={{ flex: 0.6, textAlign: "right" }}>Score</span>
          <span style={{ flex: 0.6, textAlign: "right" }}>Change</span>
          <span style={{ flex: 2 }}>Headline</span>
          <span style={{ flex: 1, textAlign: "right" }} />
        </div>
        {past.map((p, i) => (
          <div key={i} className="dt-row">
            <span style={{ flex: 1.4, fontWeight: 700 }}>{p.wk}</span>
            <span style={{ flex: 0.6, textAlign: "right" }} className="dt-pos">{p.score}</span>
            <span style={{ flex: 0.6, textAlign: "right" }} className="dt-trend up">{p.change}</span>
            <span style={{ flex: 2, fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>
              {p.notes}
            </span>
            <span style={{ flex: 1, textAlign: "right" }}>
              <button className="btn btn--ghost btn--sm">
                <Icon name="download" size={12} />
                PDF
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhiteLabelCard() {
  return (
    <div className="whitelabel-card">
      <div className="wl-left">
        <span className="tier-lock"><GameIcon name="locked" size={13} /> Team plan</span>
        <h3>White-label reports for your clients.</h3>
        <p>
          Drop your agency logo and brand colors. Auto-generated weekly. Send to 10 clients in one click. Per-seat contribution breakdowns included.
        </p>
        <ul>
          <li><Icon name="check" size={12} /> Your logo + colors on every report</li>
          <li><Icon name="check" size={12} /> Custom domain for shareable links</li>
          <li><Icon name="check" size={12} /> Per-seat contribution breakdown</li>
          <li><Icon name="check" size={12} /> Bulk send to up to 25 clients</li>
        </ul>
        <button className="btn btn--primary btn--lg">Upgrade to Team — $89/mo</button>
      </div>
      <div className="wl-right">
        <div className="wl-mock">
          <div className="wl-mock-header">
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "#7C3AED",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              AC
            </span>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Acme Agency · Client report</span>
          </div>
          <div className="wl-mock-title">Bryggi.no — Week of Mar 16</div>
          <div className="wl-mock-row">
            <span>AI visibility</span>
            <b style={{ color: "var(--success)" }}>+12%</b>
          </div>
          <div className="wl-mock-row">
            <span>Position in ChatGPT</span>
            <b>#3 → #2</b>
          </div>
          <div className="wl-mock-row">
            <span>Quests shipped</span>
            <b>4 of 5</b>
          </div>
          <div className="wl-mock-foot">Powered by Acme · weekly</div>
        </div>
      </div>
    </div>
  );
}

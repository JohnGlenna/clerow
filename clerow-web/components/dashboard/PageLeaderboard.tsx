"use client";

import React from "react";
import { Icon } from "../Icon";
import { PageHead, PageStat } from "./AppShell";

export function PageLeaderboard() {
  const [tab, setTab] = React.useState<"category" | "users">("category");

  return (
    <>
      <PageHead
        title="Leaderboard"
        sub="Your category, your XP race. Compete or close the tab. Up to you."
        actions={
          <>
            <button className="btn btn--ghost btn--sm">
              <Icon name="download" size={14} />
              Export
            </button>
            <button className="btn btn--primary btn--sm" disabled>
              This week
            </button>
          </>
        }
      />

      <div className="page-stats">
        <PageStat label="Your rank"             value="#2"   sub="in B2B SaaS · PM" hi="success" />
        <PageStat label="Gap to #1"             value="+12%" sub="vis · ~2 weeks of quests" hi="warn" />
        <PageStat label="Climb this month"      value="↑3"   sub="from #5 to #2" hi="success" />
        <PageStat label="Defenders close behind" value="2"   sub="within 4% of you" />
      </div>

      <div className="page-tabs">
        <button className={tab === "category" ? "on" : ""} onClick={() => setTab("category")}>
          Your category
        </button>
        <button className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}>
          Clerow users <span className="cnt">3,140</span>
        </button>
      </div>

      {tab === "category" ? <BoardCategory /> : <BoardUsers />}
    </>
  );
}

function BoardCategory() {
  const rows = [
    { rank: 1, name: "Jira",         vis: 78, pos: 1.4, sent: 76, delta: "+0.2", up: true,  sw: "#1CB0F6" },
    { rank: 2, name: "Linear (you)", vis: 66, pos: 2.1, sent: 92, delta: "+1.2", up: true,  sw: "#F59E0B", me: true },
    { rank: 3, name: "Asana",        vis: 54, pos: 3.4, sent: 88, delta: "+0.4", up: true,  sw: "#58CC02" },
    { rank: 4, name: "Notion",       vis: 47, pos: 3.9, sent: 82, delta: "−0.3", up: false, sw: "#A560FF" },
    { rank: 5, name: "Monday",       vis: 39, pos: 4.6, sent: 78, delta: "−0.1", up: false, sw: "#E11D48" },
    { rank: 6, name: "ClickUp",      vis: 34, pos: 5.2, sent: 70, delta: "+0.6", up: true,  sw: "#7C3AED" },
    { rank: 7, name: "Shortcut",     vis: 22, pos: 6.1, sent: 74, delta: "+0.1", up: true,  sw: "#D97706" },
    { rank: 8, name: "Plane",        vis: 18, pos: 6.8, sent: 68, delta: "+0.3", up: true,  sw: "#0EA5E9" },
  ];
  return (
    <>
      <div className="callout">
        <span className="callout-ico">⚠️</span>
        <div>
          <b>Single-day numbers fluctuate.</b>
          <span>
            {" "}AI citations aren&apos;t deterministic — they bounce ±3% day to day. We compute leaderboard from 7-day rolling averages so what you see is signal, not noise.
          </span>
        </div>
      </div>

      <div className="app-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="data-table">
          <div className="dt-head">
            <span style={{ flex: 0.3, textAlign: "center" }}>#</span>
            <span style={{ flex: 1.5 }}>Brand</span>
            <span style={{ flex: 1, textAlign: "center" }}>Visibility</span>
            <span style={{ flex: 0.6, textAlign: "center" }}>Avg pos.</span>
            <span style={{ flex: 0.6, textAlign: "center" }}>Sentiment</span>
            <span style={{ flex: 0.7, textAlign: "right" }}>Week Δ</span>
            <span style={{ flex: 1.4, textAlign: "right" }}>Gap to next</span>
          </div>
          {rows.map((r) => (
            <div key={r.rank} className={`dt-row ${r.me ? "dt-row--me" : ""}`}>
              <span style={{ flex: 0.3, textAlign: "center" }}>
                <span
                  className={`rank-pill ${
                    r.rank === 1
                      ? "rank-pill--gold"
                      : r.rank === 2
                        ? "rank-pill--silver"
                        : r.rank === 3
                          ? "rank-pill--bronze"
                          : ""
                  }`}
                >
                  {r.rank}
                </span>
              </span>
              <span style={{ flex: 1.5 }} className="dt-brand">
                <span className="ex-sw" style={{ background: r.sw }}>
                  {r.name[0]}
                </span>
                <span style={{ fontWeight: 700 }}>{r.name}</span>
                {r.me && <span className="ex-you">YOU</span>}
              </span>
              <span
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                }}
                className="dt-vis-wrap"
              >
                <span className="dt-vis-bar">
                  <i
                    style={{
                      width: `${(r.vis / 80) * 100}%`,
                      background: r.me ? "var(--accent)" : "var(--ink)",
                    }}
                  />
                </span>
                <span className="dt-pos" style={{ minWidth: 38, textAlign: "right" }}>
                  {r.vis}%
                </span>
              </span>
              <span style={{ flex: 0.6, textAlign: "center" }} className="dt-pos">{r.pos}</span>
              <span style={{ flex: 0.6, textAlign: "center" }} className="dt-pos">{r.sent}</span>
              <span style={{ flex: 0.7, textAlign: "right" }} className={`dt-trend ${r.up ? "up" : "down"}`}>
                {r.delta}
              </span>
              <span
                style={{
                  flex: 1.4,
                  textAlign: "right",
                  fontSize: 12.5,
                  color: "var(--ink-2)",
                  fontWeight: 600,
                }}
              >
                {r.me ? (
                  <span style={{ color: "var(--accent-2)", fontWeight: 800 }}>+12% to pass Jira</span>
                ) : r.rank === 1 ? (
                  <span style={{ color: "var(--success)" }}>Leader</span>
                ) : (
                  `${rows[r.rank - 2].vis - r.vis}% to #${r.rank - 1}`
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function BoardUsers() {
  const rows = [
    { rank: 1,  name: "@petros",     url: "stipe.app",    xp: 24840, streak: 42, lvl: 12, sw: "#7C3AED" },
    { rank: 2,  name: "@mira_s",     url: "bryggi.no",    xp: 21210, streak: 31, lvl: 11, sw: "#F59E0B" },
    { rank: 3,  name: "@thomasx",    url: "graphite.dev", xp: 18810, streak: 28, lvl: 10, sw: "#1CB0F6" },
    { rank: 4,  name: "@sepy",       url: "glide.app",    xp: 15402, streak: 19, lvl: 9,  sw: "#58CC02" },
    { rank: 5,  name: "@johnclerow", url: "linear.app",   xp:  7402, streak: 12, lvl: 7,  sw: "#E11D48", me: true },
    { rank: 6,  name: "@ethans",     url: "flux.so",      xp:  6815, streak:  9, lvl: 7,  sw: "#A560FF" },
    { rank: 7,  name: "@helena_b",   url: "tundra.dev",   xp:  5930, streak:  7, lvl: 6,  sw: "#10A37F" },
    { rank: 8,  name: "@anon",       url: "—",            xp:  5210, streak: 11, lvl: 6,  sw: "#0EA5E9" },
    { rank: 9,  name: "@anon",       url: "—",            xp:  4880, streak:  4, lvl: 5,  sw: "#D97706" },
    { rank: 10, name: "@kaspernor",  url: "skuld.io",     xp:  4012, streak: 14, lvl: 5,  sw: "#4285F4" },
  ];
  return (
    <>
      <div className="callout callout--accent">
        <span className="callout-ico">🎮</span>
        <div>
          <b>You&apos;re #5 of 3,140 Clerow founders this week.</b>
          <span>
            {" "}Pass @sepy (Glide) by closing 4 quests in the next 6 days. Want your URL hidden? Toggle &apos;Anonymous&apos; in settings.
          </span>
        </div>
        <button className="btn btn--ghost btn--sm">Settings</button>
      </div>

      <div className="app-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="data-table">
          <div className="dt-head">
            <span style={{ flex: 0.3, textAlign: "center" }}>#</span>
            <span style={{ flex: 1.4 }}>Founder</span>
            <span style={{ flex: 1.2 }}>Site</span>
            <span style={{ flex: 0.7, textAlign: "right" }}>Level</span>
            <span style={{ flex: 0.7, textAlign: "right" }}>Streak</span>
            <span style={{ flex: 1, textAlign: "right" }}>XP this week</span>
          </div>
          {rows.map((r) => (
            <div key={r.rank} className={`dt-row ${r.me ? "dt-row--me" : ""}`}>
              <span style={{ flex: 0.3, textAlign: "center" }}>
                <span
                  className={`rank-pill ${
                    r.rank === 1
                      ? "rank-pill--gold"
                      : r.rank === 2
                        ? "rank-pill--silver"
                        : r.rank === 3
                          ? "rank-pill--bronze"
                          : ""
                  }`}
                >
                  {r.rank}
                </span>
              </span>
              <span style={{ flex: 1.4 }} className="dt-brand">
                <span className="ex-sw" style={{ background: r.sw }}>
                  {r.name[1] === "a" ? "?" : r.name[1].toUpperCase()}
                </span>
                <span style={{ fontWeight: 700 }}>{r.name}</span>
                {r.me && <span className="ex-you">YOU</span>}
              </span>
              <span
                style={{
                  flex: 1.2,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  color: "var(--ink-2)",
                  fontWeight: 600,
                }}
              >
                {r.url}
              </span>
              <span style={{ flex: 0.7, textAlign: "right" }} className="dt-pos">
                ⚡ {r.lvl}
              </span>
              <span style={{ flex: 0.7, textAlign: "right" }} className="dt-pos">
                🔥 {r.streak}
              </span>
              <span style={{ flex: 1, textAlign: "right" }} className="dt-pos">
                {r.xp.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

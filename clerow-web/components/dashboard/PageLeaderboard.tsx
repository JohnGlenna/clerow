"use client";

import React from "react";
import { GameIcon } from "../GameIcon";
import { PageHead, PageStat } from "./AppShell";
import { useDashboard } from "@/lib/useDashboard";
import type { DashboardCompetitor } from "@/lib/types";
import type { LeaderboardResponse } from "@/app/api/leaderboard/route";

const SWATCHES = ["#1CB0F6", "#F59E0B", "#58CC02", "#A560FF", "#E11D48", "#7C3AED", "#D97706", "#0EA5E9"];

export function PageLeaderboard() {
  const [tab, setTab] = React.useState<"category" | "users">("category");
  const { data, loading } = useDashboard();

  const competitors = data?.competitors ?? [];
  const me = competitors.find((c) => c.isYou);
  const leader = competitors[0];
  const myRank = me?.rank ?? null;
  const ahead = me ? competitors.find((c) => c.rank === me.rank - 1) : null;
  const gapToNext = me && ahead ? Math.max(0, ahead.visibility - me.visibility) : null;

  return (
    <>
      <PageHead
        title="Leaderboard"
        sub="How you stack up against the brands AI recommends in your category."
      />

      <div className="page-stats">
        <PageStat label="Your rank" value={myRank != null ? `#${myRank}` : "—"} sub={`of ${competitors.length || "—"} brands`} hi={myRank === 1 ? "success" : "warn"} />
        <PageStat
          label="Gap to next"
          value={gapToNext != null ? `+${gapToNext}%` : myRank === 1 ? "Leader" : "—"}
          sub={ahead ? `to pass ${ahead.name}` : "you're on top"}
          hi={myRank === 1 ? "success" : "warn"}
        />
        <PageStat label="Your visibility" value={me ? `${me.visibility}%` : "—"} sub="across your models" />
        <PageStat label="Category leader" value={leader?.name ?? "—"} sub={leader ? `${leader.visibility}% visibility` : "scan to see"} hi="accent" />
      </div>

      <div className="page-tabs">
        <button className={tab === "category" ? "on" : ""} onClick={() => setTab("category")}>
          Your category
        </button>
        <button className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}>
          Clerow founders
        </button>
      </div>

      {tab === "category" ? (
        <BoardCategory competitors={competitors} loading={loading} />
      ) : (
        <BoardUsers />
      )}
    </>
  );
}

function BoardCategory({ competitors, loading }: { competitors: DashboardCompetitor[]; loading: boolean }) {
  if (loading) return <div className="app-card" style={{ padding: 24 }}>Loading your category…</div>;
  if (competitors.length === 0) {
    return (
      <div className="app-card" style={{ padding: 24, textAlign: "center" }}>
        No category data yet — run a scan and the brands AI recommends will appear here, ranked.
      </div>
    );
  }
  const maxVis = Math.max(...competitors.map((c) => c.visibility), 1);

  return (
    <>
      <div className="callout">
        <span className="callout-ico">⚠️</span>
        <div>
          <b>AI citations aren&apos;t deterministic.</b>
          <span> They bounce day to day. Treat this as a directional read of who AI recommends in your space — and re-scan regularly to track the trend.</span>
        </div>
      </div>

      <div className="app-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="data-table">
          <div className="dt-head">
            <span style={{ flex: 0.3, textAlign: "center" }}>#</span>
            <span style={{ flex: 1.5 }}>Brand</span>
            <span style={{ flex: 1, textAlign: "center" }}>Visibility</span>
            <span style={{ flex: 0.6, textAlign: "center" }}>Avg pos.</span>
            <span style={{ flex: 1.4, textAlign: "right" }}>Gap to next</span>
          </div>
          {competitors.map((r, i) => {
            const ahead = competitors[i - 1];
            const gap = ahead ? ahead.visibility - r.visibility : 0;
            return (
              <div key={`${r.rank}-${r.name}`} className={`dt-row ${r.isYou ? "dt-row--me" : ""}`}>
                <span style={{ flex: 0.3, textAlign: "center" }}>
                  <span className={`rank-pill ${r.rank === 1 ? "rank-pill--gold" : r.rank === 2 ? "rank-pill--silver" : r.rank === 3 ? "rank-pill--bronze" : ""}`}>
                    {r.rank}
                  </span>
                </span>
                <span style={{ flex: 1.5 }} className="dt-brand">
                  <span className="ex-sw" style={{ background: r.isYou ? "#F59E0B" : SWATCHES[i % SWATCHES.length] }}>
                    {r.name[0]?.toUpperCase()}
                  </span>
                  <span style={{ fontWeight: 700 }}>{r.name}</span>
                  {r.isYou && <span className="ex-you">YOU</span>}
                </span>
                <span style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                  <span className="dt-vis-bar">
                    <i style={{ width: `${(r.visibility / maxVis) * 100}%`, background: r.isYou ? "var(--accent)" : "var(--ink)" }} />
                  </span>
                  <span className="dt-pos" style={{ minWidth: 38, textAlign: "right" }}>{r.visibility}%</span>
                </span>
                <span style={{ flex: 0.6, textAlign: "center" }} className="dt-pos">{r.position != null ? r.position : "—"}</span>
                <span style={{ flex: 1.4, textAlign: "right", fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
                  {i === 0 ? (
                    <span style={{ color: "var(--success)" }}>Leader</span>
                  ) : r.isYou ? (
                    <span style={{ color: "var(--accent-2)", fontWeight: 800 }}>+{gap}% to #{r.rank - 1}</span>
                  ) : (
                    `${gap}% to #${r.rank - 1}`
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

function BoardUsers() {
  const [board, setBoard] = React.useState<LeaderboardResponse | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!cancelled && res.ok) setBoard(json);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (board == null) return <div className="app-card" style={{ padding: 24 }}>Loading founders…</div>;

  if (!board.available || board.total <= 1) {
    return (
      <div className="app-card" style={{ padding: "48px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <GameIcon name="gamepad" size={40} />
        </div>
        <h4 style={{ fontSize: 18, marginBottom: 6 }}>The founder leaderboard is filling up.</h4>
        <p style={{ color: "var(--ink-2)", maxWidth: 460, margin: "0 auto", fontWeight: 500 }}>
          {board.yourRank
            ? `You're #${board.yourRank} of ${board.total} so far. As more founders track their AI visibility, you'll race them on score and streaks here — anonymous by default.`
            : "As founders track their AI visibility, you'll race them on score and streaks here — anonymous by default. Run a scan to join the board."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="callout callout--accent">
        <span className="callout-ico"><GameIcon name="gamepad" size={22} /></span>
        <div>
          <b>
            {board.yourRank ? `You're #${board.yourRank} of ${board.total} Clerow founders.` : `${board.total} founders tracking their AI visibility.`}
          </b>
          <span> Ranked by AI visibility score. Other founders are anonymized — yours is the only name shown.</span>
        </div>
      </div>

      <div className="app-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="data-table">
          <div className="dt-head">
            <span style={{ flex: 0.3, textAlign: "center" }}>#</span>
            <span style={{ flex: 1.5 }}>Founder</span>
            <span style={{ flex: 1, textAlign: "right" }}>Visibility</span>
            <span style={{ flex: 1, textAlign: "right" }}>Score</span>
          </div>
          {board.rows.map((r) => (
            <div key={r.rank} className={`dt-row ${r.isYou ? "dt-row--me" : ""}`}>
              <span style={{ flex: 0.3, textAlign: "center" }}>
                <span className={`rank-pill ${r.rank === 1 ? "rank-pill--gold" : r.rank === 2 ? "rank-pill--silver" : r.rank === 3 ? "rank-pill--bronze" : ""}`}>
                  {r.rank}
                </span>
              </span>
              <span style={{ flex: 1.5 }} className="dt-brand">
                <span className="ex-sw" style={{ background: r.isYou ? "#F59E0B" : "#A8A8A8" }}>
                  {r.isYou ? r.label[0]?.toUpperCase() : "?"}
                </span>
                <span style={{ fontWeight: 700 }}>{r.isYou ? r.label : "Anonymous founder"}</span>
                {r.isYou && <span className="ex-you">YOU</span>}
              </span>
              <span style={{ flex: 1, textAlign: "right" }} className="dt-pos">{r.visibility}%</span>
              <span style={{ flex: 1, textAlign: "right" }} className="dt-pos">{r.overall}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

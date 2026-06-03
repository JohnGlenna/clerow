"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AiIcon } from "../../ui/AiIcon";
import { LDIcon } from "./LDIcon";
import { logoDomain } from "./util";
import { useOverlay } from "./OverlayProvider";
import type { DashboardData, DashboardModel } from "@/lib/types";

// A brand's identity cell: the fetched logo (via Clearbit) + brand name when a
// logo loads. When it 404s (unknown/guessed domain) we drop the chip and show
// the domain itself (e.g. "salesforce.com") instead of an ambiguous initial —
// so the user can tell the row points at a real website.
function BrandCell({ name, domain, isYou }: { name: string; domain: string | null; isYou: boolean }) {
  const [ok, setOk] = React.useState(false);
  const you = isYou ? <span className="rr-you">YOU</span> : null;
  return (
    <>
      {ok && domain ? (
        <span className="mc" style={{ background: "#fff" }}>
          <img src={`https://logo.clearbit.com/${domain}`} alt="" />
        </span>
      ) : (
        domain && (
          <img
            src={`https://logo.clearbit.com/${domain}`}
            alt=""
            onLoad={() => setOk(true)}
            onError={() => setOk(false)}
            style={{ display: "none" }}
          />
        )
      )}
      <span className={`rr-name ${ok ? "" : "rr-domain"}`}>
        {ok ? name : domain ?? name}
        {you}
      </span>
    </>
  );
}

// The Tasks-page right rail: scan CTAs, the master-AI verdict, per-model
// visibility, the top-prompt placement standings, the MCP card and daily quests.
export function RightRail({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { openUpgrade, openScan } = useOverlay();
  // Re-scan CTA appears once every currently-seeded task is resolved (the active/
  // open levels are cleared). Locked levels aren't seeded, so we ignore their
  // empty totals — otherwise this would never fire until the whole climb is done.
  const lv = data.ladder?.levels ?? [];
  const allTasksDone =
    !!data.hasFullScan &&
    lv.some((l) => l.total > 0) &&
    lv.every((l) => l.total === 0 || l.doneCount === l.total);
  const outOfScans = (data.scansLeft ?? 0) <= 0;
  const models = data.models ?? [];
  // Perplexity sits at the bottom of the model list.
  const orderedModels = [...models].sort((a, b) =>
    (a.id === "perplexity" ? 1 : 0) - (b.id === "perplexity" ? 1 : 0));
  // How many models actually have a result (real scanned count, not the 5 listed).
  const scannedCount = models.filter((m) => !m.locked && m.visibility != null).length;

  // Top prompt placement: the standings for the brand's biggest (primary) prompt
  // from the latest scan — top 3 brands, then the user's own row if they're not
  // already in the top 3. On the free Perplexity scan this is the headline result.
  const competitors = data.competitors ?? [];
  const ranked = [...competitors].sort((a, b) => a.rank - b.rank);
  const top3 = ranked.slice(0, 3);
  const you = ranked.find((c) => c.isYou) ?? null;
  const placementRows = you && !top3.some((c) => c.isYou) ? [...top3, you] : top3;
  const showPlacement = !!data.primaryPrompt && ranked.length > 0;

  return (
    <aside className="ld-rail">
      {data.subscribed && !data.hasFullScan && (
        <div className="scan-cta">
          <div className="scan-cta-txt"><b>Scan all 5 AI models</b></div>
          <button className="scan-cta-btn" onClick={openScan}>🔄 Run full scan</button>
        </div>
      )}
      {data.subscribed && allTasksDone && (
        <div className="scan-cta">
          <div className="scan-cta-txt">
            <b>You&apos;ve cleared every task 🎉</b>
            <span>Re-scan to see your new score across all 5 models.</span>
          </div>
          <button className="scan-cta-btn" onClick={openScan} disabled={outOfScans}>🔄 Re-scan now</button>
          {outOfScans && <span className="scan-cta-note">No scans left this month</span>}
        </div>
      )}
      {data.synthesis?.verdict && (
        <div className="rail-card">
          <h4>🧠 What the AIs think</h4>
          <p className="sub">{data.synthesis.verdict}</p>
          {data.synthesis.bestFix && (
            <div className="rail-note" style={{ marginTop: 10 }}>⚡ <b>Your best move:</b> {data.synthesis.bestFix}</div>
          )}
        </div>
      )}
      <div className="rail-card">
        <h4>Scanned across {scannedCount || models.length} {(scannedCount || models.length) === 1 ? "AI" : "AIs"}</h4>
        <p className="sub">Each model cites differently. One chatbot can&apos;t see the others — Clerow watches all of them.</p>
        <div className="rail-models">
          {orderedModels.map((m: DashboardModel) => {
            // Locked = no key, or not yet scanned (free tier scans one engine; a
            // full scan fills the rest). Engine-agnostic so it works with the
            // ChatGPT free scan, not just Perplexity.
            const locked = m.locked || m.visibility == null;
            return (
              <div key={m.id} className="rail-model">
                <span className="mc" style={{ background: "#fff" }}><AiIcon id={m.id} size={16} letter={m.letter} /></span>{m.label}
                <span className={`st ${!locked && m.visibility ? "ok" : "no"}`}>{locked ? "🔒" : m.visibility != null ? `${m.visibility}%` : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showPlacement && (
        <div className="rail-card">
          <h4>Top prompt placement</h4>
          <p className="sub" style={{ marginBottom: 10 }}>&ldquo;{data.primaryPrompt}&rdquo;</p>
          <div className="rail-rank">
            {placementRows.map((row) => (
              <div key={`${row.rank}-${row.name}`} className={`rr-row ${row.isYou ? "me" : ""}`}>
                <span className="rr-rank">#{row.rank}</span>
                <BrandCell
                  name={row.name}
                  domain={logoDomain(row.name, row.isYou, row.domain, data.brand?.url)}
                  isYou={row.isYou}
                />
                <span className={`rr-v ${row.isYou && !row.visibility ? "no" : ""}`}>{row.visibility}%</span>
              </div>
            ))}
          </div>
          <div className="rail-note" style={{ marginTop: 10 }}>
            {you
              ? <>📍 You&apos;re <b>#{you.rank} of {ranked.length}</b> for your biggest prompt. Clear Level 1 to climb.</>
              : <>📍 You&apos;re <b>not cited yet</b> for your biggest prompt. Clear Level 1 to break in.</>}
          </div>
        </div>
      )}

      {!data.subscribed && (
        <div className="upg-card">
          <div className="upg-head">
            <span className="upg-tag">⭐ Premium plan</span>
            <span className="upg-price"><b>$29</b>/mo</span>
          </div>
          <h4>Unlock every level &amp; all 5 models</h4>
          <ul className="upg-list">
            <li>✓ All quest levels &amp; re-scans</li>
            <li>✓ All AI models tracked</li>
            <li>✓ Leaderboard &amp; weekly reports</li>
          </ul>
          <button className="btn-upg" onClick={openUpgrade}>Upgrade — $29/mo</button>
        </div>
      )}

      <div className="mcp-card">
        <span className="mcp-tag">⚡ Clerow MCP</span>
        <h4>Let your AI do the work</h4>
        <p>Plug Clerow into Claude Code, Cursor or any agent. It ships the fixes — Clerow verifies across every model.</p>
        <button className="btn-violet" onClick={() => router.push("/dashboard/connect")}>Connect MCP</button>
      </div>

      <div className="rail-card">
        <h4>Daily quests</h4>
        <div className="rail-mini-q"><span className="qc">⚡</span><span className="qt">Clear 1 task today</span><span className="qx">+10</span></div>
        <div className="rail-bar"><i style={{ width: `${data.streak?.activeToday ? 100 : 0}%` }} /></div>
        <div className="rail-mini-q" style={{ borderBottom: 0, marginTop: 6 }}><span className="qc">🔥</span><span className="qt">Keep your {data.streak?.current ?? 0}-day streak</span><span className="qx">+5</span></div>
      </div>

      <div className="rail-card rail-super">
        <span className="rail-lock"><LDIcon name="lock" /></span>
        <div>
          <h4 style={{ margin: 0 }}>Unlock the leaderboard</h4>
          <p className="sub" style={{ margin: "4px 0 0" }}>Clear Level 1 to start competing in your category.</p>
        </div>
      </div>
    </aside>
  );
}

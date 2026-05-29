"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { GameIcon } from "../GameIcon";
import { MascotClerow } from "../Mascot";
import { PageHead } from "./AppShell";
import { useDashboard } from "@/lib/useDashboard";
import type { DashboardData } from "@/lib/types";
import type { HistoryResponse, HistoryDelta } from "@/app/api/reports/history/route";

function domainName(url?: string): string {
  if (!url) return "your site";
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "your site";
}

export function PageReports() {
  const router = useRouter();
  const navigate = (k: string) => router.push(`/dashboard/${k}`);
  const { data } = useDashboard();
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);
  const [sharing, setSharing] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [history, setHistory] = React.useState<HistoryResponse | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/reports/history", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!cancelled && res.ok) setHistory(json);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const share = async () => {
    setSharing(true);
    try {
      const res = await fetch("/api/share", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.url) {
        setShareUrl(json.url);
        try {
          await navigator.clipboard.writeText(json.url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard may be unavailable; link still shown below */
        }
      }
    } finally {
      setSharing(false);
    }
  };

  const emailToTeam = () => {
    if (!shareUrl) return;
    const subject = encodeURIComponent("Our AI visibility progress");
    const body = encodeURIComponent(`Here's our latest AI search visibility progress on Clerow:\n\n${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <>
      <PageHead
        title="Reports"
        sub="Your current standing across AI models, and a public link to share your progress."
        actions={
          <>
            {shareUrl && (
              <button className="btn btn--ghost btn--sm" onClick={emailToTeam}>
                <Icon name="external" size={14} />
                Email to team
              </button>
            )}
            <button className="btn btn--primary btn--sm" onClick={share} disabled={sharing}>
              <Icon name="external" size={14} />
              {sharing ? "Generating…" : copied ? "Link copied!" : shareUrl ? "Copy link" : "Share link"}
            </button>
          </>
        }
      />

      {shareUrl && (
        <div className="app-card" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "12px 16px" }}>
          <Icon name="external" size={14} />
          <a href={shareUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: "var(--accent-2)", wordBreak: "break-all" }}>
            {shareUrl}
          </a>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)", fontWeight: 700 }}>
            Anyone with the link can view — no login needed
          </span>
        </div>
      )}

      <CurrentReport data={data} delta={history?.delta ?? null} onNavigate={navigate} />

      <h3 className="quest-section-h">
        <span><GameIcon name="world" size={18} /> Public share card</span>
        <span className="quest-section-sub">post your climb, get distribution</span>
      </h3>
      <ShareCard data={data} />

      <h3 className="quest-section-h">
        <span><GameIcon name="folder" size={18} /> Report history</span>
        <span className="quest-section-sub">week-over-week trends</span>
      </h3>
      {history && history.history.length > 1 ? (
        <HistoryTable history={history} />
      ) : (
        <HistoryPlaceholder scannedAt={data?.scannedAt ?? null} />
      )}

      <h3 className="quest-section-h">
        <span><GameIcon name="office" size={18} /> White-label client reports</span>
        <span className="quest-section-sub">Team plan · for agencies</span>
      </h3>
      <WhiteLabelCard />
    </>
  );
}

function deltaTag(n: number, goodWhenPositive = true) {
  if (n === 0) return <small style={{ color: "var(--ink-3)" }}>±0</small>;
  const good = goodWhenPositive ? n > 0 : n < 0;
  return (
    <small style={{ color: good ? "var(--success)" : "var(--danger)" }}>
      {n > 0 ? "+" : ""}
      {n}
    </small>
  );
}

function CurrentReport({
  data,
  delta,
  onNavigate,
}: {
  data: DashboardData | null;
  delta: HistoryDelta | null;
  onNavigate: (k: string) => void;
}) {
  const score = data?.score;
  const models = data?.models ?? [];
  const competitors = data?.competitors ?? [];
  const shipped = (data?.tasks ?? []).filter((t) => t.done);
  const me = competitors.find((c) => c.isYou);
  const rivalsAhead = me ? competitors.filter((c) => !c.isYou && c.rank < me.rank) : competitors.filter((c) => !c.isYou);
  const topRival = rivalsAhead[0];

  if (!data?.hasScan) {
    return (
      <div className="report-card" style={{ textAlign: "center", padding: "40px 24px" }}>
        <h2 className="report-title">No report yet.</h2>
        <p className="report-sub">Run your first scan to generate your AI visibility report.</p>
        <a className="btn btn--primary btn--sm" href="/onboarding">Run a scan</a>
      </div>
    );
  }

  return (
    <div className="report-card">
      <div className="report-header">
        <div>
          <div className="report-week-label">Current standing{data.scannedAt ? ` · scanned ${new Date(data.scannedAt).toLocaleDateString()}` : ""}</div>
          <h2 className="report-title">
            {me && me.rank === 1
              ? `You lead your category in AI recommendations.`
              : topRival
                ? `AI recommends ${topRival.name} ahead of you — here's how to close it.`
                : `Here's where AI puts you today.`}
          </h2>
          <p className="report-sub">
            {score?.visibility ?? 0}% visibility · {shipped.length} quests shipped · {data.engine ?? "scanned"}
          </p>
        </div>
        <div className="report-score-tile">
          <span className="lbl">Score</span>
          <span className="num">
            {score?.overall ?? 0} {delta ? deltaTag(delta.overall) : null}
          </span>
        </div>
      </div>

      <div className="report-grid">
        <div className="report-block">
          <h4><GameIcon name="chart" size={16} /> Position by model</h4>
          <div className="report-positions">
            {models.filter((m) => !m.locked).map((m) => (
              <div key={m.id} className="rp-row">
                <span className="rp-model">{m.label}</span>
                <span className="rp-to">{m.position != null ? `#${m.position}` : "—"}</span>
                <span className="rp-change">{m.visibility != null ? `${m.visibility}%` : "—"}</span>
              </div>
            ))}
            {models.filter((m) => !m.locked).length === 0 && <div className="rp-row"><span className="rp-model">No models scanned yet.</span></div>}
          </div>
        </div>

        <div className="report-block">
          <h4><GameIcon name="check" size={16} color="#58CC02" /> Quests shipped</h4>
          {shipped.length ? (
            <ul className="report-list">
              {shipped.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <span className="bullet bullet--success" /> {t.title} <b>+{t.xp} XP</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="report-sub" style={{ margin: 0 }}>Complete a quest to start your track record.</p>
          )}
        </div>

        <div className="report-block report-block--win">
          <h4><GameIcon name="flame" size={16} /> Your streak</h4>
          <p>
            <b>{data.streak?.current ?? 0}-day streak</b> (longest {data.streak?.longest ?? 0}).{" "}
            {data.streak?.activeToday ? "Kept today ✅ — nice." : "Complete any quest today to keep it alive."}
          </p>
        </div>

        <div className="report-block report-block--opp">
          <h4><GameIcon name="target" size={16} /> Biggest opportunity</h4>
          <p>
            {topRival ? (
              <>
                <b>Out-position {topRival.name}.</b> They&apos;re recommended ahead of you ({topRival.visibility}% vs {me?.visibility ?? 0}%). Ship a comparison page and earn citations on the sources AI already trusts.
              </>
            ) : (
              <><b>Defend your lead.</b> You&apos;re top of your category — keep shipping so rivals can&apos;t catch up.</>
            )}
          </p>
        </div>
      </div>

      <div className="report-next">
        <span className="next-label">Do next</span>
        <div className="next-tasks">
          <span className="next-task"><GameIcon name="quill" size={14} /> Open a prompt → add its playbook as quests</span>
          <span className="next-task"><GameIcon name="world" size={14} /> Claim the top source gaps</span>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => onNavigate("quests")}>
          Open quests <span className="arrow">→</span>
        </button>
      </div>
    </div>
  );
}

function ShareCard({ data }: { data: DashboardData | null }) {
  const models = (data?.models ?? []).filter((m) => !m.locked && m.position != null);
  const best = models.length ? models.reduce((a, b) => ((a.position ?? 99) <= (b.position ?? 99) ? a : b)) : null;
  return (
    <div className="share-wrap">
      <div className="share-card">
        <div className="share-card-top">
          <div className="brand" style={{ fontSize: 18 }}>
            <MascotClerow size={28} /> Clerow
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)", fontWeight: 700 }}>
            AI VISIBILITY
          </span>
        </div>
        <div className="share-card-body">
          <div className="share-stat">
            <div className="big">{best ? `#${best.position} in ${best.label}` : `${data?.score?.overall ?? 0} score`}</div>
            <div className="lbl">{best ? "best AI recommendation rank" : "AI visibility score"}</div>
          </div>
          <div className="share-bottom">
            <div className="share-stat-mini">
              <div className="lbl">Visibility</div>
              <div className="val">{data?.score?.visibility ?? 0}%</div>
            </div>
            <div className="share-stat-mini">
              <div className="lbl">Score</div>
              <div className="val">{data?.score?.overall ?? 0}</div>
            </div>
            <div className="share-stat-mini">
              <div className="lbl">Streak</div>
              <div className="val"><GameIcon name="flame" size={15} color="#F59E0B" /> {data?.streak?.current ?? 0}d</div>
            </div>
          </div>
        </div>
        <div className="share-card-foot">{domainName(data?.brand?.url)} · powered by clerow.com</div>
      </div>

      <div className="share-actions">
        <h4>Share your climb</h4>
        <p>
          Use the <b>Share link</b> button up top to mint a public progress page. Post it on X or send it to your team —
          it shows your live score, streak, and how AI ranks you.
        </p>
      </div>
    </div>
  );
}

function HistoryTable({ history }: { history: HistoryResponse }) {
  // Newest first for the table.
  const rows = [...history.history].reverse();
  return (
    <div className="app-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="data-table">
        <div className="dt-head">
          <span style={{ flex: 1.4 }}>Date</span>
          <span style={{ flex: 0.7, textAlign: "right" }}>Score</span>
          <span style={{ flex: 0.7, textAlign: "right" }}>Visibility</span>
          <span style={{ flex: 0.7, textAlign: "right" }}>Your rank</span>
          <span style={{ flex: 0.7, textAlign: "right" }}>Models</span>
        </div>
        {rows.map((r, i) => {
          const prev = rows[i + 1];
          const d = prev ? r.overall - prev.overall : 0;
          return (
            <div key={r.id} className="dt-row">
              <span style={{ flex: 1.4, fontWeight: 700 }}>
                {new Date(r.captured_on).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span style={{ flex: 0.7, textAlign: "right" }} className="dt-pos">
                {r.overall} {prev ? deltaTag(d) : null}
              </span>
              <span style={{ flex: 0.7, textAlign: "right" }} className="dt-pos">{r.visibility}%</span>
              <span style={{ flex: 0.7, textAlign: "right" }} className="dt-pos">{r.your_rank != null ? `#${r.your_rank}` : "—"}</span>
              <span style={{ flex: 0.7, textAlign: "right" }} className="dt-pos">{r.engines}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryPlaceholder({ scannedAt }: { scannedAt: string | null }) {
  return (
    <div className="app-card" style={{ padding: "32px 24px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <GameIcon name="chart" size={32} />
      </div>
      <h4 style={{ fontSize: 16, marginBottom: 6 }}>Week-over-week history starts now.</h4>
      <p style={{ color: "var(--ink-2)", maxWidth: 460, margin: "0 auto", fontWeight: 500 }}>
        {scannedAt
          ? "Each scan is a snapshot. Re-scan weekly and Clerow will chart how your position and visibility move over time here."
          : "Run your first scan to set a baseline. Re-scan weekly and your trend will build here."}
      </p>
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
          Drop your agency logo and brand colors. Auto-generated weekly. Send to clients in one click. Per-seat contribution breakdowns included.
        </p>
        <ul>
          <li><Icon name="check" size={12} /> Your logo + colors on every report</li>
          <li><Icon name="check" size={12} /> Custom domain for shareable links</li>
          <li><Icon name="check" size={12} /> Per-seat contribution breakdown</li>
          <li><Icon name="check" size={12} /> Bulk send to clients</li>
        </ul>
        <button className="btn btn--primary btn--lg">Upgrade to Team — $89/mo</button>
      </div>
      <div className="wl-right">
        <div className="wl-mock">
          <div className="wl-mock-header">
            <span style={{ width: 28, height: 28, borderRadius: 6, background: "#7C3AED", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14 }}>
              AC
            </span>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Your Agency · Client report</span>
          </div>
          <div className="wl-mock-title">Client.com — this week</div>
          <div className="wl-mock-row"><span>AI visibility</span><b style={{ color: "var(--success)" }}>tracked</b></div>
          <div className="wl-mock-row"><span>Best position</span><b>#2</b></div>
          <div className="wl-mock-row"><span>Quests shipped</span><b>4 of 5</b></div>
          <div className="wl-mock-foot">Powered by your brand · weekly</div>
        </div>
      </div>
    </div>
  );
}

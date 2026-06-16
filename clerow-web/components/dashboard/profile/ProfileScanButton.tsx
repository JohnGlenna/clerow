"use client";

import React from "react";
import { Icon } from "../../Icon";
import { PixelProgress } from "../../ui/PixelProgress";
import { ScanProgress } from "../../scan/ScanProgress";
import { useScanStream } from "@/lib/useScanStream";

// "Run full scan" for subscribers, surfaced on the Profile → Plan & billing card.
// Runs the same multi-model /api/scan/full stream the dashboard checkpoint uses,
// shown in a live progress popup, then a compact results card. Mirrors the
// scanning / checkpoint-done views in TaskModal so the experience is identical.
const PHASES = [
  { key: "reading-site", label: "Reading your site" },
  { key: "grading-pages", label: "AI-grading your pages" },
  { key: "scanning", label: "Testing buyer queries on 5 models" },
];

export function ProfileScanButton() {
  const scan = useScanStream();
  const [open, setOpen] = React.useState(false);
  // True once a scan has finished and refreshed standings, so closing reloads
  // the profile to pick up the new score / sparkline.
  const completedRef = React.useRef(false);

  const run = async () => {
    if (scan.status === "running") return;
    completedRef.current = false;
    setOpen(true);
    const outcome = await scan.run("/api/scan/full", {
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!outcome.ok) {
      if (outcome.status === 402) alert(outcome.error || "You're out of scans this month.");
      else if (outcome.status === 429) alert(outcome.error || "A scan is already running — give it a moment.");
      else alert(outcome.error || "Scan failed. Try again.");
      setOpen(false);
      return;
    }
    completedRef.current = true;
  };

  const close = () => {
    setOpen(false);
    // Reflect the fresh score on the profile (sparkline, level, etc.).
    if (completedRef.current) window.location.reload();
  };

  return (
    <>
      <button className="btn btn--ghost btn--sm" onClick={run} disabled={scan.status === "running"}>
        <Icon name="bolt" size={14} /> {scan.status === "running" ? "Scanning…" : "Run full scan"}
      </button>

      {open && (scan.status === "running" ? <ScanningPopup scan={scan} /> : scan.status === "done" ? <ResultsPopup scan={scan} onClose={close} /> : null)}
    </>
  );
}

function ScanningPopup({ scan }: { scan: ReturnType<typeof useScanStream> }) {
  const cells = scan.prompts.flatMap((p) => p.engines);
  const total = cells.length || 1;
  const finished = cells.filter((e) => e.status === "done" || e.status === "failed").length;
  const pct = Math.round((finished / total) * 100);
  const curPhase = PHASES.findIndex((p) => p.key === scan.phase);
  const steps = PHASES.map((p, i) => ({
    label: p.label,
    state: (curPhase < 0 || i < curPhase ? "done" : i === curPhase ? "active" : "pending") as "done" | "active" | "pending",
  }));
  return (
    <div className="tm-scrim">
      <div className="tm-modal" role="dialog" aria-modal="true">
        <div className="tm-head"><span className="tm-crumb">Scanning · 📡 Live</span></div>
        <div className="tm-body">
          <div style={{ marginBottom: 18 }}><PixelProgress value={pct} /></div>
          <h2 className="tm-title">Reading your site &amp; querying 5 models…</h2>
          <p className="tm-why">Clerow reads your site, AI-grades your pages, then watches every model answer your buyer queries — your score updates the moment they finish.</p>
          <ScanProgress steps={steps} engines={scan.engines} prompts={scan.prompts} elapsedMs={scan.elapsedMs} showOrbit={false} />
        </div>
      </div>
    </div>
  );
}

function ResultsPopup({ scan, onClose }: { scan: ReturnType<typeof useScanStream>; onClose: () => void }) {
  const overall = scan.result && "score" in scan.result ? scan.result.score.overall : null;
  const groups = scan.prompts.filter((p) => p.text).sort((a, b) => a.index - b.index);
  const siteGaps = scan.site.filter((c) => c.status !== "pass" && c.status !== "unknown");
  const mark = (s: string) => (s === "pass" ? "✓" : s === "warn" ? "⚠" : s === "unknown" ? "–" : "✕");
  return (
    <div className="tm-scrim" onClick={onClose}>
      <div className="tm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="tm-head"><span className="tm-crumb">Scan complete · ✓ Done</span><button className="tm-x" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="tm-body">
          <div className="results-head">
            <div className="results-score">{overall ?? "—"}</div>
            <div><div className="results-h">Scan complete</div><div className="results-sub">Your AI visibility score{overall != null ? ` is ${overall}` : ""} · fresh standings across all 5 models.</div></div>
          </div>
          {scan.site.length > 0 && (
            <div className="results-card">
              <div className="results-card-h">🔎 Your website scan {siteGaps.length > 0 && <span>{siteGaps.length} to fix</span>}</div>
              <div className="results-checks">{scan.site.map((c) => (<div key={c.id} className={`results-check ${c.status}`}><span className="rc-mark">{mark(c.status)}</span><span>{c.label}</span></div>))}</div>
            </div>
          )}
          {groups.length > 0 && (
            <div className="results-card"><div className="results-card-h">💬 What each model said</div><ScanProgress done engines={scan.engines} prompts={scan.prompts} elapsedMs={0} showOrbit={false} /></div>
          )}
        </div>
        <div className="tm-foot tm-foot--end"><button className="tm-btn tm-btn--go" onClick={onClose}>Done →</button></div>
      </div>
    </div>
  );
}

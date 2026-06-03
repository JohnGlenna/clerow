"use client";

import React from "react";
import { logoDomain } from "../dashboard/shell/util";
import type { RankedBrand } from "@/lib/types";

function senti(k: string) {
  if (k === "pos") return <span className="senti senti--pos">●●●●●</span>;
  if (k === "neut") return <span className="senti senti--neut">●●●○○</span>;
  if (k === "warn") return <span className="senti senti--warn">●●○○○</span>;
  if (k === "neg") return <span className="senti senti--warn">●○○○○</span>;
  return null;
}

// A brand's identity cell: the real logo (via Clearbit) + name when it loads.
// When the logo 404s (unknown/guessed domain) we drop the chip and show the
// domain itself (e.g. "suno.com") instead — mirrors the dashboard RightRail so
// the row always points at a recognizable real brand. `siteUrl` lets the user's
// own row resolve its logo even when the scan stored no domain for it.
function BrandCell({ name, domain, isYou }: { name: string; domain: string | null; isYou: boolean }) {
  const [ok, setOk] = React.useState(false);
  const src = domain ? `https://logo.clearbit.com/${domain}` : null;
  return (
    <span className="ex-brand">
      {ok && src ? (
        <span className="ex-sw ex-sw--logo">
          <img src={src} alt="" />
        </span>
      ) : (
        src && <img src={src} alt="" onLoad={() => setOk(true)} onError={() => setOk(false)} style={{ display: "none" }} />
      )}
      <span className={!ok && domain ? "ex-domain" : ""}>{ok ? name : domain ?? name}</span>
      {isYou && <span className="ex-you">YOU</span>}
    </span>
  );
}

// Step 2 of the scan — the ranked brand table. Reuses the landing page's
// `.example-card` / `.ex-table` styles. Shows the top 3 competitors the AI named
// plus the user's own row (always present, even at 0%) — the whole hook.
export function ResultTable({
  engine,
  prompt,
  brands,
  siteUrl,
}: {
  engine: string;
  prompt: string;
  brands: RankedBrand[];
  siteUrl?: string;
}) {
  // Top 3 competitors (non-you, already rank-sorted) + the user's own row.
  const others = brands.filter((b) => !b.isYou).slice(0, 3);
  const you = brands.find((b) => b.isYou) ?? null;
  const rows = (you ? [...others, you] : others).sort((a, b) => a.rank - b.rank);
  const maxVis = Math.max(1, ...rows.map((b) => b.visibility));

  return (
    <div className="example-card">
      <div className="example-card-head">
        <div>
          <div className="example-card-title">AI search results — {engine}</div>
          <div className="example-card-sub">
            Result for &ldquo;{prompt}&rdquo;
          </div>
        </div>
        <span className="chip chip--ghost">{engine}</span>
      </div>

      <div className="ex-table">
        <div className="ex-row ex-row--head">
          <span>#</span>
          <span>Brand</span>
          <span>Visibility</span>
          <span>Sentiment</span>
          <span>Position</span>
        </div>
        {rows.map((r) => (
          <div key={`${r.rank}-${r.name}`} className={`ex-row ${r.isYou ? "ex-row--me" : ""}`}>
            <span className="ex-rank">{r.rank}</span>
            <BrandCell name={r.name} domain={logoDomain(r.name, r.isYou, r.domain, siteUrl)} isYou={r.isYou} />
            <span className="ex-vis">
              <span className="ex-vis-bar">
                <i
                  style={{
                    width: `${(r.visibility / maxVis) * 100}%`,
                    background: r.isYou ? "var(--accent)" : "var(--ink)",
                  }}
                />
              </span>
              <b>{r.visibility}%</b>
            </span>
            <span>{senti(r.sentiment)}</span>
            <span className="ex-pos">{r.position ?? "—"}</span>
          </div>
        ))}
      </div>

      <div className="example-card-foot">
        <span>
          📍 You&apos;re not being cited.{" "}
          <b>Clerow shows you exactly why — and what to fix first.</b>
        </span>
      </div>
    </div>
  );
}

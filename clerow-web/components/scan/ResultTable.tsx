"use client";

import React from "react";
import type { RankedBrand } from "@/lib/types";

// Deterministic swatch color per brand name (so the same brand keeps a color).
const PALETTE = ["#FF7A45", "#3D7BFF", "#0F172A", "#1E4F6B", "#10B981", "#1CB0F6", "#A560FF", "#E11D48"];
function colorFor(name: string, isYou: boolean): string {
  if (isYou) return "#F59E0B";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function senti(k: string) {
  if (k === "pos") return <span className="senti senti--pos">●●●●●</span>;
  if (k === "neut") return <span className="senti senti--neut">●●●○○</span>;
  if (k === "warn") return <span className="senti senti--warn">●●○○○</span>;
  if (k === "neg") return <span className="senti senti--warn">●○○○○</span>;
  return null;
}

// Step 2 of the scan — the ranked brand table. Reuses the landing page's
// `.example-card` / `.ex-table` styles.
export function ResultTable({
  engine,
  prompt,
  brands,
}: {
  engine: string;
  prompt: string;
  brands: RankedBrand[];
}) {
  const maxVis = Math.max(1, ...brands.map((b) => b.visibility));

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
        {brands.map((r) => {
          const color = colorFor(r.name, r.isYou);
          return (
            <div key={`${r.rank}-${r.name}`} className={`ex-row ${r.isYou ? "ex-row--me" : ""}`}>
              <span className="ex-rank">{r.rank}</span>
              <span className="ex-brand">
                <span className="ex-sw" style={{ background: color }}>
                  {r.isYou ? "?" : r.name[0]?.toUpperCase() ?? "•"}
                </span>
                {r.name}
                {r.isYou && <span className="ex-you">YOU</span>}
              </span>
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
          );
        })}
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

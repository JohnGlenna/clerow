"use client";

import React from "react";
import { useDashboard } from "@/lib/useDashboard";
import { INTENT } from "../shared/PageBits";

// The content roadmap: the discovered buyer prompts grouped into intent clusters
// and laid out in recommended ship-order (lib/roadmap.ts). Sits above the flat
// prompt list on the Prompts page and turns it from a feed into a planned path.
export function RoadmapView({ onFix }: { onFix: (p: { id: string; text: string }) => void }) {
  const { data } = useDashboard();
  const roadmap = data?.roadmap;
  if (!roadmap) return null;
  const live = roadmap.clusters.filter((c) => c.total > 0);
  if (live.length === 0) return null;
  const focus = roadmap.clusters.find((c) => c.isFocus);

  return (
    <div className="rm-wrap">
      <div className="rm-head">
        <div className="lp-eyebrow">Content roadmap</div>
        <h2 className="rm-title">Your path, in order</h2>
        <p className="rm-sub">
          We grouped the questions buyers ask AI into clusters and sequenced them to move your visibility fastest
          {focus ? <> — start with <b>{focus.label}</b>.</> : "."}
        </p>
      </div>
      <div className="rm-clusters">
        {live.map((c) => {
          const col = (INTENT[c.intent] ?? INTENT.custom)[1];
          return (
            <div key={c.intent} className={`rm-cluster is-${c.state} ${c.isFocus ? "is-focus" : ""}`}>
              <div className="rm-cluster-h">
                <span className="rm-order" style={{ background: col }}>{c.order}</span>
                <div className="rm-cluster-ht">
                  <div className="rm-cluster-label">
                    {c.label}
                    {c.isFocus && <span className="rm-focus-pill">Start here</span>}
                  </div>
                  <div className="rm-cluster-blurb">{c.blurb}</div>
                </div>
                <div className="rm-cluster-stat">
                  {c.winning > 0 && <span className="rm-stat rm-stat--win">{c.winning} winning</span>}
                  {c.gaps > 0 && <span className="rm-stat rm-stat--gap">{c.gaps} gap{c.gaps > 1 ? "s" : ""}</span>}
                  {c.untested > 0 && <span className="rm-stat rm-stat--unt">{c.untested} to test</span>}
                </div>
              </div>
              <div className="rm-prompts">
                {c.prompts.map((p) => (
                  <div key={p.id} className="rm-prompt">
                    <span className={`rm-dot is-${p.status}`} title={p.status} />
                    <span className="rm-prompt-q">
                      &ldquo;{p.text}&rdquo;
                      {p.isPrimary && <span className="rm-primary">PRIMARY</span>}
                    </span>
                    <span className="rm-prompt-pos">{p.status === "untested" ? "—" : p.position != null ? `#${p.position}` : "✗"}</span>
                    {p.status === "winning" ? (
                      <span className="rm-win">✓ Winning</span>
                    ) : (
                      <button className="rm-fix" onClick={() => onFix({ id: p.id, text: p.text })}>Fix →</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

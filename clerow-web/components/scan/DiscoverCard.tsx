"use client";

import React from "react";
import type { DiscoverResponse } from "@/lib/types";

const TAG_LABEL: Record<string, string> = {
  solution: "Solution",
  compare: "Compare",
  problem: "Problem",
  branded: "Branded",
};
const TAG_COLOR: Record<string, string> = {
  solution: "#1CB0F6",
  compare: "#E11D48",
  problem: "#7C3AED",
  branded: "#F59E0B",
};

// Step 1 of the scan — the discovered prompt set. Reuses the landing page's
// `.discovery` styles. Shows the first N prompts + a "+ more" chip.
export function DiscoverCard({
  url,
  data,
  showCount = 6,
}: {
  url: string;
  data: DiscoverResponse;
  showCount?: number;
}) {
  const shown = data.prompts.slice(0, showCount);
  const more = data.prompts.length - shown.length;

  return (
    <div className="discovery">
      <div className="discovery-head">
        <div>
          <div className="dsc-eyebrow">
            Step 1 · discovered for <span className="mono">{url}</span>
          </div>
          <h3 className="dsc-h">{data.promptCount} prompts your customers actually ask</h3>
        </div>
        <div className="dsc-stats">
          <span className="dsc-stat">
            <b>{data.promptCount}</b>
            <span>prompts</span>
          </span>
          <span className="dsc-stat">
            <b>{data.queriesPerDay}</b>
            <span>queries / day</span>
          </span>
        </div>
      </div>
      <div className="discovery-chips">
        {shown.map((d) => {
          const color = TAG_COLOR[d.intent] ?? "#A8A8A8";
          return (
            <span key={d.id} className="dsc-chip">
              <span
                className="dsc-tag"
                style={{
                  background: `color-mix(in oklab, ${color} 14%, white)`,
                  color,
                  borderColor: `color-mix(in oklab, ${color} 30%, transparent)`,
                }}
              >
                {TAG_LABEL[d.intent] ?? d.intent}
              </span>
              <span className="dsc-q">&ldquo;{d.text}&rdquo;</span>
              <span className={`dsc-vol vol--${d.volume}`}>{d.volume}</span>
            </span>
          );
        })}
        {more > 0 && <span className="dsc-chip dsc-chip--more">+ {more} more</span>}
      </div>
      <div className="discovery-foot">
        <span className="dsc-arrow">↓</span>
        <span>
          <b>Step 2:</b> we run each prompt through the AI models, then score how you rank.
        </span>
      </div>
    </div>
  );
}

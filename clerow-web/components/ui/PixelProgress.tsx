"use client";

import React from "react";

// 8-bit / pixel progress bar — a dependency-free port of theorcdev's "8bit-progress"
// (8bitcn.com, via 21st.dev). The original is Tailwind + CVA; Clerow isn't a
// Tailwind app, so this reproduces the look with inline styles: a row of chunky
// pixel squares behind a stepped 8-bit border frame, themeable to Clerow blue.
export function PixelProgress({
  value,
  height = 16,
  squares = 20,
  fill = "#38A9E0",
  track = "rgba(56,169,224,0.18)",
  border = "#F3F7F8",
  className,
  style,
}: {
  value: number;
  height?: number;
  squares?: number;
  fill?: string;
  track?: string;
  border?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const v = Math.max(0, Math.min(100, value));
  const filled = Math.round((v / 100) * squares);
  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", ...style }}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ display: "flex", width: "100%", height, background: track, overflow: "hidden" }}>
        {Array.from({ length: squares }).map((_, i) => (
          <div
            key={i}
            style={{ flex: 1, height: "100%", margin: "0 1px", background: i < filled ? fill : "transparent", transition: "background .25s" }}
          />
        ))}
      </div>
      {/* stepped 8-bit frame: offset horizontal + vertical borders */}
      <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: -4, bottom: -4, borderTop: `4px solid ${border}`, borderBottom: `4px solid ${border}`, pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", left: -4, right: -4, top: 0, bottom: 0, borderLeft: `4px solid ${border}`, borderRight: `4px solid ${border}`, pointerEvents: "none" }} />
    </div>
  );
}

export default PixelProgress;

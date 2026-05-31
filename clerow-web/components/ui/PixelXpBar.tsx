"use client";

import React from "react";
import { PixelProgress } from "./PixelProgress";

// 8-bit XP bar — dependency-free port of theorcdev's "8bit-xp-bar" (8bitcn.com,
// via 21st.dev). Wraps the pixel progress bar with an optional level badge and a
// blinking "LEVEL UP!" flash at 100%. Themed for Clerow's dark dashboard.
export function PixelXpBar({
  value,
  level,
  levelUpMessage = "LEVEL UP!",
  height = 16,
  fill = "#FFC800",
  track = "rgba(255,200,0,0.16)",
  border = "#F3F7F8",
}: {
  value: number;
  level?: number;
  levelUpMessage?: string;
  height?: number;
  fill?: string;
  track?: string;
  border?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const isLevelUp = v >= 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      {level != null && (
        <span
          style={{
            flex: "0 0 auto", width: 30, height: 30, borderRadius: 8, background: "#38A9E0", color: "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13,
            border: `2px solid ${border}`,
          }}
        >
          {level}
        </span>
      )}
      <div style={{ position: "relative", flex: 1 }}>
        <PixelProgress value={v} height={height} fill={fill} track={track} border={border} />
        {isLevelUp && (
          <span
            style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              fontSize: 10, fontWeight: 900, color: "#000", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 2,
              textShadow: "1px 1px 0 #fff,-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff",
              animation: "wlblink .5s step-end infinite",
            }}
          >
            {levelUpMessage}
          </span>
        )}
      </div>
      <style>{`@keyframes wlblink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

export default PixelXpBar;

"use client";

import React from "react";

// 8-bit step-area chart — dependency-free port of theorcdev's
// "8bit-chart-area-step" (8bitcn.com, via 21st.dev). Custom SVG: pixel grid,
// dashed y-gridlines, a step area + step line, square node markers, hover to move
// the active marker + tooltip. Themed for Clerow's dark dashboard.
export type ChartPoint = { label: string; value: number };

const W = 720;
const H = 320;
const PAD = { top: 24, right: 24, bottom: 44, left: 40 };

export function PixelAreaChart({
  data,
  max,
  color = "#38A9E0",
  ink = "#F3F7F8",
  surface = "#15252B",
  valueLabel = "Visibility",
}: {
  data: ChartPoint[];
  max?: number;
  color?: string;
  ink?: string;
  surface?: string;
  valueLabel?: string;
}) {
  // null = nothing hovered (no pinned tooltip cluttering the chart); the header
  // then shows the latest point. Hovering a node reveals its tooltip + marker.
  const [hovered, setHovered] = React.useState<number | null>(null);

  if (data.length < 2) {
    return (
      <div style={{ color: "var(--ink-2,#A7BCC4)", fontWeight: 600, fontSize: 13, padding: "8px 2px" }}>
        Scan a few times to see your visibility trend here.
      </div>
    );
  }

  const top = max ?? Math.max(10, ...data.map((d) => d.value));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const point = (i: number, v: number) => ({
    x: PAD.left + (innerW / (data.length - 1)) * i,
    y: PAD.top + innerH - (Math.max(0, Math.min(top, v)) / top) * innerH,
  });
  const pts = data.map((d, i) => point(i, d.value));
  const stepPath = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `H ${p.x} V ${p.y}`)).join(" ");
  const baseY = H - PAD.bottom;
  const areaPathD = `${stepPath} L ${pts[pts.length - 1].x} ${baseY} H ${pts[0].x} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  const active = hovered ?? data.length - 1;
  const a = data[active] ?? data[data.length - 1];
  const ap = point(active, a.value);

  return (
    <div style={{ width: "100%", border: `2px solid var(--line,#273A42)`, borderRadius: 14, background: surface, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-3,#6E848C)" }}>{valueLabel} over time</span>
        <span style={{ fontFamily: "var(--mono)", fontWeight: 800, fontSize: 13, color }}>{a.value}{valueLabel === "Visibility" ? "" : ""} · {a.label}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }} role="img" aria-label={`${valueLabel} trend`} onMouseLeave={() => setHovered(null)}>
        <defs>
          <pattern id="pixgrid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke={ink} strokeOpacity="0.08" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} fill="url(#pixgrid)" />
        {yTicks.map((t, i) => {
          const y = point(0, t).y;
          return (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={ink} strokeOpacity="0.2" strokeDasharray="8 8" />
              <text x={PAD.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill={ink} fillOpacity="0.5">{t}</text>
            </g>
          );
        })}
        <path d={areaPathD} fill={color} opacity="0.30" />
        <path d={stepPath} fill="none" stroke={color} strokeWidth="6" strokeLinejoin="miter" strokeLinecap="square" />
        {data.map((d, i) => {
          const p = point(i, d.value);
          const isActive = hovered === i;
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)} tabIndex={0} style={{ cursor: "pointer", outline: "none" }}>
              <line x1={p.x} x2={p.x} y1={PAD.top} y2={baseY} stroke="transparent" strokeWidth={Math.max(20, innerW / data.length)} />
              <rect x={p.x - 7} y={p.y - 7} width="14" height="14" fill={isActive ? ink : color} stroke={surface} strokeWidth="3" />
            </g>
          );
        })}
        {data.map((d, i) => (
          <text key={i} x={point(i, 0).x} y={H - 16} textAnchor="middle" fontSize="10" fill={ink} fillOpacity="0.5">{d.label}</text>
        ))}
        {hovered !== null && (
          <g transform={`translate(${Math.min(ap.x + 12, W - 150)} ${Math.max(ap.y - 54, 14)})`} style={{ pointerEvents: "none" }}>
            <rect width="138" height="40" fill={surface} stroke={ink} strokeWidth="3" />
            <text x="10" y="17" fontSize="10" fill={ink}>{a.label}</text>
            <text x="10" y="32" fontSize="10" fill={color}>{valueLabel}: {a.value}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

export default PixelAreaChart;

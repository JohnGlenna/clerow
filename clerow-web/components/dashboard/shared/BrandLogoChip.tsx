"use client";

import React from "react";

// A square logo chip for a brand, fetched via Clearbit from its domain. Renders
// nothing (null) until the logo loads and if it 404s — the caller always shows
// the brand name separately, so a missing logo just means no chip (no lone
// initial). `className` lets each surface size the chip (e.g. "lb-logo").
export function BrandLogoChip({ domain, className }: { domain: string | null; className: string }) {
  const [ok, setOk] = React.useState(false);
  if (!domain) return null;
  const src = `https://logo.clearbit.com/${domain}`;
  // Hidden probe drives the load/error state; once it loads we show the chip.
  return ok ? (
    <span className={className} style={{ background: "#fff" }}>
      <img src={src} alt="" />
    </span>
  ) : (
    <img src={src} alt="" onLoad={() => setOk(true)} onError={() => setOk(false)} style={{ display: "none" }} />
  );
}

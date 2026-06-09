"use client";

import React from "react";
import { MascotClerow } from "@/components/Mascot";

// Shown dead-center the moment Stripe Checkout returns the user to the dashboard
// (?checkout=success). It's the first thing a new subscriber sees: an invitation
// to run their first full scan. If they dismiss it, the card flies to the right
// rail and lands on the "Run full scan" CTA — so they know where to find it next.
export function FullScanPrompt({
  hasFullScan,
  onRun,
  onClose,
}: {
  hasFullScan: boolean;
  onRun: () => void;
  onClose: () => void;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [flying, setFlying] = React.useState(false);

  // Measure the live position of the rail's CTA and animate the card to it. If
  // the CTA isn't mounted (e.g. not on the Tasks page), just close cleanly.
  const dismiss = React.useCallback(() => {
    if (flying) return;
    const card = cardRef.current;
    const target = document.querySelector<HTMLElement>(".scan-cta-btn");
    if (!card || !target) {
      onClose();
      return;
    }
    const c = card.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const dx = t.left + t.width / 2 - (c.left + c.width / 2);
    const dy = t.top + t.height / 2 - (c.top + c.height / 2);
    const scale = Math.max(0.12, Math.min(0.4, t.width / c.width));
    card.style.setProperty("--fly-x", `${Math.round(dx)}px`);
    card.style.setProperty("--fly-y", `${Math.round(dy)}px`);
    card.style.setProperty("--fly-s", `${scale.toFixed(3)}`);
    setFlying(true);
    // Make the landing obvious: pulse the destination button as the card arrives.
    target.classList.add("scan-cta-btn--land");
    window.setTimeout(() => target.classList.remove("scan-cta-btn--land"), 1500);
    // Safety net so the popup still closes if animations are disabled.
    window.setTimeout(onClose, 800);
  }, [flying, onClose]);

  return (
    <div
      className={`fsp-scrim ${flying ? "is-flying" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fsp-title"
      onMouseDown={dismiss}
    >
      <div
        ref={cardRef}
        className={`fsp-card ${flying ? "fsp-card--fly" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
        onAnimationEnd={(e) => {
          if (e.animationName === "fspFly") onClose();
        }}
      >
        <button className="fsp-x" onClick={dismiss} aria-label="Maybe later">
          ✕
        </button>
        <div className="fsp-mascot">
          <MascotClerow size={92} float />
        </div>
        <span className="fsp-badge">⭐ You&apos;re on Premium</span>
        <h3 className="fsp-title" id="fsp-title">
          {hasFullScan ? "Run a fresh full scan" : "Run your first full scan"}
        </h3>
        <p className="fsp-body">
          All 5 AI models read your site, AI-grade your pages and test your real buyer queries — then every
          level unlocks. Takes about 1–2 minutes.
        </p>
        <button className="fsp-cta" onClick={onRun}>
          <img src="/assets/clerow-mascot.png" alt="" className="fsp-cta-ic" />
          Run full scan
        </button>
        <button className="fsp-later" onClick={dismiss}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

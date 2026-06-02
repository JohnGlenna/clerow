"use client";

import React from "react";

// Shown when Stripe Checkout redirects back to /dashboard?checkout=success.
export function SubscribedToast({ onClose }: { onClose: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="sub-toast" role="status">
      <span className="sub-toast-ic">⭐</span>
      <div className="sub-toast-txt">
        <b>You&apos;re on Founder! 🎉</b>
        <span>All 5 AI models &amp; every level are unlocked. Run your first full scan to light them up.</span>
      </div>
      <button className="sub-toast-x" onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
  );
}

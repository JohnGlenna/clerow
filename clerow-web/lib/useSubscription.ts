"use client";

import React from "react";

export type SubscriptionState = {
  subscribed: boolean;
  plan: string | null;
  status: string | null;
  cancelAtPeriodEnd: boolean;
};

// Fetches the signed-in user's billing/access state for the dashboard shell.
// `subscribed` is null while loading so the UI can avoid flashing the paywall.
export function useSubscription() {
  const [data, setData] = React.useState<SubscriptionState | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        if (!res.ok) throw new Error("status failed");
        const json: SubscriptionState = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // Treat an error as "not subscribed" so paid content stays gated.
        if (!cancelled) setData({ subscribed: false, plan: null, status: null, cancelAtPeriodEnd: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { subscription: data, loading };
}

// Redirect the browser to a Stripe Checkout Session for the given plan.
export async function startCheckout(plan: "founder" | "team") {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.url) window.location.href = json.url;
  else alert(json.error ?? "Could not start checkout. Please try again.");
}

// Redirect the browser to the Stripe Billing Portal to manage/cancel.
export async function openBillingPortal(): Promise<boolean> {
  const res = await fetch("/api/billing/portal", { method: "POST" });
  const json = await res.json().catch(() => ({}));
  if (json.url) {
    window.location.href = json.url;
    return true;
  }
  return false;
}

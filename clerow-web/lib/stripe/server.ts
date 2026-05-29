import Stripe from "stripe";

// Server-only Stripe client. Throws if the secret key is missing, mirroring the
// fail-loud pattern in lib/supabase/admin.ts. Never import this into a client
// component — the secret key must never reach the browser.
let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  // No apiVersion pin — use the account default the keys were created with.
  stripe = new Stripe(key);
  return stripe;
}

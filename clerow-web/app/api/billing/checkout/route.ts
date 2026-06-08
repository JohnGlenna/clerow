import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { PLANS, isPlanKey, priceIdFor } from "@/lib/billing/plans";
import { LAUNCH_PROMO, promoAppliesTo } from "@/lib/billing/promo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create a Stripe Checkout Session (subscription mode) for the chosen plan and
// return its hosted URL. The browser redirects there; the webhook records the
// subscription once payment completes.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const plan = body.plan;
  if (!isPlanKey(plan)) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  if (!PLANS[plan].checkout) {
    return NextResponse.json({ error: "This plan is sales-led" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // Reuse an existing Stripe customer for this user (keyed by metadata) so we
    // don't create a duplicate on repeat checkouts. The webhook persists the row.
    let customerId: string | undefined;
    const found = await stripe.customers.search({ query: `metadata['user_id']:'${user.id}'` });
    customerId = found.data[0]?.id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    const base = {
      mode: "subscription" as const,
      customer: customerId,
      line_items: [{ price: priceIdFor(plan), quantity: 1 }],
      // Carry user_id on the subscription so every subscription.* webhook can
      // resolve the owner without a customer lookup.
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id, plan },
      success_url: `${siteUrl}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/dashboard?checkout=cancelled`,
    };

    // Auto-apply the early-adopter promo when it's live and applies to this plan,
    // so the charge matches the discounted price we advertise. Stripe forbids
    // combining `discounts` with `allow_promotion_codes`, so it's one or the other.
    const usePromo = promoAppliesTo(plan) && Boolean(LAUNCH_PROMO.promotionCodeId);

    let session;
    try {
      session = await stripe.checkout.sessions.create(
        usePromo
          ? { ...base, discounts: [{ promotion_code: LAUNCH_PROMO.promotionCodeId }] }
          : { ...base, allow_promotion_codes: true },
      );
    } catch (promoErr) {
      // A stale/expired/invalid promo code would otherwise hard-fail checkout.
      // Fall back to a normal session (manual promo entry still works).
      if (!usePromo) throw promoErr;
      console.warn("[billing/checkout] promo apply failed, retrying without it:", promoErr);
      session = await stripe.checkout.sessions.create({ ...base, allow_promotion_codes: true });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Surface the real reason instead of a silent 500 — the client only shows a
    // generic "could not start checkout" when no JSON error is returned.
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("[billing/checkout] failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { PLANS, isPlanKey, priceIdFor } from "@/lib/billing/plans";

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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    // Carry user_id on the subscription so every subscription.* webhook can
    // resolve the owner without a customer lookup.
    subscription_data: { metadata: { user_id: user.id } },
    metadata: { user_id: user.id, plan },
    success_url: `${siteUrl}/dashboard?checkout=success`,
    cancel_url: `${siteUrl}/dashboard?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}

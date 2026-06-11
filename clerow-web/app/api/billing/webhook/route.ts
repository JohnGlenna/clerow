import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planForPriceId } from "@/lib/billing/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe calls this endpoint server-to-server (no user session). The raw body
// is required for signature verification, and all DB writes go through the
// service-role admin client because RLS blocks unauthenticated writes.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });

  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (userId && subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscription(await resolveCurrentSubscription(stripe, sub), userId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (userId) await upsertSubscription(await resolveCurrentSubscription(stripe, sub), userId);
        break;
      }
      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Stripe webhooks can arrive out of order, and a double checkout briefly gives
// a customer duplicate subscriptions. The event payload is therefore not the
// customer's current state: a late `deleted` event for a stale subscription
// would clobber the active row (the upsert keys on user_id). Re-list the
// customer's subscriptions and keep the live one — newest active/trialing,
// falling back to the newest of any status.
async function resolveCurrentSubscription(
  stripe: Stripe,
  eventSub: Stripe.Subscription,
): Promise<Stripe.Subscription> {
  const customerId = typeof eventSub.customer === "string" ? eventSub.customer : eventSub.customer.id;
  const { data } = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
  const byNewest = [...data].sort((a, b) => b.created - a.created);
  const live = byNewest.find((s) => s.status === "active" || s.status === "trialing");
  return live ?? byNewest[0] ?? eventSub;
}

// Map a Stripe subscription onto the subscriptions row and upsert it (PK is
// user_id, so a customer always has exactly one row).
async function upsertSubscription(sub: Stripe.Subscription, userId: string) {
  const admin = createAdminClient();
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // `current_period_end` lives on the subscription item in newer API versions
  // and on the subscription itself in older ones — read whichever is present.
  const periodEndUnix =
    (item as { current_period_end?: number } | undefined)?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    null;

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: sub.status,
      plan: planForPriceId(priceId),
      price_id: priceId,
      current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

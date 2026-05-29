import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { getSubscription } from "@/lib/billing/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Permanently delete the signed-in user's account.
//   1. Cancel any live Stripe subscription so billing stops immediately.
//   2. Delete the auth user — which cascades (ON DELETE CASCADE on
//      brands.user_id and subscriptions.user_id) to their brand, prompts,
//      scans, scan_results, result_brands, tasks, and subscription row.
//
// Stripe is cancelled FIRST and is a hard gate: if we can't confirm billing
// has stopped we abort rather than orphan a paying customer who can no longer
// sign in to cancel. The Stripe customer object itself is left in place for
// invoice/records history — only the recurring subscription is ended.
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // 1) Stop billing. Skip if there's nothing live; tolerate a subscription
  // that's already gone, but hard-fail on anything else.
  const sub = await getSubscription(admin, user.id);
  if (sub?.stripe_subscription_id && sub.status !== "canceled") {
    try {
      await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
    } catch (err) {
      const alreadyGone =
        err instanceof Stripe.errors.StripeError &&
        (err.code === "resource_missing" || err.statusCode === 404);
      if (!alreadyGone) {
        return NextResponse.json(
          { error: "Couldn't cancel your subscription. Please contact support before deleting." },
          { status: 502 },
        );
      }
    }
  }

  // 2) Delete the auth user (hard delete → cascades to all app data).
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort: clear the now-stale session cookie on this device. The user
  // is already gone, so failure here is harmless.
  await supabase.auth.signOut().catch(() => {});

  return NextResponse.json({ deleted: true });
}

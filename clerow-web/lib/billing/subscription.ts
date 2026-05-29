import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SubscriptionRow } from "../supabase/database.types";

type DB = SupabaseClient<Database>;

// Statuses that grant access to paid features. Stripe keeps a subscription in
// `active`/`trialing` while the customer is current; `past_due` etc. lock back.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

// Fetch the signed-in user's subscription row (or null). Pass a user-scoped
// client (RLS limits it to their own row) or the admin client.
export async function getSubscription(db: DB, userId: string): Promise<SubscriptionRow | null> {
  const { data } = await db.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  return data ?? null;
}

export function isSubscribed(sub: SubscriptionRow | null): boolean {
  return !!sub && ACTIVE_STATUSES.has(sub.status);
}

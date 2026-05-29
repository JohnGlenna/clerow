import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, isSubscribed } from "@/lib/billing/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight subscription check for the dashboard shell. Returns the user's
// access state so the UI can gate locked pages without prop-drilling.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sub = await getSubscription(supabase, user.id);
  return NextResponse.json({
    subscribed: isSubscribed(sub),
    plan: sub?.plan ?? null,
    status: sub?.status ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
  });
}

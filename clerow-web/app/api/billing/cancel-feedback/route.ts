import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/billing/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Record why a subscriber is cancelling, captured by the survey shown before we
// send them to the Stripe Billing Portal. Best-effort: the client still proceeds
// to the portal even if this fails, so we never trap someone trying to leave.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const detail = typeof body.detail === "string" ? body.detail.trim() : "";
  if (!reason) return NextResponse.json({ error: "Reason required" }, { status: 400 });

  // Stamp the plan they were on so churn can be sliced by tier later.
  const sub = await getSubscription(supabase, user.id);

  const { error } = await supabase.from("cancellation_feedback").insert({
    user_id: user.id,
    reason: reason.slice(0, 200),
    detail: detail ? detail.slice(0, 2000) : null,
    plan: sub?.plan ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

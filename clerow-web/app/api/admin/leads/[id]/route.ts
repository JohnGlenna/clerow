// Inline lead status updates (the entire CRM: new → scanned → emailed →
// replied → customer).

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  let body: { status?: string; stopSequence?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Stop the drip for this lead without rejecting it: step 3 is terminal, so
  // the follow-up queue never picks it up again. Status is left alone.
  if (body.stopSequence) {
    const { data, error } = await admin
      .from("leads")
      .update({ sequence_step: 3, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, status")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ lead: data });
  }

  const status = body.status as LeadStatus;
  if (!LEAD_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of ${LEAD_STATUSES.join(", ")}` }, { status: 400 });
  }

  const { data, error } = await admin
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json({ lead: data });
}

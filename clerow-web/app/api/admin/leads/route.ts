// Pipeline counts for the Discover tab's status strip.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { getLeadCounts } from "@/lib/leads/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const counts = await getLeadCounts(createAdminClient());
    return NextResponse.json({ counts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Counts failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

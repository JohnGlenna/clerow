// The auto-scan kill switch for the admin Prospect Scanner. GET reads the
// current state; POST flips it. Gates both cron routes (daily-scan +
// prospect-pipeline) via lib/settings. Admin-gated like the other /api/admin
// routes (createClient → auth.getUser → isAdminEmail).

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import { getAutoScansEnabled, setAutoScansEnabled } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  if (!isAdminEmail(user.email))
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { error: null };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const admin = createAdminClient();
  return NextResponse.json({ enabled: await getAutoScansEnabled(admin) });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await req.json().catch(() => ({}))) as { enabled?: unknown };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Body must be { enabled: boolean }" }, { status: 400 });
  }

  const admin = createAdminClient();
  await setAutoScansEnabled(admin, body.enabled);
  return NextResponse.json({ enabled: body.enabled });
}

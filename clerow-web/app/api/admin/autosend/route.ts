// The auto-send kill switch for the outreach drip cron. GET reads the current
// state; POST flips it. Gates /api/cron/send-outreach via lib/settings —
// separate from the auto-scans switch so drafting can run while sending is
// paused. Admin-gated like the other /api/admin routes.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminGate";
import {
  getAutoSendEnabled,
  getAutoSendPausedReason,
  setAutoSendEnabled,
  setAutoSendPausedReason,
} from "@/lib/settings";
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
  const [enabled, pausedReason] = await Promise.all([
    getAutoSendEnabled(admin),
    getAutoSendPausedReason(admin),
  ]);
  return NextResponse.json({ enabled, pausedReason });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await req.json().catch(() => ({}))) as { enabled?: unknown };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Body must be { enabled: boolean }" }, { status: 400 });
  }

  const admin = createAdminClient();
  await setAutoSendEnabled(admin, body.enabled);
  // Turning sending back on means the founder has fixed whatever paused it.
  if (body.enabled) await setAutoSendPausedReason(admin, null);
  return NextResponse.json({ enabled: body.enabled, pausedReason: null });
}

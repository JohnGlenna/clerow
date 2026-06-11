import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAdminUser } from "@/lib/adminGate";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The investor metrics page's ONE global share link (metrics_share_links has no
// RLS policies, so all access goes through the service-role client behind the
// founder gate).

function siteOrigin(req: Request): string {
  try {
    return new URL(req.url).origin;
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }
}

async function activeToken() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("metrics_share_links")
    .select("token")
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.token ?? null;
}

// Current active link, if any.
export async function GET(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const token = await activeToken();
  return NextResponse.json({ url: token ? `${siteOrigin(req)}/investors/${token}` : null });
}

// Mint (or reuse) the global investor link.
export async function POST(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let token = await activeToken();
  if (!token) {
    token = randomBytes(12).toString("base64url");
    const { error } = await createAdminClient().from("metrics_share_links").insert({ token });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ url: `${siteOrigin(req)}/investors/${token}`, token });
}

// Revoke every active link (kills the URL for everyone who has it).
export async function DELETE() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await createAdminClient()
    .from("metrics_share_links")
    .update({ revoked_at: new Date().toISOString() })
    .is("revoked_at", null);
  return NextResponse.json({ ok: true });
}

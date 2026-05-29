import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public share URLs use the request origin so a minted link works on whatever
// host served it; NEXT_PUBLIC_SITE_URL is the fallback (matches the billing routes).
function siteOrigin(req: Request): string {
  try {
    return new URL(req.url).origin;
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }
}

async function resolveBrand(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { authed: false, brandId: null as string | null };
  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { authed: true, brandId: brand?.id ?? null };
}

// Mint (or reuse) a public share link for the signed-in user's brand.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { authed, brandId } = await resolveBrand(supabase);
  if (!authed) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!brandId) return NextResponse.json({ error: "Nothing to share yet" }, { status: 400 });

  const { data: existing } = await supabase
    .from("share_links")
    .select("token")
    .eq("brand_id", brandId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let token = existing?.token;
  if (!token) {
    token = randomBytes(12).toString("base64url");
    const { error } = await supabase.from("share_links").insert({ brand_id: brandId, token });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: `${siteOrigin(req)}/share/${token}`, token });
}

// Revoke all active share links for the user's brand (kills any stale URL).
export async function DELETE() {
  const supabase = await createClient();
  const { authed, brandId } = await resolveBrand(supabase);
  if (!authed) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (brandId) {
    await supabase
      .from("share_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("brand_id", brandId)
      .is("revoked_at", null);
  }
  return NextResponse.json({ ok: true });
}

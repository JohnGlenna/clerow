import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomToken } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the /connect-claude consent page once the user is signed in and
// clicks Approve. Mints a single-use authorization code bound to {user, client,
// redirect_uri, PKCE challenge}; returns where the browser should go next.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, string | null>;
  const clientId = body.client_id;
  const redirectUri = body.redirect_uri;
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("oauth_clients")
    .select("redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();
  if (!client || !client.redirect_uris.includes(redirectUri)) {
    return NextResponse.json({ error: "invalid_request", error_description: "Bad client or redirect_uri" }, { status: 400 });
  }

  const code = randomToken(32);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { error } = await admin.from("oauth_codes").insert({
    code,
    client_id: clientId,
    user_id: user.id,
    redirect_uri: redirectUri,
    code_challenge: body.code_challenge ?? null,
    code_challenge_method: body.code_challenge_method ?? null,
    scope: body.scope ?? null,
    resource: body.resource ?? null,
    expires_at: expiresAt,
  });
  if (error) {
    return NextResponse.json({ error: "server_error", error_description: error.message }, { status: 500 });
  }

  const u = new URL(redirectUri);
  u.searchParams.set("code", code);
  if (body.state) u.searchParams.set("state", body.state);
  return NextResponse.json({ redirect: u.toString() });
}

import { NextResponse } from "next/server";
import { getPublicOrigin } from "mcp-handler";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Authorization endpoint. Validates the client + redirect_uri, then hands off to
// the /connect-claude consent UI (which signs the user in and approves). The UI
// posts to /api/oauth/approve to mint the code.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams;
  const clientId = p.get("client_id");
  const redirectUri = p.get("redirect_uri");
  const responseType = p.get("response_type");

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing client_id or redirect_uri" },
      { status: 400 },
    );
  }
  if (responseType && responseType !== "code") {
    return redirectError(redirectUri, p.get("state"), "unsupported_response_type");
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("oauth_clients")
    .select("client_id, redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "unauthorized_client", error_description: "Unknown client_id" }, { status: 400 });
  }
  if (!client.redirect_uris.includes(redirectUri)) {
    return NextResponse.json({ error: "invalid_request", error_description: "redirect_uri not registered" }, { status: 400 });
  }

  const consent = new URL("/connect-claude", getPublicOrigin(req));
  consent.search = url.search;
  return NextResponse.redirect(consent);
}

function redirectError(redirectUri: string, state: string | null, error: string) {
  const u = new URL(redirectUri);
  u.searchParams.set("error", error);
  if (state) u.searchParams.set("state", state);
  return NextResponse.redirect(u);
}

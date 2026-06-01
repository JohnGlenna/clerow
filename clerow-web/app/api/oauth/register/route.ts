import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomToken } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// Dynamic Client Registration (RFC 7591). Claude posts its redirect_uris and we
// hand back a public client_id (no secret — PKCE protects the code exchange).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    redirect_uris?: unknown;
    client_name?: unknown;
  };
  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];
  if (redirectUris.length === 0) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris is required" },
      { status: 400, headers: CORS },
    );
  }

  const clientId = `clerow_client_${randomToken(16)}`;
  const clientName = typeof body.client_name === "string" ? body.client_name.slice(0, 120) : "MCP client";

  const admin = createAdminClient();
  const { error } = await admin.from("oauth_clients").insert({
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
  });
  if (error) {
    return NextResponse.json({ error: "server_error", error_description: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      client_name: clientName,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    },
    { status: 201, headers: CORS },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS });
}

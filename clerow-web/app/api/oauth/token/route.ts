import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateKey } from "@/lib/apiKeys";
import { verifyPkce } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// Token endpoint. Exchanges a single-use authorization code (with PKCE) for an
// access token. The access token IS a Clerow API key, so the MCP server resolves
// it with the existing resolveKey(); the user can revoke it in Settings.
export async function POST(req: Request) {
  const params = await readParams(req);

  if (params.grant_type !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400, headers: CORS });
  }
  const { code, redirect_uri: redirectUri, client_id: clientId, code_verifier: codeVerifier } = params;
  if (!code || !redirectUri || !clientId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: CORS });
  }

  const admin = createAdminClient();
  const { data: row } = await admin.from("oauth_codes").select("*").eq("code", code).maybeSingle();
  // Single-use: consume the code regardless of what happens next.
  if (row) await admin.from("oauth_codes").delete().eq("code", code);

  if (!row || row.client_id !== clientId || row.redirect_uri !== redirectUri) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: CORS });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "invalid_grant", error_description: "Authorization code expired" }, { status: 400, headers: CORS });
  }
  if (!verifyPkce(codeVerifier ?? "", row.code_challenge, row.code_challenge_method)) {
    return NextResponse.json({ error: "invalid_grant", error_description: "PKCE verification failed" }, { status: 400, headers: CORS });
  }

  const { plaintext, hash, prefix } = generateKey();
  const { error } = await admin.from("api_keys").insert({
    user_id: row.user_id,
    name: "Claude connector",
    key_hash: hash,
    prefix,
  });
  if (error) {
    return NextResponse.json({ error: "server_error", error_description: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json(
    { access_token: plaintext, token_type: "Bearer", scope: row.scope ?? "clerow" },
    { status: 200, headers: { ...CORS, "Cache-Control": "no-store" } },
  );
}

// OAuth clients may post form-encoded (the spec default) or JSON.
async function readParams(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Record<string, string>;
  }
  const form = await req.formData().catch(() => null);
  const out: Record<string, string> = {};
  if (form) for (const [k, v] of form.entries()) out[k] = String(v);
  return out;
}

export function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS });
}

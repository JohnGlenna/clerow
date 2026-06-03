import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mintAccessKey } from "@/lib/apiKeys";
import { verifyPkce, generateRefreshToken, sha256, ACCESS_TTL_SECONDS } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

type Admin = ReturnType<typeof createAdminClient>;

// Token endpoint. Two grants:
//   • authorization_code — exchange a single-use, PKCE-protected code for an
//     access token (a short-lived Clerow API key) + a refresh token.
//   • refresh_token — exchange a refresh token for a fresh access token, rotating
//     the refresh token (OAuth 2.1 §4.3.1) so a leaked one is single-use.
// Access tokens are Clerow API keys, so the MCP server resolves them with the
// existing resolveKey(); the user can revoke a connection in Settings.
export async function POST(req: Request) {
  const params = await readParams(req);
  const admin = createAdminClient();

  if (params.grant_type === "authorization_code") return authorizationCode(admin, params);
  if (params.grant_type === "refresh_token") return refreshToken(admin, params);
  return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400, headers: CORS });
}

async function authorizationCode(admin: Admin, params: Record<string, string>) {
  const { code, redirect_uri: redirectUri, client_id: clientId, code_verifier: codeVerifier } = params;
  if (!code || !redirectUri || !clientId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: CORS });
  }

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

  return issueTokens(admin, {
    userId: row.user_id,
    clientId,
    scope: row.scope,
    resource: row.resource,
  });
}

async function refreshToken(admin: Admin, params: Record<string, string>) {
  const { refresh_token: refreshTokenValue, client_id: clientId } = params;
  if (!refreshTokenValue || !clientId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: CORS });
  }

  const tokenHash = sha256(refreshTokenValue);
  const { data: row } = await admin
    .from("oauth_refresh_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  // Rotation: the presented refresh token is always retired here. A replay of an
  // already-rotated token finds nothing and fails.
  if (row) await admin.from("oauth_refresh_tokens").delete().eq("token_hash", tokenHash);

  if (!row || row.client_id !== clientId) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: CORS });
  }

  // Revoke the access token that was paired with this (now-retired) refresh token.
  if (row.access_key_id) {
    await admin.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", row.access_key_id);
  }

  return issueTokens(admin, {
    userId: row.user_id,
    clientId,
    scope: row.scope,
    resource: row.resource,
  });
}

// Mint a paired access token + refresh token and persist the refresh token.
async function issueTokens(
  admin: Admin,
  ctx: { userId: string; clientId: string; scope: string | null; resource: string | null },
) {
  const access = await mintAccessKey(admin, {
    userId: ctx.userId,
    name: "Claude connector",
    ttlSeconds: ACCESS_TTL_SECONDS,
  });
  if (!access) {
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: CORS });
  }

  const refresh = generateRefreshToken();
  const { error } = await admin.from("oauth_refresh_tokens").insert({
    token_hash: refresh.hash,
    user_id: ctx.userId,
    client_id: ctx.clientId,
    access_key_id: access.keyId,
    scope: ctx.scope,
    resource: ctx.resource,
  });
  if (error) {
    // Don't strand an unusable access token if the refresh insert fails.
    await admin.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", access.keyId);
    return NextResponse.json({ error: "server_error", error_description: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json(
    {
      access_token: access.plaintext,
      token_type: "Bearer",
      expires_in: ACCESS_TTL_SECONDS,
      refresh_token: refresh.plaintext,
      scope: ctx.scope ?? "clerow",
    },
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

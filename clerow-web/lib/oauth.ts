// Helpers for the Clerow OAuth 2.1 authorization server (see app/api/oauth/*).
//
// Access tokens are minted as Clerow API keys (lib/apiKeys), so the MCP server
// resolves them with the existing resolveKey(). Refresh tokens live in their own
// table (oauth_refresh_tokens) and let a client mint a new access token without
// sending the user back through the browser.

import crypto from "crypto";

// How long an issued access token is valid. OAuth 2.1 favours short-lived access
// tokens backed by a refresh token; 30 days is long enough that an idle MCP
// client rarely refreshes mid-session, short enough to bound a leaked token.
export const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;

export const REFRESH_PREFIX = "clerow_rt_";

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// A fresh refresh token + the hash we persist (we never store the plaintext).
export function generateRefreshToken(): { plaintext: string; hash: string } {
  const plaintext = `${REFRESH_PREFIX}${randomToken(32)}`;
  return { plaintext, hash: sha256(plaintext) };
}

// PKCE (RFC 7636), S256 only. OAuth 2.1 makes PKCE mandatory for public clients
// and drops the "plain" method, so a missing challenge/verifier or a non-S256
// method is a hard failure — no silent bypass.
export function verifyPkce(verifier: string, challenge: string | null, method: string | null): boolean {
  if (!challenge || !verifier) return false;
  if (method !== "S256") return false;
  const hash = crypto.createHash("sha256").update(verifier).digest("base64url");
  return hash === challenge;
}

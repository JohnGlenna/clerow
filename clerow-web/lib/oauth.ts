// Small helpers for the Clerow OAuth authorization server (see app/api/oauth/*).
// Access tokens are minted as Clerow API keys (lib/apiKeys), so the MCP server
// resolves them with the existing resolveKey(); nothing here issues tokens.

import crypto from "crypto";

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

// PKCE (RFC 7636). Returns true when the verifier matches the stored challenge.
// An empty challenge means the client didn't use PKCE — allowed, but discouraged.
export function verifyPkce(verifier: string, challenge: string | null, method: string | null): boolean {
  if (!challenge) return true;
  if (!verifier) return false;
  if ((method ?? "S256") === "plain") return verifier === challenge;
  const hash = crypto.createHash("sha256").update(verifier).digest("base64url");
  return hash === challenge;
}

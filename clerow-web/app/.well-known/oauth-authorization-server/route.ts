import { getPublicOrigin, metadataCorsOptionsRequestHandler } from "mcp-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// RFC 8414 — authorization server metadata. Clerow is its own OAuth AS; the
// access token it issues is a Clerow API key the MCP server already understands.
export function GET(req: Request) {
  const origin = getPublicOrigin(req);
  const metadata = {
    issuer: origin,
    authorization_endpoint: `${origin}/api/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["clerow"],
  };
  return new Response(JSON.stringify(metadata), {
    headers: { "Content-Type": "application/json", "Cache-Control": "max-age=3600", ...CORS },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();

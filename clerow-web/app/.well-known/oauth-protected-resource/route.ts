import { protectedResourceHandler, metadataCorsOptionsRequestHandler, getPublicOrigin } from "mcp-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// RFC 9728 — tells an MCP client which authorization server protects the Clerow
// MCP endpoint. The 401 from /api/mcp points here (via withMcpAuth).
export function GET(req: Request) {
  const origin = getPublicOrigin(req);
  return protectedResourceHandler({
    authServerUrls: [origin],
    resourceUrl: `${origin}/api/mcp`,
  })(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();

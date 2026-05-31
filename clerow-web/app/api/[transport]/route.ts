import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveKey } from "@/lib/apiKeys";
import { registerTools } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The Clerow MCP server. File lives at app/api/[transport]/route.ts with
// basePath "/api", so the streamable-HTTP endpoint resolves to /api/mcp.
const handler = createMcpHandler(
  (server) => registerTools(server),
  { serverInfo: { name: "clerow", version: "1.0.0" } },
  { basePath: "/api", disableSse: true },
);

// Authenticate every request with a long-lived Clerow API key (clerow_sk_…).
// The resolved user + brand ride along in authInfo.extra for the tools to read.
const verifyToken = async (_req: Request, bearer?: string): Promise<AuthInfo | undefined> => {
  const resolved = await resolveKey(createAdminClient(), bearer);
  if (!resolved) return undefined;
  return {
    token: bearer ?? "",
    clientId: resolved.userId,
    scopes: [],
    extra: { userId: resolved.userId, brandId: resolved.brandId },
  };
};

const authed = withMcpAuth(handler, verifyToken, { required: true });

export { authed as GET, authed as POST, authed as DELETE };

// Clerow API keys — long-lived credentials for the Clerow MCP server.
//
// We never store the secret: only its SHA-256 hash (for lookup) and a short
// prefix (for display). The dashboard mints/revokes keys under the user's RLS
// session; the MCP server resolves a presented key with the service-role admin
// client (no user session exists in an MCP request).

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

type Db = SupabaseClient<Database>;

export const KEY_PREFIX = "clerow_sk_";

export function hashKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

// A new key + the values to store. The plaintext is returned to the caller ONCE
// (shown to the user on creation) and never persisted.
export function generateKey(): { plaintext: string; hash: string; prefix: string } {
  const secret = crypto.randomBytes(24).toString("base64url");
  const plaintext = `${KEY_PREFIX}${secret}`;
  return { plaintext, hash: hashKey(plaintext), prefix: plaintext.slice(0, KEY_PREFIX.length + 6) };
}

// Mint an OAuth access token (a Clerow API key) for a user, with an expiry.
// Returns the plaintext (handed to the client once) and the row id so the caller
// can pair it with a refresh token. Used by the OAuth token endpoint.
export async function mintAccessKey(
  admin: Db,
  opts: { userId: string; name: string; ttlSeconds: number },
): Promise<{ plaintext: string; keyId: string; expiresAt: string } | null> {
  const { plaintext, hash, prefix } = generateKey();
  const expiresAt = new Date(Date.now() + opts.ttlSeconds * 1000).toISOString();
  const { data, error } = await admin
    .from("api_keys")
    .insert({ user_id: opts.userId, name: opts.name, key_hash: hash, prefix, expires_at: expiresAt })
    .select("id")
    .single();
  if (error || !data) return null;
  return { plaintext, keyId: data.id, expiresAt };
}

export type ResolvedKey = { userId: string; brandId: string | null; keyId: string };

// Resolve a presented Bearer credential to its owner + their current brand.
// Returns null for missing / malformed / unknown / revoked / expired keys. Stamps
// last_used_at. MUST be called with the admin client (bypasses RLS).
export async function resolveKey(admin: Db, bearer: string | null | undefined): Promise<ResolvedKey | null> {
  if (!bearer) return null;
  const token = bearer.replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith(KEY_PREFIX)) return null;

  const { data: key } = await admin
    .from("api_keys")
    .select("id, user_id, brand_id, revoked_at, expires_at")
    .eq("key_hash", hashKey(token))
    .maybeSingle();
  if (!key || key.revoked_at) return null;
  // expires_at is null for legacy manually-minted keys (never expire).
  if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) return null;

  // Use the key's pinned brand, else the user's most recent brand.
  let brandId = key.brand_id;
  if (!brandId) {
    const { data: brand } = await admin
      .from("brands")
      .select("id")
      .eq("user_id", key.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    brandId = brand?.id ?? null;
  }

  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);
  return { userId: key.user_id, brandId, keyId: key.id };
}

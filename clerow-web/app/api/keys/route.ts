import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateKey } from "@/lib/apiKeys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manage the signed-in user's Clerow API keys (for the MCP server). Cookie/JWT
// auth via createClient → RLS scopes every row to the owner. The secret is
// returned exactly once, on POST.
async function getAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getAuth();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data } = await supabase
    .from("api_keys")
    .select("id, name, prefix, created_at, last_used_at, revoked_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = (typeof body.name === "string" && body.name.trim() ? body.name.trim() : "MCP key").slice(0, 60);
  const { plaintext, hash, prefix } = generateKey();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({ user_id: user.id, name, key_hash: hash, prefix })
    .select("id, name, prefix, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // plaintext is shown once and never stored.
  return NextResponse.json({ key: data, plaintext });
}

export async function DELETE(req: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

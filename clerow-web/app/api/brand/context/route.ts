import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "brand-uploads";
const MAX_IMAGES = 6;
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB per image
const OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function resolveBrand(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("id, about, screenshots")
    .eq("user_id", userId)
    .eq("is_prospect", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function extFor(type: string): string {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : type === "image/gif" ? "gif" : "jpg";
}

// GET: current business-context (the user's text + signed URLs for their screenshots).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const brand = await resolveBrand(user.id);
  if (!brand) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const admin = createAdminClient();
  const paths: string[] = brand.screenshots ?? [];
  const screenshots = await Promise.all(
    paths.map(async (path) => {
      const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600);
      return { path, url: data?.signedUrl ?? null };
    }),
  );
  return NextResponse.json({ about: brand.about ?? "", screenshots });
}

// POST (multipart FormData): save the user's `about` text and append uploaded
// screenshots. Stored under brand-uploads/{userId}/{brandId}/... via the
// service-role client with a code-enforced owner prefix (uploads only ever flow
// through this authenticated route — no direct browser→storage access).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const brand = await resolveBrand(user.id);
  if (!brand) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });

  const about = String(form.get("about") ?? "").trim();
  const files = form.getAll("images").filter((f): f is File => f instanceof File);
  const existing: string[] = brand.screenshots ?? [];
  if (existing.length + files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Up to ${MAX_IMAGES} screenshots.` }, { status: 400 });
  }

  const admin = createAdminClient();
  const added: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!OK_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported image type: ${file.type || "unknown"}` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `Each image must be under 6 MB.` }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const path = `${user.id}/${brand.id}/${added.length + existing.length}-${Date.now()}.${extFor(file.type)}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 502 });
    added.push(path);
  }

  // Bumping updated_at re-arms the full scan to re-distill context (it compares
  // context_enriched_at < updated_at).
  const { error: ue } = await supabase
    .from("brands")
    .update({ about, screenshots: [...existing, ...added], updated_at: new Date().toISOString() })
    .eq("id", brand.id);
  if (ue) return NextResponse.json({ error: ue.message }, { status: 500 });

  return NextResponse.json({ ok: true, added: added.length, screenshots: [...existing, ...added].length });
}

// DELETE ?path=<storage path>: remove one screenshot.
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const brand = await resolveBrand(user.id);
  if (!brand) return NextResponse.json({ error: "No brand" }, { status: 400 });

  const path = new URL(req.url).searchParams.get("path") ?? "";
  // Guard: only the owner's own prefix.
  if (!path.startsWith(`${user.id}/${brand.id}/`)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
  const next = (brand.screenshots ?? []).filter((p: string) => p !== path);
  const { error } = await supabase
    .from("brands")
    .update({ screenshots: next, updated_at: new Date().toISOString() })
    .eq("id", brand.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, screenshots: next.length });
}

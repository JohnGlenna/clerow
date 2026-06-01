// One-off: reset a user's brand + scan data so they can re-run onboarding.
// Keeps the auth user (login) intact. Deleting the brand row cascades via FKs
// to prompts, scans, scan_results, result_brands, tasks, brand_snapshots,
// brand_streak. Run with --commit to actually delete; default is a dry run.
//
//   node scripts/reset-profile.mjs                 (dry run)
//   node scripts/reset-profile.mjs --commit        (delete)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const EMAIL = "john.7bc@hotmail.com";
const COMMIT = process.argv.includes("--commit");

// Load .env.local without extra deps.
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase URL or service-role key in .env.local");

const db = createClient(url, key, { auth: { persistSession: false } });

// Find the auth user by email (paginate through the admin list).
let user = null;
for (let page = 1; page <= 20 && !user; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => (u.email || "").toLowerCase() === EMAIL.toLowerCase());
  if (data.users.length < 200) break;
}
if (!user) throw new Error(`No auth user for ${EMAIL}`);
console.log(`User: ${user.email}  id=${user.id}`);

const { data: brands, error: be } = await db.from("brands").select("id, company, url").eq("user_id", user.id);
if (be) throw be;
if (!brands.length) {
  console.log("No brand rows — already a clean slate. Nothing to do.");
  process.exit(0);
}

for (const b of brands) {
  const brandId = b.id;
  const counts = {};
  for (const t of ["prompts", "scans", "tasks", "brand_snapshots", "brand_streak"]) {
    const { count } = await db.from(t).select("id", { count: "exact", head: true }).eq("brand_id", brandId);
    counts[t] = count ?? 0;
  }
  // scan_results / result_brands are scoped via scans; report scans only.
  console.log(`\nBrand: ${b.company || "(no name)"} — ${b.url}  id=${brandId}`);
  console.log("  dependent rows:", JSON.stringify(counts));

  if (COMMIT) {
    const { error: de } = await db.from("brands").delete().eq("id", brandId);
    if (de) throw new Error(`Delete failed for brand ${brandId}: ${de.message}`);
    console.log("  ✓ deleted (cascade cleared dependents)");
  }
}

console.log(COMMIT ? "\nDone — brand + scan data removed. Login kept; next load → onboarding." : "\nDRY RUN — nothing deleted. Re-run with --commit to delete.");

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBrandProgress, type BrandProgress } from "@/lib/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI visibility progress · Clerow",
  robots: { index: false, follow: false },
};

function domainName(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim() || url;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Resolve a public share token (read-only, bypasses RLS via the service role).
// Never mutates — generating quests / evaluating the streak only happens for the
// authenticated owner on the dashboard.
async function resolveProgress(token: string): Promise<BrandProgress | null> {
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("share_links")
    .select("brand_id, revoked_at")
    .eq("token", token)
    .maybeSingle();
  if (!link || link.revoked_at) return null;
  return loadBrandProgress(admin, link.brand_id, new Date());
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const progress = await resolveProgress(token);
  if (!progress) notFound();

  const { brand, score, competitors, workDone, streak, hasScan, scannedAt } = progress;
  const ink = "#1F2430";
  const ink2 = "#5B6472";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFFDF7, #FFF4DE)",
        padding: "48px 20px 64px",
        color: ink,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em" }}>Clerow</div>
          <span style={{ fontSize: 12, fontWeight: 800, color: ink2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            AI visibility progress
          </span>
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
          {brand.company || domainName(brand.url)}
        </h1>
        <p style={{ color: ink2, fontWeight: 600, margin: "0 0 28px" }}>
          {domainName(brand.url)}
          {scannedAt ? ` · last scanned ${fmtDate(scannedAt)}` : ""}
        </p>

        {/* Streak + score row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Card>
            <Label>Daily streak</Label>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              🔥 {streak.current}
              <span style={{ fontSize: 18, color: ink2 }}> day{streak.current === 1 ? "" : "s"}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: ink2, marginTop: 6 }}>
              Longest {streak.longest} · {streak.activeToday ? "kept today ✅" : "at risk today"}
              {streak.freezes > 0 ? ` · ❄️ ${streak.freezes} freeze${streak.freezes === 1 ? "" : "s"}` : ""}
            </div>
          </Card>
          <Card>
            <Label>AI visibility score</Label>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#F59E0B" }}>
              {hasScan ? score.overall : "—"}
              <span style={{ fontSize: 18, color: ink2 }}> / 100</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: ink2, marginTop: 6 }}>
              Visibility {score.visibility}% · Position {score.position != null ? `#${score.position}` : "—"}
            </div>
          </Card>
        </div>

        {/* Competitor leaderboard */}
        {competitors.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Label>Category leaderboard</Label>
            <div style={{ marginTop: 10 }}>
              {competitors.map((c) => (
                <div
                  key={`${c.rank}-${c.name}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid #F0E6CF",
                    fontWeight: c.isYou ? 900 : 600,
                  }}
                >
                  <span style={{ width: 28, color: ink2, fontWeight: 800 }}>#{c.rank}</span>
                  <span style={{ flex: 1 }}>
                    {c.name}
                    {c.isYou && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 900, color: "#F59E0B" }}>YOU</span>
                    )}
                  </span>
                  <span style={{ color: ink2, fontWeight: 800 }}>{c.visibility}%</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Work done */}
        <Card>
          <Label>Work shipped {workDone.length > 0 ? `· ${workDone.length} task${workDone.length === 1 ? "" : "s"}` : ""}</Label>
          {workDone.length === 0 ? (
            <p style={{ color: ink2, fontWeight: 600, marginTop: 8 }}>No tasks completed yet — the climb is just starting.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
              {workDone.map((t, i) => (
                <li
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontWeight: 600 }}
                >
                  <span style={{ color: "#58CC02", fontWeight: 900 }}>✓</span>
                  <span style={{ flex: 1 }}>{t.title}</span>
                  <span style={{ fontSize: 12, color: ink2, fontWeight: 700 }}>{fmtDate(t.completedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div style={{ textAlign: "center", marginTop: 32, color: ink2, fontSize: 13, fontWeight: 700 }}>
          Powered by{" "}
          <a href="https://clerow.com" style={{ color: "#F59E0B", fontWeight: 900, textDecoration: "none" }}>
            Clerow
          </a>{" "}
          — your daily streak to getting recommended by AI.
        </div>
      </div>
    </main>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "2px solid #F0E6CF",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 4px 0 #F0E6CF",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: "#5B6472", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </div>
  );
}

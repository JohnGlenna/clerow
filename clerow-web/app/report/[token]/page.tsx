import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProspectReport, resolveReportBrandId, type ProspectReport } from "@/lib/prospect/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A cold prospect's report — no login, resolved by token via the service role.
// Don't let it into search indexes (it names a real company's standings).
export const metadata: Metadata = {
  title: "AI visibility scan · Clerow",
  robots: { index: false, follow: false },
};

const ink = "#1F2430";
const ink2 = "#5B6472";
const accent = "#F59E0B";

function domainName(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim() || url;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function resolveReport(token: string): Promise<ProspectReport | null> {
  const admin = createAdminClient();
  const brandId = await resolveReportBrandId(admin, token);
  if (!brandId) return null;
  return loadProspectReport(admin, brandId);
}

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await resolveReport(token);
  if (!report) notFound();

  const { brand, hasScan, scannedAt, engineCount, engines, score, competitors, synthesis, fixes } = report;
  const domain = domainName(brand.url);
  const scannedEngines = engines.filter((e) => e.scanned);
  const aheadOfYou = competitors.filter((c) => !c.isYou).slice(0, 1)[0];
  const startUrl = `/onboarding?url=${encodeURIComponent(brand.url)}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFFDF7, #FFF4DE)",
        padding: "48px 20px 80px",
        color: ink,
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em" }}>Clerow</div>
          <span style={{ fontSize: 12, fontWeight: 800, color: ink2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            AI visibility scan
          </span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
          {brand.company || domain}
        </h1>
        <p style={{ color: ink2, fontWeight: 600, margin: "0 0 28px" }}>
          {domain}
          {hasScan ? ` · scanned across ${engineCount} AI model${engineCount === 1 ? "" : "s"}` : ""}
          {scannedAt ? ` · ${fmtDate(scannedAt)}` : ""}
        </p>

        {/* Score */}
        <Card style={{ marginBottom: 16 }}>
          <Label>AI visibility score</Label>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1, color: accent }}>
            {hasScan ? score.overall : "—"}
            <span style={{ fontSize: 18, color: ink2 }}> / 100</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: ink2, marginTop: 6 }}>
            Visibility {score.visibility}% · Position {score.position != null ? `#${score.position}` : "not recommended"}
          </div>

          {/* Per-model standings — make the multi-model breadth visible. */}
          {scannedEngines.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {scannedEngines.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#FFFDF7",
                    border: "1.5px solid #F0E6CF",
                    borderRadius: 12,
                    padding: "8px 12px",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: e.swatch,
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 12,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {e.letter}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{e.label}</span>
                  <span style={{ color: ink2, fontWeight: 800, fontSize: 13 }}>
                    {e.position != null ? `#${e.position}` : `${e.visibility ?? 0}%`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Who AI recommends instead — the gap */}
        {competitors.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Label>Who AI recommends {aheadOfYou ? "instead" : "in your space"}</Label>
            <div style={{ marginTop: 10 }}>
              {competitors.slice(0, 10).map((c) => (
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
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 900, color: accent }}>YOU</span>
                    )}
                  </span>
                  <span style={{ color: ink2, fontWeight: 800 }}>{c.visibility}%</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* What the AI engines collectively say */}
        {synthesis && (synthesis.verdict || synthesis.consensus || synthesis.bestFix) && (
          <Card style={{ marginBottom: 16 }}>
            <Label>What the AI engines say</Label>
            {synthesis.verdict && (
              <p style={{ fontWeight: 700, fontSize: 16, margin: "10px 0 0", lineHeight: 1.5 }}>{synthesis.verdict}</p>
            )}
            {synthesis.consensus && (
              <Verdict heading="They agree on" body={synthesis.consensus} />
            )}
            {synthesis.divergence && (
              <Verdict heading="They disagree on" body={synthesis.divergence} />
            )}
            {synthesis.bestFix && (
              <Verdict heading="Highest-leverage fix" body={synthesis.bestFix} />
            )}
          </Card>
        )}

        {/* Top fixes — preview of the daily-task ladder */}
        {fixes.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Label>What to fix first</Label>
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
              {fixes.slice(0, 5).map((f) => (
                <li
                  key={f.id}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #F0E6CF" }}
                >
                  <span style={{ color: "#58CC02", fontWeight: 900, marginTop: 2 }}>→</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ fontWeight: 800, display: "block" }}>{f.title}</span>
                    <span style={{ fontSize: 13, color: ink2, fontWeight: 600 }}>{f.detail}</span>
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: accent,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                      marginTop: 2,
                    }}
                  >
                    {f.impact}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* CTA */}
        <div
          style={{
            background: "#fff",
            border: `2px solid ${accent}`,
            borderRadius: 18,
            padding: 28,
            textAlign: "center",
            boxShadow: "0 6px 0 #F7E3B0",
            marginTop: 8,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 6 }}>
            Fix this and get recommended by AI
          </div>
          <p style={{ color: ink2, fontWeight: 600, margin: "0 auto 18px", maxWidth: 460 }}>
            Clerow turns these gaps into a daily streak of small tasks, then re-scans to prove the work moved the
            needle. Claim {brand.company || domain} and start climbing.
          </p>
          <a
            href={startUrl}
            style={{
              display: "inline-block",
              background: accent,
              color: "#1F2430",
              fontWeight: 900,
              fontSize: 16,
              textDecoration: "none",
              padding: "14px 32px",
              borderRadius: 14,
              boxShadow: "0 4px 0 #C77F08",
            }}
          >
            Get started
          </a>
        </div>

        <div style={{ textAlign: "center", marginTop: 28, color: ink2, fontSize: 13, fontWeight: 700 }}>
          Powered by{" "}
          <a href="https://clerow.com" style={{ color: accent, fontWeight: 900, textDecoration: "none" }}>
            Clerow
          </a>{" "}
          — your daily streak to getting recommended by AI.
        </div>
      </div>
    </main>
  );
}

function Verdict({ heading, body }: { heading: string; body: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: ink2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {heading}
      </div>
      <p style={{ fontWeight: 600, margin: "4px 0 0", lineHeight: 1.5 }}>{body}</p>
    </div>
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
    <div style={{ fontSize: 11, fontWeight: 800, color: ink2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </div>
  );
}

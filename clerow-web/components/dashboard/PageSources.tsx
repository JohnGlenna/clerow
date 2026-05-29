"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHead, PageStat, GuideStrip } from "./AppShell";
import type { SourceRow } from "@/app/api/sources/route";

const TYPE_COLOR = (t: string) =>
  ({ UGC: "#7C3AED", Directory: "#F59E0B", Editorial: "#1CB0F6", Yours: "#58CC02", Other: "#A8A8A8" }[t] || "#A8A8A8");

export function PageSources() {
  const router = useRouter();
  const [sources, setSources] = React.useState<SourceRow[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [added, setAdded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/sources", { cache: "no-store" });
      const json = await res.json().catch(() => ({ sources: [], totalResults: 0 }));
      if (!cancelled) {
        setSources(json.sources ?? []);
        setTotal(json.totalResults ?? 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addQuest = async (s: SourceRow) => {
    setAdded((prev) => new Set(prev).add(s.domain));
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: `Get cited on ${s.domain}`,
          meta: `≈ 20 min · impact: ${s.xp >= 120 ? "very high" : "high"}`,
          xp: s.xp,
          impact: s.xp >= 120 ? "very high" : "high",
          source: "source",
        }),
      });
    } catch {
      setAdded((prev) => {
        const next = new Set(prev);
        next.delete(s.domain);
        return next;
      });
    }
  };

  const distinct = sources?.length ?? 0;
  const yours = sources?.filter((s) => s.isYours).length ?? 0;
  const gaps = sources?.filter((s) => !s.isYours && s.xp > 0).length ?? 0;
  const top = sources?.[0];

  return (
    <>
      <PageHead
        title="Sources"
        sub="The exact pages AI read to answer your prompts. Get cited here and you get recommended."
        actions={
          <button className="btn btn--primary btn--sm" onClick={() => router.push("/dashboard/quests")}>
            Open quests →
          </button>
        }
      />

      <div className="page-stats">
        <PageStat label="Sources cited" value={String(distinct)} sub={`across ${total} scans`} />
        <PageStat label="You appear in" value={String(yours)} sub="your own pages cited" hi={yours ? "success" : "warn"} />
        <PageStat label="Gaps to win" value={String(gaps)} sub="cited, but not you" hi="danger" />
        <PageStat label="Top source" value={top?.domain ?? "—"} sub={top ? `${top.citedPct}% of scans` : "scan to see"} hi="accent" />
      </div>

      <GuideStrip
        title="How to turn a source into a win"
        steps={[
          "Find a gap — a page AI cites, but not you",
          "Add it as a quest",
          "Earn the citation & climb",
        ]}
      />

      {sources == null ? (
        <div className="app-card" style={{ padding: 24 }}>Analyzing your citations…</div>
      ) : sources.length === 0 ? (
        <div className="app-card" style={{ padding: 24, textAlign: "center" }}>
          No sources yet. Open a prompt and scan it across your models — the pages they cite will show up here.
        </div>
      ) : (
        <div className="app-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="data-table">
            <div className="dt-head">
              <span style={{ flex: 1.6 }}>Source</span>
              <span style={{ flex: 0.8 }}>Type</span>
              <span style={{ flex: 0.7, textAlign: "center" }}>Cited</span>
              <span style={{ flex: 1.2 }}>Models</span>
              <span style={{ flex: 1.6 }}>Why it matters</span>
              <span style={{ flex: 1, textAlign: "right" }}>Action</span>
            </div>
            {sources.map((s) => {
              const isAdded = added.has(s.domain);
              return (
                <div key={s.domain} className={`dt-row ${s.isYours ? "" : "dt-row--invisible"}`}>
                  <span style={{ flex: 1.6 }} className="dt-source">
                    <span className="source-fav" style={{ background: TYPE_COLOR(s.type) }} />
                    <a href={`https://${s.domain}`} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                      {s.domain}
                    </a>
                  </span>
                  <span style={{ flex: 0.8 }}>
                    <span
                      className="src-type"
                      style={{
                        background: `color-mix(in oklab, ${TYPE_COLOR(s.type)} 14%, var(--surface))`,
                        color: TYPE_COLOR(s.type),
                        border: `1px solid color-mix(in oklab, ${TYPE_COLOR(s.type)} 30%, transparent)`,
                      }}
                    >
                      {s.type}
                    </span>
                  </span>
                  <span style={{ flex: 0.7, textAlign: "center" }} className="dt-pos">{s.citedPct}%</span>
                  <span style={{ flex: 1.2, fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>
                    {s.models.join(", ")}
                  </span>
                  <span style={{ flex: 1.6, fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500 }}>
                    {s.note}
                  </span>
                  <span style={{ flex: 1, textAlign: "right" }}>
                    {s.isYours ? (
                      <span className="dt-winning">Yours ✓</span>
                    ) : (
                      <button
                        className="btn-quest"
                        onClick={() => addQuest(s)}
                        disabled={isAdded}
                      >
                        {isAdded ? "Added ✓" : <>Add quest <b>+{s.xp} XP</b></>}
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

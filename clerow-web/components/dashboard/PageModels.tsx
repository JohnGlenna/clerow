"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { GameIcon } from "../GameIcon";
import { PageHead, PageStat } from "./AppShell";
import { useDashboard } from "@/lib/useDashboard";
import { modelStatus, sentimentLabel, METRIC_HELP } from "@/lib/modelStatus";
import type { DashboardModel } from "@/lib/types";

// Curated, accurate guidance for how each engine sources its answers and what
// moves you there. This is real AEO advice (not fake metrics) — the "pointer
// with meaning" for each model.
const COPY: Record<string, { maker: string; sources: string; tip: string }> = {
  chatgpt: {
    maker: "OpenAI",
    sources:
      "Training data + a live web_search tool (Bing-backed). Leans on G2, Wikipedia, and Reddit threads, with a strong recency bias on news.",
    tip: "Wins here come from comparison pages and review-site listings (G2, Capterra).",
  },
  claude: {
    maker: "Anthropic",
    sources:
      "Training data + a server-side web search tool. Higher trust threshold than ChatGPT — cites primary sources and documentation more often.",
    tip: "Add depth to your docs, changelog, and a clear 'who it's for' page. Claude rewards substance.",
  },
  perplexity: {
    maker: "Perplexity",
    sources:
      "Real-time web search on every query. Heavy on Reddit, Hacker News, Wikipedia, and recent blog posts — the most live-web-driven model.",
    tip: "Reddit and YouTube presence move you here faster than schema does.",
  },
  gemini: {
    maker: "Google",
    sources:
      "Google Search grounding + the Knowledge Graph. Strong overlap with classic SEO — if you rank in Google, you tend to rank here.",
    tip: "Classic SEO still applies: site speed, FAQ schema, and fresh, structured content.",
  },
};

export function PageModels() {
  const router = useRouter();
  const navigate = (k: string) => router.push(`/dashboard/${k}`);
  const { data, loading } = useDashboard();

  const models = data?.models ?? [];
  const scanned = models.filter((m) => !m.locked && m.visibility != null);
  const tracked = models.filter((m) => !m.locked).length;
  const lockedCount = models.filter((m) => m.locked).length;
  const best = scanned.length
    ? scanned.reduce((a, b) => ((b.visibility ?? 0) > (a.visibility ?? 0) ? b : a))
    : null;
  const worst = scanned.length
    ? scanned.reduce((a, b) => ((b.visibility ?? 0) < (a.visibility ?? 0) ? b : a))
    : null;

  return (
    <>
      <PageHead
        title="AI Models"
        sub={
          data?.primaryPrompt
            ? `Where you stand on “${data.primaryPrompt}”, by model — and how to win each one.`
            : "Each model cites differently. Here's how to win each one."
        }
        actions={
          <button className="btn btn--primary btn--sm" onClick={() => router.push("/onboarding")}>
            <Icon name="bolt" size={14} />
            Re-scan
          </button>
        }
      />

      <div className="page-stats">
        <PageStat label="Models tracked" value={String(tracked)} sub={`of ${models.length} available`} />
        <PageStat
          label="Best in"
          value={best?.label ?? "—"}
          sub={best ? `${best.visibility}% visibility` : "scan to see"}
          hi="success"
        />
        <PageStat
          label="Needs work in"
          value={worst?.label ?? "—"}
          sub={worst ? `${worst.visibility}% visibility` : "scan to see"}
          hi="warn"
        />
        <PageStat label="Locked models" value={String(lockedCount)} sub="add an API key" hi="accent" />
      </div>

      {loading ? (
        <div className="app-card" style={{ padding: 24 }}>Loading models…</div>
      ) : (
        <div className="models-grid">
          {models.map((m) => (
            <ModelCard key={m.id} m={m} onNavigate={navigate} />
          ))}
          <UpgradeCard />
        </div>
      )}
    </>
  );
}

function ModelCard({ m, onNavigate }: { m: DashboardModel; onNavigate: (k: string) => void }) {
  const copy = COPY[m.id] ?? { maker: "", sources: "", tip: "" };
  const scanned = !m.locked && m.visibility != null;
  const status = modelStatus(m);
  return (
    <div className={`model-card ${m.locked ? "model-card--locked" : ""}`}>
      <div className="model-card-head">
        <div className="model-card-id">
          <span className="model-card-ico" style={{ background: m.swatch }}>
            {m.letter}
          </span>
          <div>
            <div className="name">{m.label}</div>
            <div className="maker">by {copy.maker || "—"}</div>
          </div>
        </div>
        {m.locked && (
          <span className="tier-lock"><GameIcon name="locked" size={13} /> No API key</span>
        )}
      </div>

      <div className={`model-status mr-${status.tone}`}>{status.text}</div>

      <div className="model-stats">
        <div className="model-stat" title={METRIC_HELP.visibility}>
          <div className="label">Visibility</div>
          <div className="val">{scanned ? `${m.visibility}%` : "—"}</div>
        </div>
        <div className="model-stat" title={METRIC_HELP.position}>
          <div className="label">Position</div>
          <div className="val">{m.position != null ? `#${m.position}` : "—"}</div>
        </div>
        <div className="model-stat" title={METRIC_HELP.sentiment}>
          <div className="label">Sentiment</div>
          <div className="val">
            {m.sentiment != null ? sentimentLabel(m.sentiment) : "—"}
            {m.sentiment != null && <span className="model-stat-raw"> {m.sentiment}</span>}
          </div>
        </div>
      </div>

      {!scanned && !m.locked && (
        <div className="model-empty">Not scanned on this model yet — open a prompt and run a scan.</div>
      )}

      <div className="model-source">
        <div className="src-label"><GameIcon name="book" size={15} /> How {m.label} sources answers</div>
        <p>{copy.sources}</p>
      </div>

      <div className="model-tip">
        <span className="tip-ico"><GameIcon name="idea" size={16} color="#F59E0B" /></span>
        <span>{copy.tip}</span>
      </div>

      <div className="model-card-foot">
        {m.locked ? (
          <span className="model-empty" style={{ margin: 0 }}>
            Add this engine&apos;s API key to start tracking it.
          </span>
        ) : (
          <button className="btn btn--ghost btn--sm" onClick={() => onNavigate("prompts")}>
            See prompts &amp; fixes for {m.label} →
          </button>
        )}
      </div>
    </div>
  );
}

function UpgradeCard() {
  return (
    <div className="upgrade-card">
      <div className="upgrade-head">
        <GameIcon name="rocket" size={36} />
        <h3>Track every prompt, daily</h3>
      </div>
      <p>
        Your plan scans your primary prompt across all configured models. Upgrade to scan every tracked prompt across every model, automatically, every day.
      </p>
      <ul>
        <li><Icon name="check" size={12} /> Daily scans across all your prompts</li>
        <li><Icon name="check" size={12} /> Cross-model competitor diff</li>
        <li><Icon name="check" size={12} /> Per-model quest suggestions</li>
      </ul>
      <button className="btn btn--primary btn--lg btn--full">Upgrade to Team — $89/mo</button>
    </div>
  );
}

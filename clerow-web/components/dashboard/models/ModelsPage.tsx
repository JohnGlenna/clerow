"use client";

import { useRouter } from "next/navigation";
import { useDashboard } from "@/lib/useDashboard";
import { AiIcon } from "../../ui/AiIcon";
import { LpHead, Lock } from "../shared/PageBits";

const MAKER: Record<string, string> = { chatgpt: "OpenAI", claude: "Anthropic", perplexity: "Perplexity", grok: "xAI", gemini: "Google" };
const NOTE: Record<string, string> = {
  chatgpt: "Leans on G2, Wikipedia & Reddit. Win it with comparison pages and review-site listings.",
  claude: "Cites primary sources and rewards depth. Beef up your docs, changelog and FAQs.",
  perplexity: "Most live-web driven. Reddit threads & YouTube mentions move you here fastest.",
  grok: "Pulls heavily from X in real time. Posts and replies on X are your fastest lever here.",
  gemini: "Mirrors Google — your classic SEO basics carry straight over.",
};

// Each model cites differently — the page that makes the multi-model moat visible.
export function ModelsPage() {
  const router = useRouter();
  const { data } = useDashboard();
  if (!data) return <div className="ld-page" style={{ color: "var(--ink-2)" }}>Loading…</div>;
  const models = data.models ?? [];
  const tracked = models.filter((m) => !m.locked).length;
  return (
    <div className="ld-page">
      <LpHead eyebrow={`${tracked} of ${models.length} tracked`} title="AI Models" sub="Each model cites differently. This is why Clerow watches all of them — one chatbot can't." />
      <div className="lm-grid">
        {models.map((m) => (
          <div key={m.id} className={`lm-card ${m.locked ? "locked" : ""}`}>
            <div className="lm-top">
              <span className="lm-ic" style={{ background: "#fff" }}><AiIcon id={m.id} size={24} letter={m.letter} /></span>
              <div style={{ flex: 1 }}><div className="lm-name">{m.label}</div><div className="lm-maker">by {MAKER[m.id] ?? "—"}</div></div>
              {m.locked ? <span className="lm-lock"><Lock /> Upgrade</span> : <span className="lm-live">● live</span>}
            </div>
            {!m.locked && (
              <div className="lm-stats">
                <div><span className="ls-l">Visibility</span><span className="ls-v">{m.visibility != null ? `${m.visibility}%` : "—"}</span></div>
                <div><span className="ls-l">Avg pos.</span><span className="ls-v">{m.position != null ? `#${m.position}` : "—"}</span></div>
                <div><span className="ls-l">Sentiment</span><span className="ls-v">{m.sentiment != null ? m.sentiment : "—"}</span></div>
              </div>
            )}
            <div className="lm-note"><b>📚 How it sources:</b> {NOTE[m.id] ?? "Tracked across your scans."}</div>
            {m.locked ? <button className="lm-btn lm-btn--up" onClick={() => router.push("/dashboard/settings")}>Unlock</button> : <button className="lm-btn" onClick={() => router.push("/dashboard/tasks")}>See fixes for {m.label} →</button>}
          </div>
        ))}
        <div className="lm-card lm-why">
          <div className="mcp-tag" style={{ background: "rgba(56,169,224,.18)", color: "#bfe0f0" }}>Secret sauce</div>
          <h4>One chatbot can&apos;t watch its rivals.</h4>
          <p>Ask Claude how you rank and it only knows itself. Clerow runs every prompt through all your engines and shows the full picture — that&apos;s the moat.</p>
        </div>
      </div>
    </div>
  );
}

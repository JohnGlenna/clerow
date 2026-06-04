"use client";

import { MascotClerow } from "../../Mascot";
import { AiIcon } from "../../ui/AiIcon";
import { GameIcon, type GameIconName } from "../../GameIcon";
import { domainOf } from "./util";
import type { DashboardData } from "@/lib/types";

// One stat pill: icon + label + value, with a styled tooltip explaining what
// the number means on hover (replaces the old native `title=` tooltips).
function StatPill({
  cls, icon, color, value, label, tip,
}: {
  cls: string; icon: GameIconName; color: string; value: number; label: string; tip: string;
}) {
  return (
    <span className={`stat-pill ${cls}`} tabIndex={0}>
      <span className="ic"><GameIcon name={icon} size={16} color={color} /></span>
      <span className="val">{value}</span>
      <span className="stat-tip" role="tooltip">
        <span className="stat-tip-t">{label}</span>
        {tip}
      </span>
    </span>
  );
}

// The sticky top bar shown on every dashboard page: the connected domain, the
// models it was scanned across, and the visibility / streak / xp / scans pills.
export function TopBar({ data }: { data: DashboardData }) {
  const models = data.models ?? [];
  return (
    <div className="ld-top">
      <div className="dom">
        <MascotClerow size={26} /> {domainOf(data.brand?.url)}
        <span className="mono">· scanned across</span>
        <span className="model-cluster">
          {models.map((m) => {
            // Free users scan one engine (ChatGPT); the other four sit behind the
            // paywall, so badge them locked. Subscribers have run all five.
            const locked = !data.subscribed && !m.scanned;
            return (
              <span
                key={m.id}
                className={`mc${locked ? " mc-locked" : ""}`}
                style={{ background: "#fff" }}
                title={locked ? `${m.label} — unlock with Premium` : `Scanned across ${m.label}`}
              >
                <AiIcon id={m.id} size={16} letter={m.letter} />
                {locked && <span className="mc-lock">🔒</span>}
              </span>
            );
          })}
        </span>
      </div>
      {data.score && (
        <StatPill cls="score" icon="chart" color="#38A9E0" value={data.score.overall} label="Visibility"
          tip="Your AI visibility score from the latest scan — how often AI engines recommend you (0–100)." />
      )}
      <StatPill cls="streak" icon="flame" color="#FF9600" value={data.streak?.current ?? 0} label="Streak"
        tip="Day streak — keep it alive by clearing at least one task every day." />
      <StatPill cls="xp" icon="gem" color="#FFC800" value={data.xp?.total ?? 0} label="XP"
        tip="Total points you've earned all-time for completing tasks and scans." />
      <StatPill cls="heart" icon="bolt" color="#A560F0" value={data.scansLeft ?? 0} label="Scans"
        tip="Scans left this month on your current plan. Resets each billing cycle." />
    </div>
  );
}

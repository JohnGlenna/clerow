"use client";

import { MascotClerow } from "../../Mascot";
import { AiIcon } from "../../ui/AiIcon";
import { GameIcon } from "../../GameIcon";
import { domainOf } from "./util";
import type { DashboardData } from "@/lib/types";

// The sticky top bar shown on every dashboard page: the connected domain, the
// models it was scanned across, and the score / streak / xp / scans-left pills.
export function TopBar({ data }: { data: DashboardData }) {
  const models = data.models ?? [];
  return (
    <div className="ld-top">
      <div className="dom">
        <MascotClerow size={26} /> {domainOf(data.brand?.url)}
        <span className="mono">· scanned across</span>
        <span className="model-cluster">
          {models.map((m) => (
            <span key={m.id} className="mc" style={{ background: "#fff" }}>
              <AiIcon id={m.id} size={16} letter={m.letter} />
            </span>
          ))}
        </span>
      </div>
      {data.score && (
        <span className="stat-pill score" title="AI visibility score — from your latest scan">
          <span className="ic"><GameIcon name="chart" size={16} color="#38A9E0" /></span>{data.score.overall}
        </span>
      )}
      <span className="stat-pill streak" title="Day streak — keep it alive by clearing a task each day">
        <span className="ic"><GameIcon name="flame" size={16} color="#FF9600" /></span>{data.streak?.current ?? 0}
      </span>
      <span className="stat-pill xp" title="Total XP earned all-time">
        <span className="ic"><GameIcon name="gem" size={16} color="#FFC800" /></span>{data.xp?.total ?? 0}
      </span>
      <span className="stat-pill heart" title="Scans left this month">
        <span className="ic"><GameIcon name="bolt" size={16} color="#A560F0" /></span>{data.scansLeft ?? 0}
      </span>
    </div>
  );
}

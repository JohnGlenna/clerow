"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { GameIcon, type GameIconName } from "../GameIcon";
import { MascotClerow } from "../Mascot";
import { useSubscription, startCheckout, openBillingPortal } from "@/lib/useSubscription";
import { DashboardProvider, useDashboard } from "@/lib/useDashboard";

type NavKey =
  | "overview"
  | "prompts"
  | "sources"
  | "models"
  | "quests"
  | "archive"
  | "leaderboard"
  | "reports"
  | "settings";

const NAV: { i: Parameters<typeof Icon>[0]["name"]; l: string; k: NavKey; lock?: boolean }[] = [
  { i: "home",   l: "Overview",    k: "overview" },
  { i: "list",   l: "Prompts",     k: "prompts",     lock: true },
  { i: "globe",  l: "Sources",     k: "sources",     lock: true },
  { i: "ai",     l: "AI Models",   k: "models",      lock: true },
  { i: "trophy", l: "Quests",      k: "quests",      lock: true },
  { i: "check",  l: "Archive",     k: "archive",     lock: true },
  { i: "users",  l: "Leaderboard", k: "leaderboard", lock: true },
  { i: "bar",    l: "Reports",     k: "reports",     lock: true },
];

export function AppShell({
  page,
  children,
}: {
  page: NavKey;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { subscription, loading } = useSubscription();
  const subscribed = subscription?.subscribed ?? null;
  // Overview and Settings are always reachable; every other page is gated.
  const paid = page !== "overview" && page !== "settings";
  // Cover a paid page until we POSITIVELY confirm the user is subscribed. While
  // status is still loading we show a neutral blur cover (no paywall card) so a
  // paying user never sees the paywall flash; the full card appears only once we
  // know they're unsubscribed. This also stops the paid content from flashing
  // unblurred for ~0.2s before the paywall mounts.
  const showCover = paid && subscribed !== true;

  const navigate = (k: NavKey) =>
    router.push(k === "overview" ? "/dashboard" : `/dashboard/${k}`);

  const manageBilling = async () => {
    const opened = await openBillingPortal();
    if (!opened) navigate("prompts"); // no billing account yet → surface the paywall
  };

  return (
    <DashboardProvider>
      <div className="app-shell">
        <AppSidebar
          page={page}
          subscribed={subscribed === true}
          onNavigate={navigate}
          onManageBilling={manageBilling}
          onSignOut={() => router.push("/")}
        />
        <main className="app-main" style={{ position: "relative" }}>
          {children}
          {showCover && <PaywallOverlay page={page} loading={loading} onNavigate={navigate} />}
        </main>
      </div>
    </DashboardProvider>
  );
}

function AppSidebar({
  page,
  subscribed,
  onNavigate,
  onManageBilling,
  onSignOut,
}: {
  page: NavKey;
  subscribed: boolean;
  onNavigate: (k: NavKey) => void;
  onManageBilling: () => void;
  onSignOut: () => void;
}) {
  const { data } = useDashboard();
  const streak = data?.streak;
  const xp = data?.xp;
  return (
    <aside className="app-side">
      <a
        className="app-brand"
        href="/dashboard"
        onClick={(e) => {
          e.preventDefault();
          onNavigate("overview");
        }}
      >
        <MascotClerow size={30} />
        Clerow
      </a>

      <div className="app-nav">
        <div className="app-side-label">Workspace</div>
        {NAV.map((n) => (
          <a
            key={n.k}
            className={page === n.k ? "on" : ""}
            href={`/dashboard${n.k === "overview" ? "" : "/" + n.k}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(n.k);
            }}
          >
            <span className="ico">
              <Icon name={n.i} size={16} />
            </span>
            <span style={{ flex: 1 }}>{n.l}</span>
            {!subscribed && n.lock && (
              <span className="nav-lock"><GameIcon name="locked" size={13} /></span>
            )}
          </a>
        ))}
      </div>

      <div className="app-nav" style={{ marginTop: -8 }}>
        <div className="app-side-label">Account</div>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onManageBilling();
          }}
        >
          <span className="ico">
            <Icon name="tag" size={16} />
          </span>
          <span>{subscribed ? "Billing" : "Upgrade"}</span>
        </a>
        <a href="#" onClick={(e) => e.preventDefault()}>
          <span className="ico">
            <Icon name="bell" size={16} />
          </span>
          <span>Notifications</span>
        </a>
        <a
          className={page === "settings" ? "on" : ""}
          href="/dashboard/settings"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("settings");
          }}
        >
          <span className="ico">
            <Icon name="settings" size={16} />
          </span>
          <span>Settings</span>
        </a>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onSignOut();
          }}
          style={{ color: "var(--danger)" }}
        >
          <span className="ico" style={{ color: "var(--danger)" }}>
            <Icon name="lock" size={16} />
          </span>
          <span>Sign out</span>
        </a>
      </div>

      <div className="app-side-bottom">
        <div className="row">
          <span className="lvl">
            <GameIcon name="flame" size={15} color="#F59E0B" /> {streak?.current ?? 0} day streak
          </span>
          {(streak?.freezes ?? 0) > 0 && (
            <span className="xp" title="Streak freezes — each protects one missed day">
              ❄️ {streak?.freezes}
            </span>
          )}
        </div>
        <div className="row" style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 600 }}>
          <span>Longest {streak?.longest ?? 0}d</span>
          <span>{streak?.activeToday ? "Kept today ✅" : "Do a task to keep it"}</span>
        </div>
        <div className="side-level" title={`${xp?.total ?? 0} XP all-time`}>
          <div className="side-level-row">
            <span className="lvl">
              <GameIcon name="star" size={13} color="#1CB0F6" /> Lv {xp?.level ?? 1}
              {xp?.title ? ` · ${xp.title}` : ""}
            </span>
            <span>{xp ? `${xp.intoLevel}/${xp.span} XP` : "0 XP"}</span>
          </div>
          <div className="side-level-bar">
            <i style={{ width: `${xp?.pct ?? 0}%` }} />
          </div>
        </div>
      </div>
    </aside>
  );
}

function PaywallOverlay({
  page,
  loading,
  onNavigate,
}: {
  page: NavKey;
  loading?: boolean;
  onNavigate: (k: NavKey) => void;
}) {
  // While billing status is still loading, render the blur cover only — no card.
  // This hides the paid content immediately without flashing the paywall at a
  // user who may turn out to be subscribed.
  if (loading) return <div className="paywall" aria-hidden />;

  const pages: Record<string, { title: string; desc: string; icon: GameIconName }> = {
    prompts:     { title: "Unlock Prompts",     desc: "See all 42 prompts your customers ask AI — every model, every position, with quest hooks to start winning.", icon: "target" },
    sources:     { title: "Unlock Sources",     desc: "See which Reddit threads, G2 listings, and YouTube channels AI cites — and which ones your rivals own.", icon: "world" },
    models:      { title: "Unlock AI Models",   desc: "Track ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews — and learn how each one sources answers.", icon: "brain" },
    quests:      { title: "Unlock Quests",      desc: "Your daily playbook to climb. Concrete steps with XP, streaks, and one-click 'how to' instructions.", icon: "swords" },
    archive:     { title: "Unlock Archive",     desc: "Every quest you complete, kept as a permanent record — your track record of work that moved your AI visibility.", icon: "scroll" },
    leaderboard: { title: "Unlock Leaderboard", desc: "Race your category — and 3,140 other Clerow founders. Track gap-to-next, defenders, and weekly climbers.", icon: "trophy" },
    reports:     { title: "Unlock Reports",     desc: "Auto-generated weekly summaries. Clerow Wrapped share cards for X. White-label client reports on Team.", icon: "chart" },
  };
  const p = pages[page] || { title: "Unlock this page", desc: "Pick a plan to keep going.", icon: "sparkles" as GameIconName };
  return (
    <div className="paywall">
      <div className="paywall-card">
        <span className="paywall-icon"><GameIcon name={p.icon} size={40} /></span>
        <h2>{p.title}</h2>
        <p>{p.desc}</p>

        <div className="paywall-plans">
          <PaywallPlan
            name="Founder"
            price={29}
            desc="1 domain · 3 AI models"
            cta="Subscribe"
            onCta={() => startCheckout("founder")}
          />
          <PaywallPlan
            name="Marketing Team"
            price={89}
            desc="1 domain · 5 seats · all models"
            cta="Subscribe"
            tag="Most popular"
            featured
            onCta={() => startCheckout("team")}
          />
          <PaywallPlan
            name="Enterprise"
            price={249}
            desc="1 domain · unlimited seats"
            cta="Talk to sales"
            onCta={() => {
              window.location.href = "mailto:sales@clerow.com?subject=Clerow%20Enterprise";
            }}
          />
        </div>

        <div className="paywall-foot">
          <button className="btn btn--quiet btn--sm" onClick={() => onNavigate("overview")}>
            ← Back to overview
          </button>
          <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 700 }}>
            Cancel anytime
          </span>
        </div>
      </div>
    </div>
  );
}

function PaywallPlan({
  name,
  price,
  desc,
  cta,
  featured,
  tag,
  onCta,
}: {
  name: string;
  price: number;
  desc: string;
  cta: string;
  featured?: boolean;
  tag?: string;
  onCta?: () => void;
}) {
  return (
    <div className={`pw-plan ${featured ? "pw-plan--featured" : ""}`}>
      {tag && (
        <span className="pw-tag">
          <GameIcon name="star" size={12} /> {tag}
        </span>
      )}
      <div className="pw-name">{name}</div>
      <div className="pw-price">
        <span className="cur">$</span>
        {price}
        <span className="per">/mo</span>
      </div>
      <div className="pw-desc">{desc}</div>
      <button className={`btn btn--${featured ? "primary" : "ghost"} btn--sm btn--full`} onClick={onCta}>
        {cta}
      </button>
    </div>
  );
}

export function PageHead({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="app-top">
      <div>
        <div className="ttl">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="app-top-actions">{actions}</div>}
    </div>
  );
}

export function PageStat({
  label,
  value,
  sub,
  hi,
}: {
  label: string;
  value: string;
  sub?: string;
  hi?: "success" | "warn" | "danger" | "accent";
}) {
  const cls = hi ? `page-stat page-stat--${hi}` : "page-stat";
  return (
    <div className={cls}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

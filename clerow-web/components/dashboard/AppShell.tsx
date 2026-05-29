"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { GameIcon, type GameIconName } from "../GameIcon";
import { MascotClerow } from "../Mascot";
import { useSubscription, startCheckout, openBillingPortal } from "@/lib/useSubscription";

type NavKey =
  | "overview"
  | "prompts"
  | "sources"
  | "models"
  | "quests"
  | "leaderboard"
  | "reports";

const NAV: { i: Parameters<typeof Icon>[0]["name"]; l: string; k: NavKey; lock?: boolean }[] = [
  { i: "home",   l: "Overview",    k: "overview" },
  { i: "list",   l: "Prompts",     k: "prompts",     lock: true },
  { i: "globe",  l: "Sources",     k: "sources",     lock: true },
  { i: "ai",     l: "AI Models",   k: "models",      lock: true },
  { i: "trophy", l: "Quests",      k: "quests",      lock: true },
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
  const { subscription } = useSubscription();
  const subscribed = subscription?.subscribed ?? null;
  // Lock paid pages only once we know the user is NOT subscribed — avoids
  // flashing the paywall to a paying user while their status is still loading.
  const isLocked = page !== "overview" && subscribed === false;

  const navigate = (k: NavKey) =>
    router.push(k === "overview" ? "/dashboard" : `/dashboard/${k}`);

  const manageBilling = async () => {
    const opened = await openBillingPortal();
    if (!opened) navigate("prompts"); // no billing account yet → surface the paywall
  };

  return (
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
        {isLocked && <PaywallOverlay page={page} onNavigate={navigate} />}
      </main>
    </div>
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
  const bottom: { i: Parameters<typeof Icon>[0]["name"]; l: string }[] = [
    { i: "bell",     l: "Notifications" },
    { i: "settings", l: "Settings" },
  ];
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
        {bottom.map((n) => (
          <a key={n.l} href="#">
            <span className="ico">
              <Icon name={n.i} size={16} />
            </span>
            <span>{n.l}</span>
          </a>
        ))}
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
          <span className="lvl"><GameIcon name="bolt" size={14} color="#F59E0B" /> Level 7</span>
          <span className="xp">740 / 1000</span>
        </div>
        <div className="bar">
          <i style={{ width: "74%" }} />
        </div>
        <div
          className="row"
          style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 600 }}
        >
          <span>SEO Apprentice</span>
          <span>→ SEO Mage</span>
        </div>
      </div>
    </aside>
  );
}

function PaywallOverlay({
  page,
  onNavigate,
}: {
  page: NavKey;
  onNavigate: (k: NavKey) => void;
}) {
  const pages: Record<string, { title: string; desc: string; icon: GameIconName }> = {
    prompts:     { title: "Unlock Prompts",     desc: "See all 42 prompts your customers ask AI — every model, every position, with quest hooks to start winning.", icon: "target" },
    sources:     { title: "Unlock Sources",     desc: "See which Reddit threads, G2 listings, and YouTube channels AI cites — and which ones your rivals own.", icon: "world" },
    models:      { title: "Unlock AI Models",   desc: "Track ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews — and learn how each one sources answers.", icon: "brain" },
    quests:      { title: "Unlock Quests",      desc: "Your daily playbook to climb. Concrete steps with XP, streaks, and one-click 'how to' instructions.", icon: "swords" },
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

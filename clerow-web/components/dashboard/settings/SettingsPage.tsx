"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../Icon";
import { GameIcon } from "../../GameIcon";
import { createClient } from "@/lib/supabase/client";
import { useSubscription, startCheckout, openBillingPortal } from "@/lib/useSubscription";

// Display copy for each plan key returned by /api/billing/status. Kept inline
// (rather than importing lib/billing/plans) so this client bundle never pulls
// in the server-only price-id resolution.
const PLAN_LABELS: Record<string, { name: string; price: number; desc: string }> = {
  founder: { name: "Founder", price: 29, desc: "1 domain · all 5 AI models" },
  team: { name: "Marketing Team", price: 89, desc: "1 domain · 5 seats · all models" },
  enterprise: { name: "Enterprise", price: 249, desc: "1 domain · unlimited seats" },
};

type BrandProfile = {
  company: string;
  url: string;
  industry: string;
  description: string;
  competitors: string[];
};

export function SettingsPage() {
  return (
    <div className="ld-page">
      <div className="lp-head">
        <h1>Settings</h1>
        <div className="sub">Your account, the site Clerow tracks, and how often we nudge you.</div>
      </div>

      <div className="settings-stack">
        <AccountCard />
        <BrandCard />
        <IntegrationCard />
        <NotificationsCard />
        <BillingCard />
        <DangerCard />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Account -- */

function AccountCard() {
  const supabase = React.useMemo(() => createClient(), []);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [initial, setInitial] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      const meta = data.user.user_metadata ?? {};
      const displayName = String(meta.display_name ?? meta.full_name ?? meta.name ?? "");
      setEmail(data.user.email ?? "");
      setName(displayName);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  React.useEffect(() => {
    const base = (name || email).trim();
    setInitial(base ? base[0]!.toUpperCase() : "?");
  }, [name, email]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <section className="app-card">
      <div className="app-card-head">
        <h4>Account</h4>
        <span className="sub">Your login and display name</span>
      </div>

      <div className="settings-identity">
        <span className="settings-avatar">{initial}</span>
        <div>
          <div className="settings-identity-name">{name || "Add your name"}</div>
          <div className="settings-identity-email">{email || "…"}</div>
        </div>
      </div>

      <div className="form-stack">
        <div className="form-row">
          <label htmlFor="set-name">Display name</label>
          <input
            id="set-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Founder"
          />
        </div>
        <div className="form-row">
          <label htmlFor="set-email">Email</label>
          <input id="set-email" className="input" value={email} disabled readOnly />
          <span className="settings-hint">Email is tied to your login and can&apos;t be changed here.</span>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn--primary btn--sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Brand/site -- */

function BrandCard() {
  const router = useRouter();
  const [brand, setBrand] = React.useState<BrandProfile | null>(null);
  const [company, setCompany] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/brand", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const b: BrandProfile | null = json.brand ?? null;
        setBrand(b);
        setCompany(b?.company ?? "");
        setUrl(b?.url ?? "");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = brand != null && (company.trim() !== brand.company || url.trim() !== brand.url);

  const save = async () => {
    if (!url.trim()) {
      alert("Add the site you want Clerow to track.");
      return;
    }
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), company: company.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Couldn't save your brand. Try again.");
      return;
    }
    setBrand((b) => (b ? { ...b, company: company.trim(), url: url.trim() } : b));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <section className="app-card">
      <div className="app-card-head">
        <h4>Brand &amp; site</h4>
        <span className="sub">What Clerow scans AI engines for</span>
      </div>

      {loading ? (
        <div className="settings-hint">Loading your brand…</div>
      ) : !brand ? (
        <div className="settings-empty">
          <GameIcon name="search" size={28} />
          <p>You haven&apos;t connected a site yet.</p>
          <button className="btn btn--primary btn--sm" onClick={() => router.push("/onboarding")}>
            <Icon name="bolt" size={14} /> Run my free scan
          </button>
        </div>
      ) : (
        <>
          <div className="form-stack">
            <div className="form-row">
              <label htmlFor="set-company">Brand name</label>
              <input
                id="set-company"
                className="input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
              />
              <span className="settings-hint">The name we look for in AI answers.</span>
            </div>
            <div className="form-row">
              <label htmlFor="set-url">Tracked site</label>
              <input
                id="set-url"
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://acme.com"
              />
            </div>
          </div>

          {brand.industry && (
            <div className="settings-meta-row">
              <span className="settings-meta-label">Category</span>
              <span className="chip--ghost">{brand.industry}</span>
            </div>
          )}
          {brand.competitors.length > 0 && (
            <div className="settings-meta-row">
              <span className="settings-meta-label">Tracked competitors</span>
              <span className="settings-chips">
                {brand.competitors.slice(0, 8).map((c) => (
                  <span key={c} className="chip--ghost">{c}</span>
                ))}
              </span>
            </div>
          )}

          <div className="settings-actions">
            <button className="btn btn--ghost btn--sm" onClick={() => router.push("/onboarding")}>
              <Icon name="bolt" size={14} /> Re-scan
            </button>
            <button className="btn btn--primary btn--sm" onClick={save} disabled={saving || !dirty}>
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------ MCP / API access -- */

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

// Connect Clerow to Claude Code / Cursor / any MCP client so an agent can pull
// your GEO tasks, generate the files, and ship them into your repo.
function IntegrationCard() {
  const [keys, setKeys] = React.useState<ApiKeyRow[] | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [fresh, setFresh] = React.useState<string | null>(null); // plaintext shown once
  const [copied, setCopied] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/keys", { cache: "no-store" });
    const json = await res.json().catch(() => ({ keys: [] }));
    setKeys(json.keys ?? []);
  }, []);
  React.useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "MCP key" }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.plaintext) setFresh(json.plaintext);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    await load();
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.clerow.com";
  const keyForSnippet = fresh ?? "YOUR_KEY";
  const snippet = `claude mcp add --transport http clerow ${origin}/api/mcp --header "Authorization: Bearer ${keyForSnippet}"`;

  const active = (keys ?? []).filter((k) => !k.revoked_at);

  return (
    <section className="app-card">
      <div className="app-card-head">
        <h4>Clerow MCP — let your AI agent do the work</h4>
        <span className="sub">Claude Code, Cursor &amp; other agents</span>
      </div>

      <p className="settings-hint" style={{ marginBottom: 12 }}>
        Connect Clerow to your coding agent. It can read your prioritized GEO tasks, generate the exact
        files (robots.txt, llms.txt, FAQ schema, comparison pages), write them into your site&apos;s repo, and
        check them off — keeping your streak.
      </p>

      {fresh && (
        <div className="key-fresh">
          <div className="key-fresh-head">
            <b>Your new key — copy it now, it won&apos;t be shown again.</b>
          </div>
          <code className="key-code">{fresh}</code>
        </div>
      )}

      <div className="settings-actions" style={{ justifyContent: "flex-start", marginBottom: 14 }}>
        <button className="btn btn--primary btn--sm" onClick={create} disabled={creating}>
          <Icon name="bolt" size={14} /> {creating ? "Creating…" : "Create MCP key"}
        </button>
      </div>

      {active.length > 0 && (
        <div className="key-list">
          {active.map((k) => (
            <div key={k.id} className="key-row">
              <div>
                <div className="key-row-name">{k.name}</div>
                <div className="key-row-meta">
                  {k.prefix}…··· · {k.last_used_at ? `last used ${new Date(k.last_used_at).toLocaleDateString()}` : "never used"}
                </div>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => revoke(k.id)}>
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="key-snippet">
        <div className="key-snippet-label">Add to Claude Code</div>
        <code className="key-code">{snippet}</code>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => {
            navigator.clipboard?.writeText(snippet);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied ✓" : "Copy command"}
        </button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Notifications -- */

type NotifKey = "streak" | "weekly" | "scan" | "product";

const NOTIFS: { key: NotifKey; title: string; desc: string; def: boolean }[] = [
  { key: "streak", title: "Daily streak reminder", desc: "A nudge if you haven't kept your streak by evening.", def: true },
  { key: "weekly", title: "Weekly report email", desc: "Your Monday recap — position changes and what to ship.", def: true },
  { key: "scan", title: "Scan complete", desc: "Tell me when a fresh scan finishes processing.", def: true },
  { key: "product", title: "Product updates", desc: "Occasional news about new engines and features.", def: false },
];

const NOTIF_STORE = "clerow:notifications";

function NotificationsCard() {
  const [prefs, setPrefs] = React.useState<Record<NotifKey, boolean>>(() => {
    const base = Object.fromEntries(NOTIFS.map((n) => [n.key, n.def])) as Record<NotifKey, boolean>;
    return base;
  });

  // Hydrate from localStorage after mount (avoids SSR/client mismatch).
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTIF_STORE);
      if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const toggle = (key: NotifKey) => {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      try {
        window.localStorage.setItem(NOTIF_STORE, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <section className="app-card">
      <div className="app-card-head">
        <h4>Notifications</h4>
        <span className="sub">For a habit product, the nudge is the point</span>
      </div>

      <div className="settings-toggles">
        {NOTIFS.map((n) => (
          <div key={n.key} className="settings-toggle-row">
            <div>
              <div className="settings-toggle-title">{n.title}</div>
              <div className="settings-toggle-desc">{n.desc}</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={prefs[n.key]} onChange={() => toggle(n.key)} />
              <span />
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Billing -- */

function BillingCard() {
  const { subscription, loading } = useSubscription();
  const subscribed = subscription?.subscribed ?? false;
  const plan = subscription?.plan ? PLAN_LABELS[subscription.plan] : null;
  const cancelling = subscription?.cancelAtPeriodEnd ?? false;

  return (
    <section className="app-card">
      <div className="app-card-head">
        <h4>Plan &amp; billing</h4>
        <span className="sub">Manage your subscription</span>
      </div>

      {loading ? (
        <div className="settings-hint">Loading your plan…</div>
      ) : (
        <>
          <div className="settings-plan">
            <span className="settings-plan-icon">
              <GameIcon name={subscribed ? "trophy" : "rocket"} size={26} />
            </span>
            <div className="settings-plan-body">
              <div className="settings-plan-name">
                {subscribed && plan ? plan.name : "Free"}
                {subscribed && (
                  <span className={`settings-plan-badge ${cancelling ? "is-warn" : ""}`}>
                    {cancelling ? "Cancels at period end" : "Active"}
                  </span>
                )}
              </div>
              <div className="settings-plan-desc">
                {subscribed && plan
                  ? `$${plan.price}/mo · ${plan.desc}`
                  : "One free Perplexity scan. Upgrade to track every engine, daily."}
              </div>
            </div>
          </div>

          <div className="settings-actions">
            {subscribed ? (
              <button className="btn btn--ghost btn--sm" onClick={() => openBillingPortal()}>
                <Icon name="external" size={14} /> Manage billing
              </button>
            ) : (
              <>
                <button className="btn btn--primary btn--sm" onClick={() => startCheckout("team")}>
                  <Icon name="bolt" size={14} /> Upgrade to Marketing Team
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => startCheckout("founder")}>
                  Founder — $29/mo
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------------------------------------------------------- Danger zone -- */

function DangerCard() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [signingOut, setSigningOut] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  };

  const deleteAccount = async () => {
    if (
      !window.confirm(
        "Permanently delete your Clerow account, brand, and all scan data, and cancel any subscription? This can't be undone.",
      )
    ) {
      return;
    }
    setDeleting(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Couldn't delete your account. Please contact support.");
      setDeleting(false);
      return;
    }
    // The server already invalidated the session; clear local auth state too,
    // then drop the user back to the marketing site.
    await supabase.auth.signOut().catch(() => {});
    router.push("/");
  };

  return (
    <section className="app-card settings-danger">
      <div className="app-card-head">
        <h4>Account actions</h4>
        <span className="sub">Sign out or close your account</span>
      </div>

      <div className="settings-danger-rows">
        <div className="settings-danger-row">
          <div>
            <div className="settings-toggle-title">Sign out</div>
            <div className="settings-toggle-desc">End your session on this device.</div>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={signOut} disabled={signingOut}>
            <Icon name="lock" size={14} /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
        <div className="settings-danger-row">
          <div>
            <div className="settings-toggle-title" style={{ color: "var(--danger)" }}>
              Delete account
            </div>
            <div className="settings-toggle-desc">
              Cancel your subscription and remove your account, brand profile, and all scan history.
            </div>
          </div>
          <button
            className="btn btn--sm settings-btn-danger"
            onClick={deleteAccount}
            disabled={deleting}
          >
            <Icon name="x" size={14} /> {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../Icon";
import { GameIcon } from "../../GameIcon";
import { createClient } from "@/lib/supabase/client";
import { useSubscription, startCheckout, openBillingPortal } from "@/lib/useSubscription";

// The account/billing/brand controls — moved out of the (deleted) Settings page
// and rendered on the Profile page. Notifications (mock) and the MCP-key card
// (which lives on the Connect page) were dropped in the move.

const PLAN_LABELS: Record<string, { name: string; price: number; desc: string }> = {
  founder: { name: "Premium", price: 29, desc: "1 domain · all 5 AI models" },
  team: { name: "Marketing Team", price: 89, desc: "1 domain · 5 seats · all models" },
  enterprise: { name: "Enterprise", price: 249, desc: "1 domain · unlimited seats" },
};

type BrandProfile = { company: string; url: string; industry: string; description: string; competitors: string[] };

export function AccountSettings() {
  return (
    <div className="settings-stack">
      <BrandCard />
      <BillingCard />
      <AccountCard />
      <DangerCard />
    </div>
  );
}

function AccountCard() {
  const supabase = React.useMemo(() => createClient(), []);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");

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
    return () => { cancelled = true; };
  }, [supabase]);

  const initial = ((name || email).trim()[0] ?? "?").toUpperCase();

  return (
    <section className="app-card">
      <div className="app-card-head"><h4>Account</h4><span className="sub">Your login</span></div>
      <div className="settings-identity">
        <span className="settings-avatar">{initial}</span>
        <div>
          <div className="settings-identity-name">{name || email || "…"}</div>
          <div className="settings-identity-email">{email || "…"}</div>
        </div>
      </div>
      <span className="settings-hint">Your name and email come from your login and can&apos;t be changed here.</span>
    </section>
  );
}

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
        setBrand(b); setCompany(b?.company ?? ""); setUrl(b?.url ?? "");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirty = brand != null && (company.trim() !== brand.company || url.trim() !== brand.url);

  const save = async () => {
    if (!url.trim()) { alert("Add the site you want Clerow to track."); return; }
    setSaving(true); setSaved(false);
    const res = await fetch("/api/brand", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim(), company: company.trim() }) });
    setSaving(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error ?? "Couldn't save your brand. Try again."); return; }
    setBrand((b) => (b ? { ...b, company: company.trim(), url: url.trim() } : b));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <section className="app-card">
      <div className="app-card-head"><h4>Brand &amp; site</h4><span className="sub">What Clerow scans AI engines for</span></div>
      {loading ? (
        <div className="settings-hint">Loading your brand…</div>
      ) : !brand ? (
        <div className="settings-empty">
          <GameIcon name="search" size={28} />
          <p>You haven&apos;t connected a site yet.</p>
          <button className="btn btn--primary btn--sm" onClick={() => router.push("/onboarding")}><Icon name="bolt" size={14} /> Run my free scan</button>
        </div>
      ) : (
        <>
          <div className="form-stack">
            <div className="form-row">
              <label htmlFor="set-company">Brand name</label>
              <input id="set-company" className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." />
              <span className="settings-hint">The name we look for in AI answers.</span>
            </div>
            <div className="form-row">
              <label htmlFor="set-url">Tracked site</label>
              <input id="set-url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://acme.com" />
            </div>
          </div>
          {brand.industry && (
            <div className="settings-meta-row"><span className="settings-meta-label">Category</span><span className="chip--ghost">{brand.industry}</span></div>
          )}
          {brand.competitors.length > 0 && (
            <div className="settings-meta-row">
              <span className="settings-meta-label">Tracked competitors</span>
              <span className="settings-chips">{brand.competitors.slice(0, 8).map((c) => (<span key={c} className="chip--ghost">{c}</span>))}</span>
            </div>
          )}
          <div className="settings-actions">
            <button className="btn btn--ghost btn--sm" onClick={() => router.push("/onboarding")}><Icon name="bolt" size={14} /> Re-scan</button>
            <button className="btn btn--primary btn--sm" onClick={save} disabled={saving || !dirty}>{saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}</button>
          </div>
        </>
      )}
    </section>
  );
}

function BillingCard() {
  const { subscription, loading } = useSubscription();
  const subscribed = subscription?.subscribed ?? false;
  const plan = subscription?.plan ? PLAN_LABELS[subscription.plan] : null;
  const cancelling = subscription?.cancelAtPeriodEnd ?? false;

  return (
    <section className="app-card">
      <div className="app-card-head"><h4>Plan &amp; billing</h4><span className="sub">Manage your subscription</span></div>
      {loading ? (
        <div className="settings-hint">Loading your plan…</div>
      ) : (
        <>
          <div className="settings-plan">
            <span className="settings-plan-icon"><GameIcon name={subscribed ? "trophy" : "rocket"} size={26} /></span>
            <div className="settings-plan-body">
              <div className="settings-plan-name">
                {subscribed && plan ? plan.name : "Free"}
                {subscribed && (<span className={`settings-plan-badge ${cancelling ? "is-warn" : ""}`}>{cancelling ? "Cancels at period end" : "Active"}</span>)}
              </div>
              <div className="settings-plan-desc">{subscribed && plan ? `$${plan.price}/mo · ${plan.desc}` : "One free ChatGPT scan. Upgrade to track every engine, daily."}</div>
            </div>
          </div>
          <div className="settings-actions">
            {subscribed ? (
              <button className="btn btn--ghost btn--sm" onClick={() => openBillingPortal()}><Icon name="external" size={14} /> Manage billing</button>
            ) : (
              <button className="btn btn--primary btn--sm" onClick={() => startCheckout("founder")}><Icon name="bolt" size={14} /> Upgrade to Premium — $29/mo</button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function DangerCard() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [signingOut, setSigningOut] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const signOut = async () => { setSigningOut(true); await supabase.auth.signOut(); router.push("/"); };

  const deleteAccount = async () => {
    if (!window.confirm("Permanently delete your Clerow account, brand, and all scan data, and cancel any subscription? This can't be undone.")) return;
    setDeleting(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error ?? "Couldn't delete your account. Please contact support."); setDeleting(false); return; }
    await supabase.auth.signOut().catch(() => {});
    router.push("/");
  };

  return (
    <section className="app-card settings-danger">
      <div className="app-card-head"><h4>Account actions</h4><span className="sub">Sign out or close your account</span></div>
      <div className="settings-danger-rows">
        <div className="settings-danger-row">
          <div><div className="settings-toggle-title">Sign out</div><div className="settings-toggle-desc">End your session on this device.</div></div>
          <button className="btn btn--ghost btn--sm" onClick={signOut} disabled={signingOut}><Icon name="lock" size={14} /> {signingOut ? "Signing out…" : "Sign out"}</button>
        </div>
        <div className="settings-danger-row">
          <div><div className="settings-toggle-title" style={{ color: "var(--red)" }}>Delete account</div><div className="settings-toggle-desc">Cancel your subscription and remove your account, brand profile, and all scan history.</div></div>
          <button className="btn btn--sm settings-btn-danger" onClick={deleteAccount} disabled={deleting}><Icon name="x" size={14} /> {deleting ? "Deleting…" : "Delete"}</button>
        </div>
      </div>
    </section>
  );
}

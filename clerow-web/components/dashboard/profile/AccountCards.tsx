"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../Icon";
import { GameIcon } from "../../GameIcon";
import { createClient } from "@/lib/supabase/client";
import { useSubscription, startCheckout, openBillingPortal, submitCancelFeedback } from "@/lib/useSubscription";
import { PLANS } from "@/lib/billing/plans";
import { LAUNCH_PROMO, promoFirstMonth } from "@/lib/billing/promo";

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
      <div className="settings-row">
        <BrandCard />
        <BillingCard />
      </div>
      <div className="settings-row">
        <AccountCard />
        <DangerCard />
      </div>
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

// The churn survey — kept short so it informs us without nagging someone who's
// already decided to leave. "Other" is last by convention.
const CANCEL_REASONS = [
  "Too expensive",
  "I didn't see results / not enough value",
  "Missing a feature I need",
  "Too hard to use / no time to keep up",
  "Found a better alternative",
  "Just testing it out",
  "Other",
] as const;

function BillingCard() {
  const { subscription, loading } = useSubscription();
  const subscribed = subscription?.subscribed ?? false;
  const plan = subscription?.plan ? PLAN_LABELS[subscription.plan] : null;
  const cancelling = subscription?.cancelAtPeriodEnd ?? false;

  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const closeCancel = () => { if (busy) return; setCancelOpen(false); setReason(""); setDetail(""); };

  const continueToCancel = async () => {
    if (!reason || busy) return;
    setBusy(true);
    await submitCancelFeedback(reason, detail);
    const ok = await openBillingPortal(); // redirects on success
    if (!ok) {
      alert("Couldn't open the billing page. Please try again.");
      setBusy(false);
    }
  };

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
              <>
                <button className="btn btn--ghost btn--sm" onClick={() => openBillingPortal()}><Icon name="external" size={14} /> Manage billing</button>
                {!cancelling && (
                  <button className="btn btn--ghost btn--sm" onClick={() => setCancelOpen(true)}>Cancel subscription</button>
                )}
              </>
            ) : (
              <button className="btn btn--primary btn--sm" onClick={() => startCheckout("founder")}><Icon name="bolt" size={14} /> {LAUNCH_PROMO.active ? `Upgrade to Premium — ${promoFirstMonth(PLANS.founder.price)} first month` : `Upgrade to Premium — $${PLANS.founder.price}/mo`}</button>
            )}
          </div>
        </>
      )}

      {cancelOpen && (
        <div className="settings-confirm-scrim" role="dialog" aria-modal="true" aria-labelledby="cancel-title" onMouseDown={closeCancel}>
          <div className="settings-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="settings-confirm-icon"><GameIcon name="rocket" size={22} /></div>
            <h4 className="settings-confirm-title" id="cancel-title">Cancel your subscription?</h4>
            <p className="settings-confirm-body">
              You&apos;ll keep Premium until the end of your current billing period, then drop to the free plan — losing <b>daily scans across all 5 AI models</b> and the tasks that keep your <b>streak</b> alive. Your progress so far stays put.
            </p>
            <label className="settings-confirm-label">Before you go — what&apos;s the main reason?</label>
            <div className="cancel-reasons">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className={`cancel-reason ${reason === r ? "is-selected" : ""}`}>
                  <input type="radio" name="cancel-reason" value={r} checked={reason === r} onChange={() => setReason(r)} disabled={busy} />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            <textarea
              className="input"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Anything else we could've done better? (optional)"
              rows={2}
              disabled={busy}
            />
            <div className="settings-confirm-actions">
              <button className="btn btn--ghost btn--sm" onClick={closeCancel} disabled={busy}>Never mind</button>
              <button className="btn btn--sm settings-btn-danger" onClick={continueToCancel} disabled={!reason || busy}>{busy ? "Taking you to Stripe…" : "Continue to cancel"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DangerCard() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [signingOut, setSigningOut] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  const canDelete = confirmText.trim().toLowerCase() === "delete";

  const signOut = async () => { setSigningOut(true); await supabase.auth.signOut(); router.push("/"); };

  const closeConfirm = () => { if (deleting) return; setConfirmOpen(false); setConfirmText(""); };

  const deleteAccount = async () => {
    if (!canDelete || deleting) return;
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
          <div><div className="settings-toggle-title">Delete account</div><div className="settings-toggle-desc">Cancel your subscription and remove your account, brand profile, and all scan history.</div></div>
          <button className="btn btn--sm settings-delete-trigger" onClick={() => setConfirmOpen(true)} disabled={deleting}>Delete…</button>
        </div>
      </div>

      {confirmOpen && (
        <div className="settings-confirm-scrim" role="dialog" aria-modal="true" aria-labelledby="del-title" onMouseDown={closeConfirm}>
          <div className="settings-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="settings-confirm-icon"><Icon name="x" size={20} /></div>
            <h4 className="settings-confirm-title" id="del-title">Are you sure you want to delete your account?</h4>
            <p className="settings-confirm-body">
              This permanently deletes your account, brand profile, and <b>all your scan history</b>. You&apos;ll lose your <b>streak, points, and every bit of progress</b>, and any active subscription will be cancelled. This <b>can&apos;t be undone</b>.
            </p>
            <label className="settings-confirm-label" htmlFor="del-confirm">Type <b>delete</b> to confirm</label>
            <input
              id="del-confirm"
              className="input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") deleteAccount(); }}
              placeholder="delete"
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            <div className="settings-confirm-actions">
              <button className="btn btn--ghost btn--sm" onClick={closeConfirm} disabled={deleting}>Cancel</button>
              <button className="btn btn--sm settings-btn-danger" onClick={deleteAccount} disabled={!canDelete || deleting}>{deleting ? "Deleting…" : "Delete account"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

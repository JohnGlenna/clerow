"use client";

import "../connect/connect.css";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MascotClerow } from "@/components/Mascot";
import { createClient } from "@/lib/supabase/client";
import { useAuthModal } from "@/components/AuthModalProvider";

// The OAuth consent screen. Claude sends the user here (via /api/oauth/authorize)
// to sign in and approve the connection. On approve we mint an auth code and
// bounce back to Claude's redirect_uri.
function Consent() {
  const params = useSearchParams();
  const { open } = useAuthModal();
  const [email, setEmail] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const clientName = params.get("client_name") || "Claude";

  const refresh = React.useCallback(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
  }, []);
  React.useEffect(refresh, [refresh]);

  const signIn = () => {
    // Come straight back here (with these same params) once authenticated.
    const href = typeof window !== "undefined" ? window.location.href : "/connect-claude";
    open("signin", href);
  };

  const approve = async () => {
    setApproving(true);
    setError(null);
    const res = await fetch("/api/oauth/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: params.get("client_id"),
        redirect_uri: params.get("redirect_uri"),
        code_challenge: params.get("code_challenge"),
        code_challenge_method: params.get("code_challenge_method"),
        scope: params.get("scope"),
        state: params.get("state"),
        resource: params.get("resource"),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (json.redirect) {
      window.location.href = json.redirect;
      return;
    }
    setError(json.error_description || json.error || "Couldn't approve. Try again.");
    setApproving(false);
  };

  return (
    <div className="cn-wrap">
      <div className="cn-consent">
        <div className="cn-consent-card">
          <MascotClerow size={46} />
          <h1>Connect {clientName} to Clerow</h1>

          {!ready ? (
            <p className="cn-consent-sub">Checking your session…</p>
          ) : email ? (
            <>
              <p className="cn-consent-sub">
                <b>{clientName}</b> wants to access your Clerow GEO data — your AI visibility, prioritized
                tasks, and site audit — and ship fixes on your behalf.
              </p>
              <ul className="cn-scopes">
                <li>Read your AI visibility, tasks &amp; site audit</li>
                <li>Generate ready-to-ship content for your tasks</li>
                <li>Mark tasks complete to keep your streak</li>
              </ul>
              <div className="cn-consent-id">Signed in as {email}</div>
              {error && <div className="cn-consent-err">{error}</div>}
              <button className="cn-approve" onClick={approve} disabled={approving}>
                {approving ? "Approving…" : "Approve & connect"}
              </button>
              <p className="cn-consent-foot">You can revoke this anytime in Clerow → Settings.</p>
            </>
          ) : (
            <>
              <p className="cn-consent-sub">Sign in to your Clerow account to approve this connection.</p>
              <button className="cn-approve" onClick={signIn}>
                Sign in to continue
              </button>
              <p className="cn-consent-foot">New to Clerow? Signing in creates your account.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConnectClaudePage() {
  return (
    <Suspense fallback={null}>
      <Consent />
    </Suspense>
  );
}

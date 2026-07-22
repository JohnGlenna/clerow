"use client";

import React from "react";
import { MascotClerow } from "@/components/Mascot";
import { createClient } from "@/lib/supabase/client";

// Landing spot for the password-recovery email. The link goes through
// /auth/callback (code → session) first, so by the time we render the user
// should have a session; if not, the link expired.
export default function ResetPasswordPage() {
  const [ready, setReady] = React.useState(false);
  const [hasSession, setHasSession] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        setHasSession(Boolean(data.user));
        setReady(true);
      });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password needs to be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    window.location.assign("/dashboard");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          <MascotClerow size={72} />
        </div>

        {!ready ? null : !hasSession ? (
          <>
            <h2>That link didn&apos;t work.</h2>
            <p className="sub">
              Reset links only work once and expire quickly. Head back and request a new one.
            </p>
            <a className="btn btn--primary btn--full" href="/" style={{ height: 52, borderRadius: 14 }}>
              Back to Clerow
            </a>
          </>
        ) : (
          <>
            <h2>Set a new password.</h2>
            <p className="sub">You&apos;ll be signed in right after.</p>
            <form className="form-stack" onSubmit={submit}>
              <input
                className="input input--lg"
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={busy}
              />
              <input
                className="input input--lg"
                type="password"
                placeholder="Repeat new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={busy}
              />
              <button
                type="submit"
                className="btn btn--primary btn--full"
                style={{ height: 52, borderRadius: 14 }}
                disabled={busy}
              >
                {busy ? "Saving…" : "Save password"}
                <span className="arrow">→</span>
              </button>
            </form>
            {error && (
              <p style={{ color: "var(--danger, #E11D48)", fontSize: 13, marginTop: 8 }}>{error}</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

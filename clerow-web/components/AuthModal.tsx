"use client";

import React from "react";
import { Icon } from "./Icon";
import { MascotClerow } from "./Mascot";
import { createClient } from "@/lib/supabase/client";

function GoogleG({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FBBC05" d="M24 9.5c3.3 0 6.3 1.1 8.6 3.3l6.4-6.4C35.5 2.8 30.1.5 24 .5 14.7.5 6.7 5.8 2.9 13.7l7.5 5.8C12.2 13.6 17.6 9.5 24 9.5z"/>
      <path fill="#34A853" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.6c-.6 3-2.3 5.5-4.9 7.2l7.5 5.8c4.4-4 6.8-9.9 6.8-17.5z"/>
      <path fill="#4285F4" d="M10.4 28.5c-.6-1.7-.9-3.5-.9-5.5s.3-3.8.9-5.5l-7.5-5.8C1.1 15.5 0 19.6 0 24s1.1 8.5 2.9 12.3l7.5-5.8z"/>
      <path fill="#EA4335" d="M24 47.5c6.1 0 11.5-2 15.3-5.5l-7.5-5.8c-2.1 1.4-4.7 2.3-7.8 2.3-6.4 0-11.8-4.1-13.6-9.8l-7.5 5.8C6.7 42.2 14.7 47.5 24 47.5z"/>
    </svg>
  );
}

export function AuthModal({
  mode,
  setMode,
  pendingUrl,
  onClose,
}: {
  mode: "signin" | "signup";
  setMode: (m: "signin" | "signup") => void;
  pendingUrl: string;
  onClose: () => void;
}) {
  const isSignup = mode === "signup";
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState<null | "google" | "email">(null);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const supabase = React.useMemo(() => createClient(), []);

  React.useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // After auth we land on onboarding, carrying the URL the user pasted (if any).
  const nextUrl = () => {
    const base = "/onboarding";
    return pendingUrl ? `${base}?url=${encodeURIComponent(pendingUrl)}` : base;
  };
  const redirectTo = () => {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${origin}/auth/callback?next=${encodeURIComponent(nextUrl())}`;
  };

  const signInGoogle = async () => {
    setError(null);
    setBusy("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setError(error.message);
      setBusy(null);
    }
    // On success the browser is redirected to Google.
  };

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setBusy("email");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo(), shouldCreateUser: true },
    });
    setBusy(null);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={16} />
        </button>

        <div className="modal-mascot">
          <MascotClerow size={72} />
        </div>

        {sent ? (
          <>
            <h2>Check your inbox.</h2>
            <p className="sub">
              We sent a magic link to{" "}
              <b style={{ color: "var(--ink)" }}>{email}</b>. Click it to{" "}
              {isSignup ? "start your free scan" : "sign in"}.
            </p>
            <button className="btn btn--ghost btn--full" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </>
        ) : (
          <>
            <h2>
              {pendingUrl
                ? "One step before your scan."
                : isSignup
                  ? "Stop being invisible to AI."
                  : "Welcome back."}
            </h2>
            <p className="sub">
              {pendingUrl ? (
                <>
                  We&apos;ll scan{" "}
                  <b style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                    {pendingUrl}
                  </b>{" "}
                  right after you {isSignup ? "sign up" : "sign in"}.
                </>
              ) : isSignup ? (
                "Free scan. 60 seconds. No card."
              ) : (
                "Pick up your streak where you left off."
              )}
            </p>

            <button className="oauth-primary" onClick={signInGoogle} disabled={busy !== null}>
              <GoogleG size={18} />
              {busy === "google" ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="divider">or</div>

            <form className="form-stack" onSubmit={sendMagicLink}>
              <input
                className="input input--lg"
                type="email"
                placeholder="you@yourstartup.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={busy !== null}
              />
              <button
                type="submit"
                className="btn btn--primary btn--full"
                style={{ height: 52, borderRadius: 14 }}
                disabled={busy !== null}
              >
                {busy === "email"
                  ? "Sending…"
                  : isSignup
                    ? "Continue with email"
                    : "Send me a magic link"}
                <span className="arrow">→</span>
              </button>
            </form>

            {error && (
              <p style={{ color: "var(--danger, #E11D48)", fontSize: 13, marginTop: 8 }}>{error}</p>
            )}

            <p className="auth-toggle">
              {isSignup ? (
                <>
                  Already have an account? <a onClick={() => setMode("signin")}>Sign in</a>
                </>
              ) : (
                <>
                  New to Clerow? <a onClick={() => setMode("signup")}>Sign up</a>
                </>
              )}
            </p>

            <p className="legal">
              By continuing you agree to our <a href="#">Terms</a> and <a href="#">Privacy</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

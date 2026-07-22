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

// Supabase error strings are developer-speak; translate the ones users can hit.
function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("rate limit"))
    return "We've sent this address a few emails already — wait a couple of minutes and try again.";
  if (m.includes("invalid login credentials"))
    return "Wrong email or password. Try again, or reset your password below.";
  if (m.includes("email not confirmed"))
    return "Your email isn't confirmed yet — check your inbox for the confirmation link.";
  if (m.includes("password should be"))
    return "Password needs to be at least 6 characters.";
  return message;
}

type View = "form" | "forgot" | "confirmSent" | "resetSent";

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
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState<null | "google" | "email">(null);
  const [view, setView] = React.useState<View>("form");
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
  // Onboarding itself bounces already-scanned users on to the dashboard.
  const nextUrl = () => {
    const base = "/onboarding";
    return pendingUrl ? `${base}?url=${encodeURIComponent(pendingUrl)}` : base;
  };
  const origin = () =>
    (
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")
    ).replace(/\/+$/, "");
  const redirectTo = () => `${origin()}/auth/callback?next=${encodeURIComponent(nextUrl())}`;

  const signInGoogle = async () => {
    setError(null);
    setBusy("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setError(friendlyError(error.message));
      setBusy(null);
    }
    // On success the browser is redirected to Google.
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setBusy("email");

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectTo() },
      });
      if (error) {
        setBusy(null);
        setError(friendlyError(error.message));
        return;
      }
      // Supabase obfuscates existing accounts as a user with no identities.
      if (data.user && data.user.identities?.length === 0) {
        setBusy(null);
        setError("An account with this email already exists — sign in instead.");
        setMode("signin");
        return;
      }
      if (data.session) {
        // Email confirmation is off: we're signed in, go straight on.
        window.location.assign(nextUrl());
        return;
      }
      setBusy(null);
      setView("confirmSent");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(null);
      setError(friendlyError(error.message));
      return;
    }
    window.location.assign(nextUrl());
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setBusy("email");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin()}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    setBusy(null);
    if (error) setError(friendlyError(error.message));
    else setView("resetSent");
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

        {view === "confirmSent" ? (
          <>
            <h2>Check your inbox.</h2>
            <p className="sub">
              We sent a confirmation link to{" "}
              <b style={{ color: "var(--ink)" }}>{email}</b>. Click it to start your free scan.
            </p>
            <button className="btn btn--ghost btn--full" onClick={() => setView("form")}>
              Use a different email
            </button>
          </>
        ) : view === "resetSent" ? (
          <>
            <h2>Check your inbox.</h2>
            <p className="sub">
              If an account exists for <b style={{ color: "var(--ink)" }}>{email}</b>, we sent a
              link to reset your password.
            </p>
            <button className="btn btn--ghost btn--full" onClick={() => setView("form")}>
              Back to sign in
            </button>
          </>
        ) : view === "forgot" ? (
          <>
            <h2>Reset your password.</h2>
            <p className="sub">We&apos;ll email you a link to set a new one.</p>
            <form className="form-stack" onSubmit={sendReset}>
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
                {busy === "email" ? "Sending…" : "Send reset link"}
                <span className="arrow">→</span>
              </button>
            </form>
            {error && (
              <p style={{ color: "var(--danger, #E11D48)", fontSize: 13, marginTop: 8 }}>{error}</p>
            )}
            <p className="auth-toggle">
              <a onClick={() => { setError(null); setView("form"); }}>Back to sign in</a>
            </p>
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

            <form className="form-stack" onSubmit={submitPassword}>
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
              <input
                className="input input--lg"
                type="password"
                placeholder={isSignup ? "Choose a password" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
                disabled={busy !== null}
              />
              <button
                type="submit"
                className="btn btn--primary btn--full"
                style={{ height: 52, borderRadius: 14 }}
                disabled={busy !== null}
              >
                {busy === "email"
                  ? isSignup
                    ? "Creating account…"
                    : "Signing in…"
                  : isSignup
                    ? "Create account"
                    : "Sign in"}
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
                  {" · "}
                  <a onClick={() => { setError(null); setView("forgot"); }}>Forgot password?</a>
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

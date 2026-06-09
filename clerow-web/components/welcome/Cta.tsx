"use client";

import React from "react";
import { useAuthModal } from "../AuthModalProvider";

// The only interactive pieces of the landing page: the CTA buttons that open the
// auth modal. Isolating them as tiny client islands lets the rest of WelcomePage be
// a server component, so the full marketing copy ships in the raw HTML that AI
// crawlers (which mostly don't run JS) actually read.

export function StartButton({
  className = "btn btn-primary",
  children = "Get started",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { open } = useAuthModal();
  return (
    <button className={className} onClick={() => open("signup")}>
      {children}
    </button>
  );
}

export function SignInButton({
  className = "btn btn-ghost",
  children = "I already have an account",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { open } = useAuthModal();
  return (
    <button className={className} onClick={() => open("signin")}>
      {children}
    </button>
  );
}

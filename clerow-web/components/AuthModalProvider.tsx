"use client";

import React from "react";
import { AuthModal } from "./AuthModal";

type Mode = "signin" | "signup" | null;

type Ctx = {
  mode: Mode;
  pendingUrl: string;
  open: (mode: Exclude<Mode, null>, url?: string) => void;
  close: () => void;
};

const AuthCtx = React.createContext<Ctx | null>(null);

export function useAuthModal() {
  const ctx = React.useContext(AuthCtx);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<Mode>(null);
  const [pendingUrl, setPendingUrl] = React.useState("");

  const open: Ctx["open"] = (m, url) => {
    setPendingUrl(url || "");
    setMode(m);
  };
  const close = () => setMode(null);

  return (
    <AuthCtx.Provider value={{ mode, pendingUrl, open, close }}>
      {children}
      {mode && (
        <AuthModal
          mode={mode}
          setMode={(m) => setMode(m as Mode)}
          pendingUrl={pendingUrl}
          onClose={close}
        />
      )}
    </AuthCtx.Provider>
  );
}

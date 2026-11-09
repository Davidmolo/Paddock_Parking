"use client";

import { useEffect, useState } from "react";
import { PortalEmailProvider } from "./portal-email";
import { PortalShell } from "./portal-shell";
import { PortalSignIn } from "./portal-sign-in";
import type { PortalGateProps, PortalSession } from "./types";

const PORTAL_SESSION_KEY = "paddock-portal-session";

function readPortalSession(): PortalSession | null {
  try {
    const raw = localStorage.getItem(PORTAL_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PortalSession;
    if (!data?.email || !data?.name) return null;
    return {
      name: data.name,
      email: data.email,
      gateCode: data.gateCode ?? "",
    };
  } catch {
    return null;
  }
}

function writePortalSession(session: PortalSession | null) {
  if (!session) localStorage.removeItem(PORTAL_SESSION_KEY);
  else localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
}

export function PortalGate({ children }: PortalGateProps) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readPortalSession());
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-dvh bg-[#0a1628]" />;

  if (!session) {
    return (
      <PortalSignIn
        onSignedIn={(next) => {
          writePortalSession(next);
          setSession(next);
        }}
      />
    );
  }

  return (
    <PortalEmailProvider email={session.email}>
      <PortalShell
        session={session}
        onSignOut={() => {
          writePortalSession(null);
          setSession(null);
        }}
      >
        {children}
      </PortalShell>
    </PortalEmailProvider>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { BookChrome, BOOK_SHELL } from "@/components/book/book-chrome";
import { ApiError, endpoints } from "@/lib/api";

type Mode = "login" | "set" | "reset";

/**
 * Customer Portal — login, set password (from invite), reset password.
 */
export default function CustomerPortalPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [session, setSession] = useState<{
    name: string;
    gateCode: string;
    email: string;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFlash("");
    try {
      if (mode === "login") {
        const res = await endpoints.portalLogin({ email, password });
        setSession({
          name: res.name,
          gateCode: res.gateCode,
          email: res.email,
        });
      } else if (mode === "set") {
        const res = await endpoints.portalSetPassword({
          email,
          password,
          inviteToken: inviteToken || undefined,
        });
        setFlash(res.message);
        setMode("login");
        setPassword("");
      } else {
        const res = await endpoints.portalResetPassword({ email });
        setFlash(res.message);
        if (res.inviteToken) {
          setInviteToken(res.inviteToken);
          setMode("set");
        }
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <BookChrome>
      <section className="bg-[#0a1628] py-16 text-white">
        <div className={BOOK_SHELL}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E8C547]">
            Customer Portal
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-sora)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Manage your lease online
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Pay rent, view agreements, and check your gate code at Paddock 16,
            325, or 6060.
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className={`${BOOK_SHELL} max-w-lg`}>
          {session ? (
            <div className="rounded-2xl border border-[#e8ecf0] p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[#0a1628]">
                Welcome, {session.name}
              </h2>
              <p className="mt-2 text-sm text-[#64748b]">{session.email}</p>
              <div className="mt-6 rounded-xl bg-[#0a1628] px-4 py-5 text-center text-white">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#E8C547]">
                  Gate code
                </p>
                <p className="mt-2 font-mono text-3xl font-bold tracking-widest">
                  {session.gateCode}
                </p>
              </div>
              <button
                type="button"
                className="mt-6 w-full rounded-xl border border-[#0a1628]/15 py-3 text-sm font-bold text-[#0a1628]"
                onClick={() => setSession(null)}
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#e8ecf0] p-6 sm:p-8">
              <div className="flex gap-2 text-sm font-semibold">
                {(
                  [
                    ["login", "Sign in"],
                    ["set", "Set password"],
                    ["reset", "Reset"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setMode(key);
                      setError("");
                      setFlash("");
                    }}
                    className={
                      mode === key
                        ? "rounded-full bg-[#0a1628] px-3 py-1.5 text-white"
                        : "rounded-full px-3 py-1.5 text-[#64748b] hover:bg-[#f4f6f9]"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <h2 className="mt-5 text-lg font-semibold text-[#0a1628]">
                {mode === "login"
                  ? "Sign in"
                  : mode === "set"
                    ? "Set / create password"
                    : "Reset password"}
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                {mode === "set"
                  ? "Use the email from your portal invite (token optional for demo)."
                  : mode === "reset"
                    ? "We’ll send a reset link so you can set a new password."
                    : "Use the password from your portal invite setup."}
              </p>

              <form className="mt-5 space-y-4" onSubmit={submit}>
                <label className="block text-sm font-medium text-[#0a1628]">
                  Email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-md border border-[#cbd5e1] px-3 text-sm"
                    placeholder="you@company.com"
                  />
                </label>
                {mode !== "reset" && (
                  <label className="block text-sm font-medium text-[#0a1628]">
                    Password
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-md border border-[#cbd5e1] px-3 text-sm"
                      placeholder="••••••••"
                    />
                  </label>
                )}
                {mode === "set" && (
                  <label className="block text-sm font-medium text-[#0a1628]">
                    Invite token (optional)
                    <input
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-md border border-[#cbd5e1] px-3 font-mono text-sm"
                      placeholder="From invite / reset email"
                    />
                  </label>
                )}
                {error && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </p>
                )}
                {flash && (
                  <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {flash}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-[#E8C547] py-3 text-sm font-bold text-[#0a1628] disabled:opacity-50"
                >
                  {busy
                    ? "Please wait…"
                    : mode === "login"
                      ? "Sign in to Customer Portal"
                      : mode === "set"
                        ? "Save password"
                        : "Send reset"}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-[#64748b]">
                New customer?{" "}
                <Link
                  href="/book/spots"
                  className="font-semibold text-[#0a1628] underline"
                >
                  Book Now
                </Link>
              </p>
            </div>
          )}
          <p className="mt-8 text-center text-xs text-[#94a3b8]">
            Staff / Admin Portal —{" "}
            <Link href="/login" className="underline">
              /login
            </Link>
          </p>
        </div>
      </section>
    </BookChrome>
  );
}

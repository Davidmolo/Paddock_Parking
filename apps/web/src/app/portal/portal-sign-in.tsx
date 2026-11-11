"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { ApiError, endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import type { PortalSignInProps } from "./types";

export function PortalSignIn({ onSignedIn }: PortalSignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [fromInvite, setFromInvite] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const invitedEmail = params.get("email");
    if (!token) return;
    setInviteToken(token);
    setFromInvite(true);
    if (invitedEmail) setEmail(invitedEmail);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prev = {
      rootBg: root.style.background,
      bodyBg: body.style.background,
      rootOverflow: root.style.overflow,
      bodyOverflow: body.style.overflow,
    };
    root.style.background = "#0a1628";
    body.style.background = "#0a1628";
    root.style.overflow = "auto";
    body.style.overflow = "auto";
    return () => {
      root.style.background = prev.rootBg;
      body.style.background = prev.bodyBg;
      root.style.overflow = prev.rootOverflow;
      body.style.overflow = prev.bodyOverflow;
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFlash("");
    try {
      if (fromInvite) {
        const res = await endpoints.portalSetPassword({
          email,
          password,
          inviteToken,
        });
        window.history.replaceState(null, "", "/portal");
        onSignedIn({
          name: res.name,
          email: res.email,
          gateCode: res.gateCode,
        });
        return;
      }
      if (forgot) {
        const res = await endpoints.portalResetPassword({ email });
        setFlash(res.message);
        setForgot(false);
        return;
      }
      const res = await endpoints.portalLogin({ email, password });
      onSignedIn({
        name: res.name,
        gateCode: res.gateCode,
        email: res.email,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : text.portal.genericError);
    } finally {
      setBusy(false);
    }
  }

  const title = fromInvite
    ? text.portal.setPasswordTitle
    : forgot
      ? text.portal.forgotTitle
      : text.portal.welcome;

  return (
    <div className="flex h-dvh flex-col overflow-y-auto overscroll-none bg-[#0a1628] px-4 py-6">
      <div className="m-auto w-full max-w-[450px]">
        <div className="rounded-xl bg-white p-5 shadow-[0_24px_38px_rgba(10,22,40,0.14)] sm:p-6">
          <div className="mb-5 text-center">
            <h1 className="font-[family-name:var(--font-sora)] text-2xl font-medium text-[#0a1628] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-[#5b6b7c]">
              {fromInvite
                ? text.portal.setPasswordHint
                : forgot
                  ? text.portal.forgotHint
                  : text.portal.signInHint}
            </p>
          </div>
          {error && (
            <p className="mb-4 rounded border-l-4 border-rose-600 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          )}
          {flash && (
            <p className="mb-4 rounded bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {flash}
            </p>
          )}
          <form className="space-y-4" onSubmit={submit} autoComplete="off">
            <label className="relative block">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5b6b7c]" />
              <input
                type="email"
                name="portal-email"
                required
                value={email}
                readOnly={fromInvite}
                autoComplete="off"
                placeholder={text.portal.email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded border border-[#ddd] bg-white pl-12 pr-4 text-base outline-none focus:border-[#0a1628]"
              />
            </label>
            {!forgot && (
              <label className="relative block">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5b6b7c]" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="portal-password"
                  required
                  minLength={fromInvite ? 6 : undefined}
                  value={password}
                  autoComplete="new-password"
                  placeholder={text.portal.password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded border border-[#ddd] bg-white pl-12 pr-12 text-base outline-none focus:border-[#0a1628]"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5b6b7c]"
                  aria-label={
                    showPassword ? text.portal.hidePassword : text.portal.showPassword
                  }
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </label>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 w-full rounded bg-[#0a1628] py-3 text-base font-semibold text-[#F5D04A] disabled:opacity-60"
            >
              {busy
                ? text.portal.pleaseWait
                : fromInvite
                  ? text.portal.savePassword
                  : forgot
                    ? text.portal.sendReset
                    : text.portal.signIn}
            </button>
          </form>
          {!fromInvite && (
            <>
              <div className="my-4 flex items-center gap-4 text-sm text-[#5b6b7c]">
                <span className="h-px flex-1 bg-[#ddd]" />
                {text.portal.needHelp}
                <span className="h-px flex-1 bg-[#ddd]" />
              </div>
              <div className="text-center text-sm text-[#5b6b7c]">
                <button
                  type="button"
                  className="font-medium text-[#0a1628] underline"
                  onClick={() => {
                    setForgot((value) => !value);
                    setError("");
                    setFlash("");
                    setPassword("");
                  }}
                >
                  {text.portal.forgot}
                </button>
                <p className="mt-3">
                  {text.portal.noAccount}{" "}
                  <a
                    href="mailto:info@paddockparking.com"
                    className="font-medium text-[#0a1628] underline"
                  >
                    {text.portal.contact}
                  </a>
                </p>
                <Link
                  href="/book/spots"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#F5D04A] px-4 py-2.5 text-sm font-bold text-[#0a1628]"
                >
                  {text.portal.bookNow}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

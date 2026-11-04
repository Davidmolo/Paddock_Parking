"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { ApiError, endpoints } from "@/lib/api";

/**
 * Customer sign-in. Same choices as paddockparking.com/login_form.html:
 * email, password, sign in, forgot password, contact us.
 * A password is chosen only from the invite email link, not from this screen.
 */
export default function CustomerPortalPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [fromInvite, setFromInvite] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [session, setSession] = useState<{
    name: string;
    gateCode: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const invitedEmail = params.get("email");
    if (!token) return;
    setInviteToken(token);
    setFromInvite(true);
    if (invitedEmail) setEmail(invitedEmail);
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
          inviteToken: inviteToken || undefined,
        });
        setFlash(res.message);
        setFromInvite(false);
        setPassword("");
        setInviteToken("");
        window.history.replaceState(null, "", "/portal");
        return;
      }
      if (forgot) {
        const res = await endpoints.portalResetPassword({ email });
        setFlash(res.message);
        setForgot(false);
        return;
      }
      const res = await endpoints.portalLogin({ email, password });
      setSession({
        name: res.name,
        gateCode: res.gateCode,
        email: res.email,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const title = fromInvite
    ? "Set your password"
    : forgot
      ? "Forgot your password?"
      : "Welcome back";

  return (
    <div className="grid min-h-screen place-items-center bg-[#0a1628] px-4 py-8">
      <div className="w-full max-w-[450px]">
          <div className="rounded-xl bg-white p-6 shadow-[0_24px_38px_rgba(10,22,40,0.14)] sm:p-8">
            <Link
              href="/book"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#0a1628]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>

            <div className="mb-8 text-center">
              <h1 className="font-[family-name:var(--font-sora)] text-3xl font-medium text-[#0a1628]">
                {title}
              </h1>
              <p className="mt-2 text-[#5b6b7c]">
                {fromInvite
                  ? "Choose a password for your Paddock Parking account."
                  : forgot
                    ? "Enter your email and we will send a link to set a new password."
                    : "Sign in to your Paddock Parking account"}
              </p>
            </div>

            {session ? (
              <div>
                <p className="text-lg font-semibold text-[#0a1628]">
                  {session.name}
                </p>
                <p className="mt-1 text-sm text-[#5b6b7c]">{session.email}</p>
                <div className="mt-6 rounded-xl bg-[#0a1628] px-4 py-5 text-center text-white">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#F5D04A]">
                    Gate code
                  </p>
                  <p className="mt-2 font-mono text-3xl font-bold tracking-widest">
                    {session.gateCode}
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-6 w-full rounded-md border border-[#0a1628]/15 py-3 text-sm font-bold text-[#0a1628]"
                  onClick={() => setSession(null)}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <>
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
                      placeholder="Email Address"
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 w-full rounded border border-[#ddd] bg-white pl-12 pr-4 text-base outline-none focus:border-[#0a1628]"
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
                        placeholder="Password"
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-14 w-full rounded border border-[#ddd] bg-white pl-12 pr-12 text-base outline-none focus:border-[#0a1628]"
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5b6b7c]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </label>
                  )}
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-2 w-full rounded bg-[#0a1628] py-4 text-base font-semibold text-[#F5D04A] disabled:opacity-60"
                  >
                    {busy
                      ? "Please wait…"
                      : fromInvite
                        ? "Save password"
                        : forgot
                          ? "Send reset link"
                          : "Sign In"}
                  </button>
                </form>

                {!fromInvite && (
                  <>
                    <div className="my-6 flex items-center gap-4 text-sm text-[#5b6b7c]">
                      <span className="h-px flex-1 bg-[#ddd]" />
                      Need help?
                      <span className="h-px flex-1 bg-[#ddd]" />
                    </div>
                    <div className="text-center text-sm text-[#5b6b7c]">
                      <button
                        type="button"
                        className="font-medium text-[#0a1628] underline"
                        onClick={() => {
                          setForgot((v) => !v);
                          setError("");
                          setFlash("");
                          setPassword("");
                        }}
                      >
                        Forgot your password?
                      </button>
                      <p className="mt-4">
                        Don&apos;t have an account?{" "}
                        <a
                          href="mailto:info@paddockparking.com"
                          className="font-medium text-[#0a1628] underline"
                        >
                          Contact us to get started
                        </a>
                      </p>
                      <Link
                        href="/book/spots"
                        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#F5D04A] px-4 py-3 text-sm font-bold text-[#0a1628]"
                      >
                        Book Now
                      </Link>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useApp } from "@/components/app-provider";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { login } = useApp();
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("paddockparking");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
      router.replace("/dashboard");
    } catch (err) {
      const offline = err instanceof ApiError && err.status === 0;
      setError(
        offline
          ? "API is unreachable. Make sure the API is running on port 4001."
          : "Invalid credentials. Use admin / paddockparking",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--accent-soft),transparent_70%)]"
          animate={{ y: [0, 24, 0], x: [0, 12, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(11,18,32,0.18),transparent_70%)]"
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.12),transparent_70%)]"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]/90 p-8 shadow-[0_30px_80px_rgba(11,18,32,0.14)] backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />

        <div className="mb-8">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--ink)] text-sm font-bold text-[var(--accent)] shadow-[0_10px_30px_rgba(11,18,32,0.3)]">
            PP
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Paddock Parking
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Sign in to run occupancy, collections, and lease operations.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Signing in…" : "Enter workspace"}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          Demo access:{" "}
          <span className="font-medium text-[var(--ink)]">admin / paddockparking</span>
        </p>
      </motion.form>
    </div>
  );
}

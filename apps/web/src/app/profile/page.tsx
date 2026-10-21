"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, endpoints } from "@/lib/api";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const { user, setUser } = useApp();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
  }, [user]);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return null;

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    setProfileError("");
    try {
      const updated = await endpoints.updateProfile({ name, email, phone });
      setUser(updated);
      setProfileMsg("Profile updated.");
    } catch (err) {
      setProfileError(
        err instanceof ApiError ? err.message : "Could not update profile",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function onSavePassword(e: FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMsg("");
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      setSavingPassword(false);
      return;
    }
    try {
      await endpoints.updatePassword({ currentPassword, newPassword });
      setPasswordMsg("Password updated. Use it next time you sign in.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof ApiError ? err.message : "Could not update password",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Edit profile"
        subtitle="Update your account details and password."
        action={
          <Button variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
        }
      />

      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--ink)] text-lg font-semibold text-[#5eead4]">
          {initials || "PP"}
        </span>
        <div>
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm text-[var(--muted)]">
            @{user.username} · {user.role}
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        <Card interactive={false}>
          <CardHeader>
            <h2 className="font-semibold">Account info</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={onSaveProfile} className="space-y-4">
              <Field label="Full name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field label="Username">
                <Input value={user.username} disabled />
              </Field>
              {profileMsg && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {profileMsg}
                </p>
              )}
              {profileError && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {profileError}
                </p>
              )}
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save profile"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card interactive={false}>
          <CardHeader>
            <h2 className="font-semibold">Change password</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={onSavePassword} className="space-y-4">
              <Field label="Current password">
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Field label="New password">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </Field>
              <Field label="Confirm new password">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </Field>
              {passwordMsg && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {passwordMsg}
                </p>
              )}
              {passwordError && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {passwordError}
                </p>
              )}
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </PageTransition>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

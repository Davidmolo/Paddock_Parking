"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { cn } from "@/lib/utils";

export function ProfileMenu() {
  const { user, logout } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-1.5 pr-2.5 text-sm transition hover:border-[var(--accent)]",
          open && "border-[var(--accent)]",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--ink)] text-[11px] font-semibold text-[#5eead4]">
          {initials || "PP"}
        </span>
        <span className="hidden max-w-[120px] truncate font-medium sm:inline">
          {user.name}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--muted)] transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_50px_rgba(11,18,32,0.18)]"
        >
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--ink)] text-sm font-semibold text-[#5eead4]">
              {initials || "PP"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-[var(--muted)]">
                {user.email || user.username}
              </p>
              <p className="text-[11px] text-[var(--muted)]">{user.role}</p>
            </div>
          </div>
          <div className="p-1.5">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"
            >
              <UserRound className="h-4 w-4 text-[var(--muted)]" />
              Edit profile
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
                router.replace("/login");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

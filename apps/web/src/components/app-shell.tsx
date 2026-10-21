"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, X, Building2, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { NAV_ITEMS } from "@/lib/nav";
import { useApp } from "@/components/app-provider";
import { ProfileMenu } from "@/components/profile-menu";
import { cn } from "@/lib/utils";
import { prefetchAllScreens, prefetchScreenData } from "@/lib/prefetch";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, ready, properties, propertyId, setPropertyId } = useApp();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const warmed = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (!user && pathname !== "/login") router.replace("/login");
    if (user && pathname === "/login") router.replace("/dashboard");
  }, [ready, user, pathname, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      void router.prefetch(item.href);
    });
    void router.prefetch("/profile");
  }, [router]);

  useEffect(() => {
    if (!user || warmed.current) return;
    warmed.current = true;
    void prefetchAllScreens(queryClient, propertyId);
  }, [user, propertyId, queryClient]);

  useEffect(() => {
    if (!user) return;
    void prefetchAllScreens(queryClient, propertyId);
  }, [propertyId, user, queryClient]);

  function warmRoute(href: string) {
    void router.prefetch(href);
    void prefetchScreenData(queryClient, href, propertyId);
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!user || pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(15,118,110,0.12),transparent_70%)]" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(11,21,36,0.08),transparent_70%)]" />
      </div>

      <div className="relative flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-4 py-5 lg:flex">
          <Brand />
          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onMouseEnter={() => warmRoute(item.href)}
                  onFocus={() => warmRoute(item.href)}
                  onClick={() => {
                    startTransition(() => undefined);
                  }}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-100",
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
                  )}
                >
                  <Icon className="relative z-10 h-4.5 w-4.5" />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                className="rounded-xl border border-[var(--border)] p-2 lg:hidden"
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="lg:hidden">
                <Brand compact />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <select
                    value={propertyId}
                    onChange={(e) =>
                      setPropertyId(
                        e.target.value === "all" ? "all" : e.target.value,
                      )
                    }
                    className="h-10 appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-9 text-sm outline-none transition focus:border-[var(--accent)]"
                  >
                    <option value="all">All yards</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                </div>
                <ProfileMenu />
              </div>
            </div>
          </header>

          {open && (
            <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 lg:hidden">
              <nav className="grid gap-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      onMouseEnter={() => warmRoute(item.href)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                        active
                          ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                          : "text-[var(--muted)]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          <main className="relative w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3" prefetch>
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--ink)] text-sm font-bold tracking-wider text-[#5eead4] shadow-[0_10px_30px_rgba(11,21,36,0.35)]">
        PP
      </span>
      {!compact && (
        <span>
          <span className="block text-base font-semibold tracking-tight">
            Paddock Parking
          </span>
          <span className="block text-xs text-[var(--muted)]">
            Property management
          </span>
        </span>
      )}
    </Link>
  );
}

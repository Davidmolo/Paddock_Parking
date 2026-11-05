"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, X, Building2, ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { NAV_GROUPS, NAV_ITEMS, type NavGroup } from "@/lib/nav";
import { useApp } from "@/components/app-provider";
import { ProfileMenu } from "@/components/profile-menu";
import { cn } from "@/lib/utils";
import { prefetchAllScreens, prefetchScreenData } from "@/lib/prefetch";

function hrefPath(href: string) {
  return href.split("?")[0];
}

function isNavActive(pathname: string, href: string) {
  const path = hrefPath(href);
  if (path === "/dashboard") return pathname === "/dashboard";
  if (path === "/customers") {
    return pathname === "/customers" || pathname.startsWith("/customers/");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, ready, properties, propertyId, setPropertyId } = useApp();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [, startTransition] = useTransition();
  const warmed = useRef(false);

  const defaultOpen = useMemo(() => {
    const openLabels = new Set<string>();
    for (const g of NAV_GROUPS) {
      if (!g.expandable || !g.label) continue;
      if (g.items.some((i) => isNavActive(pathname, i.href))) {
        openLabels.add(g.label);
      }
    }
    return openLabels;
  }, [pathname]);

  const [expanded, setExpanded] = useState<Set<string>>(defaultOpen);

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const label of defaultOpen) next.add(label);
      return next;
    });
  }, [defaultOpen]);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("pp_sidebar") === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("pp_sidebar", next ? "1" : "0");
      return next;
    });
  }

  /**
   * Public (no admin auth):
   * - Customer marketing website: /book/*
   * - Customer portal: /portal
   * - Admin login page: /login
   */
  const isPublic =
    pathname === "/login" ||
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/book" ||
    pathname.startsWith("/book/");

  useEffect(() => {
    if (!ready) return;
    if (!user && !isPublic) router.replace("/login");
    if (user && pathname === "/login") router.replace("/dashboard");
  }, [ready, user, pathname, router, isPublic]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      void router.prefetch(hrefPath(item.href));
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
    const path = hrefPath(href);
    void router.prefetch(path);
    void prefetchScreenData(queryClient, path, propertyId);
  }

  function toggleGroup(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!user || isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden overscroll-none bg-[var(--canvas)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(10,22,40,0.08),transparent_70%)]" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(10,22,40,0.05),transparent_70%)]" />
      </div>

      <div className="relative flex h-full min-h-0 w-full">
        <aside
          className={cn(
            "hidden h-full shrink-0 flex-col bg-[var(--ink)] py-4 text-white transition-[width,padding] duration-200 ease-out lg:flex",
            collapsed ? "w-[4.25rem] px-2" : "w-56 px-3",
          )}
        >
          <Brand compact={collapsed} />
          <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden overscroll-none pb-3">
            {NAV_GROUPS.map((group, gi) => (
              <NavBlock
                key={group.label ?? `group-${gi}`}
                group={group}
                gi={gi}
                pathname={pathname}
                expanded={expanded}
                collapsed={collapsed}
                onToggle={toggleGroup}
                warmRoute={warmRoute}
                startTransition={startTransition}
              />
            ))}
          </nav>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="mt-2 inline-flex h-9 items-center justify-center gap-2 rounded-lg px-2.5 text-[13px] font-medium text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="z-30 shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
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
              <div className="ml-auto flex min-w-0 w-full items-center gap-2 sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:max-w-[14rem]">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <select
                    value={propertyId}
                    onChange={(e) =>
                      setPropertyId(
                        e.target.value === "all" ? "all" : e.target.value,
                      )
                    }
                    className="h-9 w-full max-w-full appearance-none truncate rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-8 pr-8 text-[13px] outline-none transition focus:border-[var(--ink)]"
                    aria-label="Filter by yard"
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
            <div className="max-h-[40vh] shrink-0 overflow-y-auto overscroll-none border-b border-[var(--ink)] bg-[var(--ink)] px-4 py-3 text-white lg:hidden">
              <nav className="grid gap-0.5">
                {NAV_GROUPS.map((group, gi) => (
                  <NavBlock
                    key={group.label ?? `m-group-${gi}`}
                    group={group}
                    gi={gi}
                    pathname={pathname}
                    expanded={expanded}
                    onToggle={toggleGroup}
                    warmRoute={warmRoute}
                    startTransition={startTransition}
                    mobile
                  />
                ))}
              </nav>
            </div>
          )}

          <main className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 py-4 sm:px-5">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

const navBtnClass =
  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-200 ease-out";

function NavBlock({
  group,
  pathname,
  expanded,
  collapsed = false,
  onToggle,
  warmRoute,
  startTransition,
}: {
  group: NavGroup;
  gi: number;
  pathname: string;
  expanded: Set<string>;
  collapsed?: boolean;
  onToggle: (label: string) => void;
  warmRoute: (href: string) => void;
  startTransition: (cb: () => void) => void;
  mobile?: boolean;
}) {
  const expandable = Boolean(group.expandable && group.label);
  const isOpen = collapsed || !expandable || expanded.has(group.label!);
  const GroupIcon = group.icon;

  return (
    <section className="flex min-w-0 flex-col gap-0.5">
      {expandable && !collapsed ? (
        <button
          type="button"
          onClick={() => onToggle(group.label!)}
          aria-expanded={isOpen}
          className={cn(
            navBtnClass,
            "text-left text-white/55 hover:bg-white/10 hover:text-white",
          )}
        >
          {GroupIcon ? <GroupIcon className="h-4 w-4 shrink-0" /> : null}
          <span className="min-w-0 flex-1 truncate">{group.label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-white/45 transition-transform duration-200",
              isOpen ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
      ) : null}

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "flex flex-col gap-0.5",
              expandable && !collapsed && "ml-3 border-l border-white/15 pl-2",
            )}
          >
            {group.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  prefetch
                  title={item.label}
                  onMouseEnter={() => warmRoute(item.href)}
                  onFocus={() => warmRoute(item.href)}
                  onClick={() => {
                    startTransition(() => undefined);
                  }}
                  className={cn(
                    navBtnClass,
                    collapsed && "justify-center px-0",
                    active
                      ? "border-l-2 border-[var(--accent)] bg-white/10 font-semibold text-white"
                      : "border-l-2 border-transparent text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-current" />
                  {!collapsed && (
                    <span className="truncate text-current">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3" prefetch>
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--accent)] text-sm font-bold tracking-wider text-[var(--accent-ink)]">
        PP
      </span>
      {!compact && (
        <span>
          <span
            className={cn(
              "block text-base font-semibold tracking-tight",
              compact ? "text-[var(--ink)]" : "text-white",
            )}
          >
            Paddock Parking
          </span>
          <span
            className={cn(
              "block text-xs",
              compact ? "text-[var(--muted)]" : "text-white/55",
            )}
          >
            Property management
          </span>
        </span>
      )}
    </Link>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { text } from "@/constants/text";
import { ScreenTitleProvider } from "@/components/screen-title";
import { cn } from "@/lib/utils";
import type { PortalShellProps } from "./types";

export function PortalShell({ session, onSignOut, children }: PortalShellProps) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [screenTitle, setScreenTitle] = useState(text.portal.dashboard);
  const setTitle = useCallback((title: string) => setScreenTitle(title), []);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("paddock-portal-sidebar") === "1");
    setReady(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("paddock-portal-sidebar", next ? "1" : "0");
      return next;
    });
  }

  return (
    <ScreenTitleProvider setTitle={setTitle}>
      <div className="fixed inset-0 flex overflow-hidden overscroll-none bg-[var(--canvas)] text-[var(--ink)]">
        <div className="relative flex h-full min-h-0 w-full">
          <aside
            className={cn(
              "hidden h-full shrink-0 flex-col overflow-hidden bg-[var(--ink)] px-2 py-4 text-white lg:flex",
              ready && "transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
              collapsed ? "w-[4.25rem]" : "w-56",
            )}
          >
            <p className={cn("px-2.5 text-sm font-semibold", collapsed && "sr-only")}>
              {session.name}
            </p>
            <nav className="mt-6">
              <p className="flex h-9 items-center gap-2.5 rounded-lg bg-white/10 px-2.5 text-[13px] font-medium">
                <LayoutDashboard className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <span className={cn(collapsed && "sr-only")}>{text.portal.dashboard}</span>
              </p>
            </nav>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="mt-auto inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium text-white/80"
              aria-label={collapsed ? text.portal.expand : text.portal.collapse}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
              <span className={cn(collapsed && "sr-only")}>{text.portal.collapse}</span>
            </button>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg lg:hidden"
                aria-label={text.portal.menu}
                onClick={() => setOpen((value) => !value)}
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
                {screenTitle}
              </h1>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-[var(--ink)]"
              >
                <LogOut className="h-4 w-4" />
                {text.portal.signOut}
              </button>
            </header>
            {open && (
              <div className="border-b border-[var(--ink)] bg-[var(--ink)] px-4 py-3 text-white lg:hidden">
                <p className="text-sm font-semibold">{session.name}</p>
                <p className="mt-2 text-[13px] text-[var(--accent)]">{text.portal.dashboard}</p>
              </div>
            )}
            <main className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 py-4 sm:px-5">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ScreenTitleProvider>
  );
}

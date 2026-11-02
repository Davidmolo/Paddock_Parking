"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import {
  SERVICES,
  LOCATIONS,
  SITE_EMAIL,
  SITE_PHONE,
  SITE_PHONE_TEL,
} from "@/lib/site-content";
import { cn } from "@/lib/utils";

/** Wide content column — customer marketing website under /book */
export const BOOK_SHELL =
  "mx-auto w-full max-w-[1520px] px-4 sm:px-6 lg:px-8";

/**
 * Customer marketing website chrome only.
 * - Home / Services / … / Book Now → /book/*
 * - Customer Portal → /portal (tenants)
 * Admin portal is separate: /login → /dashboard
 */
const NAV_SIMPLE = [
  { label: "Home", href: "/book" },
  { label: "About Us", href: "/book/about" },
  { label: "Blog", href: "/book/blog" },
  { label: "Partner With Us", href: "/book/partner" },
  { label: "Contact", href: "/book/contact" },
] as const;

export function BookChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#eef1f4] text-[#0b1524]">
      <header className="relative z-50 bg-[#0a1628] text-white">
        <div className={`${BOOK_SHELL} py-3.5 lg:py-4`}>
          <div className="flex items-center justify-between gap-4">
            <Link href="/book" className="flex shrink-0 items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-[#f5b301] text-sm font-black text-[#0a1628]">
                P
              </span>
              <span className="font-[family-name:var(--font-sora)] text-[13px] font-semibold tracking-[0.16em]">
                PADDOCK PARKING
              </span>
            </Link>

            <nav className="hidden items-center gap-5 xl:gap-6 lg:flex">
              <Link
                href="/book"
                className={cn(
                  "text-[13px] font-medium transition hover:text-white",
                  pathname === "/book" ? "text-white" : "text-white/90",
                )}
              >
                Home
              </Link>

              <div
                className="relative"
                onMouseEnter={() => setServicesOpen(true)}
                onMouseLeave={() => setServicesOpen(false)}
              >
                <Link
                  href="/book/services"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-white/90 transition hover:text-white"
                >
                  Services
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Link>
                {servicesOpen ? (
                  <div className="absolute left-0 top-full z-50 min-w-[260px] pt-2">
                    <div className="rounded-xl border border-white/10 bg-[#0a1628] py-2 shadow-xl">
                      {SERVICES.map((s) => (
                        <Link
                          key={s.slug}
                          href={`/book/services#${s.slug}`}
                          className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 hover:text-white"
                        >
                          {s.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className="relative"
                onMouseEnter={() => setLocationsOpen(true)}
                onMouseLeave={() => setLocationsOpen(false)}
              >
                <Link
                  href="/book/locations"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-white/90 transition hover:text-white"
                >
                  Locations
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Link>
                {locationsOpen ? (
                  <div className="absolute left-0 top-full z-50 min-w-[280px] pt-2">
                    <div className="rounded-xl border border-white/10 bg-[#0a1628] py-2 shadow-xl">
                      {LOCATIONS.map((loc) => (
                        <Link
                          key={loc.name}
                          href="/book/locations"
                          className="block px-4 py-2.5 text-sm text-white/90 hover:bg-white/5 hover:text-white"
                        >
                          {loc.name}
                        </Link>
                      ))}
                      <Link
                        href="/book/spots"
                        className="block border-t border-white/10 px-4 py-2.5 text-sm font-semibold text-[#f5b301] hover:bg-white/5"
                      >
                        Find Your Spot →
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              {NAV_SIMPLE.filter((n) => n.label !== "Home").map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "text-[13px] font-medium transition hover:text-white",
                    pathname === item.href ? "text-white" : "text-white/90",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/portal"
                className="hidden items-center justify-center whitespace-nowrap rounded-lg bg-[#f5b301] px-3.5 py-2 text-[13px] font-bold !text-[#0a1628] sm:inline-flex"
              >
                Customer Portal
              </Link>
              <Link
                href="/book/spots"
                className="hidden items-center justify-center whitespace-nowrap rounded-lg bg-[#f5b301] px-3.5 py-2 text-[13px] font-bold !text-[#0a1628] md:inline-flex"
              >
                Book Now
              </Link>
              <a
                href={SITE_PHONE_TEL}
                className="hidden items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#f5b301]/40 px-3.5 py-2 text-[13px] font-bold text-[#f5b301] sm:inline-flex lg:hidden xl:inline-flex"
              >
                <Phone className="h-3.5 w-3.5" />
                {SITE_PHONE}
              </a>
              <button
                type="button"
                className="inline-flex rounded-lg p-2 text-white lg:hidden"
                aria-label="Menu"
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto border-t border-white/10 pt-3 lg:hidden">
              <Link
                href="/book"
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                Home
              </Link>
              <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                Services
              </p>
              {SERVICES.map((s) => (
                <Link
                  key={s.slug}
                  href={`/book/services#${s.slug}`}
                  className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                  onClick={() => setMobileOpen(false)}
                >
                  {s.title}
                </Link>
              ))}
              <Link
                href="/book/locations"
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                Locations
              </Link>
              {NAV_SIMPLE.filter((n) => n.label !== "Home").map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/5"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/book/spots"
                  className="inline-flex items-center justify-center rounded-lg bg-[#f5b301] px-3.5 py-2.5 text-sm font-bold text-[#0a1628]"
                  onClick={() => setMobileOpen(false)}
                >
                  Book Now
                </Link>
                <Link
                  href="/portal"
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 px-3.5 py-2.5 text-sm font-bold text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Customer Portal
                </Link>
                <a
                  href={SITE_PHONE_TEL}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#f5b301] px-3.5 py-2.5 text-sm font-bold text-[#0a1628]"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {SITE_PHONE}
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="w-full min-w-0">{children}</main>

      <footer className="border-t border-[#0a1628]/10 bg-[#0a1628] py-12 text-sm text-white/70">
        <div
          className={`${BOOK_SHELL} grid gap-10 md:grid-cols-2 lg:grid-cols-4`}
        >
          <div>
            <p className="font-[family-name:var(--font-sora)] text-sm font-semibold tracking-[0.14em] text-white">
              PADDOCK PARKING
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed">
              Phoenix&apos;s premier heavy equipment &amp; commercial vehicle
              storage — secure, accessible, professional since 2022.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
              Quick Links
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/book" className="hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/book/about" className="hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/book/services" className="hover:text-white">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/book/spots" className="hover:text-white">
                  Book Now
                </Link>
              </li>
              <li>
                <Link href="/portal" className="hover:text-white">
                  Customer Portal
                </Link>
              </li>
              <li>
                <Link href="/book/contact" className="hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
              Our Locations
            </h3>
            <ul className="mt-3 space-y-2">
              {LOCATIONS.map((loc) => (
                <li key={loc.name}>
                  <a
                    href={loc.maps}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white"
                  >
                    {loc.address}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
              Contact Us
            </h3>
            <p className="mt-3">
              <a href={SITE_PHONE_TEL} className="font-semibold text-white">
                {SITE_PHONE}
              </a>
            </p>
            <p className="mt-1">
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="font-semibold text-white"
              >
                {SITE_EMAIL}
              </a>
            </p>
            <Link
              href="/book/spots"
              className="mt-4 inline-flex rounded-lg bg-[#f5b301] px-4 py-2 text-sm font-bold text-[#0a1628]"
            >
              Book Now
            </Link>
          </div>
        </div>
        <div
          className={`${BOOK_SHELL} mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/40`}
        >
          © {new Date().getFullYear()} Paddock Parking. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

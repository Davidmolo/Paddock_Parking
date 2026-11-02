"use client";

import Link from "next/link";
import { BookChrome, BOOK_SHELL } from "@/components/book/book-chrome";

/**
 * Customer Portal — for tenants (payments, lease, gate access).
 * Separate from Admin Portal (/login → /dashboard).
 */
export default function CustomerPortalPage() {
  return (
    <BookChrome>
      <section className="bg-[#0a1628] py-16 text-white">
        <div className={BOOK_SHELL}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#f5b301]">
            Customer Portal
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-sora)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Manage your lease online
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Pay rent, view agreements, and check your space at Paddock 16,
            Paddock 325, or Paddock 6060 — for existing customers.
          </p>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className={`${BOOK_SHELL} max-w-lg`}>
          <div className="rounded-2xl border border-[#e8ecf0] p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-[#0a1628]">Sign in</h2>
            <p className="mt-2 text-sm text-[#64748b]">
              Tenant portal login connects here next (Authorize.net / gate
              credentials). For now, book a new spot or contact support.
            </p>
            <label className="mt-6 block text-sm font-medium text-[#0a1628]">
              Email
              <input
                type="email"
                className="mt-1.5 h-11 w-full rounded-md border border-[#cbd5e1] px-3 text-sm"
                placeholder="you@company.com"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-[#0a1628]">
              Password
              <input
                type="password"
                className="mt-1.5 h-11 w-full rounded-md border border-[#cbd5e1] px-3 text-sm"
                placeholder="••••••••"
              />
            </label>
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-[#f5b301] py-3 text-sm font-bold text-[#0a1628]"
            >
              Sign in to Customer Portal
            </button>
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
          <p className="mt-8 text-center text-xs text-[#94a3b8]">
            Staff / Admin Portal is separate — use{" "}
            <Link href="/login" className="underline">
              /login
            </Link>
            .
          </p>
        </div>
      </section>
    </BookChrome>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";

export function BookingBell() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { data } = useQuery({
    queryKey: ["bookings", "bell"],
    queryFn: () => endpoints.bookings(),
  });
  const pending = (data ?? []).filter((booking) => (booking.decision ?? "pending") === "pending");

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)]"
        aria-label={text.admin.newRequests}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-4 w-4" />
        {pending.length > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[var(--ink)]">
            {pending.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <p className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">{text.admin.newRequests}</p>
          {pending.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--muted)]">{text.admin.noNewRequests}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {pending.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={`/bookings?focus=${booking.id}`}
                    className="block px-4 py-3 hover:bg-[var(--surface-muted)]"
                    onClick={() => setOpen(false)}
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">{booking.customerName}</p>
                    <p className="text-xs text-[var(--muted)]">{booking.propertyName ?? booking.email}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

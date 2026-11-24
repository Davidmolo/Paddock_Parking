"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Hourglass, KeyRound, MapPin } from "lucide-react";
import { endpoints } from "@/lib/api";
import type { PortalInvoice } from "@/app/portal/types";
import { text } from "@/constants/text";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalAccount } from "./portal-account";
import { BookingRow, bookingTone } from "@/components/bookings/booking-row";
import { usePortalEmail } from "./portal-email";
import { PortalStat } from "./portal-stat";

export function PortalDashboard() {
  const email = usePortalEmail();
  const { data, isPending } = useQuery({
    queryKey: ["portal-home", email],
    queryFn: () => endpoints.portalHome(email),
  });
  const space = data?.plots.length
    ? data.plots
        .map((plot) => (plot.size ? `${plot.number} · ${plot.size}` : plot.number))
        .join(", ")
    : text.portal.notAssigned;
  const late =
    data?.paymentStatus === "past_due" ? lateBalance(data.invoices) : null;

  return (
    <PageTransition>
      <PageHeader
        title={text.portal.dashboard}
        subtitle={text.portal.subtitle}
        action={<Link href="/portal/add" className="text-sm font-semibold text-[var(--accent-ink)]">{text.portal.addSpace}</Link>}
      />
      {isPending && !data ? (
        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Skeleton className="h-56" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        </div>
      ) : data ? (
        <div className="grid gap-4">
          {late ? (
            <p className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {text.portal.lateNotice(formatCurrency(late.amount), late.days)}
            </p>
          ) : null}
          <Stagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <PortalStat label={text.portal.plot} value={space} icon={MapPin} />
            </StaggerItem>
            <StaggerItem>
              <PortalStat label={text.portal.daysHere} value={dayCount(data.daysHere)} icon={Hourglass} />
            </StaggerItem>
            <StaggerItem>
              <PortalStat
                label={text.portal.daysLeft}
                value={data.daysLeft == null ? text.portal.monthToMonth : dayCount(data.daysLeft)}
                icon={CalendarClock}
              />
            </StaggerItem>
            <StaggerItem>
              <PortalStat label={text.portal.gateCode} value={data.gateCode || text.portal.notSet} icon={KeyRound} />
            </StaggerItem>
          </Stagger>
          <BookingRow
            viewAllHref="/portal/bookings"
            items={(data.bookings ?? []).map((booking) => ({
              id: booking.reference,
              href: `/portal/bookings/${booking.reference}`,
              status: booking.decision || text.portal.pending,
              tone: bookingTone(booking.decision || "pending"),
              title: booking.spaces?.length ? booking.spaces.map((number) => `#${number}`).join(", ") : booking.spaceType,
              meta: [booking.yardName || data.yardName, booking.bookedOn].filter(Boolean).join(" · "),
            }))}
          />
          <PortalAccount home={data} />
        </div>
      ) : null}
    </PageTransition>
  );
}

function lateBalance(invoices: PortalInvoice[]) {
  const late = invoices.filter(
    (invoice) => invoice.status === "overdue" && invoice.balance > 0,
  );
  if (late.length === 0) return null;
  const amount = late.reduce((sum, invoice) => sum + invoice.balance, 0);
  const oldest = late.reduce(
    (min, invoice) => (invoice.dueDate < min ? invoice.dueDate : min),
    late[0].dueDate,
  );
  return { amount, days: daysSince(oldest) };
}

function daysSince(dueDate: string) {
  const [year, month, day] = dueDate.split("-").map(Number);
  const due = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - due) / 86400000));
}

function dayCount(value: number | null) {
  if (value == null) return text.portal.notSet;
  return `${value} ${value === 1 ? text.portal.day : text.portal.days}`;
}

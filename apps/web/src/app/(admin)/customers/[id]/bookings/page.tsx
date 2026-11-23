"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { BookingTile, bookingTone } from "@/components/bookings/booking-row";

export default function CustomerBookingsPage() {
  const params = useParams<{ id: string }>();
  const customer = useQuery({
    queryKey: ["customer", params.id],
    queryFn: () => endpoints.customer(params.id),
  });
  const bookings = useQuery({
    queryKey: ["bookings", "customer", params.id],
    queryFn: () => endpoints.bookings(),
  });
  const mine = (bookings.data ?? []).filter(
    (booking) =>
      booking.customerId === params.id ||
      booking.email.toLowerCase() === customer.data?.email.toLowerCase(),
  );

  return (
    <PageTransition>
      <PageHeader
        title={text.admin.bookings}
        subtitle={customer.data?.name}
        action={
          <Link href={`/customers/${params.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            {customer.data?.name}
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {mine.map((booking) => (
          <BookingTile
            key={booking.id}
            item={{
              id: booking.id,
              href: `/customers/${params.id}/bookings/${booking.id}`,
              status: booking.decisionLabel ?? "Pending",
              tone: bookingTone(booking.decision ?? "pending"),
              title: booking.lotNumbers?.length ? booking.lotNumbers.map((number) => `#${number}`).join(", ") : booking.lotTypeLabel,
              meta: [booking.propertyName, booking.createdAt].filter(Boolean).join(" · "),
            }}
          />
        ))}
      </div>
    </PageTransition>
  );
}

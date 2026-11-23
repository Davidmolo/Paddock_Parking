"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { BookingTile, bookingTone } from "@/components/bookings/booking-row";
import { usePortalEmail } from "../portal-email";

export default function PortalBookingsPage() {
  const email = usePortalEmail();
  const home = useQuery({
    queryKey: ["portal-home", email],
    queryFn: () => endpoints.portalHome(email),
  });
  const bookings = home.data?.bookings ?? [];

  return (
    <PageTransition>
      <PageHeader title={text.admin.bookings} subtitle={home.data?.yardName} />
      <div className="grid gap-3 sm:grid-cols-2">
        {bookings.map((booking) => (
          <BookingTile
            key={booking.reference}
            item={{
              id: booking.reference,
              href: `/portal/bookings/${booking.reference}`,
              status: booking.decision || text.portal.pending,
              tone: bookingTone(booking.decision || "pending"),
              title: booking.spaces?.length ? booking.spaces.map((number) => `#${number}`).join(", ") : booking.spaceType,
              meta: booking.bookedOn,
            }}
          />
        ))}
      </div>
    </PageTransition>
  );
}

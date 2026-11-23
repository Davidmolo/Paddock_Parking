"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import { formatCurrency } from "@/lib/utils";
import { BookingDetail } from "@/components/bookings/booking-detail";
import { bookingTone } from "@/components/bookings/booking-row";

export default function CustomerBookingPage() {
  const params = useParams<{ id: string; bookingId: string }>();
  const bookings = useQuery({
    queryKey: ["bookings", "customer", params.id],
    queryFn: () => endpoints.bookings(),
  });
  const booking = bookings.data?.find((item) => item.id === params.bookingId);
  if (!booking) return null;
  const plates = (booking.vehicles ?? []).map((vehicle) =>
    vehicle.submitLater || !vehicle.licensePlate ? text.portal.plateLater : vehicle.licensePlate,
  );
  return (
    <BookingDetail
      backHref={`/customers/${params.id}/bookings`}
      title={booking.lotNumbers?.length ? booking.lotNumbers.map((number) => `#${number}`).join(", ") : booking.lotTypeLabel}
      status={booking.decisionLabel ?? "Pending"}
      tone={bookingTone(booking.decision ?? "pending")}
      insurance={booking.docsSubmitLater ? text.admin.insuranceLater : text.admin.insuranceAccount}
      plates={plates}
      facts={[
        { label: text.portal.yard, value: booking.propertyName || text.portal.notSet },
        { label: text.portal.spaceType, value: booking.lotTypeLabel },
        { label: text.portal.monthlyRate, value: booking.monthlyRate == null ? text.portal.notSet : `${formatCurrency(booking.monthlyRate)}/mo` },
        { label: text.portal.leaseStart, value: booking.leaseStart || text.portal.notSet },
        { label: text.portal.reference, value: booking.id },
        { label: text.portal.bookedOn, value: booking.createdAt },
      ]}
    />
  );
}

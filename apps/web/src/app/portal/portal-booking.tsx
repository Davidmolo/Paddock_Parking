import { text } from "@/constants/text";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { PortalBooking, PortalBookingCardProps } from "./types";

const paymentLabel: Record<PortalBooking["paymentMethod"], string> = {
  "": text.portal.paymentPending,
  card: text.portal.card,
  ach: text.portal.ach,
  pending: text.portal.paymentPending,
};

const decisionLabel: Record<PortalBooking["decision"], string> = {
  "": text.portal.pending,
  pending: text.portal.pending,
  approved: text.portal.approved,
  conditional: text.portal.conditional,
  denied: text.portal.denied,
};

function shown(value: string) {
  return value || text.portal.notSet;
}

function money(value: number | null) {
  return value == null ? text.portal.notSet : formatCurrency(value);
}

export function PortalBookingCard({ home }: PortalBookingCardProps) {
  const booking = home.booking;
  const rows = booking
    ? [
        [text.portal.company, booking.companyName],
        [text.portal.reference, booking.reference],
        [text.portal.bookedOn, shown(booking.bookedOn)],
        [text.portal.status, decisionLabel[booking.decision]],
        [text.portal.yard, shown(home.yardName)],
        [text.portal.spaceType, shown(booking.spaceType)],
        [
          text.portal.spots,
          booking.spotCount == null ? text.portal.notSet : String(booking.spotCount),
        ],
        [
          text.portal.acres,
          booking.acreSize == null ? text.portal.notSet : String(booking.acreSize),
        ],
        [text.portal.storing, shown(booking.storing)],
        [text.portal.payment, paymentLabel[booking.paymentMethod]],
        [text.portal.leaseStart, shown(booking.leaseStart)],
        [text.portal.monthlyRate, money(booking.monthlyRate)],
      ]
    : [];

  return (
    <Card interactive={false}>
      <CardHeader>
        <h2 className="text-base font-semibold text-[var(--ink)]">
          {text.portal.bookingTitle}
        </h2>
      </CardHeader>
      <CardBody>
        {booking ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[12px] font-medium text-[var(--muted)]">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--ink)]">
                  {value}
                </dd>
              </div>
            ))}
            {booking.vehicles.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-[12px] font-medium text-[var(--muted)]">
                  {text.portal.vehicles}
                </dt>
                <dd className="mt-1 space-y-1 text-sm text-[var(--ink)]">
                  {booking.vehicles.map((vehicle) => (
                    <p key={`${vehicle.truckNumber}-${vehicle.make}`}>
                      {[vehicle.make, vehicle.color, vehicle.truckNumber]
                        .filter(Boolean)
                        .join(" · ")}
                      {" · "}
                      {vehicle.submitLater || !vehicle.licensePlate
                        ? text.portal.plateLater
                        : vehicle.licensePlate}
                    </p>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-[var(--muted)]">{text.portal.noBooking}</p>
        )}
        {home.yardAddress ? (
          <p className="mt-4 text-sm text-[var(--muted)]">{home.yardAddress}</p>
        ) : null}
      </CardBody>
    </Card>
  );
}

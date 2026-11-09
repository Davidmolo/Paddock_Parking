import { text } from "@/constants/text";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { formatPortalDate } from "./format";
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

const decisionTone = {
  "": "warning",
  pending: "warning",
  approved: "success",
  conditional: "info",
  denied: "danger",
} as const;

const labelClass = "text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]";

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
        [text.portal.bookedOn, formatPortalDate(booking.bookedOn) || text.portal.notSet],
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
        [text.portal.leaseStart, formatPortalDate(booking.leaseStart) || text.portal.notSet],
        [text.portal.monthlyRate, money(booking.monthlyRate)],
      ]
    : [];

  return (
    <Card interactive={false}>
      <CardHeader>
        <h2 className="text-base font-semibold text-[var(--ink)]">{text.portal.bookingTitle}</h2>
        {booking ? (
          <Badge tone={decisionTone[booking.decision]}>{decisionLabel[booking.decision]}</Badge>
        ) : null}
      </CardHeader>
      <CardBody>
        {booking ? (
          <>
            <dl className="grid gap-4 sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className={labelClass}>{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</dd>
                </div>
              ))}
            </dl>
            {booking.vehicles.length > 0 ? (
              <div className="mt-4 overflow-x-auto border-t border-[var(--border)] pt-4">
                <p className={labelClass}>{text.portal.vehicles}</p>
                <table className="mt-2 w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                      <th className="py-2 pr-3 font-semibold">{text.portal.vehicle}</th>
                      <th className="py-2 pr-3 font-semibold">{text.portal.truck}</th>
                      <th className="py-2 font-semibold">{text.portal.plateFor}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.vehicles.map((vehicle) => (
                      <tr key={`${vehicle.truckNumber}-${vehicle.make}`} className="border-t border-[var(--border)]">
                        <td className="py-2 pr-3 font-medium text-[var(--ink)]">
                          {[vehicle.make, vehicle.color].filter(Boolean).join(" · ")}
                        </td>
                        <td className="py-2 pr-3 text-[var(--ink)]">{vehicle.truckNumber || text.portal.notSet}</td>
                        <td className="py-2">
                          {vehicle.submitLater || !vehicle.licensePlate ? (
                            <Badge tone="warning">{text.portal.plateLater}</Badge>
                          ) : (
                            <span className="font-semibold text-[var(--ink)]">{vehicle.licensePlate}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
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

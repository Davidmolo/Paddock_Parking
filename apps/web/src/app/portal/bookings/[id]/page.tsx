"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import { formatCurrency } from "@/lib/utils";
import { BookingDetail } from "@/components/bookings/booking-detail";
import { bookingTone } from "@/components/bookings/booking-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { usePortalEmail } from "../../portal-email";

export default function PortalBookingPage() {
  const params = useParams<{ id: string }>();
  const email = usePortalEmail();
  const queryClient = useQueryClient();
  const home = useQuery({
    queryKey: ["portal-home", email],
    queryFn: () => endpoints.portalHome(email),
  });
  const booking = home.data?.bookings?.find((item) => item.reference === params.id);
  const pending = (booking?.decision || "pending") === "pending";
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [storing, setStoring] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "ach">("card");
  const [docsLater, setDocsLater] = useState(false);
  const [plates, setPlates] = useState<string[]>([]);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (!booking || !home.data) return;
    setPhone(home.data.phone || "");
    setStoring(booking.storing || "");
    setLeaseStart(booking.leaseStart || "");
    setPaymentMethod(booking.paymentMethod === "ach" ? "ach" : "card");
    setDocsLater(booking.docsLater);
    setPlates(booking.vehicles.map((vehicle) => vehicle.licensePlate || ""));
  }, [booking?.reference, home.data?.phone]);

  const save = useMutation({
    mutationFn: () =>
      endpoints.portalEditBooking({
        email,
        reference: booking!.reference,
        phone,
        storageDescription: storing,
        leaseStart,
        paymentMethod,
        docsSubmitLater: docsLater,
        vehicles: booking!.vehicles.map((vehicle, index) => ({
          index,
          licensePlate: plates[index] ?? vehicle.licensePlate,
          submitLater: !(plates[index] ?? vehicle.licensePlate).trim(),
        })),
      }),
    onSuccess: () => {
      setSaved(text.portal.editBookingDone);
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["portal-home", email] });
    },
  });

  if (!booking || !home.data) return null;

  if (editing) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-xl font-semibold">{text.portal.editBooking}</h1>
        <p className="text-sm text-[var(--muted)]">{text.portal.editBookingHint}</p>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.portal.phone}</span>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.portal.storing}</span>
          <Input value={storing} onChange={(e) => setStoring(e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.portal.leaseStart}</span>
          <Input type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
        </label>
        <SelectMenu
          ariaLabel={text.portal.payment}
          value={paymentMethod}
          onChange={(value) => setPaymentMethod(value as "card" | "ach")}
          options={[
            { value: "card", label: text.portal.card },
            { value: "ach", label: text.portal.ach },
          ]}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={docsLater} onChange={(e) => setDocsLater(e.target.checked)} />
          {text.portal.insuranceLater}
        </label>
        {booking.vehicles.map((vehicle, index) => (
          <label key={index} className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              {text.portal.plateFor} {vehicle.truckNumber || index + 1}
            </span>
            <Input
              value={plates[index] ?? ""}
              onChange={(e) =>
                setPlates((current) => {
                  const next = [...current];
                  next[index] = e.target.value;
                  return next;
                })
              }
            />
          </label>
        ))}
        {save.isError ? <p className="text-sm text-rose-700">{text.portal.genericError}</p> : null}
        {saved ? <p className="text-sm text-emerald-700">{saved}</p> : null}
        <div className="flex gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? text.portal.pleaseWait : text.portal.editBookingSave}
          </Button>
          <Button variant="secondary" onClick={() => setEditing(false)}>
            {text.blankYard.deleteCancel}
          </Button>
        </div>
      </div>
    );
  }

  const plateLabels = booking.vehicles.map((vehicle) =>
    vehicle.submitLater || !vehicle.licensePlate ? text.portal.plateLater : vehicle.licensePlate,
  );

  return (
  <>
    {pending ? (
      <div className="mb-4 flex justify-end">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          {text.portal.editBooking}
        </Button>
      </div>
    ) : null}
    <BookingDetail
      backHref="/portal/bookings"
      title={booking.spaces?.length ? booking.spaces.map((number) => `#${number}`).join(", ") : booking.spaceType}
      status={booking.decision || text.portal.pending}
      tone={bookingTone(booking.decision || "pending")}
      insurance={booking.docsLater ? text.admin.insuranceLater : text.admin.insuranceAccount}
      plates={plateLabels}
      facts={[
        { label: text.portal.yard, value: home.data.yardName || text.portal.notSet },
        { label: text.portal.spaceType, value: booking.spaceType },
        { label: text.portal.monthlyRate, value: booking.monthlyRate == null ? text.portal.notSet : `${formatCurrency(booking.monthlyRate)}/mo` },
        { label: text.portal.leaseStart, value: booking.leaseStart || text.portal.notSet },
        { label: text.portal.storing, value: booking.storing || text.portal.notSet },
        { label: text.portal.reference, value: booking.reference },
        { label: text.portal.bookedOn, value: booking.bookedOn },
      ]}
    />
  </>
  );
}
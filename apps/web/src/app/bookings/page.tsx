"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  endpoints,
  type Booking,
  type LotType,
} from "@/lib/api";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";

const statusTone = {
  new: "accent",
  reserved: "warning",
  converted: "success",
  cancelled: "neutral",
} as const;

const LOT_TYPES: { value: LotType; label: string }[] = [
  { value: "truck_trailer", label: "Truck / trailer" },
  { value: "general_storage", label: "General storage" },
  { value: "bobtail", label: "Bobtail" },
  { value: "drop_yard", label: "Drop yard" },
  { value: "acre", label: "Acre" },
];

export default function BookingsPage() {
  const { propertyId, properties } = useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Booking["status"] | "all">("new");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [lotId, setLotId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [flash, setFlash] = useState("");
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    propertyId: "",
    lotType: "truck_trailer" as LotType,
    customerName: "",
    email: "",
    phone: "",
    monthlyRate: "",
    notes: "",
  });

  const { data, isPending } = useQuery({
    queryKey: queryKeys.bookings(propertyId),
    queryFn: () => endpoints.bookings(propertyParam(propertyId)),
  });

  const converting = data?.find((b) => b.id === convertingId);

  const { data: lots } = useQuery({
    queryKey: queryKeys.lots(converting?.propertyId ?? propertyId),
    queryFn: () =>
      endpoints.lots(propertyParam(converting?.propertyId ?? propertyId)),
    enabled: !!converting,
  });

  const availableLots = useMemo(
    () =>
      (lots ?? []).filter(
        (l) =>
          l.status === "available" &&
          (!converting || l.propertyId === converting.propertyId) &&
          (!converting || l.lotType === converting.lotType),
      ),
    [lots, converting],
  );

  function invalidateRelated() {
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["lots"] });
    void queryClient.invalidateQueries({ queryKey: ["customers"] });
    void queryClient.invalidateQueries({ queryKey: ["leases"] });
    void queryClient.invalidateQueries({ queryKey: ["lease-summary"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  const convert = useMutation({
    mutationFn: () => {
      if (!convertingId || !lotId) throw new Error("Pick a lot");
      return endpoints.convertBooking(convertingId, lotId);
    },
    onSuccess: (res) => {
      invalidateRelated();
      setConvertingId(null);
      setLotId("");
      setFlash("Converted — opening customer to collect COI.");
      router.push(`/customers/${res.customerId}`);
    },
  });

  const waive = useMutation({
    mutationFn: (id: string) =>
      endpoints.patchBooking(id, { autoPullWaived: true }),
    onSuccess: () => {
      invalidateRelated();
      setFlash(
        "Auto-pull waived for this applicant — they can finish without ACH requirement.",
      );
    },
  });

  const restore = useMutation({
    mutationFn: (id: string) =>
      endpoints.patchBooking(id, { autoPullWaived: false }),
    onSuccess: () => {
      invalidateRelated();
      setFlash("Auto-pull requirement restored for this applicant.");
    },
  });

  const create = useMutation({
    mutationFn: () => {
      const pid = form.propertyId || (propertyId !== "all" ? propertyId : "");
      if (!pid) throw new Error("Pick a yard");
      if (!form.customerName.trim() || !form.email.trim() || !form.phone.trim()) {
        throw new Error("Name, email, and phone are required");
      }
      return endpoints.createBooking({
        propertyId: pid,
        lotType: form.lotType,
        customerName: form.customerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        monthlyRate: form.monthlyRate
          ? Number(form.monthlyRate)
          : undefined,
        notes: form.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      setFormError("");
      setShowAdd(false);
      setFlash("Booking added to inbox.");
      setForm({
        propertyId: "",
        lotType: "truck_trailer",
        customerName: "",
        email: "",
        phone: "",
        monthlyRate: "",
        notes: "",
      });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not create booking",
      );
    },
  });

  const visible = (data ?? []).filter(
    (b) => filter === "all" || b.status === filter,
  );

  return (
    <PageTransition>
      <PageHeader
        title="Onboarding"
        subtitle="FMS-style pipeline — track how far each public Book Now applicant got (page 1→4), then convert to a tenant."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/book/spots"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              Open public Book Now
            </a>
            <Button
              size="sm"
              onClick={() => {
                setShowAdd(true);
                setFormError("");
                if (propertyId !== "all") {
                  setForm((f) => ({ ...f, propertyId }));
                }
              }}
            >
              Add booking
            </Button>
          </div>
        }
      />

      {flash && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {flash}
        </p>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          ["new", "reserved", "converted", "cancelled", "all"] as const
        ).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-xl border px-3.5 py-2 text-sm font-medium capitalize transition",
              filter === s
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]",
            )}
          >
            {s === "all" ? "All" : s}
            {data && (
              <span className="ml-2 text-xs opacity-70">
                {s === "all"
                  ? data.length
                  : data.filter((b) => b.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isPending && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card interactive={false} className="p-10 text-center">
          <p className="text-[var(--muted)]">No bookings in this filter.</p>
        </Card>
      ) : (
        <Stagger className="grid gap-3">
          {visible.map((booking) => (
            <StaggerItem key={booking.id}>
              <Card>
                <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{booking.customerName}</p>
                      <Badge tone={statusTone[booking.status]}>
                        {booking.status}
                      </Badge>
                      {booking.compliancePending && (
                        <Badge tone="warning">Compliance pending</Badge>
                      )}
                      {booking.autoPullWaived ? (
                        <Badge tone="warning">Auto-pull waived</Badge>
                      ) : booking.autoPullAgreed ? (
                        <Badge tone="success">Auto-pull</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      {booking.email} · {booking.phone}
                    </p>
                    <p className="text-sm">
                      {booking.propertyName} ·{" "}
                      {booking.productType === "storage_acre"
                        ? `${booking.acreSize ?? "?"} ac storage`
                        : booking.productType === "parking_spot"
                          ? `${booking.spotCount ?? 1} spot(s)`
                          : booking.lotTypeLabel}
                      {booking.monthlyRate != null && (
                        <>
                          {" "}
                          · {formatCurrency(booking.monthlyRate)}
                          /mo
                        </>
                      )}
                    </p>
                    <WizardProgress step={booking.wizardStep ?? 1} />
                    <p className="text-xs text-[var(--muted)]">
                      Submitted {booking.createdAt}
                      {booking.paymentMethod
                        ? ` · pay ${booking.paymentMethod}`
                        : ""}
                      {booking.notes ? ` · ${booking.notes}` : ""}
                    </p>
                  </div>
                  {(booking.status === "new" ||
                    booking.status === "reserved") && (
                    <div className="flex flex-col gap-2 sm:items-end">
                      {!booking.autoPullWaived && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={waive.isPending}
                          onClick={() => {
                            setFlash("");
                            waive.mutate(booking.id);
                          }}
                        >
                          Waive auto-pull
                        </Button>
                      )}
                      {booking.autoPullWaived && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={waive.isPending}
                          onClick={() => {
                            setFlash("");
                            restore.mutate(booking.id);
                          }}
                        >
                          Restore auto-pull req.
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setConvertingId(booking.id);
                          setLotId("");
                          setFlash("");
                        }}
                      >
                        Convert to tenant
                      </Button>
                    </div>
                  )}
                  {booking.status === "converted" && booking.customerId && (
                    <Link href={`/customers/${booking.customerId}`}>
                      <Button variant="secondary">View customer</Button>
                    </Link>
                  )}
                  {booking.status === "converted" && !booking.customerId && (
                    <Link href="/customers">
                      <Button variant="secondary">View customers</Button>
                    </Link>
                  )}
                </CardBody>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {converting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
          <Card interactive={false} className="w-full max-w-md !shadow-2xl">
            <CardHeader>
              <div>
                <h2 className="text-lg font-semibold">Assign a lot</h2>
                <p className="text-sm text-[var(--muted)]">
                  {converting.customerName} · {converting.lotTypeLabel}
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Available {converting.lotTypeLabel} spots
                </span>
                <select
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm"
                  value={lotId}
                  onChange={(e) => setLotId(e.target.value)}
                >
                  <option value="">Select lot…</option>
                  {availableLots.map((l) => (
                    <option key={l.id} value={l.id}>
                      #{l.number} · {l.size} · {formatCurrency(l.monthlyRate)}
                      /mo
                    </option>
                  ))}
                </select>
              </label>
              {availableLots.length === 0 && (
                <p className="text-sm text-amber-700">
                  No available lots of this type at that yard. Free a spot on
                  Lots first.
                </p>
              )}
              {convert.isError && (
                <p className="text-sm text-rose-700">
                  {convert.error instanceof Error
                    ? convert.error.message
                    : "Convert failed"}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConvertingId(null);
                    setLotId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!lotId || convert.isPending}
                  onClick={() => convert.mutate()}
                >
                  {convert.isPending ? "Converting…" : "Convert"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
          <Card interactive={false} className="w-full max-w-lg !shadow-2xl">
            <CardHeader>
              <div>
                <h2 className="text-lg font-semibold">Add booking</h2>
                <p className="text-sm text-[var(--muted)]">
                  Simulate a public Book Now submission for the demo.
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Yard
                </span>
                <select
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm"
                  value={form.propertyId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, propertyId: e.target.value }))
                  }
                >
                  <option value="">Select yard…</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Lot type
                </span>
                <select
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm"
                  value={form.lotType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      lotType: e.target.value as LotType,
                    }))
                  }
                >
                  {LOT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                placeholder="Customer / company name"
                value={form.customerName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customerName: e.target.value }))
                }
              />
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
              <Input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
              <Input
                type="number"
                min={0}
                placeholder="Monthly rate (optional)"
                value={form.monthlyRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, monthlyRate: e.target.value }))
                }
              />
              <Input
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
              {formError && (
                <p className="text-sm text-rose-700">{formError}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAdd(false);
                    setFormError("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={create.isPending}
                  onClick={() => create.mutate()}
                >
                  {create.isPending ? "Saving…" : "Add to inbox"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </PageTransition>
  );
}

const WIZARD_LABELS = [
  "Contact Info",
  "Lease Details",
  "Agreement",
  "Review & Pay",
] as const;

function WizardProgress({ step }: { step: number }) {
  const current = Math.min(4, Math.max(1, step));
  const label = WIZARD_LABELS[current - 1] ?? WIZARD_LABELS[0];
  return (
    <div className="mt-2 max-w-xs space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-[var(--muted)]">
          Page {current} of 4
          <span className="mx-1.5 text-[var(--border)]">·</span>
          <span className="font-medium text-[var(--ink)]">{label}</span>
        </p>
      </div>
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={4}
        aria-label={`Onboarding page ${current} of 4`}
      >
        {WIZARD_LABELS.map((name, i) => {
          const n = i + 1;
          return (
            <span
              key={name}
              title={`Page ${n}: ${name}`}
              className={cn(
                "h-1 flex-1 rounded-full",
                n <= current
                  ? "bg-[var(--accent)]"
                  : "bg-[var(--surface-muted)]",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

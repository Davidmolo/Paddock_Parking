"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  ApiError,
  endpoints,
  type Booking,
  type BookingCondition,
  type BookingDecision,
  type LotType,
} from "@/lib/api";
import { text } from "@/constants/text";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, usePresence } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/segmented";
import { SelectMenu } from "@/components/ui/select-menu";
import { formatCurrency, cn } from "@/lib/utils";

type Filter = BookingDecision | "all";

const CONDITIONS: { key: BookingCondition; label: string }[] = [
  { key: "prepaid", label: "Prepaid" },
  { key: "deposit_hold", label: "Deposit hold" },
  { key: "coi_pending", label: "COI pending" },
  { key: "escrow", label: "Escrow" },
  { key: "bond", label: "Bond" },
];

const LOT_TYPES: { value: LotType; label: string }[] = [
  { value: "truck_trailer", label: "Truck / trailer" },
  { value: "general_storage", label: "General storage" },
  { value: "bobtail", label: "Bobtail" },
  { value: "drop_yard", label: "Drop yard" },
  { value: "acre", label: "Acre" },
];

const STEP_NAMES = [
  "Get started",
  "Business / lease",
  "Verify & pay",
  "Review & sign",
] as const;

/** FMS-style Onboarding Profiles — table + detail panel (Paddock theme). */
export default function BookingsPage() {
  const { propertyId, properties } = useApp();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lotId, setLotId] = useState("");
  const [conditions, setConditions] = useState<BookingCondition[]>([]);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [flash, setFlash] = useState("");
  const [formError, setFormError] = useState("");
  const [showAssist, setShowAssist] = useState(false);
  const [assistForm, setAssistForm] = useState({
    propertyId: "",
    lotType: "truck_trailer" as LotType,
    customerName: "",
    email: "",
    phone: "",
    monthlyRate: "",
    notes: "",
    referredBy: "",
  });

  const { data, isPending } = useQuery({
    queryKey: queryKeys.bookings(propertyId),
    queryFn: () => endpoints.bookings(propertyParam(propertyId)),
  });

  const selected = data?.find((b) => b.id === selectedId) ?? null;
  const profileHold = useRef(selected);
  if (selected) profileHold.current = selected;
  const profileOn = usePresence(Boolean(selected), 180);
  const profile = selected ?? profileHold.current;
  const assistOn = usePresence(showAssist, 160);
  const flashOn = usePresence(Boolean(flash), 160);
  const flashHold = useRef(flash);
  if (flash) flashHold.current = flash;

  const { data: lots } = useQuery({
    queryKey: queryKeys.lots(selected?.propertyId ?? propertyId),
    queryFn: () =>
      endpoints.lots(propertyParam(selected?.propertyId ?? propertyId)),
    enabled: !!selected && (selected.decision ?? "pending") === "pending",
  });

  const availableLots = useMemo(
    () =>
      (lots ?? []).filter(
        (l) =>
          (l.status === "available" || l.status === "available_soon") &&
          (!selected || l.propertyId === selected.propertyId),
      ),
    [lots, selected],
  );

  useEffect(() => {
    if (!selected) return;
    const preferred = selected.lotId;
    if (preferred && availableLots.some((l) => l.id === preferred) && !lotId) {
      setLotId(preferred);
    }
  }, [selected, availableLots, lotId]);

  const counts = useMemo(() => {
    const rows = data ?? [];
    return {
      pending: rows.filter((b) => (b.decision ?? "pending") === "pending")
        .length,
      approved: rows.filter((b) => b.decision === "approved").length,
      conditional: rows.filter((b) => b.decision === "conditional").length,
      denied: rows.filter((b) => b.decision === "denied").length,
      all: rows.length,
    };
  }, [data]);

  const visible = useMemo(() => {
    const rows = data ?? [];
    if (filter === "all") return rows;
    return rows.filter((b) => (b.decision ?? "pending") === filter);
  }, [data, filter]);

  function invalidateRelated() {
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["lots"] });
    void queryClient.invalidateQueries({ queryKey: ["customers"] });
    void queryClient.invalidateQueries({ queryKey: ["leases"] });
    void queryClient.invalidateQueries({ queryKey: ["lease-summary"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  function selectProfile(b: Booking) {
    setSelectedId(b.id);
    setLotId("");
    setConditions(b.conditions ?? []);
    setDecisionNotes("");
    setFormError("");
    setFlash("");
  }

  const decide = useMutation({
    mutationFn: (args: {
      id: string;
      decision: "approve" | "conditional" | "deny";
      giveGateCode?: boolean;
    }) =>
      endpoints.decideBooking(args.id, {
        decision: args.decision,
        lotId: args.decision === "deny" ? undefined : lotId || undefined,
        conditions:
          args.decision === "conditional" ? conditions : undefined,
        notes: decisionNotes || undefined,
        giveGateCode: args.decision === "deny" ? undefined : args.giveGateCode,
      }),
    onSuccess: (res, vars) => {
      invalidateRelated();
      setFormError("");
      setLotId("");
      setConditions([]);
      setDecisionNotes("");
      if (vars.decision === "deny") {
        setFlash("Application denied. Customer notified (demo).");
        setSelectedId(null);
      } else if (res.customerId) {
        setFlash(
          vars.decision === "conditional"
            ? "Conditionally approved — customer created. Portal still Not invited."
            : "Approved — customer created. Portal still Not invited.",
        );
        setSelectedId(res.booking.id);
      }
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not save decision.";
      setFormError(msg || "Could not save decision.");
    },
  });

  const invite = useMutation({
    mutationFn: (id: string) => endpoints.inviteBookingPortal(id),
    onSuccess: () => {
      invalidateRelated();
      setFormError("");
      setFlash(
        "Portal invitation emailed. The customer opens that link to set a password.",
      );
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Could not send the portal invitation.",
      );
    },
  });

  const billing = useMutation({
    mutationFn: (body: { id: string; autoPullWaived?: boolean; paymentMethod?: "card" | "ach" }) =>
      endpoints.patchBooking(body.id, {
        autoPullWaived: body.autoPullWaived,
        paymentMethod: body.paymentMethod,
      }),
    onSuccess: (_booking, body) => {
      invalidateRelated();
      setFlash(
        body.paymentMethod === "card"
          ? text.admin.switchedCard
          : body.paymentMethod === "ach"
            ? text.admin.switchedAch
            : body.autoPullWaived
              ? text.admin.autopullOffFlash
              : text.admin.autopullOnFlash,
      );
    },
  });

  const assistCreate = useMutation({
    mutationFn: () =>
      endpoints.createBooking({
        propertyId: assistForm.propertyId || properties[0]?.id,
        lotType: assistForm.lotType,
        customerName: assistForm.customerName,
        email: assistForm.email,
        phone: assistForm.phone,
        monthlyRate: assistForm.monthlyRate
          ? Number(assistForm.monthlyRate)
          : undefined,
        notes: assistForm.notes || "Onboarding Assist — staff started Steps 1–2",
        referredBy: assistForm.referredBy || undefined,
        wizardStep: 2,
        paymentMethod: "pending",
      }),
    onSuccess: () => {
      invalidateRelated();
      setShowAssist(false);
      setFlash(
        "Assist profile created as Pending. Customer finishes verify, docs, and signature.",
      );
      setAssistForm({
        propertyId: "",
        lotType: "truck_trailer",
        customerName: "",
        email: "",
        phone: "",
        monthlyRate: "",
        notes: "",
        referredBy: "",
      });
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiError ? err.message : "Could not create assist profile.",
      );
    },
  });

  function toggleCondition(key: BookingCondition) {
    setConditions((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Onboarding Profiles"
        subtitle="FMS-style queue: Pending → Approve / Conditionally approve / Deny (once). Then portal invite."
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setShowAssist((v) => !v);
              setFormError("");
            }}
          >
            Onboarding Assist
          </Button>
        }
      />

      {flashOn.mounted && flashHold.current && (
        <div className={cn("mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-950", flashOn.leaving ? "fade-out" : "fade-in")}>
          <p>{flashHold.current}</p>
          <button
            type="button"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-emerald-800/70 transition-colors duration-150 hover:bg-emerald-100 hover:text-emerald-950"
            onClick={() => setFlash("")}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {assistOn.mounted && (
        <div className={cn("relative mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4", assistOn.leaving ? "fade-out" : "fade-in")}>
          <button
            type="button"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
            onClick={() => setShowAssist(false)}
            aria-label="Close assist"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="pr-10 font-display text-base font-semibold">
            Onboarding Assist
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Staff start Steps 1–2. Customer finishes ID, payment, docs, signature.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                Yard
              </span>
              <SelectMenu
                ariaLabel="Yard"
                value={assistForm.propertyId}
                placeholder="Select yard"
                onChange={(next) =>
                  setAssistForm((form) => ({ ...form, propertyId: next }))
                }
                options={properties.map((property) => ({
                  value: property.id,
                  label: property.name,
                }))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                Lot type
              </span>
              <SelectMenu
                ariaLabel="Lot type"
                value={assistForm.lotType}
                onChange={(next) =>
                  setAssistForm((form) => ({
                    ...form,
                    lotType: next as LotType,
                  }))
                }
                options={LOT_TYPES}
              />
            </label>
            <Field
              label="Company / customer"
              value={assistForm.customerName}
              onChange={(v) =>
                setAssistForm((f) => ({ ...f, customerName: v }))
              }
            />
            <Field
              label="Email"
              value={assistForm.email}
              onChange={(v) => setAssistForm((f) => ({ ...f, email: v }))}
            />
            <Field
              label="Phone"
              value={assistForm.phone}
              onChange={(v) => setAssistForm((f) => ({ ...f, phone: v }))}
            />
            <Field
              label="Referred by"
              value={assistForm.referredBy}
              onChange={(v) =>
                setAssistForm((f) => ({ ...f, referredBy: v }))
              }
            />
            <Field
              label="Monthly rate"
              value={assistForm.monthlyRate}
              onChange={(v) =>
                setAssistForm((f) => ({ ...f, monthlyRate: v }))
              }
            />
            <Field
              label="Notes"
              value={assistForm.notes}
              onChange={(v) => setAssistForm((f) => ({ ...f, notes: v }))}
            />
          </div>
          {formError && !selected && (
            <p className="mt-2 text-sm text-rose-600">{formError}</p>
          )}
          <Button
            className="mt-3"
            disabled={
              assistCreate.isPending ||
              !assistForm.customerName ||
              !assistForm.email ||
              !assistForm.phone
            }
            onClick={() => {
              setFormError("");
              assistCreate.mutate();
            }}
          >
            {assistCreate.isPending ? "Saving…" : "Create Pending profile"}
          </Button>
        </div>
      )}

      {/* FMS status tabs */}
      <Segmented
        className="mb-3"
        variant="underline"
        ariaLabel="Onboarding status"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "approved", label: "Approved", count: counts.approved },
          { value: "conditional", label: "Conditional", count: counts.conditional },
          { value: "denied", label: "Denied", count: counts.denied },
          { value: "all", label: "All", count: counts.all },
        ]}
      />

      {isPending && !data ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
          {/* FMS list */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-3 py-3">Yard</th>
                    <th className="px-3 py-3">Stage</th>
                    <th className="px-3 py-3">Decision</th>
                    <th className="px-3 py-3">Portal</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-[var(--muted)]"
                      >
                        No profiles in this filter.
                      </td>
                    </tr>
                  )}
                  {visible.map((b) => (
                    <tr
                      key={b.id}
                      className={cn(
                        "cursor-pointer border-b border-[var(--border)] last:border-b-0 transition",
                        selectedId === b.id
                          ? "bg-[var(--accent-soft)]"
                          : "hover:bg-[var(--surface-muted)]",
                      )}
                      onClick={() => selectProfile(b)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--ink)]">
                          {b.customerName}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {b.email}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-[var(--muted)]">
                        {b.propertyName ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <StageBar
                          complete={b.stepsComplete ?? b.wizardStep ?? 1}
                        />
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {b.stepLabel ?? `Step ${b.wizardStep ?? 1}`}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <DecisionPill decision={b.decision ?? "pending"} />
                      </td>
                      <td className="px-3 py-3 text-xs capitalize text-[var(--muted)]">
                        {(b.portalStatus ?? "not_invited").replace("_", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FMS detail / decide panel */}
          <aside className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] lg:sticky lg:top-4 lg:self-start">
            {!profileOn.mounted || !profile ? (
              <p className="fade-in px-5 py-16 text-center text-sm text-[var(--muted)]">
                Select a profile to review and decide.
              </p>
            ) : (
              <div
                key={profile.id}
                className={cn(
                  profileOn.leaving ? "panel-out pointer-events-none" : "panel-in",
                )}
              >
              <ProfileDetail
                booking={profile}
                availableLots={availableLots}
                lotId={lotId}
                setLotId={setLotId}
                conditions={conditions}
                toggleCondition={toggleCondition}
                decisionNotes={decisionNotes}
                setDecisionNotes={setDecisionNotes}
                formError={formError}
                deciding={decide.isPending}
                onDecide={(decision, giveGateCode) => {
                  setFormError("");
                  decide.mutate({ id: profile.id, decision, giveGateCode });
                }}
                onAutopull={(off) =>
                  billing.mutate({ id: profile.id, autoPullWaived: off })
                }
                onMethod={(paymentMethod) =>
                  billing.mutate({ id: profile.id, paymentMethod })
                }
                onInvite={() => invite.mutate(profile.id)}
                inviting={invite.isPending}
                onClose={() => setSelectedId(null)}
              />
              </div>
            )}
          </aside>
        </div>
      )}
    </PageTransition>
  );
}

function ProfileDetail({
  booking,
  availableLots,
  lotId,
  setLotId,
  conditions,
  toggleCondition,
  decisionNotes,
  setDecisionNotes,
  formError,
  deciding,
  onDecide,
  onAutopull,
  onMethod,
  onInvite,
  inviting,
  onClose,
}: {
  booking: Booking;
  availableLots: {
    id: string;
    number: string;
    monthlyRate: number;
    status: string;
  }[];
  lotId: string;
  setLotId: (v: string) => void;
  conditions: BookingCondition[];
  toggleCondition: (c: BookingCondition) => void;
  decisionNotes: string;
  setDecisionNotes: (v: string) => void;
  formError: string;
  deciding: boolean;
  onDecide: (d: "approve" | "conditional" | "deny", giveGateCode: boolean) => void;
  onAutopull: (off: boolean) => void;
  onMethod: (method: "card" | "ach") => void;
  onInvite: () => void;
  inviting: boolean;
  onClose: () => void;
}) {
  const pending = (booking.decision ?? "pending") === "pending";
  const approved =
    booking.decision === "approved" || booking.decision === "conditional";
  const [giveGateCode, setGiveGateCode] = useState(true);

  return (
    <div className="flex max-h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Profile summary
          </p>
          <h2 className="mt-0.5 truncate font-display text-lg font-semibold text-[var(--ink)]">
            {booking.customerName}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {booking.propertyName} · {booking.lotTypeLabel}
            {booking.monthlyRate != null
              ? ` · ${formatCurrency(booking.monthlyRate)}/mo`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <DecisionPill decision={booking.decision ?? "pending"} />
          <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-xs capitalize text-[var(--muted)]">
            Portal {(booking.portalStatus ?? "not_invited").replace("_", " ")}
          </span>
        </div>

        <StageBar
          complete={booking.stepsComplete ?? booking.wizardStep ?? 1}
          labels
        />

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <Meta label="Email" value={booking.email} />
          <Meta label="Phone" value={booking.phone} />
          <Meta label="Submitted" value={booking.createdAt} />
          <Meta label="Referred by" value={booking.referredBy || "—"} />
          <Meta
            label="Payment"
            value={[
              booking.paymentMethod === "card" ? text.portal.card : booking.paymentMethod === "ach" ? text.portal.ach : "—",
              booking.autoPullWaived ? text.admin.autopullOff : text.admin.autopullOn,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <Meta
            label="Gaps"
            value={
              booking.compliancePending
                ? `${booking.missingPlates ?? 0} plate(s)${
                    booking.docsSubmitLater ? " · docs later" : ""
                  }`
                : "Clear"
            }
          />
        </dl>

        {(booking.vehicles?.length ?? 0) > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Vehicles
            </p>
            <ul className="mt-1 space-y-1 text-sm">
              {booking.vehicles!.map((v, i) => (
                <li key={`${v.truckNumber}-${i}`}>
                  {v.make || "Vehicle"} {v.truckNumber} ·{" "}
                  {v.submitLater || !v.licensePlate
                    ? "plate later"
                    : v.licensePlate}
                </li>
              ))}
            </ul>
          </div>
        )}

        {booking.decisionNotes && (
          <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--muted)]">
            {booking.decisionNotes}
          </p>
        )}

        {pending ? (
          <div className="space-y-3 border-t border-[var(--border)] pt-3">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                Assign space (required)
              </span>
              <SelectMenu
                ariaLabel="Assign space"
                value={lotId}
                placeholder="Select lot…"
                onChange={setLotId}
                options={availableLots.map((lot) => ({
                  value: lot.id,
                  label: `#${lot.number} · ${formatCurrency(lot.monthlyRate)}/mo · ${lot.status.replace("_", " ")}`,
                }))}
              />
              {availableLots.length === 0 && (
                <p className="text-xs text-amber-800">
                  No available spaces — free a lot in Inventory first.
                </p>
              )}
            </label>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                Conditions (conditional)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleCondition(c.key)}
                    className={cn(
                      "rounded border px-2 py-1 text-xs font-medium",
                      conditions.includes(c.key)
                        ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                        : "border-[var(--border)] text-[var(--muted)]",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                Decision notes
              </span>
              <Input
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Optional"
              />
            </label>

            {formError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {formError}
              </p>
            )}

            <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={giveGateCode}
                onChange={(event) => setGiveGateCode(event.target.checked)}
              />
              {text.admin.giveGateCode}
            </label>

            <div className="flex flex-col gap-2">
              <Button
                disabled={deciding || !lotId}
                onClick={() => onDecide("approve", giveGateCode)}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                disabled={deciding || !lotId}
                onClick={() => onDecide("conditional", giveGateCode)}
              >
                Conditionally approve
              </Button>
              <Button
                variant="danger"
                disabled={deciding}
                onClick={() => onDecide("deny", false)}
              >
                Deny
              </Button>
            </div>

          </div>
        ) : (
          <div className="space-y-3 border-t border-[var(--border)] pt-3">
            {booking.conditions && booking.conditions.length > 0 && (
              <p className="text-sm">
                Conditions:{" "}
                <span className="font-medium">
                  {booking.conditions.join(", ")}
                </span>
              </p>
            )}
            {booking.gateCode ? (
              <div className="rounded-lg bg-[var(--ink)] px-3 py-3 text-center text-white">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                  Gate code
                </p>
                <p className="mt-1 font-mono text-xl font-bold tracking-widest">
                  {booking.gateCode}
                </p>
              </div>
            ) : approved ? (
              <p className="text-sm text-[var(--muted)]">{text.admin.noGateCode}</p>
            ) : null}
            {booking.customerId && (
              <Link
                href={`/customers/${booking.customerId}`}
                className="inline-flex text-sm font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
              >
                Open customer record →
              </Link>
            )}
            {approved && booking.portalStatus !== "active" && (
              <Button
                className="w-full"
                disabled={inviting}
                onClick={onInvite}
              >
                {inviting
                  ? "Sending…"
                  : booking.portalStatus === "invited"
                    ? "Resend portal invitation"
                    : "Send portal invitation"}
              </Button>
            )}
            {booking.portalStatus === "active" && (
              <p className="text-sm text-emerald-800">
                Portal active — customer set their password.
              </p>
            )}
          </div>
        )}

        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            {text.admin.autopull}
          </p>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            {text.admin.autopullHint}
          </p>
          <p className="text-sm font-medium text-[var(--ink)]">
            {text.admin.chargeWith}:{" "}
            {booking.paymentMethod === "card" ? text.portal.card : text.portal.ach}
            {" · "}
            {booking.autoPullWaived ? text.admin.autopullOff : text.admin.autopullOn}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => onAutopull(!booking.autoPullWaived)}>
              {booking.autoPullWaived ? text.admin.turnAutopullOn : text.admin.turnAutopullOff}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onMethod(booking.paymentMethod === "card" ? "ach" : "card")}
            >
              {booking.paymentMethod === "card" ? text.admin.switchToAch : text.admin.switchToCard}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-[var(--muted)]">{label}</dt>
      <dd className="truncate font-medium text-[var(--ink)]">{value}</dd>
    </div>
  );
}

function StageBar({
  complete,
  labels = false,
}: {
  complete: number;
  labels?: boolean;
}) {
  const n = Math.min(4, Math.max(0, complete));
  return (
    <div>
      <div className="flex gap-1">
        {STEP_NAMES.map((name, i) => (
          <div key={name} className="min-w-0 flex-1">
            <div
              className={cn(
                "h-1.5 rounded-sm",
                i < n ? "bg-[var(--accent)]" : "bg-[var(--border)]",
              )}
              title={name}
            />
            {labels && (
              <p
                className={cn(
                  "mt-1 truncate text-[9px]",
                  i < n ? "font-medium text-[var(--ink)]" : "text-[var(--muted)]",
                )}
              >
                {name}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionPill({ decision }: { decision: BookingDecision }) {
  const map = {
    pending: "bg-amber-500/15 text-amber-950",
    approved: "bg-emerald-500/15 text-emerald-900",
    conditional: "bg-sky-500/15 text-sky-950",
    denied: "bg-rose-500/15 text-rose-900",
  } as const;
  const label = {
    pending: "Pending",
    approved: "Approved",
    conditional: "Conditional",
    denied: "Denied",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-xs font-semibold",
        map[decision],
      )}
    >
      {label[decision]}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

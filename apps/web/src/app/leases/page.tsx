"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { endpoints, type LeaseRecord } from "@/lib/api";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

type Tab = "renewals" | "tenant" | "landlord" | "all";

const urgencyTone = {
  overdue: "danger",
  due: "warning",
  upcoming: "accent",
  ok: "neutral",
} as const;

export default function LeasesPage() {
  const { propertyId } = useApp();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("renewals");
  const [editing, setEditing] = useState<LeaseRecord | null>(null);

  const { data: summary, isPending: summaryPending } = useQuery({
    queryKey: queryKeys.leaseSummary(propertyId),
    queryFn: () => endpoints.leaseSummary(propertyParam(propertyId)),
  });

  const { data: leases, isPending } = useQuery({
    queryKey: queryKeys.leases(propertyId),
    queryFn: () =>
      endpoints.leases({ propertyId: propertyParam(propertyId) }),
  });

  const visible = useMemo(() => {
    const list = leases ?? [];
    if (tab === "renewals") return list.filter((l) => l.noticeDue);
    if (tab === "tenant") return list.filter((l) => l.direction === "tenant");
    if (tab === "landlord")
      return list.filter((l) => l.direction === "landlord");
    return list;
  }, [leases, tab]);

  return (
    <PageTransition>
      <PageHeader
        title="Leases"
        subtitle="Landlord ground leases and tenant agreements — term, renewal, and required notice windows."
        action={
          <Link href="/notifications">
            <Button variant="secondary">Open notices</Button>
          </Link>
        }
      />

      {summaryPending && !summary ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : summary ? (
        <Stagger className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Tenant leases" value={String(summary.tenant)} />
          <Stat label="Landlord leases" value={String(summary.landlord)} />
          <Stat
            label="Renewals in notice window"
            value={String(summary.renewalsDue)}
            danger={summary.renewalsDue > 0}
          />
          <Stat
            label="Past renewal date"
            value={String(summary.renewalsOverdue)}
            danger={summary.renewalsOverdue > 0}
          />
        </Stagger>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["renewals", "Renewals due"],
            ["tenant", "Tenant"],
            ["landlord", "Landlord"],
            ["all", "All leases"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-xl border px-3.5 py-2 text-sm font-medium transition",
              tab === key
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]",
            )}
          >
            {label}
            {summary && (
              <span className="ml-2 text-xs opacity-70">
                {key === "renewals"
                  ? summary.renewalsDue
                  : key === "tenant"
                    ? summary.tenant
                    : key === "landlord"
                      ? summary.landlord
                      : summary.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {isPending && !leases ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card interactive={false} className="p-10 text-center">
          <p className="text-[var(--muted)]">
            {tab === "renewals"
              ? "No leases inside a notice window right now."
              : "No leases in this filter."}
          </p>
        </Card>
      ) : (
        <Stagger className="grid gap-3">
          {visible.map((lease) => (
            <StaggerItem key={lease.id}>
              <LeaseCard lease={lease} onEdit={() => setEditing(lease)} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {editing && (
        <LeaseEditDrawer
          lease={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ["leases"] });
            void queryClient.invalidateQueries({ queryKey: ["lease-summary"] });
            void queryClient.invalidateQueries({ queryKey: ["customer"] });
            void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            void queryClient.invalidateQueries({ queryKey: ["notifications"] });
            void queryClient.invalidateQueries({
              queryKey: ["notification-summary"],
            });
            setEditing(null);
          }}
        />
      )}
    </PageTransition>
  );
}

function LeaseCard({
  lease,
  onEdit,
}: {
  lease: LeaseRecord;
  onEdit: () => void;
}) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{lease.partyName}</p>
              <Badge tone={lease.direction === "landlord" ? "accent" : "info"}>
                {lease.direction}
              </Badge>
              <Badge tone={urgencyTone[lease.urgency]}>
                {lease.urgency === "ok"
                  ? "on track"
                  : lease.urgency.replace("_", " ")}
              </Badge>
              <Badge tone="neutral">{lease.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {lease.propertyName}
              {lease.legalEntityName ? ` · ${lease.legalEntityName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-lg font-semibold">
              {formatCurrency(lease.monthlyRent)}
              <span className="text-sm font-normal text-[var(--muted)]">
                /mo
              </span>
            </p>
            <Button size="sm" variant="secondary" onClick={onEdit}>
              Edit
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Term start" value={lease.startDate} />
          <Meta
            label="Renewal"
            value={lease.renewalDate ?? lease.endDate ?? "—"}
          />
          <Meta
            label="Notice required"
            value={`${lease.notificationLeadDays} days before`}
          />
          <Meta
            label="Notify by"
            value={
              lease.notifyByDate
                ? `${lease.notifyByDate}${
                    lease.daysToRenewal != null
                      ? ` · ${lease.daysToRenewal}d to renewal`
                      : ""
                  }`
                : "—"
            }
          />
        </div>

        {lease.direction === "landlord" && lease.landlordContact && (
          <p className="text-sm text-[var(--muted)]">
            Landlord contact: {lease.landlordContact}
            {lease.landlordEmail ? ` · ${lease.landlordEmail}` : ""}
          </p>
        )}

        {lease.direction === "tenant" && lease.customerId && (
          <Link
            href={`/customers/${lease.customerId}`}
            className="text-sm font-medium text-[var(--accent-ink)] hover:underline"
          >
            Open customer →
          </Link>
        )}

        {lease.notes && (
          <p className="text-sm text-[var(--muted)]">{lease.notes}</p>
        )}
      </CardBody>
    </Card>
  );
}

function LeaseEditDrawer({
  lease,
  onClose,
  onSaved,
}: {
  lease: LeaseRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [renewalDate, setRenewalDate] = useState(lease.renewalDate ?? "");
  const [endDate, setEndDate] = useState(lease.endDate ?? "");
  const [startDate, setStartDate] = useState(lease.startDate);
  const [leadDays, setLeadDays] = useState(String(lease.notificationLeadDays));
  const [rent, setRent] = useState(String(lease.monthlyRent));
  const [status, setStatus] = useState(lease.status);
  const [notes, setNotes] = useState(lease.notes ?? "");
  const [landlordName, setLandlordName] = useState(lease.landlordName ?? "");
  const [landlordContact, setLandlordContact] = useState(
    lease.landlordContact ?? "",
  );
  const [landlordEmail, setLandlordEmail] = useState(
    lease.landlordEmail ?? "",
  );

  const save = useMutation({
    mutationFn: () =>
      endpoints.patchLease(lease.id, {
        startDate,
        endDate: endDate || undefined,
        renewalDate: renewalDate || undefined,
        notificationLeadDays: Number(leadDays),
        monthlyRent: Number(rent),
        status,
        notes,
        ...(lease.direction === "landlord"
          ? { landlordName, landlordContact, landlordEmail }
          : {}),
      }),
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Edit {lease.direction} lease
            </p>
            <h2 className="text-lg font-semibold">{lease.partyName}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <Field label="Start date">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
          <Field label="Renewal date">
            <Input
              type="date"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
            />
          </Field>
          <Field label="Notice lead days">
            <Input
              type="number"
              min={0}
              value={leadDays}
              onChange={(e) => setLeadDays(e.target.value)}
            />
          </Field>
          <Field label="Monthly rent">
            <Input
              type="number"
              min={0}
              value={rent}
              onChange={(e) => setRent(e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as LeaseRecord["status"])
              }
            >
              {(["active", "pending", "expired", "terminated"] as const).map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </Field>
          {lease.direction === "landlord" && (
            <>
              <Field label="Landlord name">
                <Input
                  value={landlordName}
                  onChange={(e) => setLandlordName(e.target.value)}
                />
              </Field>
              <Field label="Landlord contact">
                <Input
                  value={landlordContact}
                  onChange={(e) => setLandlordContact(e.target.value)}
                />
              </Field>
              <Field label="Landlord email">
                <Input
                  type="email"
                  value={landlordEmail}
                  onChange={(e) => setLandlordEmail(e.target.value)}
                />
              </Field>
            </>
          )}
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <div className="border-t border-[var(--border)] p-5">
          <Button
            className="w-full"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : "Save lease"}
          </Button>
          {save.isError && (
            <p className="mt-2 text-sm text-rose-600">Could not save lease.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <StaggerItem>
      <Card className="p-4" interactive={false}>
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
          {label}
        </p>
        <p
          className={cn(
            "mt-2 text-2xl font-semibold",
            danger && "text-rose-600",
          )}
        >
          {value}
        </p>
      </Card>
    </StaggerItem>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

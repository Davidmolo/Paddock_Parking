"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { endpoints, type LeaseRecord, type LeaseStage } from "@/lib/api";
import {
  LEASE_STAGES,
  leaseDirectionLabel,
  leaseStageLabel,
} from "@/lib/lease-stages";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem, usePresence } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";
import { yardTitle } from "@/components/lots/blank-yard";
import { blankLease, filledLease, type AddedYard } from "@/components/lots/types";
import { text } from "@/constants/text";

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
  const [editingYard, setEditingYard] = useState<AddedYard | null>(null);
  const leaseHold = useRef(editing);
  if (editing) leaseHold.current = editing;
  const editOn = usePresence(Boolean(editing), 180);
  const leaseShown = editing ?? leaseHold.current;

  const { data: summary, isPending: summaryPending } = useQuery({
    queryKey: queryKeys.leaseSummary(propertyId),
    queryFn: () => endpoints.leaseSummary(propertyParam(propertyId)),
  });

  const { data: leases, isPending } = useQuery({
    queryKey: queryKeys.leases(propertyId),
    queryFn: () =>
      endpoints.leases({ propertyId: propertyParam(propertyId) }),
  });
  const { data: yards = [] } = useQuery({
    queryKey: queryKeys.yards(),
    queryFn: () => endpoints.yards(),
  });
  const yardLeases = yards.filter(
    (yard) => yard.leaseName || Object.values(yard.lease ?? {}).some((line) => line.trim()),
  );

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
          <Stat label="Landlord leases" value={String(summary.landlord + yardLeases.length)} />
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

      <Segmented
        className="mb-5"
        ariaLabel="Lease list"
        value={tab}
        onChange={setTab}
        options={[
          { value: "renewals", label: "Renewals due", count: summary?.renewalsDue },
          { value: "tenant", label: "Tenant", count: summary?.tenant },
          { value: "landlord", label: "Landlord", count: (summary?.landlord ?? 0) + yardLeases.length },
          { value: "all", label: "All leases", count: (summary?.total ?? 0) + yardLeases.length },
        ]}
      />

      {isPending && !leases ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : visible.length === 0 && (tab === "tenant" || tab === "renewals" || yardLeases.length === 0) ? (
        <Card interactive={false} className="p-10 text-center">
          <p className="text-[var(--muted)]">
            {tab === "renewals"
              ? "No leases inside a notice window right now."
              : "No leases in this filter."}
          </p>
        </Card>
      ) : (
        <Stagger className="grid gap-3">
          {(tab === "landlord" || tab === "all") &&
            yardLeases.map((yard) => (
              <StaggerItem key={yard.id}>
                <YardLeaseCard yard={yard} onEdit={() => setEditingYard(yard)} />
              </StaggerItem>
            ))}
          {visible.map((lease) => (
            <StaggerItem key={lease.id}>
              <LeaseCard lease={lease} onEdit={() => setEditing(lease)} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {editingYard ? (
        <YardLeaseEdit
          yard={editingYard}
          onClose={() => setEditingYard(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.yards() });
            setEditingYard(null);
          }}
        />
      ) : null}

      {editOn.mounted && leaseShown && (
        <LeaseEditDrawer
          lease={leaseShown}
          leaving={editOn.leaving}
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

function yardStanding(lease: AddedYard["lease"]) {
  const full = lease ? filledLease({ ...blankLease(), ...lease }) : undefined;
  const start = full?.start ? new Date(full.start) : null;
  const end = full?.end ? new Date(full.end) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lead = Number(full?.notice || 0);
  if (!start || Number.isNaN(+start) || !end || Number.isNaN(+end) || today < start) {
    return today < (start ?? today) ? "pending" : "active";
  }
  if (today > end) return "expired";
  if (lead > 0) {
    const notify = new Date(end);
    notify.setDate(notify.getDate() - lead);
    if (today >= notify) return "due";
  }
  return "active";
}

const yardFacts = ["start", "end", "term", "deposit", "increaseDate", "increaseAmount", "extensions"] as const;

function YardLeaseCard({ yard, onEdit }: { yard: AddedYard; onEdit: () => void }) {
  const lease = yard.lease ? filledLease({ ...blankLease(), ...yard.lease }) : undefined;
  const standing = yardStanding(lease);
  const notice =
    lease?.notice === "30" || lease?.notice === "90" || lease?.notice === "180"
      ? text.blankYard.leaseField.noticeChoice[lease.notice]
      : "";
  const reach = [lease?.contact, lease?.phone, lease?.email].filter(Boolean).join(" · ");
  const facts = [
    ...yardFacts.flatMap((key) => (lease?.[key] ? [[text.blankYard.leaseField[key], lease[key]] as const] : [])),
    ...(notice ? [[text.blankYard.leaseField.notice, notice] as const] : []),
  ];
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{lease?.landlord || yardTitle(yard.name)}</p>
              <Badge tone="accent">Landlord</Badge>
              <Badge tone={standing === "due" || standing === "expired" ? "warning" : "neutral"}>
                {standing === "due" ? "due" : standing === "expired" ? "expired" : standing === "pending" ? "pending" : "active"}
              </Badge>
              {standing === "active" ? <Badge tone="neutral">on track</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {yard.name}
              {yard.leaseFile ? (
                <>
                  {" · "}
                  <a href={yard.leaseFile} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent-ink)] underline-offset-2 hover:underline">
                    {yard.leaseName || text.blankYard.openLease}
                  </a>
                </>
              ) : yard.leaseName ? (
                ` · ${yard.leaseName}`
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lease?.baseRent ? (
              <p className="text-lg font-semibold">
                {formatCurrency(Number(lease.baseRent.replace(/[^0-9.]/g, "")))}
                <span className="text-sm font-normal text-[var(--muted)]">/mo</span>
              </p>
            ) : null}
            <Button size="sm" variant="secondary" onClick={onEdit}>
              {text.blankYard.edit}
            </Button>
          </div>
        </div>
        {standing === "active" ? <p className="text-sm text-[var(--muted)]">{text.blankYard.leaseCurrent}</p> : null}
        {reach ? <p className="text-sm text-[var(--muted)]">{reach}</p> : null}
        {facts.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map(([label, value]) => (
              <Meta key={label} label={label} value={value} />
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function YardLeaseEdit({
  yard,
  onClose,
  onSaved,
}: {
  yard: AddedYard;
  onClose: () => void;
  onSaved: () => void;
}) {
  const lease = filledLease({ ...blankLease(), ...yard.lease });
  const [draft, setDraft] = useState(lease);
  const save = useMutation({
    mutationFn: () => endpoints.saveYard({ ...yard, lease: draft }),
    onSuccess: onSaved,
  });
  const fields = ["contact", "phone", "email", "baseRent", "deposit", "term", "start", "end", "increaseDate", "increaseAmount", "extensions"] as const;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 fade-in">
      <div className="flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl drawer-in">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{text.blankYard.edit}</p>
            <h2 className="text-lg font-semibold">{draft.landlord || yardTitle(yard.name)}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {fields.map((key) => (
            <Field key={key} label={text.blankYard.leaseField[key]}>
              <Input value={draft[key]} onChange={(e) => setDraft((current) => ({ ...current, [key]: e.target.value }))} />
            </Field>
          ))}
          <Field label={text.blankYard.leaseField.notice}>
            <SelectMenu
              ariaLabel={text.blankYard.leaseField.notice}
              value={draft.notice}
              placeholder={text.blankYard.leaseField.noticeUnset}
              onChange={(value) => setDraft((current) => ({ ...current, notice: value }))}
              options={(["30", "90", "180"] as const).map((days) => ({
                value: days,
                label: text.blankYard.leaseField.noticeChoice[days],
              }))}
            />
          </Field>
        </div>
        <div className="border-t border-[var(--border)] p-5">
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save lease"}
          </Button>
        </div>
      </div>
    </div>
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
                {leaseDirectionLabel(lease.direction)}
              </Badge>
              <Badge tone={urgencyTone[lease.urgency]}>
                {lease.urgency === "ok"
                  ? "on track"
                  : lease.urgency.replace("_", " ")}
              </Badge>
              <Badge tone="neutral">{lease.status}</Badge>
              <Badge tone="accent">{leaseStageLabel(lease.stage)}</Badge>
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
          {lease.startDate ? <Meta label="Term start" value={lease.startDate} /> : null}
          {lease.renewalDate || lease.endDate ? (
            <Meta label="Renewal" value={lease.renewalDate ?? lease.endDate ?? ""} />
          ) : null}
          {lease.notificationLeadDays ? (
            <Meta label="Notice required" value={`${lease.notificationLeadDays} days before`} />
          ) : null}
          {lease.notifyByDate ? (
            <Meta
              label="Notify by"
              value={`${lease.notifyByDate}${lease.daysToRenewal != null ? ` · ${lease.daysToRenewal}d to renewal` : ""}`}
            />
          ) : null}
        </div>

        {lease.direction === "landlord" && (lease.landlordContact || lease.landlordEmail) ? (
          <p className="text-sm text-[var(--muted)]">
            {[lease.landlordContact, lease.landlordEmail].filter(Boolean).join(" · ")}
          </p>
        ) : null}

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
  leaving,
  onClose,
  onSaved,
}: {
  lease: LeaseRecord;
  leaving?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [renewalDate, setRenewalDate] = useState(lease.renewalDate ?? "");
  const [endDate, setEndDate] = useState(lease.endDate ?? "");
  const [startDate, setStartDate] = useState(lease.startDate);
  const [leadDays, setLeadDays] = useState(String(lease.notificationLeadDays));
  const [rent, setRent] = useState(String(lease.monthlyRent));
  const [status, setStatus] = useState(lease.status);
  const [stage, setStage] = useState<LeaseStage>(
    lease.stage ?? "not_contacted",
  );
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
        stage,
        notes,
        ...(lease.direction === "landlord"
          ? { landlordName, landlordContact, landlordEmail }
          : {}),
      }),
    onSuccess: onSaved,
  });

  return (
    <div className={cn("fixed inset-0 z-50 flex justify-end bg-black/30", leaving ? "fade-out" : "fade-in")}>
      <div className={cn("flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl", leaving ? "drawer-out pointer-events-none" : "drawer-in")}>
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
          <Field label="Renewal status">
            <SelectMenu
              ariaLabel="Renewal status"
              value={stage}
              onChange={(next) => setStage(next as LeaseStage)}
              size="lg"
              options={LEASE_STAGES.map((item) => ({
                value: item.value,
                label: item.label,
              }))}
            />
          </Field>
          <Field label="Status">
            <SelectMenu
              ariaLabel="Lease status"
              value={status}
              onChange={(next) =>
                setStatus(next as LeaseRecord["status"])
              }
              size="lg"
              options={(
                ["active", "pending", "expired", "terminated"] as const
              ).map((item) => ({
                value: item,
                label: item,
              }))}
            />
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

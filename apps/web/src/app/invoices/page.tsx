"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import {
  endpoints,
  type Invoice,
  type InvoiceCollectionMethod,
} from "@/lib/api";
import { propertyParam } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

type MethodFilter = InvoiceCollectionMethod | "all";
type StatusFilter = Invoice["status"] | "all";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "partial", label: "Partial" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
];

const statusTone = {
  paid: "success",
  open: "info",
  overdue: "danger",
  partial: "warning",
} as const;

function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function methodShort(method?: InvoiceCollectionMethod) {
  if (method === "ach_debit") return "ACH debit";
  if (method === "send_invoice") return "Invoice";
  return "—";
}

export default function InvoicesPage() {
  const { propertyId, properties } = useApp();
  const [method, setMethod] = useState<MethodFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const { data, isPending } = useQuery({
    queryKey: ["invoices", propertyId],
    queryFn: () =>
      endpoints.invoices({
        propertyId: propertyParam(propertyId),
      }),
  });

  const summary = useMemo(() => {
    const rows = data ?? [];
    const unpaid = rows.filter((i) => i.status !== "paid");
    const ach = unpaid.filter((i) => i.collectionMethod === "ach_debit");
    const inv = unpaid.filter((i) => i.collectionMethod === "send_invoice");
    const overdue = unpaid.filter((i) => i.status === "overdue");
    return {
      achDue: ach.reduce((s, i) => s + (i.balance ?? i.amount), 0),
      achCount: ach.length,
      invoiceDue: inv.reduce((s, i) => s + (i.balance ?? i.amount), 0),
      invoiceCount: inv.length,
      overdueDue: overdue.reduce((s, i) => s + (i.balance ?? i.amount), 0),
      overdueCount: overdue.length,
    };
  }, [data]);

  const rows = useMemo(() => {
    let list = data ?? [];
    if (method !== "all") {
      list = list.filter((i) => i.collectionMethod === method);
    }
    if (status !== "all") {
      list = list.filter((i) => i.status === status);
    }
    return list;
  }, [data, method, status]);

  return (
    <PageTransition>
      <PageHeader
        title="Invoices"
        subtitle="Monthly rent by collection path — ACH debit first, send invoice when ACH is not authorized."
        action={
          <Link href="/collections" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto">
              Open collections
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      {isPending && !data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-11 w-full max-w-md" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <Stagger className="mb-6 grid gap-3 sm:grid-cols-3">
            <StaggerItem>
              <SummaryTile
                label="ACH debit"
                value={formatCurrency(summary.achDue)}
                meta={`${summary.achCount} open`}
                hint="Auto-pull when due"
                active={method === "ach_debit"}
                onClick={() =>
                  setMethod((m) => (m === "ach_debit" ? "all" : "ach_debit"))
                }
              />
            </StaggerItem>
            <StaggerItem>
              <SummaryTile
                label="Send invoice"
                value={formatCurrency(summary.invoiceDue)}
                meta={`${summary.invoiceCount} open`}
                hint="No ACH on file"
                active={method === "send_invoice"}
                onClick={() =>
                  setMethod((m) =>
                    m === "send_invoice" ? "all" : "send_invoice",
                  )
                }
              />
            </StaggerItem>
            <StaggerItem>
              <SummaryTile
                label="Overdue"
                value={formatCurrency(summary.overdueDue)}
                meta={`${summary.overdueCount} account${summary.overdueCount === 1 ? "" : "s"}`}
                hint="Failed pull or unpaid"
                danger
                active={status === "overdue"}
                onClick={() => {
                  setStatus((s) => (s === "overdue" ? "all" : "overdue"));
                  setMethod("all");
                }}
              />
            </StaggerItem>
          </Stagger>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="inline-flex w-fit rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
              role="tablist"
              aria-label="Collection method"
            >
              {(
                [
                  { value: "all", label: "All" },
                  { value: "ach_debit", label: "ACH" },
                  { value: "send_invoice", label: "Invoice" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={method === opt.value}
                  onClick={() => setMethod(opt.value)}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
                    method === opt.value
                      ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="invoice-status" className="sr-only">
                Status
              </label>
              <select
                id="invoice-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="hidden text-sm text-[var(--muted)] sm:block">
                {rows.length} shown
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <Card interactive={false} className="p-12 text-center">
              <p className="font-medium text-[var(--ink)]">No matching charges</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Try another collection method or status.
              </p>
              {(method !== "all" || status !== "all") && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setMethod("all");
                    setStatus("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </Card>
          ) : (
            <>
              <Stagger className="grid gap-3 md:hidden">
                {rows.map((invoice) => (
                  <StaggerItem key={invoice.id}>
                    <InvoiceMobileCard
                      invoice={invoice}
                      yardName={
                        properties.find((p) => p.id === invoice.propertyId)
                          ?.name
                      }
                    />
                  </StaggerItem>
                ))}
              </Stagger>

              <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] md:block">
                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7.5rem_6.5rem_6.5rem_5.5rem] gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  <div>Customer</div>
                  <div>Yard</div>
                  <div>Collection</div>
                  <div>Due</div>
                  <div className="text-right">Amount</div>
                  <div className="text-right">Status</div>
                </div>
                <Stagger>
                  {rows.map((invoice) => {
                    const yard = properties.find(
                      (p) => p.id === invoice.propertyId,
                    );
                    return (
                      <StaggerItem key={invoice.id}>
                        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7.5rem_6.5rem_6.5rem_5.5rem] items-center gap-3 border-b border-[var(--border)] px-5 py-3.5 last:border-b-0 transition hover:bg-[var(--surface-muted)]/50">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--ink)]">
                              {invoice.customerName ?? "—"}
                            </p>
                            <p className="truncate text-xs text-[var(--muted)]">
                              {invoice.id}
                            </p>
                          </div>
                          <p className="truncate text-sm text-[var(--ink)]">
                            {yard?.name ?? "—"}
                          </p>
                          <p className="text-sm text-[var(--muted)]">
                            {methodShort(invoice.collectionMethod)}
                          </p>
                          <p className="text-sm tabular-nums text-[var(--muted)]">
                            {formatDate(invoice.dueDate)}
                          </p>
                          <p className="text-right text-sm font-semibold tabular-nums">
                            {formatCurrency(invoice.amount)}
                          </p>
                          <div className="flex justify-end">
                            <Badge tone={statusTone[invoice.status]}>
                              {invoice.status}
                            </Badge>
                          </div>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </Stagger>
              </div>
            </>
          )}
        </>
      )}
    </PageTransition>
  );
}

function SummaryTile({
  label,
  value,
  meta,
  hint,
  danger,
  active,
  onClick,
}: {
  label: string;
  value: string;
  meta: string;
  hint: string;
  danger?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border bg-[var(--surface)] p-4 text-left transition",
        active
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20"
          : "border-[var(--border)] hover:border-[var(--accent)]/50",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight tabular-nums",
          danger && "text-[var(--danger)]",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        <span className="text-[var(--ink)]">{meta}</span>
        <span className="mx-1.5 text-[var(--border)]">·</span>
        {hint}
      </p>
    </button>
  );
}

function InvoiceMobileCard({
  invoice,
  yardName,
}: {
  invoice: Invoice;
  yardName?: string;
}) {
  return (
    <Card interactive={false}>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {invoice.customerName ?? invoice.id}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
              {yardName ?? "—"} · {invoice.id}
            </p>
          </div>
          <Badge tone={statusTone[invoice.status]}>{invoice.status}</Badge>
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-[var(--border)] pt-3">
          <div>
            <p className="text-xs text-[var(--muted)]">
              {methodShort(invoice.collectionMethod)}
            </p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              Due {formatDate(invoice.dueDate)}
            </p>
          </div>
          <p className="text-lg font-semibold tabular-nums">
            {formatCurrency(invoice.amount)}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

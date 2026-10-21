"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints, type Invoice } from "@/lib/api";
import { propertyParam } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

const STATUSES: Array<Invoice["status"] | "all"> = [
  "all",
  "open",
  "partial",
  "overdue",
  "paid",
];

const tone = {
  paid: "success",
  open: "info",
  overdue: "danger",
  partial: "warning",
} as const;

export default function InvoicesPage() {
  const { propertyId, properties } = useApp();
  const [status, setStatus] = useState<Invoice["status"] | "all">("all");

  const { data, isPending } = useQuery({
    queryKey: ["invoices", propertyId, status],
    queryFn: () =>
      endpoints.invoices({
        propertyId: propertyParam(propertyId),
        status: status === "all" ? undefined : status,
      }),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Invoices"
        subtitle="Billing ledger with open, partial, and overdue balances."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-xl border px-3.5 py-2 text-sm font-medium capitalize transition",
              status === s
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]",
            )}
          >
            {s === "all" ? "All statuses" : s}
          </button>
        ))}
      </div>

      {isPending && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card interactive={false} className="p-10 text-center">
          <p className="text-[var(--muted)]">No invoices for this filter.</p>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <Stagger className="grid gap-3 md:hidden">
            {data.map((invoice) => {
              const yard = properties.find((p) => p.id === invoice.propertyId);
              return (
                <StaggerItem key={invoice.id}>
                  <Card>
                    <CardBody className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{invoice.id}</p>
                          <p className="text-xs text-[var(--muted)]">
                            {yard?.name}
                          </p>
                        </div>
                        <Badge tone={tone[invoice.status]}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--muted)]">
                          Due {invoice.dueDate}
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(invoice.amount)}
                        </span>
                      </div>
                    </CardBody>
                  </Card>
                </StaggerItem>
              );
            })}
          </Stagger>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] md:block">
            <div className="grid grid-cols-5 gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              <div>Invoice</div>
              <div>Yard</div>
              <div>Due</div>
              <div>Amount</div>
              <div>Status</div>
            </div>
            <Stagger>
              {data.map((invoice) => {
                const yard = properties.find(
                  (p) => p.id === invoice.propertyId,
                );
                return (
                  <StaggerItem key={invoice.id}>
                    <div className="grid grid-cols-5 items-center gap-3 border-b border-[var(--border)] px-4 py-4 last:border-b-0 transition hover:bg-[var(--surface-muted)]/60">
                      <div>
                        <p className="font-semibold">{invoice.id}</p>
                        <p className="text-xs text-[var(--muted)]">
                          Issued {invoice.issuedAt}
                        </p>
                      </div>
                      <p className="text-sm">{yard?.name ?? "—"}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {invoice.dueDate}
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(invoice.amount)}
                      </p>
                      <div>
                        <Badge tone={tone[invoice.status]}>
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
    </PageTransition>
  );
}

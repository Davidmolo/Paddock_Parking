"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { endpoints } from "@/lib/api";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

const paymentTone = {
  current: "success",
  past_due: "danger",
  notice: "warning",
} as const;

const coiTone = {
  valid: "success",
  expiring: "warning",
  expired: "danger",
  mismatch: "danger",
  missing: "danger",
} as const;

export default function CustomersPage() {
  const { propertyId, properties } = useApp();
  const [q, setQ] = useState("");
  const { data, isPending } = useQuery({
    queryKey: queryKeys.customers(propertyId, q),
    queryFn: () =>
      endpoints.customers({
        propertyId: propertyParam(propertyId),
        q: q || undefined,
      }),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Customers"
        subtitle="Tenants with leases, lot assignments, balances, and documents."
      />

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          className="pl-10"
          placeholder="Search company, contact, email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isPending && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card interactive={false} className="p-10 text-center">
          <p className="text-[var(--muted)]">No customers match your search.</p>
        </Card>
      ) : (
        <>
          <Stagger className="grid gap-3 md:hidden">
            {data.map((customer) => {
              const yard = properties.find((p) => p.id === customer.propertyId);
              return (
                <StaggerItem key={customer.id}>
                  <Link href={`/customers/${customer.id}`}>
                    <Card>
                      <CardBody className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{customer.name}</p>
                            <p className="text-sm text-[var(--muted)]">
                              {customer.contactName}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge tone={paymentTone[customer.paymentStatus]}>
                              {customer.paymentStatus.replace("_", " ")}
                            </Badge>
                            <Badge
                              tone={
                                coiTone[customer.coiStatus ?? "missing"]
                              }
                            >
                              COI {customer.coiStatus ?? "missing"}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                              Yard
                            </p>
                            <p className="mt-0.5 font-medium">
                              {yard?.name ?? "—"}
                            </p>
                          </div>
                          <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                              Balance
                            </p>
                            <p
                              className={`mt-0.5 font-medium ${
                                customer.balanceDue > 0 ? "text-rose-600" : ""
                              }`}
                            >
                              {formatCurrency(customer.balanceDue)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          Lots: {customer.lotNumbers.join(", ") || "Unassigned"}
                        </p>
                      </CardBody>
                    </Card>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>

          <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] md:block">
            <div className="grid grid-cols-12 gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              <div className="col-span-3">Customer</div>
              <div className="col-span-2">Yard</div>
              <div className="col-span-1">Lots</div>
              <div className="col-span-2">Balance</div>
              <div className="col-span-2">COI</div>
              <div className="col-span-2">Status</div>
            </div>
            <Stagger>
              {data.map((customer) => {
                const yard = properties.find(
                  (p) => p.id === customer.propertyId,
                );
                return (
                  <StaggerItem key={customer.id}>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="block transition hover:bg-[var(--surface-muted)]/60"
                    >
                      <div className="grid grid-cols-12 items-center gap-3 border-b border-[var(--border)] px-4 py-4 last:border-b-0">
                        <div className="col-span-3">
                          <p className="font-semibold">{customer.name}</p>
                          <p className="text-sm text-[var(--muted)]">
                            {customer.contactName} · {customer.email}
                          </p>
                        </div>
                        <div className="col-span-2 text-sm">
                          {yard?.name ?? "—"}
                        </div>
                        <div className="col-span-1 text-sm">
                          {customer.lotNumbers.join(", ") || "—"}
                        </div>
                        <div
                          className={`col-span-2 font-semibold ${
                            customer.balanceDue > 0 ? "text-rose-600" : ""
                          }`}
                        >
                          {formatCurrency(customer.balanceDue)}
                        </div>
                        <div className="col-span-2">
                          <Badge
                            tone={coiTone[customer.coiStatus ?? "missing"]}
                          >
                            {customer.coiStatus ?? "missing"}
                          </Badge>
                        </div>
                        <div className="col-span-2">
                          <Badge tone={paymentTone[customer.paymentStatus]}>
                            {customer.paymentStatus.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </Link>
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

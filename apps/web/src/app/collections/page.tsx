"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import { endpoints, type CollectionAccount } from "@/lib/api";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

const QUEUES: { key: CollectionAccount["queue"]; label: string }[] = [
  { key: "need_email", label: "Need email" },
  { key: "need_text", label: "Need text" },
  { key: "owner_call", label: "Owner call" },
  { key: "promised", label: "Promised" },
  { key: "dispute", label: "Dispute / plan" },
  { key: "notice", label: "Notice approval" },
  { key: "in_cure", label: "In cure" },
  { key: "lockout", label: "Lockout approval" },
];

export default function CollectionsPage() {
  const { propertyId } = useApp();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "outreach" | "approvals">("all");
  const [selectedYard, setSelectedYard] = useState<string | "all">("all");
  const [flash, setFlash] = useState("");

  const cacheProperty =
    selectedYard !== "all" ? selectedYard : propertyId;

  const { data, isPending, refetch, isFetching } = useQuery({
    queryKey: queryKeys.collections(cacheProperty),
    queryFn: () =>
      endpoints.collections({
        propertyId: propertyParam(cacheProperty),
      }),
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["collections"] });
  }

  const patch = useMutation({
    mutationFn: (args: {
      id: string;
      body: {
        queue?: CollectionAccount["queue"];
        nextAction?: string;
        logCall?: boolean;
        logEmail?: boolean;
      };
    }) => endpoints.patchCollection(args.id, args.body),
    onSuccess: invalidate,
  });

  const sendEmails = useMutation({
    mutationFn: () =>
      endpoints.sendCollectionEmailsDue(propertyParam(cacheProperty)),
    onSuccess: (res) => {
      setFlash(
        res.sent === 0
          ? "No accounts in Need email."
          : `Logged email on ${res.sent} account${res.sent === 1 ? "" : "s"} → Need text.`,
      );
      invalidate();
    },
  });

  const visibleQueues = useMemo(() => {
    if (tab === "outreach") {
      return QUEUES.filter((q) =>
        ["need_email", "need_text", "owner_call", "promised"].includes(q.key),
      );
    }
    if (tab === "approvals") {
      return QUEUES.filter((q) =>
        ["notice", "in_cure", "lockout", "dispute"].includes(q.key),
      );
    }
    return QUEUES;
  }, [tab]);

  return (
    <PageTransition>
      <PageHeader
        title="Collections"
        subtitle="Work overdue balances by yard with outreach and approval queues."
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={sendEmails.isPending}
              onClick={() => {
                setFlash("");
                sendEmails.mutate();
              }}
            >
              {sendEmails.isPending ? "Sending…" : "Send emails due"}
            </Button>
            <Button
              size="sm"
              disabled={isFetching}
              onClick={() => {
                setFlash("");
                void refetch();
              }}
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        }
      />

      {flash && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {flash}
        </p>
      )}

      {isPending && !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-10 w-72" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-72 shrink-0" />
            ))}
          </div>
        </div>
      ) : data ? (
        <>
          <Stagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StaggerItem>
              <YardChip
                active={selectedYard === "all"}
                label="All yards"
                balance={data.yards.reduce((s, y) => s + y.balance, 0)}
                meta={`${data.yards.reduce((s, y) => s + y.invoiceCount, 0)} invoices · Company overview`}
                onClick={() => setSelectedYard("all")}
              />
            </StaggerItem>
            {data.yards.map((yard) => (
              <StaggerItem key={yard.propertyId}>
                <YardChip
                  active={selectedYard === yard.propertyId}
                  label={yard.name}
                  balance={yard.balance}
                  meta={`${yard.invoiceCount} invoices · ${yard.address}`}
                  onClick={() => setSelectedYard(yard.propertyId)}
                />
              </StaggerItem>
            ))}
          </Stagger>

          <Stagger className="mt-5 grid gap-3 sm:grid-cols-3">
            <StaggerItem>
              <Card interactive={false} className="p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  At risk
                </p>
                <p className="mt-2 text-2xl font-semibold text-rose-600">
                  {formatCurrency(data.totals.atRisk)}
                </p>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card interactive={false} className="p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Accounts
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {data.totals.accounts}
                </p>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card interactive={false} className="p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Emails pending
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {data.totals.emails}
                </p>
              </Card>
            </StaggerItem>
          </Stagger>

          <div className="mt-5 inline-flex rounded-2xl bg-[var(--surface-muted)] p-1">
            {(
              [
                ["all", "All queues"],
                ["outreach", "Outreach"],
                ["approvals", "Approvals"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition",
                  tab === key
                    ? "bg-[var(--surface-elevated)] text-[var(--ink)] shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--ink)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex gap-4 overflow-x-auto pb-4">
            {visibleQueues.map((queue) => {
              const cards = data.accounts.filter((a) => a.queue === queue.key);
              return (
                <div
                  key={queue.key}
                  className="w-72 shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-ink)]">
                      {queue.label}
                    </h3>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--surface-muted)] text-xs font-semibold">
                      {cards.length}
                    </span>
                  </div>
                  <div className="space-y-3 p-3">
                    {cards.length === 0 && (
                      <p className="py-8 text-center text-sm text-[var(--muted)]">
                        Empty
                      </p>
                    )}
                    {cards.map((account) => (
                      <Card key={account.id} className="!shadow-none">
                        <CardBody className="space-y-2 !p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold leading-snug">
                              {account.customerName}
                            </p>
                            <p className="text-sm font-semibold text-rose-600">
                              {formatCurrency(account.balance)}
                            </p>
                          </div>
                          <p className="text-xs text-[var(--muted)]">
                            {account.daysOverdue}d overdue ·{" "}
                            {account.invoiceCount} inv
                          </p>
                          <p className="text-xs text-[var(--accent-ink)]">
                            Next: {account.nextAction}
                          </p>
                          <label className="block space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                              Move queue
                            </span>
                            <select
                              className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 text-xs"
                              value={account.queue}
                              disabled={patch.isPending}
                              onChange={(e) =>
                                patch.mutate({
                                  id: account.id,
                                  body: {
                                    queue: e.target
                                      .value as CollectionAccount["queue"],
                                  },
                                })
                              }
                            >
                              {QUEUES.map((q) => (
                                <option key={q.key} value={q.key}>
                                  {q.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <Badge tone="neutral">
                              E {account.emails} · T {account.texts} · C{" "}
                              {account.calls}
                            </Badge>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={patch.isPending}
                              onClick={() =>
                                patch.mutate({
                                  id: account.id,
                                  body: { logCall: true },
                                })
                              }
                            >
                              <Phone className="h-3.5 w-3.5" />
                              Log call
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </PageTransition>
  );
}

function YardChip({
  label,
  balance,
  meta,
  active,
  onClick,
}: {
  label: string;
  balance: number;
  meta: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card
        className={cn(
          "p-4",
          active &&
            "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--canvas)]",
        )}
      >
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
          {label}
        </p>
        <p
          className={cn(
            "mt-2 text-2xl font-semibold",
            balance > 0 ? "text-rose-600" : "text-[var(--ink)]",
          )}
        >
          {formatCurrency(balance)}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">{meta}</p>
      </Card>
    </button>
  );
}

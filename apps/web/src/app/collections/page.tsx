"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, RefreshCw } from "lucide-react";
import {
  endpoints,
  type AgingBucketKey,
  type CollectionAccount,
  type CollectionStage,
} from "@/lib/api";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

const STAGES: { key: CollectionStage; label: string }[] = [
  { key: "communicated", label: "Communicated" },
  { key: "waiting", label: "Waiting" },
  { key: "waiting_payment", label: "Waiting for payment" },
  { key: "payment_made", label: "Payment made" },
];

const BUCKET_HINT: Record<AgingBucketKey, string> = {
  current: "Not late yet — due today or in the future",
  "1_15": "1–15 days past due",
  "16_30": "16–30 days past due",
  "31_60": "31–60 days past due",
  "60_plus": "More than 60 days past due",
};

function formatDueDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAsOf(iso: string) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CollectionsPage() {
  const { propertyId } = useApp();
  const queryClient = useQueryClient();
  const [selectedYard, setSelectedYard] = useState<string | "all">("all");
  const [flash, setFlash] = useState("");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

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
        stage?: CollectionStage;
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
          ? "No accounts waiting on first email."
          : `Logged email on ${res.sent} account${res.sent === 1 ? "" : "s"} → Communicated.`,
      );
      invalidate();
    },
  });

  const yardOptions = useMemo(() => {
    if (!data) return [];
    return [
      {
        id: "all" as const,
        name: "All yards",
        balance: data.yards.reduce((s, y) => s + y.balance, 0),
        count: data.totals.accounts,
      },
      ...data.yards.map((y) => ({
        id: y.propertyId,
        name: y.name,
        balance: y.balance,
        count: y.invoiceCount,
      })),
    ];
  }, [data]);

  return (
    <PageTransition>
      <PageHeader
        title="Collections"
        subtitle="Open balances grouped by how late they are — same idea as QuickBooks aging, tuned for Paddock yards and outreach."
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
              <RefreshCw
                className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
              />
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        }
      />

      {flash && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {flash}
        </p>
      )}

      {isPending && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-11 w-full max-w-2xl" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      ) : data ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {yardOptions.map((yard) => (
              <button
                key={yard.id}
                type="button"
                onClick={() => setSelectedYard(yard.id)}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-left text-sm transition",
                  selectedYard === yard.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--ink)]",
                )}
              >
                <span className="font-medium">{yard.name}</span>
                <span className="ml-2 tabular-nums text-[var(--ink)]">
                  {formatCurrency(yard.balance)}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <SummaryStat
              label="Open balance"
              value={formatCurrency(data.totals.openBalance)}
            />
            <SummaryStat
              label="Accounts"
              value={String(data.totals.accounts)}
            />
            <SummaryStat
              label="Past 60 days"
              value={formatCurrency(data.totals.atRisk)}
              danger={data.totals.atRisk > 0}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-ink)]">
                  A/R aging
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-[var(--ink)]">
                  Open balances by days overdue
                </h2>
              </div>
              <p className="text-xs text-[var(--muted)]">
                As of {formatAsOf(data.asOf)} · Buckets {data.intervalLabel} ·
                Through {data.throughLabel}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                    <th className="px-4 py-3 font-semibold sm:px-5">Name</th>
                    <th className="px-3 py-3 font-semibold">Yard</th>
                    <th className="px-3 py-3 font-semibold">Due date</th>
                    <th className="px-3 py-3 text-right font-semibold">Aging</th>
                    <th className="px-3 py-3 text-right font-semibold">
                      Open balance
                    </th>
                    <th className="px-3 py-3 font-semibold">Stage</th>
                    <th className="px-3 py-3 font-semibold">Follow-up note</th>
                    <th className="px-4 py-3 font-semibold sm:px-5">Outreach</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sections.map((section) => (
                    <AgingSection
                      key={section.key}
                      bucketKey={section.key}
                      label={section.label}
                      totalLabel={section.totalLabel}
                      balance={section.balance}
                      accounts={section.accounts}
                      editingNotes={editingNotes}
                      setEditingNotes={setEditingNotes}
                      patchPending={patch.isPending}
                      onStage={(id, stage) =>
                        patch.mutate({ id, body: { stage } })
                      }
                      onNotes={(id, nextAction) => {
                        patch.mutate({ id, body: { nextAction } });
                        setEditingNotes(null);
                      }}
                      onLogCall={(id) =>
                        patch.mutate({ id, body: { logCall: true } })
                      }
                    />
                  ))}
                  <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-muted)] font-semibold">
                    <td colSpan={4} className="px-4 py-3.5 sm:px-5">
                      TOTAL
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums">
                      {formatCurrency(data.totals.openBalance)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-[var(--muted)]">
            Aging = days past the invoice due date. Stage is ops outreach status
            (Communicated, Waiting, Waiting for payment, Payment made) — not the
            old email/text/lockout board.
          </p>
        </>
      ) : null}
    </PageTransition>
  );
}

function SummaryStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tabular-nums tracking-tight",
          danger ? "text-rose-600" : "text-[var(--ink)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AgingSection({
  bucketKey,
  label,
  totalLabel,
  balance,
  accounts,
  editingNotes,
  setEditingNotes,
  patchPending,
  onStage,
  onNotes,
  onLogCall,
}: {
  bucketKey: AgingBucketKey;
  label: string;
  totalLabel: string;
  balance: number;
  accounts: CollectionAccount[];
  editingNotes: string | null;
  setEditingNotes: (id: string | null) => void;
  patchPending: boolean;
  onStage: (id: string, stage: CollectionStage) => void;
  onNotes: (id: string, notes: string) => void;
  onLogCall: (id: string) => void;
}) {
  return (
    <>
      <tr className="border-y border-[var(--border)] bg-[var(--accent-soft)]/50">
        <td colSpan={8} className="px-4 py-2.5 sm:px-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="font-semibold text-[var(--accent-ink)]">
              {label}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {BUCKET_HINT[bucketKey]}
              {accounts.length === 0 ? " · none" : ""}
            </span>
          </div>
        </td>
      </tr>
      {accounts.map((account) => (
        <tr
          key={account.id}
          className="border-b border-[var(--border)] hover:bg-[var(--surface-muted)]/50"
        >
          <td className="px-4 py-3 align-top font-medium text-[var(--ink)] sm:px-5">
            {account.customerName}
          </td>
          <td className="px-3 py-3 align-top text-[var(--muted)]">
            {account.propertyName ?? "—"}
          </td>
          <td className="whitespace-nowrap px-3 py-3 align-top">
            {formatDueDate(account.dueDate)}
          </td>
          <td className="px-3 py-3 text-right align-top tabular-nums">
            {account.daysOverdue}
          </td>
          <td className="px-3 py-3 text-right align-top font-semibold tabular-nums text-[var(--ink)]">
            {formatCurrency(account.balance)}
          </td>
          <td className="px-3 py-3 align-top">
            <select
              className="h-8 max-w-[11.5rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              value={account.stage}
              disabled={patchPending}
              onChange={(e) =>
                onStage(account.id, e.target.value as CollectionStage)
              }
              aria-label={`Stage for ${account.customerName}`}
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </td>
          <td className="min-w-[9rem] px-3 py-3 align-top">
            {editingNotes === account.id ? (
              <input
                autoFocus
                defaultValue={account.nextAction}
                className="h-8 w-full rounded-lg border border-[var(--border)] px-2 text-xs outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                onBlur={(e) => onNotes(account.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onNotes(account.id, (e.target as HTMLInputElement).value);
                  }
                  if (e.key === "Escape") setEditingNotes(null);
                }}
              />
            ) : (
              <button
                type="button"
                className="max-w-[14rem] truncate text-left text-xs text-[var(--muted)] hover:text-[var(--accent-ink)]"
                title="Click to edit follow-up note"
                onClick={() => setEditingNotes(account.id)}
              >
                {account.nextAction || "Add note…"}
              </button>
            )}
          </td>
          <td className="px-4 py-3 align-top sm:px-5">
            <button
              type="button"
              disabled={patchPending}
              onClick={() => onLogCall(account.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--surface-muted)] disabled:opacity-50"
              title={`Logged — Emails ${account.emails} · Texts ${account.texts} · Calls ${account.calls}`}
            >
              <Phone className="h-3.5 w-3.5 text-[var(--muted)]" />
              Log call
            </button>
          </td>
        </tr>
      ))}
      <tr className="bg-[var(--surface-muted)]/80 text-sm font-semibold">
        <td colSpan={4} className="px-4 py-2.5 text-[var(--muted)] sm:px-5">
          {totalLabel}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--ink)]">
          {formatCurrency(balance)}
        </td>
        <td colSpan={3} />
      </tr>
    </>
  );
}

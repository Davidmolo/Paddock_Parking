"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { text } from "@/constants/text";
import { endpoints } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { formatPortalDate } from "./format";
import { usePortalEmail } from "./portal-email";
import type { PortalInvoicesProps } from "./types";

const statusLabel = {
  paid: text.portal.paid,
  open: text.portal.open,
  overdue: text.portal.overdue,
  partial: text.portal.partial,
} as const;

const statusTone = {
  paid: "success",
  open: "info",
  overdue: "danger",
  partial: "warning",
} as const;

export function PortalInvoices({ home }: PortalInvoicesProps) {
  const email = usePortalEmail();
  const queryClient = useQueryClient();
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const rows = [...home.invoices].sort((a, b) =>
    a.dueDate < b.dueDate ? 1 : -1,
  );
  const selected = rows.find((invoice) => invoice.id === invoiceId);
  const pay = useMutation({
    mutationFn: endpoints.portalPay,
    onSuccess: (next) => {
      queryClient.setQueryData(["portal-home", email], next);
      setInvoiceId("");
      setAmount("");
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="grid gap-4">
    <Card interactive={false}>
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted)]">{text.portal.noInvoices}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <th className="px-4 py-3 font-semibold">{text.portal.invoice}</th>
                  <th className="px-4 py-3 font-semibold">{text.portal.issued}</th>
                  <th className="px-4 py-3 font-semibold">{text.portal.due}</th>
                  <th className="px-4 py-3 text-right font-semibold">{text.portal.amount}</th>
                  <th className="px-4 py-3 text-right font-semibold">{text.portal.balance}</th>
                  <th className="px-4 py-3 font-semibold">{text.portal.method}</th>
                  <th className="px-4 py-3 font-semibold">{text.portal.status}</th>
                  <th className="px-4 py-3 font-semibold">{text.portal.pay}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-semibold text-[var(--ink)]">{invoice.id}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatPortalDate(invoice.issuedAt)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatPortalDate(invoice.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--ink)]">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--ink)]">
                      {formatCurrency(invoice.balance)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {invoice.collectionMethod === "ach_debit"
                        ? text.portal.achDebit
                        : text.portal.sendInvoice}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[invoice.status]}>
                        {statusLabel[invoice.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {invoice.balance > 0 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setInvoiceId(invoice.id);
                            setAmount(String(invoice.balance));
                            setError("");
                          }}
                        >
                          {text.portal.pay}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
    {selected ? (
      <Card interactive={false}>
        <CardHeader>
          <h2 className="text-base font-semibold text-[var(--ink)]">
            {text.portal.payTitle} {selected.id}
          </h2>
        </CardHeader>
        <CardBody className="grid max-w-md gap-3">
          <p className="text-sm text-[var(--muted)]">{text.portal.payHint}</p>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              {text.portal.amount}
            </span>
            <Input
              className="mt-1.5"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <Button
            type="button"
            className="w-fit"
            disabled={pay.isPending || !(Number(amount) > 0)}
            onClick={() =>
              pay.mutate({
                email,
                invoiceId: selected.id,
                amount: Number(amount),
              })
            }
          >
            {pay.isPending ? text.portal.pleaseWait : text.portal.payConfirm}
          </Button>
        </CardBody>
      </Card>
    ) : null}
    </div>
  );
}

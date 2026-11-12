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
import { isValidAbaRouting } from "@/lib/aba-routing";
import { PaymentCardPreview, formatCardNumberInput, formatExpInput } from "@/components/book/payment-card-preview";
import { formatPortalDate } from "./format";
import { usePortalEmail } from "./portal-email";
import type { PortalHome, PortalInvoicesProps, PortalPayFieldProps } from "./types";

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
  const [method, setMethod] = useState<"card" | "ach">(home.payMethod);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<"checking" | "savings">("checking");
  const [cvvFocused, setCvvFocused] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const rows = [...home.invoices].sort((a, b) =>
    a.dueDate < b.dueDate ? 1 : -1,
  );
  const selected = rows.find((invoice) => invoice.id === invoiceId);
  const pay = useMutation({
    mutationFn: endpoints.portalPay,
    onSuccess: (next) => {
      queryClient.setQueryData(["portal-home", email], next.home);
      if (next.result === "declined") {
        setNotice("");
        setError(text.portal.insufficient);
        return;
      }
      setError("");
      setCardName("");
      setCardNumber("");
      setCardExp("");
      setCardCvv("");
      setBillingZip("");
      setRoutingNumber("");
      setAccountNumber("");
      if (next.result === "partial") {
        setAmount(String(next.stillDue));
        setNotice(text.portal.paidPart);
        return;
      }
      setNotice("");
      setInvoiceId("");
      setAmount("");
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="grid gap-4">
    <Card interactive={false}>
      <CardBody className="p-0">
        {home.autoPull ? (
          <p className="border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
            {text.portal.autopullNotice}
          </p>
        ) : null}
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
                  {home.autoPull ? null : (
                    <th className="px-4 py-3 font-semibold">{text.portal.pay}</th>
                  )}
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
                      {collectLabel(home)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[invoice.status]}>
                        {statusLabel[invoice.status]}
                      </Badge>
                    </td>
                    {home.autoPull ? null : (
                      <td className="px-4 py-3">
                        {invoice.balance > 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setInvoiceId(invoice.id);
                              setAmount(String(invoice.balance));
                              setMethod(home.payMethod);
                              setError("");
                              setNotice("");
                            }}
                          >
                            {text.portal.pay}
                          </Button>
                        ) : null}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
    {selected && !home.autoPull ? (
      <Card interactive={false}>
        <CardHeader>
          <h2 className="text-base font-semibold text-[var(--ink)]">
            {text.portal.payTitle} {selected.id}
          </h2>
        </CardHeader>
        <CardBody className="grid gap-4">
          <p className="text-sm text-[var(--muted)]">{text.portal.payHint}</p>
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {notice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            {([
              ["card", text.portal.cardFee],
              ["ach", text.portal.achFee],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                className={`flex-1 rounded-xl border px-3 py-3 text-left text-sm font-bold ${
                  method === id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                    : "border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {method === "card" ? (
            <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
              <PaymentCardPreview
                name={cardName}
                number={cardNumber}
                exp={cardExp}
                cvv={cardCvv}
                showBack={cvvFocused}
                className="mx-auto w-full lg:mx-0"
              />
              <div className="grid gap-3">
                <PayField label={text.portal.nameOnCard} value={cardName} onChange={setCardName} />
                <PayField
                  label={text.portal.cardNumber}
                  value={cardNumber}
                  onChange={(value) => setCardNumber(formatCardNumberInput(value))}
                  inputMode="numeric"
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <PayField
                    label={text.portal.expiration}
                    value={cardExp}
                    onChange={(value) => setCardExp(formatExpInput(value))}
                    inputMode="numeric"
                  />
                  <PayField
                    label={text.portal.cvv}
                    value={cardCvv}
                    onChange={(value) => setCardCvv(value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    onFocus={() => setCvvFocused(true)}
                    onBlur={() => setCvvFocused(false)}
                  />
                  <PayField
                    label={text.portal.billingZip}
                    value={billingZip}
                    onChange={setBillingZip}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <PayField
                label={text.portal.routing}
                value={routingNumber}
                onChange={(value) => setRoutingNumber(value.replace(/\D/g, "").slice(0, 9))}
                inputMode="numeric"
              />
              <PayField
                label={text.portal.accountNumber}
                value={accountNumber}
                onChange={(value) => setAccountNumber(value.replace(/\D/g, "").slice(0, 17))}
                inputMode="numeric"
              />
              <div className="flex gap-2">
                {(["checking", "savings"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAccountType(id)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      accountType === id
                        ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                        : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {id === "checking" ? text.portal.checking : text.portal.savings}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="text-sm text-[var(--muted)]">{text.portal.payLess}</p>
          <label className="block max-w-xs">
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
            onClick={() => {
              const digits = method === "card" ? cardNumber.replace(/\D/g, "") : accountNumber;
              if (method === "card") {
                if (!cardName.trim() || digits.length < 12 || cardExp.length < 4 || cardCvv.length < 3 || !billingZip.trim()) {
                  setError(text.portal.cardIncomplete);
                  return;
                }
              } else if (!isValidAbaRouting(routingNumber) || accountNumber.length < 4) {
                setError(text.portal.bankIncomplete);
                return;
              }
              pay.mutate({
                email,
                invoiceId: selected.id,
                amount: Number(amount),
                method,
                last4: digits.slice(-4),
              });
            }}
          >
            {pay.isPending
              ? text.portal.pleaseWait
              : Number(amount) > 0 && Number(amount) < selected.balance
                ? text.portal.payPart
                : text.portal.payConfirm}
          </Button>
        </CardBody>
      </Card>
    ) : null}
    </div>
  );
}

function collectLabel(home: PortalHome) {
  if (!home.autoPull) return text.portal.sendInvoice;
  return home.payMethod === "card" ? text.portal.cardPull : text.portal.achDebit;
}

function PayField({ label, value, onChange, inputMode, onFocus, onBlur }: PortalPayFieldProps) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </span>
      <Input
        className="mt-1.5"
        inputMode={inputMode}
        value={value}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

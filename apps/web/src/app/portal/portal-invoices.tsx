import { text } from "@/constants/text";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { formatPortalDate } from "./format";
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
  const rows = [...home.invoices].sort((a, b) =>
    a.dueDate < b.dueDate ? 1 : -1,
  );

  return (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

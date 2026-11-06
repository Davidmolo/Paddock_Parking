import { text } from "@/constants/text";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { PortalInvoicesProps } from "./types";

const statusLabel = {
  paid: text.portal.paid,
  open: text.portal.open,
  overdue: text.portal.overdue,
  partial: text.portal.partial,
} as const;

export function PortalInvoices({ home }: PortalInvoicesProps) {
  const rows = [...home.invoices].sort((a, b) =>
    a.dueDate < b.dueDate ? 1 : -1,
  );

  return (
    <Card interactive={false}>
      <CardHeader>
        <h2 className="text-base font-semibold text-[var(--ink)]">
          {text.portal.invoices}
        </h2>
      </CardHeader>
      <CardBody>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{text.portal.noInvoices}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((invoice) => (
              <li
                key={invoice.id}
                className="grid gap-1 py-3 text-sm first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--ink)]">{invoice.id}</p>
                  <p className="text-[var(--muted)]">
                    {text.portal.issued} {invoice.issuedAt} · {text.portal.due}{" "}
                    {invoice.dueDate}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="font-semibold text-[var(--ink)]">
                    {formatCurrency(invoice.balance)}
                  </p>
                  <p className="text-[var(--muted)]">
                    {statusLabel[invoice.status]} · {text.portal.amount}{" "}
                    {formatCurrency(invoice.amount)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

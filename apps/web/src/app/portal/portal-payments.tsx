import { text } from "@/constants/text";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { formatPortalDate } from "./format";
import type { PortalPayment, PortalPaymentsProps } from "./types";

const methodLabel: Record<PortalPayment["method"], string> = {
  ach: text.portal.ach,
  card: text.portal.card,
  check: text.portal.check,
  cash: text.portal.cash,
};

export function PortalPayments({ home }: PortalPaymentsProps) {
  const rows = [...home.payments].sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1));

  return (
    <Card interactive={false}>
      <CardHeader>
        <h2 className="text-base font-semibold text-[var(--ink)]">
          {text.portal.payments}
        </h2>
      </CardHeader>
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted)]">{text.portal.noPayments}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <th className="px-4 py-3 font-semibold">{text.portal.paidOn}</th>
                  <th className="px-4 py-3 font-semibold">{text.portal.method}</th>
                  <th className="px-4 py-3 text-right font-semibold">{text.portal.amount}</th>
                  <th className="px-4 py-3 font-semibold">{text.portal.invoice}</th>
                  <th className="px-4 py-3 font-semibold">{text.portal.status}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((payment) => (
                  <tr key={payment.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 text-[var(--ink)]">
                      {formatPortalDate(payment.paidAt)}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink)]">{methodLabel[payment.method]}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--ink)]">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink)]">{payment.reference || text.portal.notSet}</td>
                    <td className="px-4 py-3">
                      <Badge tone={payment.status === "cleared" ? "success" : payment.status === "failed" ? "danger" : "warning"}>
                        {payment.status === "cleared"
                          ? text.portal.cleared
                          : payment.status === "failed"
                            ? text.portal.declined
                            : text.portal.paymentPending}
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

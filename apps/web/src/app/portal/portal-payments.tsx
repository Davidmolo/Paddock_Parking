import { text } from "@/constants/text";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
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
      <CardBody>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{text.portal.noPayments}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold text-[var(--ink)]">
                    {methodLabel[payment.method]}
                  </p>
                  <p className="text-[var(--muted)]">{payment.paidAt}</p>
                </div>
                <p className="font-semibold text-[var(--ink)]">
                  {formatCurrency(payment.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

import { text } from "@/constants/text";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { PortalAccountProps, PortalHome } from "./types";

const paidLabel: Record<PortalHome["paymentStatus"], string> = {
  current: text.portal.current,
  past_due: text.portal.pastDue,
  notice: text.portal.notice,
};

const insuranceLabel: Record<PortalHome["insuranceStatus"], string> = {
  valid: text.portal.valid,
  expiring: text.portal.expiring,
  expired: text.portal.expired,
  mismatch: text.portal.mismatch,
  missing: text.portal.missing,
};

export function PortalAccount({ home }: PortalAccountProps) {
  const rows = [
    [text.portal.contactName, home.contactName || text.portal.notSet],
    [text.portal.balanceDue, formatCurrency(home.balanceDue)],
    [text.portal.deposit, formatCurrency(home.securityDeposit)],
    [text.portal.ach, home.achEnabled ? text.portal.achOn : text.portal.achOff],
    [text.portal.standing, paidLabel[home.paymentStatus]],
    [
      text.portal.contract,
      home.contractType === "fixed" ? text.portal.fixedTerm : text.portal.monthToMonth,
    ],
    [text.portal.renewal, home.renewalDate || text.portal.monthToMonth],
    [text.portal.term, home.termMonths == null ? text.portal.notSet : `${home.termMonths} ${text.portal.months}`],
    [text.portal.legalEntity, home.legalEntityName || text.portal.notSet],
    [text.portal.insurance, home.insuranceStatus === "missing" && home.documents.some((doc) => doc.kind === "insurance")
      ? text.portal.onFile
      : insuranceLabel[home.insuranceStatus]],
  ];

  return (
    <Card interactive={false}>
      <CardHeader>
        <h2 className="text-base font-semibold text-[var(--ink)]">
          {text.portal.yourAccount}
        </h2>
      </CardHeader>
      <CardBody>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[12px] font-medium text-[var(--muted)]">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

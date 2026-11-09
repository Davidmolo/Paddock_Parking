import { text } from "@/constants/text";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { formatPortalDate } from "./format";
import type { PortalAccountProps, PortalHome } from "./types";

const paidLabel: Record<PortalHome["paymentStatus"], string> = {
  current: text.portal.current,
  past_due: text.portal.pastDue,
  notice: text.portal.notice,
};

const paidTone = {
  current: "success",
  past_due: "danger",
  notice: "warning",
} as const;

const insuranceLabel: Record<PortalHome["insuranceStatus"], string> = {
  valid: text.portal.valid,
  expiring: text.portal.expiring,
  expired: text.portal.expired,
  mismatch: text.portal.mismatch,
  missing: text.portal.missing,
};

const insuranceTone = {
  valid: "success",
  expiring: "warning",
  expired: "danger",
  mismatch: "warning",
  missing: "danger",
} as const;

const labelClass = "text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]";

export function PortalAccount({ home }: PortalAccountProps) {
  const insuranceOnFile =
    home.insuranceStatus === "missing" &&
    home.documents.some((doc) => doc.kind === "insurance");
  const rows = [
    [text.portal.contactName, home.contactName || text.portal.notSet],
    [text.portal.deposit, formatCurrency(home.securityDeposit)],
    [text.portal.ach, home.achEnabled ? text.portal.achOn : text.portal.achOff],
    [
      text.portal.contract,
      home.contractType === "fixed" ? text.portal.fixedTerm : text.portal.monthToMonth,
    ],
    [text.portal.renewal, home.renewalDate ? formatPortalDate(home.renewalDate) : text.portal.monthToMonth],
    [
      text.portal.term,
      home.termMonths == null ? text.portal.notSet : `${home.termMonths} ${text.portal.months}`,
    ],
    [text.portal.legalEntity, home.legalEntityName || text.portal.notSet],
  ];

  return (
    <Card interactive={false}>
      <CardHeader>
        <h2 className="text-base font-semibold text-[var(--ink)]">{text.portal.yourAccount}</h2>
        <Badge tone={paidTone[home.paymentStatus]}>{paidLabel[home.paymentStatus]}</Badge>
      </CardHeader>
      <CardBody>
        <div className="mb-4 rounded-xl bg-[var(--ink)] px-4 py-3 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">
            {text.portal.balanceDue}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {formatCurrency(home.balanceDue)}
          </p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className={labelClass}>{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</dd>
            </div>
          ))}
          <div>
            <dt className={labelClass}>{text.portal.insurance}</dt>
            <dd className="mt-1">
              <Badge tone={insuranceOnFile ? "info" : insuranceTone[home.insuranceStatus]}>
                {insuranceOnFile ? text.portal.onFile : insuranceLabel[home.insuranceStatus]}
              </Badge>
            </dd>
          </div>
        </dl>
      </CardBody>
    </Card>
  );
}

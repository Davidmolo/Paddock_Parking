import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { text } from "@/constants/text";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import type { BookingDetailProps } from "./types";

export function BookingDetail({ backHref, title, status, tone, facts, plates, insurance }: BookingDetailProps) {
  return (
    <PageTransition>
      <PageHeader
        title={title}
        subtitle={text.admin.thisBooking}
        action={
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ink)]">
            <ArrowLeft className="h-4 w-4" />
            {text.admin.backToBookings}
          </Link>
        }
      />
      <Card interactive={false} className="max-w-2xl">
        <CardBody className="space-y-4">
          <Badge tone={tone}>{status}</Badge>
          <dl className="grid gap-4 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{fact.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--ink)]">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.portal.vehicles}</p>
            {plates.length ? (
              <ul className="mt-2 space-y-1 text-sm font-semibold text-[var(--ink)]">
                {plates.map((plate) => (
                  <li key={plate}>{plate}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">{text.portal.notSet}</p>
            )}
          </div>
          <p className="border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">{insurance}</p>
        </CardBody>
      </Card>
    </PageTransition>
  );
}

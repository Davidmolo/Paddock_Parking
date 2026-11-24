"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import {
  LEASE_AGREEMENT_FULL,
  PERSONAL_GUARANTY_FULL,
} from "@/lib/book-lease-copy";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { usePortalEmail } from "./portal-email";
import { formatPortalDate } from "./format";
import type { PortalSignatureBlockProps, PortalYardLeaseProps } from "./types";

export function PortalLeaseScreen() {
  const email = usePortalEmail();
  const { data, isPending } = useQuery({
    queryKey: ["portal-home", email],
    queryFn: () => endpoints.portalHome(email),
  });
  const yards = data?.yards ?? [];

  return (
    <PageTransition>
      <PageHeader title={text.portal.lease} subtitle={text.portal.leaseSubtitle} />
      {isPending && !data ? (
        <Skeleton className="h-80" />
      ) : yards.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-[var(--muted)]">{text.portal.leaseEmpty}</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {yards.map((yard) => (
            <YardLease key={yard.propertyId} yard={yard} />
          ))}
        </div>
      )}
    </PageTransition>
  );
}

function YardLease({ yard }: PortalYardLeaseProps) {
  const lease = yard.signedLease;
  const lots = yard.lotNumbers.map((number) => `#${number}`).join(", ");
  const started = yard.startDate
    ? `${text.portal.leaseStart} ${formatPortalDate(yard.startDate)}`
    : "";
  const meta = [lots, formatCurrency(yard.monthlyRent), started].filter(Boolean).join(" · ");
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">{yard.name || text.portal.lease}</h2>
        <p className="text-sm text-[var(--muted)]">{meta}</p>
      </CardHeader>
      <CardBody className="grid gap-6">
        {lease ? (
          <>
            <p className="text-sm text-[var(--muted)]">
              {text.portal.signedOn} {formatPortalDate(lease.signatureDate)}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
              {LEASE_AGREEMENT_FULL}
            </p>
            <SignatureBlock
              label={text.portal.lessee}
              name={lease.lesseeName}
              signature={lease.lesseeSignature}
            />
            {lease.guarantorSignature ? (
              <>
                <h3 className="text-sm font-semibold">{text.portal.guarantyTitle}</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
                  {PERSONAL_GUARANTY_FULL}
                </p>
                <SignatureBlock
                  label={text.portal.guarantor}
                  name={lease.guarantorName}
                  signature={lease.guarantorSignature}
                />
              </>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">{text.portal.leaseEmpty}</p>
        )}
        {yard.documents.length > 0 ? (
          <ul className="grid gap-2">
            {yard.documents.map((doc) => {
              const src = doc.storagePath ? `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001"}/uploads/${doc.storagePath}` : "";
              return (
                <li key={doc.id} className="text-sm">
                  {src ? (
                    <a className="font-semibold text-[var(--accent-ink)]" href={src} target="_blank" rel="noreferrer">
                      {doc.name}
                    </a>
                  ) : (
                    <span className="font-semibold text-[var(--ink)]">{doc.name}</span>
                  )}
                  <span className="text-[var(--muted)]"> · {formatPortalDate(doc.uploadedAt)}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}

function SignatureBlock({ label, name, signature }: PortalSignatureBlockProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{name}</p>
      {signature ? (
        <img
          src={signature}
          alt={label}
          className="mt-2 h-24 w-auto max-w-sm rounded-md border border-[var(--border)] bg-white object-contain"
        />
      ) : null}
    </div>
  );
}

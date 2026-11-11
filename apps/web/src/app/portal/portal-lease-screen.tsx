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
import { usePortalEmail } from "./portal-email";
import { formatPortalDate } from "./format";
import type { PortalSignatureBlockProps } from "./types";

export function PortalLeaseScreen() {
  const email = usePortalEmail();
  const { data, isPending } = useQuery({
    queryKey: ["portal-home", email],
    queryFn: () => endpoints.portalHome(email),
  });
  const lease = data?.signedLease;

  return (
    <PageTransition>
      <PageHeader title={text.portal.lease} subtitle={text.portal.leaseSubtitle} />
      {isPending && !data ? (
        <Skeleton className="h-80" />
      ) : !lease ? (
        <Card>
          <CardBody>
            <p className="text-sm text-[var(--muted)]">{text.portal.leaseEmpty}</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">{text.portal.lease}</h2>
            <p className="text-sm text-[var(--muted)]">
              {text.portal.signedOn} {formatPortalDate(lease.signatureDate)}
            </p>
          </CardHeader>
          <CardBody className="grid gap-6">
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
          </CardBody>
        </Card>
      )}
    </PageTransition>
  );
}

function SignatureBlock({ label, name, signature }: PortalSignatureBlockProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{name}</p>
      <img
        src={signature}
        alt={label}
        className="mt-2 h-24 w-auto max-w-sm rounded-md border border-[var(--border)] bg-white object-contain"
      />
    </div>
  );
}

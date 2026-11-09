"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalEmail } from "./portal-email";
import { PortalInvoices } from "./portal-invoices";

export function PortalInvoicesScreen() {
  const email = usePortalEmail();
  const { data, isPending } = useQuery({
    queryKey: ["portal-home", email],
    queryFn: () => endpoints.portalHome(email),
  });

  return (
    <PageTransition>
      <PageHeader title={text.portal.invoices} subtitle={text.portal.invoicesSubtitle} />
      {isPending && !data ? (
        <Skeleton className="h-56" />
      ) : data ? (
        <PortalInvoices home={data} />
      ) : null}
    </PageTransition>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, KeyRound, LayoutDashboard, MapPin } from "lucide-react";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { PortalBookingCard } from "./portal-booking";
import { PortalStat } from "./portal-stat";
import type { PortalDashboardProps } from "./types";

export function PortalDashboard({ email }: PortalDashboardProps) {
  const { data, isPending } = useQuery({
    queryKey: ["portal-home", email],
    queryFn: () => endpoints.portalHome(email),
  });
  const space = data?.spaces.length
    ? data.spaces.join(", ")
    : text.portal.notAssigned;

  return (
    <PageTransition>
      <PageHeader title={text.portal.dashboard} subtitle={text.portal.subtitle} />
      {isPending && !data ? (
        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Skeleton className="h-56" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        </div>
      ) : data ? (
        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <PortalBookingCard home={data} />
          <Stagger className="grid gap-3 sm:grid-cols-2">
            <StaggerItem>
              <PortalStat
                label={text.portal.monthlyRate}
                value={
                  data.monthlyRate == null
                    ? text.portal.notSet
                    : formatCurrency(data.monthlyRate)
                }
                icon={LayoutDashboard}
              />
            </StaggerItem>
            <StaggerItem>
              <PortalStat
                label={text.portal.gateCode}
                value={data.gateCode || text.portal.notSet}
                icon={KeyRound}
              />
            </StaggerItem>
            <StaggerItem>
              <PortalStat label={text.portal.space} value={space} icon={MapPin} />
            </StaggerItem>
            <StaggerItem>
              <PortalStat
                label={text.portal.leaseStart}
                value={data.leaseStart || text.portal.notSet}
                icon={Calendar}
              />
            </StaggerItem>
          </Stagger>
        </div>
      ) : null}
    </PageTransition>
  );
}

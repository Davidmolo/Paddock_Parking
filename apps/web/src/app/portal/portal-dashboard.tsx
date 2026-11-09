"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Hourglass, KeyRound, MapPin } from "lucide-react";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalBookingCard } from "./portal-booking";
import { usePortalEmail } from "./portal-email";
import { PortalStat } from "./portal-stat";

export function PortalDashboard() {
  const email = usePortalEmail();
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
          <Stagger className="grid content-start gap-3 sm:grid-cols-2">
              <StaggerItem>
                <PortalStat label={text.portal.plot} value={space} icon={MapPin} />
              </StaggerItem>
              <StaggerItem>
                <PortalStat
                  label={text.portal.daysHere}
                  value={dayCount(data.daysHere)}
                  icon={Hourglass}
                />
              </StaggerItem>
              <StaggerItem>
                <PortalStat
                  label={text.portal.daysLeft}
                  value={
                    data.daysLeft == null
                      ? text.portal.monthToMonth
                      : dayCount(data.daysLeft)
                  }
                  icon={CalendarClock}
                />
              </StaggerItem>
              <StaggerItem>
                <PortalStat
                  label={text.portal.gateCode}
                  value={data.gateCode || text.portal.notSet}
                  icon={KeyRound}
                />
              </StaggerItem>
          </Stagger>
        </div>
      ) : null}
    </PageTransition>
  );
}

function dayCount(value: number | null) {
  if (value == null) return text.portal.notSet;
  return `${value} ${value === 1 ? text.portal.day : text.portal.days}`;
}

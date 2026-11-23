"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalEmail } from "./portal-email";

export function PortalAddScreen() {
  const email = usePortalEmail();
  const queryClient = useQueryClient();
  const home = useQuery({
    queryKey: ["portal-home", email],
    queryFn: () => endpoints.portalHome(email),
  });
  const lots = useQuery({
    queryKey: ["portal-open-lots", home.data?.propertyId],
    queryFn: () => endpoints.lots(home.data?.propertyId),
    enabled: Boolean(home.data?.propertyId),
  });
  const open = (lots.data ?? []).filter((lot) => lot.status === "available" && lot.propertyId === home.data?.propertyId);
  const [lotId, setLotId] = useState("");
  const [plate, setPlate] = useState("");
  const [charge, setCharge] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState("");
  const picked = open.find((lot) => lot.id === lotId);
  const needsPlate = picked?.lotType === "truck_trailer" || picked?.lotType === "bobtail";
  const save = useMutation({
    mutationFn: () => endpoints.portalAddSpace({ email, lotId, plate, chargeOnFile: charge, agreed }),
    onSuccess: (result) => {
      setDone(text.portal.addSpaceDone(result.number));
      setLotId("");
      setPlate("");
      setAgreed(false);
      void queryClient.invalidateQueries({ queryKey: ["portal-home", email] });
      void queryClient.invalidateQueries({ queryKey: ["portal-open-lots"] });
    },
  });

  return (
    <PageTransition>
      <PageHeader title={text.portal.addSpace} subtitle={text.portal.addSpaceHint} />
      {home.isPending && !home.data ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="grid max-w-lg gap-3">
          <p className="text-sm text-[var(--muted)]">{home.data?.name} · {home.data?.yardName}</p>
          {(home.data?.bookings ?? []).some((booking) => booking.decision === "pending") ? (
            <div>
              {(home.data?.bookings ?? [])
                .filter((booking) => booking.decision === "pending")
                .map((booking) => (
                  <p key={booking.reference} className="text-sm text-[var(--muted)]">
                    {text.portal.requestPending}
                    {booking.spaces?.length ? ` · ${booking.spaces.map((number) => `#${number}`).join(", ")}` : ""}
                  </p>
                ))}
            </div>
          ) : null}
          {home.data?.plots.length ? (
            <div>
              <p className="text-sm font-semibold">{text.portal.yourSpaces}</p>
              {home.data.plots.map((plot) => (
                <p key={plot.number} className="text-sm text-[var(--muted)]">
                  #{plot.number}{plot.size ? ` · ${plot.size}` : ""} · {formatCurrency(plot.monthlyRate)}/mo
                </p>
              ))}
            </div>
          ) : null}
          <SelectMenu
            ariaLabel={text.portal.addSpace}
            value={lotId}
            placeholder={text.portal.notAssigned}
            onChange={setLotId}
            options={open.map((lot) => ({
              value: lot.id,
              label: `#${lot.number} · ${lot.size} · ${formatCurrency(lot.monthlyRate)}/mo`,
            }))}
          />
          {needsPlate ? (
            <Input placeholder={text.portal.addSpacePlate} value={plate} onChange={(e) => setPlate(e.target.value)} />
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={charge} onChange={(e) => setCharge(e.target.checked)} />
            {text.portal.addSpaceCharge}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            {text.portal.addSpaceAgree}
          </label>
          <Button disabled={!lotId || !charge || !agreed || (needsPlate && !plate.trim()) || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? text.portal.pleaseWait : text.portal.addSpaceSave}
          </Button>
          {done ? <p className="text-sm font-semibold text-emerald-700">{done}</p> : null}
          {save.isError ? <p className="text-sm text-rose-700">{text.portal.genericError}</p> : null}
        </div>
      )}
    </PageTransition>
  );
}

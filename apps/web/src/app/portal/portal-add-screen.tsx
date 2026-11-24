"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { endpoints } from "@/lib/api";
import { LEASE_AGREEMENT_FULL } from "@/lib/book-lease-copy";
import { text } from "@/constants/text";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalEmail } from "./portal-email";

const STEPS = text.portal.bookingSteps;
const fieldLabel = "text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]";

export function PortalAddScreen() {
  const email = usePortalEmail();
  const queryClient = useQueryClient();
  const home = useQuery({
    queryKey: ["portal-home", email],
    queryFn: () => endpoints.portalHome(email),
  });
  const lots = useQuery({
    queryKey: ["portal-open-lots"],
    queryFn: () => endpoints.lots(),
    enabled: Boolean(home.data),
  });
  const properties = useQuery({
    queryKey: ["properties"],
    queryFn: () => endpoints.properties(),
    enabled: Boolean(home.data),
  });
  const open = (lots.data ?? []).filter((lot) => lot.status === "available");
  const yards = (properties.data ?? []).filter((property) =>
    open.some((lot) => lot.propertyId === property.id),
  );
  const [step, setStep] = useState(0);
  const [yardId, setYardId] = useState("");
  const [lotId, setLotId] = useState("");
  const [plate, setPlate] = useState("");
  const [signer, setSigner] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const onThisYard =
    yardId === home.data?.propertyId ||
    (home.data?.plots ?? []).some((plot) => plot.propertyId === yardId);
  const picked = open.find((lot) => lot.id === lotId && lot.propertyId === yardId);
  const yardName = yards.find((yard) => yard.id === yardId)?.name ?? "";
  const needsPlate = picked?.lotType === "truck_trailer" || picked?.lotType === "bobtail";
  const save = useMutation({
    mutationFn: () =>
      endpoints.portalAddSpace({
        email,
        lotId,
        plate,
        chargeOnFile: true,
        agreed: true,
        lesseeName: onThisYard ? undefined : signer.trim(),
      }),
    onSuccess: (result) => {
      setDone(text.portal.addSpaceDone(result.number));
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["portal-home", email] });
      void queryClient.invalidateQueries({ queryKey: ["portal-open-lots"] });
    },
    onError: () => setError(text.portal.genericError),
  });

  function goNext() {
    if (step === 0 && (!yardId || !lotId || (needsPlate && !plate.trim()))) {
      setError(text.portal.bookingNeedSpace);
      return;
    }
    if (step === 1 && (!agreed || (!onThisYard && !signer.trim()))) {
      setError(text.portal.bookingNeedSign);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  const failed = home.isError || lots.isError || properties.isError;
  const ready = Boolean(home.data && lots.isSuccess && properties.isSuccess);

  return (
    <PageTransition>
      <PageHeader title={text.portal.addSpace} subtitle={text.portal.addSpaceHint} />
      {failed ? (
        <p className="text-sm text-rose-700">{text.portal.genericError}</p>
      ) : !ready ? (
        <Skeleton className="h-56 max-w-xl" />
      ) : done ? (
        <p className="max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm font-semibold text-emerald-700">
          {done}
        </p>
      ) : (
        <Card interactive={false} className="max-w-xl">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <p className={fieldLabel}>
              {text.portal.bookingStepOf(step + 1, STEPS.length)}
            </p>
            <ol className="mt-3 flex items-center">
              {STEPS.map((label, index) => {
                const current = index === step;
                const complete = index < step;
                return (
                  <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        current && "bg-[var(--ink)] text-white",
                        complete && "bg-[var(--accent)] text-[var(--accent-ink)]",
                        !current && !complete && "bg-[var(--surface-muted)] text-[var(--muted)]",
                      )}
                    >
                      {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className={cn("truncate text-sm font-semibold", current ? "text-[var(--ink)]" : "text-[var(--muted)]")}>
                      {label}
                    </span>
                    {index < STEPS.length - 1 ? (
                      <span className={cn("mx-1 h-px min-w-4 flex-1", complete ? "bg-[var(--accent)]" : "bg-[var(--border)]")} />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
          <CardBody className="grid gap-4">
            {step === 0 ? (
              <>
                <p className="text-sm text-[var(--muted)]">{text.portal.bookingSpaceHint}</p>
                <label className="grid gap-1.5">
                  <span className={fieldLabel}>
                    {text.portal.addSpaceYard}
                  </span>
                  <SelectMenu
                    ariaLabel={text.portal.addSpaceYard}
                    value={yardId}
                    placeholder={text.portal.addSpaceYard}
                    onChange={(id) => {
                      setYardId(id);
                      setLotId("");
                      setAgreed(false);
                      setSigner("");
                      setError("");
                    }}
                    options={yards.map((property) => ({ value: property.id, label: property.name }))}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className={fieldLabel}>
                    {text.portal.space}
                  </span>
                  <SelectMenu
                    ariaLabel={text.portal.space}
                    value={lotId}
                    placeholder={text.portal.bookingChooseSpace}
                    onChange={(id) => {
                      setLotId(id);
                      setError("");
                    }}
                    disabled={!yardId}
                    options={open
                      .filter((lot) => lot.propertyId === yardId)
                      .map((lot) => ({ value: lot.id, label: `#${lot.number} · ${lot.size}` }))}
                  />
                </label>
                {needsPlate ? (
                  <label className="grid gap-1.5">
                    <span className={fieldLabel}>
                      {text.portal.addSpacePlate}
                    </span>
                    <Input
                      placeholder={text.portal.addSpacePlate}
                      value={plate}
                      onChange={(e) => setPlate(e.target.value)}
                    />
                  </label>
                ) : null}
              </>
            ) : null}

            {step === 1 ? (
              <>
                <p className="text-sm text-[var(--ink)]">
                  {onThisYard ? text.portal.bookingSameLease(yardName) : text.portal.bookingNewLease(yardName)}
                </p>
                {onThisYard ? null : (
                  <>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--muted)]">
                      {LEASE_AGREEMENT_FULL}
                    </pre>
                    <label className="grid gap-1.5">
                      <span className={fieldLabel}>
                        {text.portal.bookingSigner}
                      </span>
                      <Input
                        placeholder={text.portal.bookingSigner}
                        value={signer}
                        onChange={(e) => setSigner(e.target.value)}
                      />
                    </label>
                  </>
                )}
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  {onThisYard ? text.portal.addSpaceAgree : text.portal.addSpaceAgreeYard}
                </label>
              </>
            ) : null}

            {step === 2 && picked ? (
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">{text.portal.addSpaceYard}</dt>
                  <dd className="font-semibold">{yardName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">{text.portal.space}</dt>
                  <dd className="font-semibold">#{picked.number} · {picked.size}</dd>
                </div>
                <p className="pt-2 text-[var(--muted)]">{text.portal.bookingInvoice}</p>
              </dl>
            ) : null}

            {error ? <p className="text-sm text-rose-700">{error}</p> : null}

            <div className="flex justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                disabled={step === 0}
                onClick={() => {
                  setError("");
                  setStep((current) => Math.max(0, current - 1));
                }}
              >
                {text.portal.bookingBack}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={goNext}>
                  {text.portal.bookingNext}
                </Button>
              ) : (
                <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
                  {save.isPending ? text.portal.pleaseWait : text.portal.bookingSend}
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </PageTransition>
  );
}

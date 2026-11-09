"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalEmail } from "./portal-email";
import type { PortalDocument } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

const kindLabel: Record<PortalDocument["kind"], string> = {
  lease: text.portal.leaseDoc,
  insurance: text.portal.insuranceDoc,
  other: text.portal.otherDoc,
};

export function PortalFinishScreen() {
  const email = usePortalEmail();
  const queryClient = useQueryClient();
  const [plates, setPlates] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const { data, isPending } = useQuery({
    queryKey: ["portal-home", email],
    queryFn: () => endpoints.portalHome(email),
  });

  const savePlate = useMutation({
    mutationFn: (body: { index: number; licensePlate: string }) =>
      endpoints.portalSavePlate({ email, ...body }),
    onSuccess: (home) => {
      queryClient.setQueryData(["portal-home", email], home);
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const upload = useMutation({
    mutationFn: endpoints.portalUploadDocument,
    onSuccess: (home) => {
      queryClient.setQueryData(["portal-home", email], home);
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <PageTransition>
      <PageHeader title={text.portal.toFinish} subtitle={text.portal.toFinishSubtitle} />
      {isPending && !data ? (
        <Skeleton className="h-56" />
      ) : data ? (
        <div className="grid gap-4">
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          {data.owedPlates.length === 0 && !data.docsOwed ? (
            <p className="text-sm text-[var(--muted)]">{text.portal.nothingOwed}</p>
          ) : null}
          {data.owedPlates.map((plate) => (
            <Card key={plate.index} interactive={false}>
              <CardBody className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block">
                  <span className="text-[12px] font-medium text-[var(--muted)]">
                    {plate.make} {plate.truckNumber} · {text.portal.plateFor}
                  </span>
                  <input
                    value={plates[plate.index] ?? ""}
                    onChange={(event) =>
                      setPlates((current) => ({
                        ...current,
                        [plate.index]: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
                  />
                </label>
                <Button
                  type="button"
                  disabled={savePlate.isPending || !(plates[plate.index] ?? "").trim()}
                  onClick={() =>
                    savePlate.mutate({
                      index: plate.index,
                      licensePlate: plates[plate.index] ?? "",
                    })
                  }
                >
                  {text.portal.savePlate}
                </Button>
              </CardBody>
            </Card>
          ))}
          {data.docsOwed ? (
            <Card interactive={false}>
              <CardHeader>
                <h2 className="text-base font-semibold text-[var(--ink)]">
                  {text.portal.uploadCoi}
                </h2>
              </CardHeader>
              <CardBody className="grid gap-2">
                <p className="text-sm text-[var(--muted)]">{text.portal.coiHint}</p>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  disabled={upload.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      upload.mutate({
                        email,
                        fileName: file.name,
                        kind: "insurance",
                        contentBase64: String(reader.result ?? ""),
                      });
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="text-sm"
                />
              </CardBody>
            </Card>
          ) : null}
          <Card interactive={false}>
            <CardHeader>
              <h2 className="text-base font-semibold text-[var(--ink)]">
                {text.portal.onFile}
              </h2>
            </CardHeader>
            <CardBody>
              {data.documents.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">{text.portal.noDocuments}</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {data.documents.map((doc) => (
                    <li key={doc.id} className="py-3 text-sm first:pt-0 last:pb-0">
                      {doc.storagePath ? (
                        <a
                          className="font-semibold text-[var(--ink)] underline"
                          href={`${apiUrl}/uploads/${doc.storagePath}`}
                        >
                          {doc.name}
                        </a>
                      ) : (
                        <p className="font-semibold text-[var(--ink)]">{doc.name}</p>
                      )}
                      <p className="text-[var(--muted)]">
                        {kindLabel[doc.kind]} · {doc.uploadedAt}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </PageTransition>
  );
}

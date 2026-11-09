"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { text } from "@/constants/text";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalEmail } from "./portal-email";
import { formatPortalDate } from "./format";
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
  const fileRef = useRef<HTMLInputElement>(null);
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
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    {plate.make} {plate.truckNumber} · {text.portal.plateFor}
                  </span>
                  <Input
                    value={plates[plate.index] ?? ""}
                    onChange={(event) =>
                      setPlates((current) => ({
                        ...current,
                        [plate.index]: event.target.value,
                      }))
                    }
                    className="mt-1.5"
                    placeholder={text.portal.plateFor}
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
              <CardBody className="grid gap-3">
                <p className="text-sm text-[var(--muted)]">{text.portal.coiHint}</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/*"
                  className="sr-only"
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
                />
                <Button
                  type="button"
                  className="w-fit"
                  disabled={upload.isPending}
                  onClick={() => fileRef.current?.click()}
                >
                  {upload.isPending ? text.portal.pleaseWait : text.portal.chooseFile}
                </Button>
              </CardBody>
            </Card>
          ) : null}
          <Card interactive={false}>
            <CardHeader>
              <h2 className="text-base font-semibold text-[var(--ink)]">
                {text.portal.onFile}
              </h2>
            </CardHeader>
            <CardBody className="p-0">
              {data.documents.length === 0 ? (
                <p className="p-4 text-sm text-[var(--muted)]">{text.portal.noDocuments}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                        <th className="px-4 py-3 font-semibold">{text.portal.onFile}</th>
                        <th className="px-4 py-3 font-semibold">{text.portal.kind}</th>
                        <th className="px-4 py-3 font-semibold">{text.portal.issued}</th>
                        <th className="px-4 py-3 font-semibold">{text.portal.openFile}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.documents.map((doc) => (
                        <tr key={doc.id} className="border-b border-[var(--border)] last:border-0">
                          <td className="px-4 py-3 font-semibold text-[var(--ink)]">{doc.name}</td>
                          <td className="px-4 py-3 text-[var(--muted)]">{kindLabel[doc.kind]}</td>
                          <td className="px-4 py-3 text-[var(--muted)]">
                            {formatPortalDate(doc.uploadedAt)}
                          </td>
                          <td className="px-4 py-3">
                            {doc.storagePath ? (
                              <a
                                className="font-semibold text-[var(--accent-ink)]"
                                href={`${apiUrl}/uploads/${doc.storagePath}`}
                              >
                                {text.portal.openFile}
                              </a>
                            ) : (
                              <span className="text-[var(--muted)]">{text.portal.notSet}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </PageTransition>
  );
}

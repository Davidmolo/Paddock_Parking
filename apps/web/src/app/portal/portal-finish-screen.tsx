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
    mutationFn: (body: { plates: { index: number; licensePlate: string }[] }) =>
      endpoints.portalSavePlates({ email, ...body }),
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
          {data.owedPlates.length > 0 ? (
            <Card interactive={false}>
              <CardHeader>
                <h2 className="text-base font-semibold text-[var(--ink)]">
                  {text.portal.plateFor}
                </h2>
              </CardHeader>
              <CardBody className="grid gap-4">
                <p className="text-sm text-[var(--muted)]">{text.portal.platesHint}</p>
                {data.owedPlates.map((plate) => (
                  <label key={plate.index} className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      {plate.make} {plate.truckNumber}
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
                ))}
                <Button
                  type="button"
                  className="w-fit"
                  disabled={
                    savePlate.isPending ||
                    data.owedPlates.some((plate) => !(plates[plate.index] ?? "").trim())
                  }
                  onClick={() =>
                    savePlate.mutate({
                      plates: data.owedPlates.map((plate) => ({
                        index: plate.index,
                        licensePlate: plates[plate.index] ?? "",
                      })),
                    })
                  }
                >
                  {data.owedPlates.length > 1 ? text.portal.savePlates : text.portal.savePlate}
                </Button>
              </CardBody>
            </Card>
          ) : null}
          <Card interactive={false}>
              <CardHeader>
                <h2 className="text-base font-semibold text-[var(--ink)]">
                  {text.portal.uploadCoi}
                </h2>
              </CardHeader>
              <CardBody className="grid gap-3">
                <details className="w-fit justify-self-start">
                  <summary className="inline-flex h-9 cursor-pointer list-none items-center rounded-lg border border-[var(--ink)] bg-[var(--ink)] px-3 text-[13px] font-medium text-[var(--accent)] [&::-webkit-details-marker]:hidden">
                    {text.portal.coiExampleAlt}
                  </summary>
                  <a href="/coi-example.png" target="_blank" rel="noreferrer" className="mt-3 block w-fit">
                    <img
                      src="/coi-example.png"
                      alt={text.portal.coiExampleAlt}
                      className="block max-h-96 max-w-sm cursor-pointer rounded-md border border-[var(--border)] object-contain object-left object-top"
                    />
                  </a>
                </details>
                <p className="text-sm text-[var(--ink)]">{text.portal.coiHint}</p>
                {data.yardAddress ? (
                  <p className="text-sm text-[var(--muted)]">{data.yardAddress}</p>
                ) : null}
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
                  {upload.isPending ? text.portal.readingCoi : text.portal.chooseFile}
                </Button>
                {upload.isPending ? (
                  <p className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                    {text.portal.readingCoi}
                  </p>
                ) : null}
              </CardBody>
            </Card>
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
                <div className="max-h-72 overflow-auto">
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
                      {data.documents.map((doc) => {
                        const src = doc.storagePath ? `${apiUrl}/uploads/${doc.storagePath}` : "";
                        return (
                          <tr key={doc.id} className="border-b border-[var(--border)] last:border-0">
                            <td className="px-4 py-3 font-semibold text-[var(--ink)]">{doc.name}</td>
                            <td className="px-4 py-3 text-[var(--muted)]">{kindLabel[doc.kind]}</td>
                            <td className="px-4 py-3 text-[var(--muted)]">
                              {formatPortalDate(doc.uploadedAt)}
                            </td>
                            <td className="px-4 py-3">
                              {src ? (
                                <a
                                  className="font-semibold text-[var(--accent-ink)]"
                                  href={src}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {text.portal.openFile}
                                </a>
                              ) : (
                                <span className="text-[var(--muted)]">{text.portal.notSet}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, ShieldCheck, CreditCard } from "lucide-react";
import { ApiError, endpoints } from "@/lib/api";
import { queryKeys } from "@/lib/prefetch";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

const paymentTone = {
  current: "success",
  past_due: "danger",
  notice: "warning",
} as const;

const invoiceTone = {
  paid: "success",
  open: "info",
  overdue: "danger",
  partial: "warning",
} as const;

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => endpoints.customer(id),
  });

  const requiredEntity =
    data?.certificate.requiredAdditionalInsured ||
    data?.property?.legalEntityName ||
    "";

  const [carrier, setCarrier] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [additionalInsured, setAdditionalInsured] = useState("");
  const [coiNotes, setCoiNotes] = useState("");
  const [coiMsg, setCoiMsg] = useState("");
  const [coiError, setCoiError] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (!data) return;
    setCarrier(data.certificate.carrier ?? "");
    setPolicyNumber(data.certificate.policyNumber ?? "");
    setEffectiveDate(data.certificate.effectiveDate ?? "");
    setExpirationDate(data.certificate.expirationDate ?? "");
    setAdditionalInsured(
      data.certificate.additionalInsuredName ||
        data.certificate.requiredAdditionalInsured ||
        "",
    );
    setCoiNotes(data.certificate.notes ?? "");
  }, [data]);

  const saveCoi = useMutation({
    mutationFn: () =>
      endpoints.upsertCertificate(id, {
        carrier,
        policyNumber,
        effectiveDate,
        expirationDate,
        additionalInsuredName: additionalInsured,
        notes: coiNotes || undefined,
      }),
    onSuccess: () => {
      setCoiMsg("COI saved.");
      setCoiError("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.customer(id) });
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({
        queryKey: ["notification-summary"],
      });
    },
    onError: (err) => {
      setCoiMsg("");
      setCoiError(
        err instanceof ApiError ? err.message : "Could not save COI",
      );
    },
  });

  async function onUpload(
    file: File,
    kind: "lease" | "insurance" | "other",
  ) {
    setUploadMsg("");
    setUploadError("");
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i]!);
      const contentBase64 = btoa(binary);
      await endpoints.uploadDocument(id, {
        fileName: file.name,
        kind,
        contentBase64,
      });
      setUploadMsg(`${file.name} uploaded.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.customer(id) });
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : "Upload failed",
      );
    }
  }

  if (isPending && !data) {
    return (
      <PageTransition>
        <Skeleton className="mb-6 h-20 w-full max-w-lg" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </PageTransition>
    );
  }

  if (!data) {
    return (
      <PageTransition>
        <Card interactive={false} className="p-10 text-center">
          <p className="text-[var(--muted)]">Customer not found.</p>
          <Link href="/customers" className="mt-4 inline-block">
            <Button variant="secondary">Back to customers</Button>
          </Link>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title={data.name}
        subtitle={`${data.contactName} · ${data.email} · ${data.phone}`}
        action={
          <div className="flex gap-2">
            <Link href="/customers">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                All customers
              </Button>
            </Link>
            <Badge tone={paymentTone[data.paymentStatus]}>
              {data.paymentStatus.replace("_", " ")}
            </Badge>
          </div>
        }
      />

      <Stagger className="grid gap-5 lg:grid-cols-3">
        <StaggerItem className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Lease & assignment</h2>
              <Badge
                tone={
                  data.lease?.noticeDue
                    ? "warning"
                    : data.lease?.status === "active"
                      ? "success"
                      : "neutral"
                }
              >
                {data.lease?.noticeDue
                  ? "Renewal notice due"
                  : data.leaseStatus}
              </Badge>
            </CardHeader>
            <CardBody className="grid gap-3 sm:grid-cols-2">
              <Meta label="Property" value={data.property?.name ?? "—"} />
              <Meta
                label="Legal entity"
                value={data.property?.legalEntityName ?? "—"}
              />
              <Meta
                label="Contract"
                value={data.contractType.replaceAll("_", " ")}
              />
              <Meta label="Lease start" value={data.lease?.startDate ?? data.leaseStart} />
              <Meta
                label="Renewal date"
                value={data.lease?.renewalDate ?? data.leaseEnd ?? "—"}
              />
              <Meta
                label="Notice lead time"
                value={
                  data.lease
                    ? `${data.lease.notificationLeadDays} days before renewal`
                    : "—"
                }
              />
              <Meta
                label="Lots"
                value={
                  data.lots.map((l) => `#${l.number}`).join(", ") ||
                  "Unassigned"
                }
              />
              <Meta
                label="Monthly rent"
                value={
                  data.lease
                    ? formatCurrency(data.lease.monthlyRent)
                    : data.lots.length
                      ? formatCurrency(
                          data.lots.reduce((s, l) => s + l.monthlyRate, 0),
                        )
                      : "—"
                }
              />
              <Meta
                label="Security deposit"
                value={formatCurrency(data.securityDeposit)}
              />
              <Meta label="Gate code" value={data.gateCode || "—"} />
              <Meta
                label="ACH"
                value={data.achEnabled ? "Enabled" : "Not set up"}
              />
              <Meta
                label="Portal last login"
                value={data.portalLastLogin ?? "Never"}
              />
            </CardBody>
            {data.lease?.notes && (
              <p className="border-t border-[var(--border)] px-5 py-3 text-sm text-[var(--muted)]">
                {data.lease.notes}
              </p>
            )}
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">Certificate of insurance</h2>
              <Badge tone={coiTone(data.certificate.status)}>
                {data.certificate.status}
              </Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm text-[var(--muted)]">
                COI must list{" "}
                <span className="font-medium text-[var(--ink)]">
                  {requiredEntity || "the yard legal entity"}
                </span>{" "}
                as additional insured.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Carrier
                  </span>
                  <Input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Policy #
                  </span>
                  <Input
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Effective
                  </span>
                  <Input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Expires
                  </span>
                  <Input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Additional insured on COI
                  </span>
                  <Input
                    value={additionalInsured}
                    onChange={(e) => setAdditionalInsured(e.target.value)}
                    placeholder={requiredEntity}
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Notes
                  </span>
                  <Input
                    value={coiNotes}
                    onChange={(e) => setCoiNotes(e.target.value)}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={saveCoi.isPending}
                  onClick={() => saveCoi.mutate()}
                >
                  {saveCoi.isPending ? "Saving…" : "Save COI"}
                </Button>
                {requiredEntity && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setAdditionalInsured(requiredEntity)}
                  >
                    Use yard entity name
                  </Button>
                )}
              </div>
              {coiMsg && (
                <p className="text-sm text-emerald-700">{coiMsg}</p>
              )}
              {coiError && (
                <p className="text-sm text-rose-700">{coiError}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">Documents</h2>
              <FileText className="h-4 w-4 text-[var(--muted)]" />
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium hover:border-[var(--accent)]">
                  Upload lease PDF
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onUpload(file, "lease");
                      e.target.value = "";
                    }}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium hover:border-[var(--accent)]">
                  Upload COI
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onUpload(file, "insurance");
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {uploadMsg && (
                <p className="text-sm text-emerald-700">{uploadMsg}</p>
              )}
              {uploadError && (
                <p className="text-sm text-rose-700">{uploadError}</p>
              )}
              {data.documents.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  No documents uploaded yet.
                </p>
              ) : (
                data.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {doc.kind} · {doc.uploadedAt} · {doc.sizeKb} KB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.storagePath && (
                        <a
                          href={`${API_URL}/uploads/${doc.storagePath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-[var(--accent-ink)] hover:underline"
                        >
                          Open
                        </a>
                      )}
                      <Badge tone="accent">{doc.kind}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">Invoices</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {data.invoices.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No invoices.</p>
              ) : (
                data.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{inv.id}</p>
                      <p className="text-xs text-[var(--muted)]">
                        Due {inv.dueDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {formatCurrency(inv.balance ?? inv.amount)}
                      </span>
                      <Badge tone={invoiceTone[inv.status]}>{inv.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </StaggerItem>

        <StaggerItem className="space-y-5">
          <Card glow>
            <CardHeader>
              <h2 className="font-semibold">Money</h2>
              <CreditCard className="h-4 w-4 text-[var(--muted)]" />
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  Balance due
                </p>
                <p
                  className={`mt-1 text-2xl font-semibold ${
                    data.balanceDue > 0 ? "text-rose-600" : ""
                  }`}
                >
                  {formatCurrency(data.balanceDue)}
                </p>
              </div>
              {data.notes && (
                <p className="text-sm text-[var(--muted)]">{data.notes}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">Payments</h2>
              <ShieldCheck className="h-4 w-4 text-[var(--muted)]" />
            </CardHeader>
            <CardBody className="space-y-2">
              {data.payments.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No payments yet.</p>
              ) : (
                data.payments.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl bg-[var(--surface-muted)] px-3 py-2.5"
                  >
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {formatCurrency(p.amount)}
                      </p>
                      <Badge
                        tone={p.status === "cleared" ? "success" : "warning"}
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {p.method.toUpperCase()} · {p.paidAt}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </StaggerItem>
      </Stagger>
    </PageTransition>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function coiTone(
  status: string,
): "success" | "warning" | "danger" | "neutral" | "accent" {
  if (status === "valid") return "success";
  if (status === "expiring") return "warning";
  if (status === "mismatch" || status === "expired" || status === "missing")
    return "danger";
  return "neutral";
}

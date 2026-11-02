"use client";

import { useEffect, useRef } from "react";
import { SignaturePad } from "@/components/book/signature-pad";
import {
  LEASE_AGREEMENT_FULL,
  PERSONAL_GUARANTY_FULL,
} from "@/lib/book-lease-copy";
import {
  type IdVerifyStatus,
  verifyPhotoId,
} from "@/lib/id-verify";
import { cn } from "@/lib/utils";

export type AgreementValues = {
  agreeLease: boolean;
  lesseeName: string;
  lesseeSignature: string;
  agreeGuarantee: boolean;
  guarantorName: string;
  guarantorSignature: string;
  signatureDate: string;
  idFileName: string;
  /** David: OCR — idle | checking | matched | name_mismatch | not_id | … */
  idVerifyStatus: IdVerifyStatus;
  idVerifyMessage: string;
  /** Dev/test only: skip OCR so any image can proceed */
  idVerifySkipTest: boolean;
  coiFileName: string;
  /** David: COI only may be submitted later → Compliance */
  docsSubmitLater: boolean;
};

type Props = {
  value: AgreementValues;
  /** Kept in parent so remounting Agreement doesn’t lose the File */
  idFile: File | null;
  onIdFile: (file: File | null) => void;
  onChange: <K extends keyof AgreementValues>(
    key: K,
    next: AgreementValues[K],
  ) => void;
};

const labelClass = "mb-1.5 block text-sm font-medium text-[#1e293b]";
const required = <span className="text-[#e11d48]"> *</span>;
const inputClass =
  "h-11 w-full rounded-md border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] outline-none focus:border-[#0a1628] focus:ring-1 focus:ring-[#0a1628]";

function FileUpload({
  label,
  hint,
  fileName,
  onPick,
  disabled,
  required: isRequired = true,
  accept = "image/*,.pdf,application/pdf",
}: {
  label: string;
  hint?: string;
  fileName: string;
  onPick: (file: File | null) => void;
  disabled?: boolean;
  required?: boolean;
  accept?: string;
}) {
  return (
    <div className={cn(disabled && "opacity-50")}>
      <span className={labelClass}>
        {label}
        {isRequired ? required : null}
      </span>
      {hint ? <p className="mb-2 text-sm text-[#64748b]">{hint}</p> : null}
      <label
        className={cn(
          "flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-6 text-center transition hover:border-[#94a3b8]",
          disabled && "pointer-events-none",
        )}
      >
        <span className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-[#0a1628] shadow-sm ring-1 ring-[#e2e8f0]">
          {fileName ? "Replace file" : "Choose File"}
        </span>
        <span className="text-sm text-[#64748b]">
          {fileName || "No file chosen"}
        </span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

function IdVerifyBanner({
  status,
  message,
}: {
  status: IdVerifyStatus;
  message: string;
}) {
  if (status === "idle" || !message) return null;
  const tone =
    status === "matched"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : status === "checking"
        ? "border-sky-200 bg-sky-50 text-sky-900"
        : "border-rose-200 bg-rose-50 text-rose-900";
  const title =
    status === "matched"
      ? "Photo ID verified"
      : status === "checking"
        ? "Checking Photo ID…"
        : status === "not_id"
          ? "Not a government ID"
          : status === "name_mismatch"
            ? "Name doesn’t match"
            : status === "unreadable"
              ? "Couldn’t read ID"
              : "Upload issue";
  return (
    <div className={cn("rounded-md border px-3 py-2.5 text-sm", tone)}>
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5 opacity-90">{message}</p>
    </div>
  );
}

/**
 * Exact Step 4 — Agreement layout from live paddock-16 / Elwood form.
 * David: COI may be later; Photo ID required + OCR name match vs signer.
 */
export function AgreementStep({ value, idFile, onIdFile, onChange }: Props) {
  const namesRef = useRef({
    lessee: value.lesseeName,
    guarantor: value.guarantorName,
  });
  namesRef.current = {
    lessee: value.lesseeName,
    guarantor: value.guarantorName,
  };

  async function runVerify(file: File, skipTest = value.idVerifySkipTest) {
    if (skipTest) {
      onChange("idVerifyStatus", "matched");
      onChange(
        "idVerifyMessage",
        "Test skip on — OCR bypassed. Any image accepted.",
      );
      return;
    }
    onChange("idVerifyStatus", "checking");
    onChange("idVerifyMessage", "Reading your ID and matching the name…");
    const { lessee, guarantor } = namesRef.current;
    const result = await verifyPhotoId({
      file,
      lesseeName: lessee,
      guarantorName: guarantor,
    });
    onChange("idVerifyStatus", result.status);
    onChange("idVerifyMessage", result.message);
  }

  async function onIdPick(file: File | null) {
    if (!file) {
      onIdFile(null);
      onChange("idFileName", "");
      onChange("idVerifyStatus", "idle");
      onChange("idVerifyMessage", "");
      return;
    }
    onIdFile(file);
    onChange("idFileName", file.name);
    await runVerify(file, value.idVerifySkipTest);
  }

  function onToggleSkipTest(checked: boolean) {
    onChange("idVerifySkipTest", checked);
    if (checked) {
      if (idFile) {
        onChange("idVerifyStatus", "matched");
        onChange(
          "idVerifyMessage",
          "Test skip on — OCR bypassed. Any image accepted.",
        );
      }
      return;
    }
    // Re-run real OCR when turning skip off
    if (idFile) void runVerify(idFile, false);
  }

  // Re-check when signer names change after an ID was uploaded
  useEffect(() => {
    if (!idFile || value.idVerifySkipTest) return;
    if (!value.lesseeName.trim() && !value.guarantorName.trim()) return;
    if (
      value.idVerifyStatus === "idle" ||
      value.idVerifyStatus === "bad_type" ||
      value.idVerifyStatus === "not_id"
    ) {
      return;
    }
    const t = window.setTimeout(() => {
      void runVerify(idFile);
    }, 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- names / file
  }, [value.lesseeName, value.guarantorName, idFile, value.idVerifySkipTest]);

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-[#0f172a]">
        Step 3 — Agreement
      </h2>

      {/* —— Lease —— */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-[#0f172a]">
          Lease Agreement Terms
        </h3>
        <div className="max-h-[280px] overflow-y-auto rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-4 text-[13px] leading-relaxed whitespace-pre-wrap text-[#334155]">
          {LEASE_AGREEMENT_FULL}
        </div>
        <label className="flex items-start gap-2.5 text-sm text-[#0f172a]">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[#cbd5e1]"
            checked={value.agreeLease}
            onChange={(e) => onChange("agreeLease", e.target.checked)}
          />
          <span>
            I have read and agree to the Lease Agreement Terms
            {required}
          </span>
        </label>

        <div>
          <label className={labelClass} htmlFor="lessee-name">
            Lessee Signer Name{required}
          </label>
          <input
            id="lessee-name"
            className={inputClass}
            value={value.lesseeName}
            onChange={(e) => onChange("lesseeName", e.target.value)}
            autoComplete="name"
          />
        </div>

        <div>
          <span className={labelClass}>Lessee Signature{required}</span>
          <SignaturePad
            value={value.lesseeSignature}
            onChange={(v) => onChange("lesseeSignature", v)}
          />
        </div>
      </section>

      {/* —— Guaranty —— */}
      <section className="space-y-4 border-t border-[#e2e8f0] pt-8">
        <h3 className="text-base font-semibold text-[#0f172a]">
          Personal Guarantee Terms
        </h3>
        <div className="max-h-[200px] overflow-y-auto rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-4 text-[13px] leading-relaxed whitespace-pre-wrap text-[#334155]">
          {PERSONAL_GUARANTY_FULL}
        </div>

        <div>
          <label className={labelClass} htmlFor="guarantor-name">
            Guarantor Signer Name{required}
          </label>
          <input
            id="guarantor-name"
            className={inputClass}
            value={value.guarantorName}
            onChange={(e) => onChange("guarantorName", e.target.value)}
            autoComplete="name"
          />
        </div>

        <div>
          <span className={labelClass}>Guarantor Signature{required}</span>
          <SignaturePad
            value={value.guarantorSignature}
            onChange={(v) => onChange("guarantorSignature", v)}
          />
        </div>

        <label className="flex items-start gap-2.5 text-sm text-[#0f172a]">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[#cbd5e1]"
            checked={value.agreeGuarantee}
            onChange={(e) => onChange("agreeGuarantee", e.target.checked)}
          />
          <span>
            I accept the Personal Guarantee terms and conditions
            {required}
          </span>
        </label>

        <div>
          <label className={labelClass} htmlFor="sig-date">
            Signature Date{required}
          </label>
          <input
            id="sig-date"
            type="date"
            className={inputClass}
            value={value.signatureDate}
            onChange={(e) => onChange("signatureDate", e.target.value)}
          />
          <p className="mt-1.5 text-sm text-[#64748b]">
            Automatically set to today&apos;s date
          </p>
        </div>
      </section>

      {/* —— Uploads: Photo ID required + name match; COI may submit later —— */}
      <section className="space-y-5 border-t border-[#e2e8f0] pt-8">
        <div className="space-y-3">
          <FileUpload
            label="Upload Photo ID"
            hint="Upload a clear photo of your government-issued ID (driver’s license, state ID, or passport). We’ll check that the name matches your signer name above — random photos won’t pass."
            fileName={value.idFileName}
            accept="image/*,.heic,.jpg,.jpeg,.png,.webp"
            onPick={onIdPick}
          />
          <IdVerifyBanner
            status={value.idVerifyStatus}
            message={value.idVerifyMessage}
          />
          <label className="flex items-center gap-2 text-xs text-[#94a3b8]">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-[#cbd5e1]"
              checked={value.idVerifySkipTest}
              onChange={(e) => onToggleSkipTest(e.target.checked)}
            />
            <span>Test: skip ID check (any photo OK)</span>
          </label>
        </div>
        <FileUpload
          label="Upload certificate of insurance"
          fileName={value.coiFileName}
          disabled={value.docsSubmitLater}
          required={!value.docsSubmitLater}
          onPick={(file) => onChange("coiFileName", file?.name ?? "")}
        />
        <label className="flex items-start gap-2.5 rounded-md border border-[#f5b301]/40 bg-[#fffbeb] px-3 py-3 text-sm text-[#0f172a]">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[#cbd5e1]"
            checked={value.docsSubmitLater}
            onChange={(e) => {
              onChange("docsSubmitLater", e.target.checked);
              if (e.target.checked) onChange("coiFileName", "");
            }}
          />
          <span>
            <span className="font-semibold">Upload certificate of insurance later</span>
            <span className="mt-0.5 block text-[#64748b]">
              Photo ID is required now and must match your signer name. You can send your COI afterward.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}

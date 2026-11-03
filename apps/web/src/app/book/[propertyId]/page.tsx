"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { AgreementStep } from "@/components/book/agreement-step";
import { BookChrome, BOOK_SHELL } from "@/components/book/book-chrome";
import {
  PaymentCardPreview,
  formatCardNumberInput,
  formatExpInput,
} from "@/components/book/payment-card-preview";
import { endpoints, type LotType } from "@/lib/api";
import { isValidAbaRouting } from "@/lib/aba-routing";
import { formatCurrency, cn } from "@/lib/utils";
import { isLivePropertyId } from "@/lib/yards";

/**
 * Book Now steps — David: drop Spot Selection (lease type lives in Lease Details;
 * live inventory stays on /book landing; staff assigns concrete spots).
 */
const STEPS = [
  "Contact Info",
  "Lease Details",
  "Agreement",
  "Review & Pay",
] as const;

const WIZARD_VERSION = 5;

const ACRE_OPTIONS = [0.25, 0.5, 1, 2, 3, 4, 5] as const;

type Vehicle = {
  make: string;
  color: string;
  truckNumber: string;
  licensePlate: string;
  submitLater: boolean;
};

type FormState = {
  companyName: string;
  taxId: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  /** David: parking by spot | storage by acre (replaces simple MTM-only) */
  productType: "parking_spot" | "storage_acre" | "";
  spotCount: number;
  vehicles: Vehicle[];
  acreSize: number;
  storageDescription: string;
  leaseStart: string;
  selectedLotIds: string[];
  agreeLease: boolean;
  lesseeName: string;
  lesseeSignature: string;
  agreeGuarantee: boolean;
  guarantorName: string;
  guarantorSignature: string;
  signatureDate: string;
  idFileName: string;
  idVerifyStatus:
    | "idle"
    | "checking"
    | "matched"
    | "missing_signer"
    | "name_mismatch"
    | "not_id"
    | "unreadable"
    | "bad_type";
  idVerifyMessage: string;
  idVerifySkipTest: boolean;
  coiFileName: string;
  docsSubmitLater: boolean;
  paymentMethod: "card" | "ach";
  /** David: required auto-pull; positive wording on Review & Pay */
  agreeAutoPull: boolean;
  cardName: string;
  cardNumber: string;
  cardExp: string;
  cardCvv: string;
  billingZip: string;
  routingNumber: string;
  accountNumber: string;
  accountType: "checking" | "savings";
};

/**
 * Greta (Oct 2026): CC confirmed at 3.5%. ACH still negotiating — don’t claim $0.
 */
const CARD_SURCHARGE_LABEL = "3.5% merchant fee";
const ACH_FEE_LABEL = "fee TBD";

function emptyVehicle(): Vehicle {
  return {
    make: "",
    color: "",
    truckNumber: "",
    licensePlate: "",
    submitLater: false,
  };
}

const emptyForm = (): FormState => ({
  companyName: "",
  taxId: "",
  email: "",
  phone: "",
  firstName: "",
  lastName: "",
  address: "",
  productType: "",
  spotCount: 1,
  vehicles: [emptyVehicle()],
  acreSize: 0.5,
  storageDescription: "",
  leaseStart: new Date().toISOString().slice(0, 10),
  selectedLotIds: [],
  agreeLease: false,
  lesseeName: "",
  lesseeSignature: "",
  agreeGuarantee: false,
  guarantorName: "",
  guarantorSignature: "",
  signatureDate: new Date().toISOString().slice(0, 10),
  idFileName: "",
  idVerifyStatus: "idle",
  idVerifyMessage: "",
  idVerifySkipTest: false,
  coiFileName: "",
  docsSubmitLater: false,
  paymentMethod: "card",
  agreeAutoPull: false,
  cardName: "",
  cardNumber: "",
  cardExp: "",
  cardCvv: "",
  billingZip: "",
  routingNumber: "",
  accountNumber: "",
  accountType: "checking",
});

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-[#0a1628]">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-xs text-[#64748b]">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "box-border h-11 w-full max-w-full rounded-xl border border-[#0b1524]/15 bg-white px-3 text-sm outline-none ring-[#E8C547] focus:ring-2";

export default function BookWizardPage() {
  const params = useParams<{ propertyId: string }>();
  const propertyId = params.propertyId;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  /** Photo ID File kept outside form (not JSON-serializable for drafts) */
  const [idFile, setIdFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [doneId, setDoneId] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [cvvFocused, setCvvFocused] = useState(false);

  const { data: properties, isPending: propsPending } = useQuery({
    queryKey: ["public-properties"],
    queryFn: () => endpoints.properties(),
  });
  const { data: lots } = useQuery({
    queryKey: ["public-lots", propertyId],
    queryFn: () => endpoints.lots(propertyId),
    enabled: Boolean(propertyId),
  });

  const property = properties?.find(
    (p) => p.id === propertyId && isLivePropertyId(p.id),
  );

  useEffect(() => {
    if (!propertyId || !isLivePropertyId(propertyId)) {
      router.replace("/book/spots");
      return;
    }
    if (propsPending || !properties) return;
    if (!property) {
      router.replace("/book/spots");
    }
  }, [propsPending, properties, property, propertyId, router]);
  const available = useMemo(
    () => (lots ?? []).filter((l) => l.status === "available"),
    [lots],
  );

  const selectableLots = useMemo(() => {
    if (form.productType === "storage_acre") {
      return available.filter((l) => l.lotType === "acre");
    }
    if (form.productType === "parking_spot") {
      return available.filter((l) => l.lotType !== "acre");
    }
    return available;
  }, [available, form.productType]);

  useEffect(() => {
    setForm((f) => {
      const n = Math.max(1, Math.min(10, f.spotCount));
      if (f.vehicles.length === n) return f;
      const vehicles = [...f.vehicles];
      while (vehicles.length < n) vehicles.push(emptyVehicle());
      while (vehicles.length > n) vehicles.pop();
      return { ...f, spotCount: n, vehicles };
    });
  }, [form.spotCount]);

  /** Staff assigns final spots; we reserve matching open inventory for pricing. */
  useEffect(() => {
    let ids: string[] = [];
    if (form.productType === "parking_spot") {
      ids = selectableLots.slice(0, form.spotCount).map((l) => l.id);
    } else if (form.productType === "storage_acre") {
      const match =
        selectableLots.find(
          (l) => Math.abs((l.acres ?? 0) - form.acreSize) < 0.01,
        ) ?? selectableLots[0];
      if (match) ids = [match.id];
    }
    setForm((f) => {
      const same =
        ids.length === f.selectedLotIds.length &&
        ids.every((id, i) => id === f.selectedLotIds[i]);
      return same ? f : { ...f, selectedLotIds: ids };
    });
  }, [
    selectableLots,
    form.productType,
    form.spotCount,
    form.acreSize,
  ]);

  const selectedLots = useMemo(
    () =>
      selectableLots.filter((l) => form.selectedLotIds.includes(l.id)),
    [selectableLots, form.selectedLotIds],
  );

  const pricing = useMemo(() => {
    let monthly = selectedLots.reduce((s, l) => s + l.monthlyRate, 0);
    if (monthly === 0 && form.productType === "storage_acre") {
      const match = selectableLots.find(
        (l) => Math.abs((l.acres ?? 0) - form.acreSize) < 0.01,
      );
      monthly = match?.monthlyRate ?? form.acreSize * 2000;
    }
    if (
      monthly === 0 &&
      form.productType === "parking_spot" &&
      selectableLots[0]
    ) {
      monthly = (selectableLots[0].monthlyRate || 400) * form.spotCount;
    }
    const day = new Date().getDate();
    const daysInMonth = 30;
    const remaining = Math.max(1, daysInMonth - day + 1);
    const prorata = Math.round((monthly * remaining) / daysInMonth);
    const deposit = monthly;
    const tax = Math.round((prorata + deposit) * 0.056 * 100) / 100;
    const total = prorata + deposit + tax;
    const firstCycle = Math.round(monthly * (28 / 30) * 100) / 100;
    return {
      monthly,
      prorata,
      deposit,
      tax,
      total,
      remaining,
      firstCycle,
      nextMonth: monthly,
      spotCount: selectedLots.length || form.spotCount,
    };
  }, [
    selectedLots,
    form.productType,
    form.acreSize,
    form.spotCount,
    selectableLots,
  ]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
    setDraftSaved(false);
  }

  function patchVehicle(i: number, key: keyof Vehicle, value: string | boolean) {
    setForm((f) => ({
      ...f,
      vehicles: f.vehicles.map((v, idx) =>
        idx === i ? { ...v, [key]: value } : v,
      ),
    }));
  }

  function validateStep(): boolean {
    if (step === 0) {
      if (
        !form.companyName.trim() ||
        !form.taxId.trim() ||
        !form.email.trim() ||
        !form.phone.trim() ||
        !form.firstName.trim() ||
        !form.lastName.trim() ||
        !form.address.trim()
      ) {
        setError("Fill all required contact fields.");
        return false;
      }
    }
    if (step === 1) {
      if (!form.leaseStart) {
        setError("Select a lease start date.");
        return false;
      }
      if (!form.productType) {
        setError("Select parking by spot or storage by acre.");
        return false;
      }
      if (form.productType === "parking_spot") {
        for (let i = 0; i < form.vehicles.length; i++) {
          const v = form.vehicles[i]!;
          if (!v.make.trim() || !v.color.trim() || !v.truckNumber.trim()) {
            setError(`Vehicle ${i + 1}: make, color, and truck # required.`);
            return false;
          }
          // Plates optional — fill later or leave blank (David)
        }
      }
      if (
        form.productType === "storage_acre" &&
        !form.storageDescription.trim()
      ) {
        setError("Tell us what you will be storing.");
        return false;
      }
    }
    if (step === 2) {
      if (!form.agreeLease || !form.lesseeName.trim() || !form.lesseeSignature) {
        setError("Agree to the lease, type your name, and draw your signature.");
        return false;
      }
      if (
        !form.agreeGuarantee ||
        !form.guarantorName.trim() ||
        !form.guarantorSignature
      ) {
        setError(
          "Accept the personal guarantee and provide guarantor name + signature.",
        );
        return false;
      }
      if (!form.idFileName || !idFile) {
        setError("Please upload a photo of your government ID to continue.");
        return false;
      }
      if (!form.idVerifySkipTest) {
        if (form.idVerifyStatus === "checking") {
          setError("Still verifying your Photo ID — wait a moment.");
          return false;
        }
        if (form.idVerifyStatus === "missing_signer") {
          setError(
            "Enter your signer name above, then re-upload your Photo ID.",
          );
          return false;
        }
        if (form.idVerifyStatus === "name_mismatch") {
          setError(
            form.idVerifyMessage ||
              "Name on the Photo ID must match your signer name.",
          );
          return false;
        }
        if (form.idVerifyStatus !== "matched") {
          setError(
            form.idVerifyMessage ||
              "Please upload a clear government Photo ID to continue.",
          );
          return false;
        }
      }
      if (!form.docsSubmitLater && !form.coiFileName) {
        setError(
          "Upload certificate of insurance, or check Submit COI later.",
        );
        return false;
      }
    }
    if (step === 3) {
      if (!form.agreeAutoPull) {
        setError(
          "Please accept the automatic payment authorization to continue.",
        );
        return false;
      }
      if (form.paymentMethod === "card") {
        if (
          !form.cardName.trim() ||
          form.cardNumber.replace(/\s/g, "").length < 12 ||
          !form.cardExp.trim() ||
          !form.cardCvv.trim() ||
          !form.billingZip.trim()
        ) {
          setError("Complete card details (Authorize.net).");
          return false;
        }
      } else if (!isValidAbaRouting(form.routingNumber)) {
        setError("Enter a valid 9-digit bank routing number.");
        return false;
      } else if (form.accountNumber.trim().length < 4) {
        setError("Enter a valid bank account number.");
        return false;
      }
    }
    setError("");
    return true;
  }

  const submit = useMutation({
    mutationFn: () => {
      const primaryLot = selectedLots[0];
      const lotType: LotType =
        form.productType === "storage_acre"
          ? "acre"
          : primaryLot?.lotType ?? "truck_trailer";
      return endpoints.createBooking({
        propertyId,
        lotType,
        customerName: form.companyName,
        email: form.email,
        phone: form.phone,
        monthlyRate: pricing.monthly,
        notes: [
          `${form.firstName} ${form.lastName}`,
          form.address,
          form.productType === "storage_acre"
            ? `Acre ${form.acreSize}: ${form.storageDescription}`
            : `${form.spotCount} spot(s)`,
          form.docsSubmitLater ? "COI submit later" : "ID + COI uploaded",
          `Signed ${form.signatureDate}`,
        ].join(" · "),
        productType: form.productType || "parking_spot",
        spotCount:
          form.productType === "parking_spot" ? form.spotCount : undefined,
        acreSize:
          form.productType === "storage_acre" ? form.acreSize : undefined,
        storageDescription:
          form.productType === "storage_acre"
            ? form.storageDescription
            : undefined,
        leaseStart: form.leaseStart,
        vehicles:
          form.productType === "parking_spot" ? form.vehicles : undefined,
        docsSubmitLater: form.docsSubmitLater,
        wizardStep: 4,
        autoPullAgreed: form.agreeAutoPull,
        paymentMethod: form.paymentMethod,
        lotId: primaryLot?.id,
      });
    },
    onSuccess: (b) => setDoneId(b.id),
    onError: (e: Error) => setError(e.message || "Could not submit"),
  });

  function saveDraft() {
    try {
      localStorage.setItem(
        `paddock-book-draft-${propertyId}`,
        JSON.stringify({
          form,
          step,
          savedAt: Date.now(),
          wizardVersion: WIZARD_VERSION,
        }),
      );
      setDraftSaved(true);
    } catch {
      setError("Could not save draft in this browser.");
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`paddock-book-draft-${propertyId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        form: FormState;
        step: number;
        wizardVersion?: number;
      };
      if (parsed?.form) {
        // File blobs aren’t in localStorage — force Photo ID re-upload + OCR
        setForm({
          ...emptyForm(),
          ...parsed.form,
          idFileName: "",
          idVerifyStatus: "idle",
          idVerifyMessage: "",
        });
        if (typeof parsed.step === "number") {
          let s = parsed.step;
          // Old 5-step drafts: Contact, Lease, Spot, Agreement, Pay
          if (parsed.wizardVersion !== WIZARD_VERSION) {
            if (s <= 1) s = s;
            else if (s <= 3) s = 2; // spot or agreement → agreement
            else s = 3; // pay
          }
          setStep(Math.min(s, STEPS.length - 1));
        }
      }
    } catch {
      /* ignore */
    }
  }, [propertyId]);

  if (!property && properties) {
    return (
      <BookChrome>
        <div className={`${BOOK_SHELL} py-16 text-center`}>
          <p className="text-lg font-semibold">Location not found</p>
          <Link href="/book/spots" className="mt-4 inline-block underline">
            Back to locations
          </Link>
        </div>
      </BookChrome>
    );
  }

  if (doneId) {
    return (
      <BookChrome>
        <div className={`${BOOK_SHELL} py-16 sm:py-20`}>
          <motion.div
            className="mx-auto max-w-lg text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#ecfdf5] text-[#15803d] ring-8 ring-[#d1fae5]/60"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 18,
                delay: 0.08,
              }}
            >
              <motion.span
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Check className="h-8 w-8 stroke-[2.5]" />
              </motion.span>
            </motion.div>

            <h1 className="mt-6 font-[family-name:var(--font-sora)] text-3xl font-semibold tracking-tight text-[#0a1628] sm:text-4xl">
              Order confirmed — spot reserved
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[#64748b]">
              Congratulations — your parking reservation is submitted and
              confirmed. We&apos;ll email{" "}
              <span className="font-medium text-[#0a1628]">{form.email}</span>{" "}
              with next steps. Your{" "}
              <span className="font-semibold text-[#0a1628]">gate code</span>{" "}
              arrives before your start date so you can begin parking on day
              one. Staff will finalize yard assignment in Onboarding.
            </p>
            <p className="mt-3 text-sm text-[#94a3b8]">
              Reference{" "}
              <span className="font-mono font-semibold text-[#0a1628]">
                {doneId}
              </span>
            </p>

            <motion.div
              className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.35 }}
            >
              <Link
                href="/book/spots"
                className="inline-flex items-center justify-center rounded-xl bg-[#E8C547] px-5 py-3 text-sm font-bold text-[#0a1628]"
              >
                Back to spots
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-xl border border-[#0a1628]/15 px-5 py-3 text-sm font-bold text-[#0a1628]"
              >
                Home
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </BookChrome>
    );
  }

  return (
    <BookChrome>
      <section className="border-b border-[#e8ecf0] bg-white py-8">
        <div className={BOOK_SHELL}>
          <p className="text-center text-sm font-semibold tracking-wide text-[#0a1628]">
            Paddock Parking
          </p>
          <h1 className="mt-2 text-center text-2xl font-bold text-[#0a1628] sm:text-3xl">
            {property?.name ?? "Book"} —{" "}
            {property?.address ?? "Contractor & Equipment Storage"}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-[#64748b]">
            Secure storage for contractors and equipment. Month-to-month leases
            with flexible terms.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                    i === step
                      ? "bg-[#0a1628] text-white"
                      : i < step
                        ? "bg-[#E8C547] text-[#0a1628]"
                        : "bg-[#e8ecf0] text-[#94a3b8]",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-semibold sm:inline",
                    i === step ? "text-[#0a1628]" : "text-[#94a3b8]",
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${BOOK_SHELL} py-10`}>
        <div className="mx-auto max-w-4xl space-y-5 rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <>
              <h2 className="text-lg font-semibold text-[#0a1628]">
                Step 1 — Contact Info
              </h2>
              <Field label="Company Name" required>
                <input
                  className={inputClass}
                  placeholder="Your company or business name"
                  value={form.companyName}
                  onChange={(e) => patch("companyName", e.target.value)}
                />
              </Field>
              <Field
                label="Tax ID / EIN"
                required
                hint="Your business Tax ID or EIN number"
              >
                <input
                  className={inputClass}
                  placeholder="XX-XXXXXXX"
                  value={form.taxId}
                  onChange={(e) => patch("taxId", e.target.value)}
                />
              </Field>
              <Field
                label="Email Address"
                required
                hint="We will send your gate code and lease details here"
              >
                <input
                  type="email"
                  className={inputClass}
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => patch("email", e.target.value)}
                />
              </Field>
              <Field label="Phone Number" required>
                <input
                  className={inputClass}
                  placeholder="(XXX) XXX-XXXX"
                  value={form.phone}
                  onChange={(e) => patch("phone", e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact First Name" required>
                  <input
                    className={inputClass}
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(e) => patch("firstName", e.target.value)}
                  />
                </Field>
                <Field label="Contact Last Name" required>
                  <input
                    className={inputClass}
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(e) => patch("lastName", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Billing Address" required>
                <input
                  className={inputClass}
                  placeholder="Street address, City, State, ZIP"
                  value={form.address}
                  onChange={(e) => patch("address", e.target.value)}
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-[#0a1628]">
                Step 2 — Lease Details
              </h2>
              <Field
                label="Lease Start Date"
                required
                hint="Select when you would like to start (within the next 10 days preferred)"
              >
                <input
                  type="date"
                  className={inputClass}
                  value={form.leaseStart}
                  onChange={(e) => patch("leaseStart", e.target.value)}
                />
              </Field>

              {/* David: replace MTM-only with parking-by-spot vs storage-by-acre */}
              <Field
                label="Lease Type"
                required
                hint="Parking by spot, or storage by acre"
              >
                <select
                  className={inputClass}
                  value={form.productType}
                  onChange={(e) => {
                    patch(
                      "productType",
                      e.target.value as FormState["productType"],
                    );
                    patch("selectedLotIds", []);
                  }}
                >
                  <option value="">Select…</option>
                  <option value="parking_spot">Parking by spot</option>
                  <option value="storage_acre">Storage by acre</option>
                </select>
              </Field>

              {form.productType === "parking_spot" && (
                <>
                  <Field label="How many truck spots?" required>
                    <select
                      className={inputClass}
                      value={form.spotCount}
                      onChange={(e) =>
                        patch("spotCount", Number(e.target.value))
                      }
                    >
                      {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {form.vehicles.map((v, i) => (
                    <div
                      key={i}
                      className="space-y-3 rounded-xl border border-[#e8ecf0] p-4"
                    >
                      <p className="text-sm font-bold">Vehicle {i + 1}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Make" required>
                          <input
                            className={inputClass}
                            placeholder="Volvo"
                            value={v.make}
                            onChange={(e) =>
                              patchVehicle(i, "make", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Color" required>
                          <input
                            className={inputClass}
                            value={v.color}
                            onChange={(e) =>
                              patchVehicle(i, "color", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Truck number" required>
                          <input
                            className={inputClass}
                            value={v.truckNumber}
                            onChange={(e) =>
                              patchVehicle(i, "truckNumber", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="License plate">
                          <input
                            className={inputClass}
                            disabled={v.submitLater}
                            value={v.licensePlate}
                            onChange={(e) =>
                              patchVehicle(i, "licensePlate", e.target.value)
                            }
                            placeholder={
                              v.submitLater ? "Filling out later" : "Optional"
                            }
                          />
                        </Field>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-[#0a1628]">
                        <input
                          type="checkbox"
                          checked={v.submitLater}
                          onChange={(e) =>
                            patchVehicle(i, "submitLater", e.target.checked)
                          }
                        />
                        Fill plate out later
                      </label>
                    </div>
                  ))}
                </>
              )}

              {form.productType === "storage_acre" && (
                <>
                  <Field label="How much storage?" required>
                    <select
                      className={inputClass}
                      value={form.acreSize}
                      onChange={(e) =>
                        patch("acreSize", Number(e.target.value))
                      }
                    >
                      {ACRE_OPTIONS.map((a) => (
                        <option key={a} value={a}>
                          {a} acre{a === 1 ? "" : "s"}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="What will you be storing?"
                    required
                    hint="This helps us assign the best spot for your needs"
                  >
                    <textarea
                      className={cn(inputClass, "h-24 py-2")}
                      value={form.storageDescription}
                      onChange={(e) =>
                        patch("storageDescription", e.target.value)
                      }
                    />
                  </Field>
                </>
              )}

              {form.productType === "parking_spot" && (
                <Field
                  label="What will you be storing? (optional)"
                  hint="This helps us assign the best spot for your needs"
                >
                  <textarea
                    className={cn(inputClass, "h-20 py-2")}
                    value={form.storageDescription}
                    onChange={(e) =>
                      patch("storageDescription", e.target.value)
                    }
                  />
                </Field>
              )}
            </>
          )}

          {step === 2 && (
            <AgreementStep
              value={{
                agreeLease: form.agreeLease,
                lesseeName: form.lesseeName,
                lesseeSignature: form.lesseeSignature,
                agreeGuarantee: form.agreeGuarantee,
                guarantorName: form.guarantorName,
                guarantorSignature: form.guarantorSignature,
                signatureDate: form.signatureDate,
                idFileName: form.idFileName,
                idVerifyStatus: form.idVerifyStatus,
                idVerifyMessage: form.idVerifyMessage,
                idVerifySkipTest: form.idVerifySkipTest,
                coiFileName: form.coiFileName,
                docsSubmitLater: form.docsSubmitLater,
              }}
              idFile={idFile}
              onIdFile={setIdFile}
              onChange={(key, next) => {
                patch(key, next as FormState[typeof key]);
              }}
            />
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold text-[#0a1628]">
                Step 4 — Review Your Booking
              </h2>
              <div className="space-y-2 rounded-xl border border-[#e8ecf0] bg-[#f8fafc] p-4 text-sm">
                <p className="font-semibold">Your request</p>
                <p className="font-medium text-[#0a1628]">
                  {form.productType === "storage_acre"
                    ? `Storage · ${form.acreSize} acre`
                    : `Parking · ${form.spotCount} spot${form.spotCount === 1 ? "" : "s"}`}
                </p>
                <p className="text-xs text-[#64748b]">
                  Final stall assignment is confirmed by staff after review.
                </p>
                {selectedLots.length > 0 ? (
                  <div className="pt-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                      Pricing based on
                    </p>
                    {selectedLots.map((l) => (
                      <p key={l.id} className="font-medium">
                        #{l.number} · {l.lotTypeLabel} ·{" "}
                        {formatCurrency(l.monthlyRate)}/mo
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#64748b]">
                    Rate estimated from lease details — inventory will be
                    confirmed by staff.
                  </p>
                )}
                <div className="border-t border-[#e8ecf0] pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Photo ID
                  </p>
                  <p
                    className={
                      form.idVerifySkipTest
                        ? "font-medium text-amber-800"
                        : "font-medium text-emerald-800"
                    }
                  >
                    {form.idVerifySkipTest
                      ? `Test skip — OCR bypassed${form.idFileName ? ` (${form.idFileName})` : ""}`
                      : `Verified — name matches ${form.guarantorName || form.lesseeName}${form.idFileName ? ` (${form.idFileName})` : ""}`}
                  </p>
                </div>

                <p className="pt-2 font-semibold">Pricing Breakdown</p>
                <div className="space-y-1 text-[#64748b]">
                  <div className="flex justify-between">
                    <span>First Billing Cycle (28 days):</span>
                    <span>{formatCurrency(pricing.firstCycle)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Month (Pro-rata):</span>
                    <span>{formatCurrency(pricing.prorata)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Month:</span>
                    <span>{formatCurrency(pricing.nextMonth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security Deposit (Refundable):</span>
                    <span>{formatCurrency(pricing.deposit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(pricing.tax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#e8ecf0] pt-2 text-base font-bold text-[#0a1628]">
                    <span>Total Due:</span>
                    <span>{formatCurrency(pricing.total)}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#64748b]">
                Secure payment through <strong>Authorize.net</strong>. Card
                surcharge is <strong>3.5%</strong> (Greta). ACH fee still being
                negotiated — shown as TBD until confirmed.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {(
                  [
                    [
                      "card",
                      `Credit / debit card (${CARD_SURCHARGE_LABEL})`,
                    ],
                    ["ach", `ACH bank transfer (${ACH_FEE_LABEL})`],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patch("paymentMethod", id)}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-3 text-sm font-bold",
                      form.paymentMethod === id
                        ? "border-[#E8C547] bg-[#E8C547]/12 text-[#0a1628]"
                        : "border-[#e2e8f0] text-[#64748b]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {form.paymentMethod === "card" ? (
                <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
                  <PaymentCardPreview
                    name={form.cardName}
                    number={form.cardNumber}
                    exp={form.cardExp}
                    cvv={form.cardCvv}
                    showBack={cvvFocused}
                    className="mx-auto w-full lg:sticky lg:top-6 lg:mx-0"
                  />
                  <div className="min-w-0 space-y-3">
                    <Field label="Name on card" required>
                      <input
                        className={inputClass}
                        autoComplete="cc-name"
                        value={form.cardName}
                        onChange={(e) => patch("cardName", e.target.value)}
                        placeholder="Name as it appears on card"
                      />
                    </Field>
                    <Field label="Card number" required>
                      <input
                        className={inputClass}
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="•••• •••• •••• ••••"
                        value={form.cardNumber}
                        onChange={(e) =>
                          patch(
                            "cardNumber",
                            formatCardNumberInput(e.target.value),
                          )
                        }
                      />
                    </Field>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Field label="Exp" required>
                        <input
                          className={inputClass}
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          placeholder="MM/YY"
                          value={form.cardExp}
                          onChange={(e) =>
                            patch("cardExp", formatExpInput(e.target.value))
                          }
                        />
                      </Field>
                      <Field label="CVV" required>
                        <input
                          className={inputClass}
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          placeholder="•••"
                          value={form.cardCvv}
                          onChange={(e) =>
                            patch(
                              "cardCvv",
                              e.target.value.replace(/\D/g, "").slice(0, 4),
                            )
                          }
                          onFocus={() => setCvvFocused(true)}
                          onBlur={() => setCvvFocused(false)}
                        />
                      </Field>
                      <Field label="ZIP" required>
                        <input
                          className={inputClass}
                          autoComplete="postal-code"
                          value={form.billingZip}
                          onChange={(e) => patch("billingZip", e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Field label="Routing number" required>
                    <input
                      className={inputClass}
                      value={form.routingNumber}
                      onChange={(e) => patch("routingNumber", e.target.value)}
                    />
                  </Field>
                  <Field label="Account number" required>
                    <input
                      className={inputClass}
                      value={form.accountNumber}
                      onChange={(e) => patch("accountNumber", e.target.value)}
                    />
                  </Field>
                  <Field label="Account type">
                    <select
                      className={inputClass}
                      value={form.accountType}
                      onChange={(e) =>
                        patch(
                          "accountType",
                          e.target.value as "checking" | "savings",
                        )
                      }
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </Field>
                </div>
              )}

              <label className="flex items-start gap-2.5 rounded-xl border border-[#E8C547]/45 bg-[#E8C547]/10 px-3.5 py-3 text-sm text-[#0a1628]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-[#cbd5e1]"
                  checked={form.agreeAutoPull}
                  onChange={(e) => patch("agreeAutoPull", e.target.checked)}
                />
                <span>
                  <span className="font-semibold">
                    Automatic payment authorization
                    <span className="text-rose-500"> *</span>
                  </span>
                  <span className="mt-1 block text-[#64748b]">
                    I authorize Paddock Parking to automatically debit my
                    payment method on file for each billing cycle’s lot rent and
                    related lease charges until I revoke this authorization in
                    writing under my lease.
                  </span>
                </span>
              </label>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          {draftSaved && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Draft saved in this browser.
            </p>
          )}

          <div className="flex flex-wrap justify-between gap-3 pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-xl border border-[#0a1628]/15 px-4 py-2.5 text-sm font-bold disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={saveDraft}
                className="rounded-xl border border-[#0a1628]/15 px-4 py-2.5 text-sm font-bold"
              >
                Save Draft
              </button>
            </div>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (validateStep()) setStep((s) => s + 1);
                }}
                className="rounded-xl bg-[#0a1628] px-5 py-2.5 text-sm font-bold text-white"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={submit.isPending}
                onClick={() => {
                  if (validateStep()) submit.mutate();
                }}
                className="rounded-xl bg-[#E8C547] px-5 py-2.5 text-sm font-bold text-[#0a1628] disabled:opacity-60"
              >
                {submit.isPending ? "Submitting…" : "Pay & complete"}
              </button>
            )}
          </div>
        </div>
      </section>
    </BookChrome>
  );
}

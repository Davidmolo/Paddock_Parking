/** Paddock Parking domain — aligned to David’s ops needs (not Jazzmin clutter). */

import { sitePlanLots } from "./site-plan-lots.js";

export type LotType =
  | "truck_trailer"
  | "general_storage"
  | "bobtail"
  | "drop_yard"
  | "acre";

export type LotStatus =
  | "available"
  | "available_soon"
  | "occupied"
  | "reserved"
  | "maintenance";

export type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  /** Legal entity that must appear as additional insured on tenant COIs */
  legalEntityName: string;
};

export type Lot = {
  id: string;
  propertyId: string;
  number: string;
  size: string;
  lotType: LotType;
  monthlyRate: number;
  status: LotStatus;
  customerId?: string;
  qbItemName?: string;
  acres?: number;
  /** ISO date — when available_soon frees up */
  availableOn?: string;
  /** ISO date — when this available space became vacant */
  vacantSince?: string;
  /** Prior tenant name (for inventory hover) */
  lastTenantName?: string;
};

export type CustomerDocument = {
  id: string;
  name: string;
  kind: "lease" | "insurance" | "other";
  uploadedAt: string;
  sizeKb: number;
  /** Relative path under /uploads when file was stored locally */
  storagePath?: string;
};

export type Customer = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  propertyId: string;
  contractType: "month_to_month" | "fixed";
  paymentStatus: "current" | "past_due" | "notice";
  balanceDue: number;
  securityDeposit: number;
  leaseStatus: string;
  insuranceOk: boolean;
  achEnabled: boolean;
  gateCode: string;
  isActive: boolean;
  lotIds: string[];
  leaseStart: string;
  leaseEnd?: string;
  /** ISO date — when the customer record was created (newest-first sorts) */
  createdAt?: string;
  portalLastLogin?: string;
  /** Demo portal auth (set after invite) */
  portalPassword?: string;
  portalInviteToken?: string;
  /** ISO time — invite link stops working after this */
  portalInviteExpiresAt?: string;
  documents: CustomerDocument[];
  notes?: string;
};

/**
 * David (meeting): primary = monthly ACH debit (pull); send invoice only if
 * tenant did not agree to ACH. Processor direction: Greta Authorize.net.
 */
export type InvoiceCollectionMethod = "ach_debit" | "send_invoice";

export type Invoice = {
  id: string;
  customerId: string;
  propertyId: string;
  amount: number;
  balance: number;
  status: "paid" | "open" | "overdue" | "partial";
  dueDate: string;
  issuedAt: string;
  /**
   * How we collect this charge. If omitted, derived from customer.achEnabled
   * at read time (ACH on → ach_debit, else send_invoice).
   */
  collectionMethod?: InvoiceCollectionMethod;
};

export type Payment = {
  id: string;
  customerId: string;
  amount: number;
  method: "ach" | "card" | "check" | "cash";
  status: "cleared" | "pending";
  paidAt: string;
  reference?: string;
};

/** David / QB aging — outreach stage on each open balance */
export type CollectionStage =
  | "communicated"
  | "waiting"
  | "waiting_payment"
  | "payment_made";

export type CollectionAccount = {
  id: string;
  customerId: string;
  customerName: string;
  propertyId: string;
  balance: number;
  daysOverdue: number;
  /** Open invoice due date (YYYY-MM-DD) */
  dueDate: string;
  invoiceCount: number;
  /** Legacy outreach queues — still used by send-emails-due */
  queue:
    | "need_email"
    | "need_text"
    | "owner_call"
    | "promised"
    | "dispute"
    | "notice"
    | "in_cure"
    | "lockout";
  /** David: Communicated / Waiting / Waiting for payment / Payment made */
  stage: CollectionStage;
  nextAction: string;
  emails: number;
  texts: number;
  calls: number;
};

/** David Book Now: parking by spot vs storage by acre */
export type BookingProductType = "parking_spot" | "storage_acre";

export type BookingVehicle = {
  make: string;
  color: string;
  truckNumber: string;
  licensePlate: string;
  /** Applicant chose “fill out later” for this vehicle */
  submitLater: boolean;
};

/**
 * FMS-style onboarding progress (last step completed, 1–5).
 * 1 Get started · 2 Business / lease · 3 Verify & pay · 4 Review & sign · 5 Pay
 */
export type BookingWizardStep = 1 | 2 | 3 | 4 | 5;

/** Staff decision on Onboarding Profiles (FMS: Approve / Conditional / Deny) */
export type BookingDecision =
  | "pending"
  | "approved"
  | "conditional"
  | "denied";

export type BookingCondition =
  | "escrow"
  | "bond"
  | "prepaid"
  | "coi_pending"
  | "deposit_hold";

export type BookingPortalStatus = "not_invited" | "invited" | "active";

export type Booking = {
  id: string;
  propertyId: string;
  lotType: LotType;
  customerName: string;
  email: string;
  phone: string;
  status: "new" | "reserved" | "converted" | "cancelled";
  monthlyRate?: number;
  createdAt: string;
  notes?: string;
  lotId?: string;
  /** Set after convert / approve to tenant */
  customerId?: string;
  productType?: BookingProductType;
  spotCount?: number;
  acreSize?: number;
  storageDescription?: string;
  leaseStart?: string;
  vehicles?: BookingVehicle[];
  docsSubmitLater?: boolean;
  /** Last wizard step completed (for Onboarding Profiles) */
  wizardStep?: BookingWizardStep;
  paymentMethod?: "card" | "ach" | "pending";
  autoPullAgreed?: boolean;
  autoPullWaived?: boolean;
  /** FMS: Pending until staff decide once */
  decision?: BookingDecision;
  conditions?: BookingCondition[];
  decidedAt?: string;
  decisionNotes?: string;
  referredBy?: string;
  /** Portal invite is separate from approval (FMS) */
  portalStatus?: BookingPortalStatus;
};

/**
 * Leases we manage in both directions:
 * - tenant: we rent spots/acres TO customers
 * - landlord: we rent the yard FROM a landlord / landowner
 */
export type LeaseDirection = "tenant" | "landlord";

export type Lease = {
  id: string;
  direction: LeaseDirection;
  propertyId: string;
  /** Set when direction === "tenant" */
  customerId?: string;
  /** Set when direction === "landlord" */
  landlordName?: string;
  landlordContact?: string;
  landlordEmail?: string;
  lotNumbers: string[];
  startDate: string;
  endDate?: string;
  /** Next renewal / end-of-term date ops must act on */
  renewalDate?: string;
  /** Days before renewal when contract requires notice / outreach */
  notificationLeadDays: number;
  termMonths?: number;
  monthlyRent: number;
  status: "active" | "pending" | "expired" | "terminated";
  /**
   * Ops stage for renewal / landlord outreach (David).
   * not_contacted → outreach_sent → negotiating → notice_given → renewed | exiting
   */
  stage?:
    | "not_contacted"
    | "outreach_sent"
    | "negotiating"
    | "notice_given"
    | "renewed"
    | "exiting";
  achEnabled: boolean;
  signedDocId?: string;
  notes?: string;
};

export type CoiStatus =
  | "valid"
  | "expiring"
  | "expired"
  | "mismatch"
  | "missing";

/** Certificate of Insurance — must name the correct property legal entity as additional insured */
export type CertificateOfInsurance = {
  id: string;
  customerId: string;
  propertyId: string;
  carrier: string;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  /** Name listed as additional insured on the COI */
  additionalInsuredName: string;
  documentId?: string;
  notes?: string;
};

export type NotificationKind =
  | "lease_renewal"
  | "coi_issue"
  | "ops_renewal_alert";
export type NotificationChannel = "email" | "sms";
export type NotificationStatus = "pending" | "sent" | "failed";

/** Outbound notice queue — renewals & COI follow-ups (demo send logs to store) */
export type OpsNotification = {
  id: string;
  /** Prevents duplicate pending/sent notices for the same event */
  dedupeKey: string;
  kind: NotificationKind;
  channel: NotificationChannel;
  status: NotificationStatus;
  propertyId: string;
  leaseId?: string;
  customerId?: string;
  toName: string;
  toAddress: string;
  subject: string;
  body: string;
  createdAt: string;
  sentAt?: string;
  error?: string;
};

export const notifications: OpsNotification[] = [];

export type DemoUser = {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

export const DEMO_USER: DemoUser = {
  id: "u1",
  username: "admin",
  password: "paddockparking",
  name: "David Molo",
  email: "david@paddockparking.com",
  phone: "(602) 555-0100",
  role: "Owner",
};

export const properties: Property[] = [
  {
    id: "prop-16",
    name: "Paddock 16",
    address: "2005 E Elwood St",
    city: "Phoenix, AZ 85040",
    legalEntityName: "Paddock Parking 16 LLC",
  },
  {
    id: "prop-325",
    name: "Paddock 325",
    address: "325 S 31st Ave",
    city: "Phoenix, AZ 85009",
    legalEntityName: "Paddock Parking 325 LLC",
  },
  {
    id: "prop-6060",
    name: "Paddock 6060",
    address: "6060 W Washington St",
    city: "Phoenix, AZ 85043",
    legalEntityName: "Paddock Parking 6060 LLC",
  },
];

export const customers: Customer[] = [
  {
    id: "c-portal-demo",
    name: "Demo Tenant LLC",
    contactName: "Pat Demo",
    email: "demo.portal@paddockparking.com",
    phone: "(602) 555-0199",
    propertyId: "prop-16",
    contractType: "fixed",
    paymentStatus: "past_due",
    balanceDue: 1050,
    securityDeposit: 450,
    leaseStatus: "Fixed term",
    insuranceOk: true,
    achEnabled: true,
    gateCode: "2468",
    isActive: true,
    lotIds: ["elw-demo-1", "elw-demo-2"],
    leaseStart: "2026-06-01",
    leaseEnd: "2027-05-31",
    createdAt: "2026-05-20",
    portalPassword: "Portal123",
    documents: [
      {
        id: "d-demo-lease",
        name: "lease_agreement.pdf",
        kind: "lease",
        uploadedAt: "2026-06-01",
        sizeKb: 64,
      },
      {
        id: "d-demo-coi",
        name: "insurance_cert.pdf",
        kind: "insurance",
        uploadedAt: "2026-06-01",
        sizeKb: 90,
      },
    ],
    notes: "Demo customer for the customer portal login.",
  },
  {
    id: "c1",
    name: "Golden Horn Transport LLC",
    contactName: "Marcus Hale",
    email: "marcus@goldenhorn.example",
    phone: "(602) 555-0142",
    propertyId: "prop-16",
    contractType: "month_to_month",
    paymentStatus: "past_due",
    balanceDue: 4462.1,
    securityDeposit: 450,
    leaseStatus: "Month to Month",
    insuranceOk: false,
    achEnabled: false,
    gateCode: "4821",
    isActive: true,
    lotIds: ["elw-Lot1", "elw-Lot2"],
    leaseStart: "2024-03-15",
    createdAt: "2024-03-10",
    documents: [
      {
        id: "d1",
        name: "lease_agreement.pdf",
        kind: "lease",
        uploadedAt: "2024-03-15",
        sizeKb: 56,
      },
    ],
  },
  {
    id: "c2",
    name: "Lucas AZ Home Services",
    contactName: "Lucas Reyes",
    email: "lucas@azhome.example",
    phone: "(480) 555-0198",
    propertyId: "prop-16",
    contractType: "month_to_month",
    paymentStatus: "past_due",
    balanceDue: 3070.98,
    securityDeposit: 650,
    leaseStatus: "Month to Month",
    insuranceOk: true,
    achEnabled: false,
    gateCode: "1190",
    isActive: true,
    lotIds: ["elw-P-02"],
    leaseStart: "2023-11-01",
    createdAt: "2023-10-28",
    documents: [
      {
        id: "d2",
        name: "lease_agreement.pdf",
        kind: "lease",
        uploadedAt: "2023-11-01",
        sizeKb: 48,
      },
      {
        id: "d3",
        name: "insurance_cert.pdf",
        kind: "insurance",
        uploadedAt: "2025-01-10",
        sizeKb: 120,
      },
    ],
  },
  {
    id: "c3",
    name: "Fisk & Sons",
    contactName: "Elena Fisk",
    email: "elena@fisksons.example",
    phone: "(623) 555-0111",
    propertyId: "prop-325",
    contractType: "month_to_month",
    paymentStatus: "notice",
    balanceDue: 2000.79,
    securityDeposit: 780,
    leaseStatus: "Month to Month",
    insuranceOk: false,
    achEnabled: true,
    gateCode: "3302",
    isActive: true,
    lotIds: ["p325-B1", "p325-B2"],
    leaseStart: "2025-06-01",
    createdAt: "2025-05-28",
    documents: [],
  },
  {
    id: "c4",
    name: "ValleyWide Xpress Transport",
    contactName: "Jordan Vale",
    email: "ops@valleywide.example",
    phone: "(602) 555-0177",
    propertyId: "prop-325",
    contractType: "fixed",
    paymentStatus: "past_due",
    balanceDue: 1870,
    securityDeposit: 520,
    leaseStatus: "Fixed term",
    insuranceOk: true,
    achEnabled: false,
    gateCode: "7744",
    isActive: true,
    lotIds: ["p325-Lot2"],
    leaseStart: "2024-01-01",
    createdAt: "2023-12-20",
    leaseEnd: "2026-12-31",
    documents: [
      {
        id: "d4",
        name: "lease_signed.pdf",
        kind: "lease",
        uploadedAt: "2024-01-01",
        sizeKb: 62,
      },
    ],
  },
  {
    id: "c5",
    name: "Modern Home Textiles Inc.",
    contactName: "Priya Shah",
    email: "priya@modernhome.example",
    phone: "(480) 555-0133",
    propertyId: "prop-6060",
    contractType: "month_to_month",
    paymentStatus: "current",
    balanceDue: 0,
    securityDeposit: 1120,
    leaseStatus: "Month to Month",
    insuranceOk: true,
    achEnabled: true,
    gateCode: "6060",
    isActive: true,
    lotIds: ["p6060-1", "p6060-2"],
    leaseStart: "2025-11-01",
    createdAt: "2025-10-22",
    portalLastLogin: "2026-10-01",
    documents: [
      {
        id: "d5",
        name: "lease_agreement.pdf",
        kind: "lease",
        uploadedAt: "2025-11-01",
        sizeKb: 55,
      },
    ],
  },
  {
    id: "c6",
    name: "ND Asset Recovery LLC",
    contactName: "Noah Drake",
    email: "noah@ndasset.example",
    phone: "(602) 555-0166",
    propertyId: "prop-16",
    contractType: "month_to_month",
    paymentStatus: "notice",
    balanceDue: 6824.4,
    securityDeposit: 890,
    leaseStatus: "In cure",
    insuranceOk: false,
    achEnabled: false,
    gateCode: "9911",
    isActive: true,
    lotIds: ["elw-UnitedRental"],
    leaseStart: "2024-08-01",
    createdAt: "2024-07-25",
    documents: [],
  },
  {
    id: "c7",
    name: "Truck Parking Source LLC",
    contactName: "Samantha Ortiz",
    email: "sam@truckpark.example",
    phone: "(623) 555-0188",
    propertyId: "prop-6060",
    contractType: "month_to_month",
    paymentStatus: "past_due",
    balanceDue: 4342.8,
    securityDeposit: 560,
    leaseStatus: "Lockout review",
    insuranceOk: false,
    achEnabled: false,
    gateCode: "2200",
    isActive: true,
    lotIds: ["p6060-LotA"],
    leaseStart: "2023-05-01",
    createdAt: "2023-04-18",
    documents: [],
  },
  {
    id: "c8",
    name: "AA& D Transport LLC",
    contactName: "Maria Morales",
    email: "mjl1724@yahoo.com",
    phone: "(602) 349-3074",
    propertyId: "prop-16",
    contractType: "month_to_month",
    paymentStatus: "current",
    balanceDue: 232.65,
    securityDeposit: 225,
    leaseStatus: "Month to Month",
    insuranceOk: false,
    achEnabled: false,
    gateCode: "6201",
    isActive: true,
    lotIds: ["elw-P-01"],
    leaseStart: "2026-08-07",
    createdAt: "2026-08-07",
    portalLastLogin: "2026-08-07",
    documents: [
      {
        id: "d6",
        name: "lease_agreement_20260807.pdf",
        kind: "lease",
        uploadedAt: "2026-08-07",
        sizeKb: 56,
      },
    ],
  },
];

export const lots: Lot[] = [
  ...sitePlanLots.map((lot: (typeof sitePlanLots)[number]) => {
  const occupied: Record<
    string,
    { status: LotStatus; customerId: string; monthlyRate?: number }
  > = {
    "elw-Lot1": { status: "occupied", customerId: "c1", monthlyRate: 2400 },
    "elw-Lot2": { status: "occupied", customerId: "c1", monthlyRate: 4800 },
    "elw-P-01": { status: "occupied", customerId: "c8", monthlyRate: 225 },
    "elw-P-02": { status: "occupied", customerId: "c2", monthlyRate: 225 },
    "elw-UnitedRental": { status: "occupied", customerId: "c6", monthlyRate: 1600 },
    "p325-B1": { status: "occupied", customerId: "c3" },
    "p325-B2": { status: "occupied", customerId: "c3" },
    "p325-Lot2": { status: "occupied", customerId: "c4", monthlyRate: 2400 },
    "p6060-1": { status: "occupied", customerId: "c5", monthlyRate: 180 },
    "p6060-2": { status: "occupied", customerId: "c5", monthlyRate: 180 },
    "p6060-LotA": { status: "occupied", customerId: "c7", monthlyRate: 3600 },
  };
  const patch = occupied[lot.id];
  if (!patch) {
    const base = lot as Lot;
    // Demo vacant ages for hover (“Vacant N days”)
    if (base.status === "available" && !base.vacantSince) {
      return { ...base, vacantSince: "2026-06-01" };
    }
    return base;
  }
  return {
    ...(lot as Lot),
    status: patch.status,
    customerId: patch.customerId,
    monthlyRate: patch.monthlyRate ?? (lot as Lot).monthlyRate,
  };
}),
  {
    id: "elw-demo-1",
    propertyId: "prop-16",
    number: "P-D1",
    size: "25 ft × 75 ft",
    lotType: "truck_trailer",
    monthlyRate: 225,
    status: "occupied",
    customerId: "c-portal-demo",
  },
  {
    id: "elw-demo-2",
    propertyId: "prop-16",
    number: "P-D2",
    size: "25 ft × 75 ft",
    lotType: "truck_trailer",
    monthlyRate: 225,
    status: "occupied",
    customerId: "c-portal-demo",
  },
];

export const invoices: Invoice[] = [
  {
    id: "032517",
    customerId: "c8",
    propertyId: "prop-16",
    amount: 232.65,
    balance: 232.65,
    status: "open",
    dueDate: "2026-10-07",
    issuedAt: "2026-10-01",
  },
  {
    id: "inv-1001",
    customerId: "c1",
    propertyId: "prop-16",
    amount: 2231.05,
    balance: 2231.05,
    status: "overdue",
    dueDate: "2026-07-01",
    issuedAt: "2026-06-25",
  },
  {
    id: "inv-1002",
    customerId: "c1",
    propertyId: "prop-16",
    amount: 2231.05,
    balance: 2231.05,
    status: "overdue",
    dueDate: "2026-08-01",
    issuedAt: "2026-07-25",
  },
  {
    id: "inv-1004",
    customerId: "c6",
    propertyId: "prop-16",
    amount: 6824.4,
    balance: 6824.4,
    status: "overdue",
    dueDate: "2026-09-15",
    issuedAt: "2026-09-01",
  },
  {
    id: "inv-1005",
    customerId: "c5",
    propertyId: "prop-6060",
    amount: 1120,
    balance: 0,
    status: "paid",
    dueDate: "2026-09-01",
    issuedAt: "2026-08-25",
  },
  {
    id: "inv-1006",
    customerId: "c3",
    propertyId: "prop-325",
    amount: 780,
    balance: 200,
    status: "partial",
    dueDate: "2026-09-20",
    issuedAt: "2026-09-05",
  },
  {
    id: "inv-demo-paid",
    customerId: "c-portal-demo",
    propertyId: "prop-16",
    amount: 450,
    balance: 0,
    status: "paid",
    dueDate: "2026-09-01",
    issuedAt: "2026-08-25",
    collectionMethod: "ach_debit",
  },
  {
    id: "inv-demo-partial",
    customerId: "c-portal-demo",
    propertyId: "prop-16",
    amount: 450,
    balance: 150,
    status: "partial",
    dueDate: "2026-10-01",
    issuedAt: "2026-09-25",
    collectionMethod: "ach_debit",
  },
  {
    id: "inv-demo-overdue",
    customerId: "c-portal-demo",
    propertyId: "prop-16",
    amount: 450,
    balance: 450,
    status: "overdue",
    dueDate: "2026-11-01",
    issuedAt: "2026-10-25",
    collectionMethod: "ach_debit",
  },
  {
    id: "inv-demo-open",
    customerId: "c-portal-demo",
    propertyId: "prop-16",
    amount: 450,
    balance: 450,
    status: "open",
    dueDate: "2026-12-01",
    issuedAt: "2026-11-01",
    collectionMethod: "ach_debit",
  },
];

export const payments: Payment[] = [
  {
    id: "pay-demo",
    customerId: "c-portal-demo",
    amount: 450,
    method: "ach",
    status: "cleared",
    paidAt: "2026-09-02",
    reference: "ACH-DEMO-0902",
  },
  {
    id: "pay1",
    customerId: "c5",
    amount: 1120,
    method: "ach",
    status: "cleared",
    paidAt: "2026-09-02",
    reference: "ACH-9912",
  },
  {
    id: "pay2",
    customerId: "c8",
    amount: 457.65,
    method: "card",
    status: "cleared",
    paidAt: "2026-08-07",
    reference: "pi_3U1vn6FH9n2NKbXm0JOXeqv7",
  },
  {
    id: "pay3",
    customerId: "c8",
    amount: 255.92,
    method: "check",
    status: "cleared",
    paidAt: "2026-09-22",
  },
];

export const collections: CollectionAccount[] = [
  {
    id: "col1",
    customerId: "c1",
    customerName: "Golden Horn Transport LLC",
    propertyId: "prop-16",
    balance: 4462.1,
    daysOverdue: 30,
    dueDate: "2026-09-28",
    invoiceCount: 2,
    queue: "promised",
    stage: "waiting_payment",
    nextAction: "Promised Fri",
    emails: 1,
    texts: 1,
    calls: 2,
  },
  {
    id: "col2",
    customerId: "c2",
    customerName: "Lucas AZ Home Services",
    propertyId: "prop-16",
    balance: 3070.98,
    daysOverdue: 105,
    dueDate: "2026-07-15",
    invoiceCount: 6,
    queue: "owner_call",
    stage: "waiting_payment",
    nextAction: "—",
    emails: 1,
    texts: 0,
    calls: 1,
  },
  {
    id: "col3",
    customerId: "c3",
    customerName: "Fisk & Sons",
    propertyId: "prop-325",
    balance: 200.79,
    daysOverdue: 0,
    dueDate: "2026-11-15",
    invoiceCount: 1,
    queue: "need_email",
    stage: "waiting_payment",
    nextAction: "Invoice open, not late",
    emails: 0,
    texts: 0,
    calls: 0,
  },
  {
    id: "col4",
    customerId: "c4",
    customerName: "ValleyWide Xpress Transport",
    propertyId: "prop-325",
    balance: 1870,
    daysOverdue: 57,
    dueDate: "2026-09-01",
    invoiceCount: 8,
    queue: "need_text",
    stage: "communicated",
    nextAction: "—",
    emails: 2,
    texts: 1,
    calls: 1,
  },
  {
    id: "col5",
    customerId: "c8",
    customerName: "AA& D Transport LLC",
    propertyId: "prop-16",
    balance: 232.65,
    daysOverdue: 8,
    dueDate: "2026-10-20",
    invoiceCount: 1,
    queue: "need_email",
    stage: "communicated",
    nextAction: "Email logged",
    emails: 1,
    texts: 0,
    calls: 0,
  },
  {
    id: "col6",
    customerId: "c5",
    customerName: "Modern Home Textiles Inc.",
    propertyId: "prop-6060",
    balance: 0,
    daysOverdue: 0,
    dueDate: "2026-11-01",
    invoiceCount: 1,
    queue: "promised",
    stage: "payment_made",
    nextAction: "Cleared",
    emails: 0,
    texts: 0,
    calls: 0,
  },
  {
    id: "col7",
    customerId: "c6",
    customerName: "ND Asset Recovery LLC",
    propertyId: "prop-16",
    balance: 6824.4,
    daysOverdue: 45,
    dueDate: "2026-09-13",
    invoiceCount: 1,
    queue: "lockout",
    stage: "waiting",
    nextAction: "No reply",
    emails: 2,
    texts: 1,
    calls: 0,
  },
  {
    id: "col8",
    customerId: "c7",
    customerName: "Truck Parking Source LLC",
    propertyId: "prop-6060",
    balance: 4342.8,
    daysOverdue: 149,
    dueDate: "2026-06-01",
    invoiceCount: 4,
    queue: "lockout",
    stage: "waiting",
    nextAction: "Lockout review",
    emails: 1,
    texts: 0,
    calls: 2,
  },
];

export const leases: Lease[] = [
  // —— Landlord leases (we rent FROM landowners) ——
  {
    id: "ll-16",
    direction: "landlord",
    propertyId: "prop-16",
    landlordName: "Elwood Yard Holdings LLC",
    landlordContact: "Diane Ortiz",
    landlordEmail: "diane@elwoodyard.example",
    lotNumbers: ["Yard master"],
    startDate: "2022-01-01",
    endDate: "2027-12-31",
    renewalDate: "2026-12-31",
    notificationLeadDays: 90,
    termMonths: 60,
    monthlyRent: 28500,
    status: "active",
    achEnabled: true,
    notes: "Master ground lease — notify landlord 90 days before renewal",
  },
  {
    id: "ll-325",
    direction: "landlord",
    propertyId: "prop-325",
    landlordName: "31st Avenue Partners",
    landlordContact: "Greg Hahn",
    landlordEmail: "greg@31stavpartners.example",
    lotNumbers: ["Yard master"],
    startDate: "2023-06-01",
    endDate: "2026-11-30",
    renewalDate: "2026-11-30",
    notificationLeadDays: 60,
    termMonths: 36,
    monthlyRent: 24200,
    status: "active",
    achEnabled: true,
    notes: "Renewal window open — landlord notice due",
  },
  {
    id: "ll-6060",
    direction: "landlord",
    propertyId: "prop-6060",
    landlordName: "West Wash Industrial LLC",
    landlordContact: "Omar Blake",
    landlordEmail: "omar@westwash.example",
    lotNumbers: ["Yard master"],
    startDate: "2024-04-01",
    endDate: "2027-03-31",
    renewalDate: "2027-03-31",
    notificationLeadDays: 60,
    termMonths: 36,
    monthlyRent: 31000,
    status: "active",
    achEnabled: true,
  },
  // —— Tenant leases (we rent TO customers) ——
  {
    id: "ls1",
    direction: "tenant",
    customerId: "c5",
    propertyId: "prop-6060",
    lotNumbers: ["1", "2"],
    startDate: "2025-11-01",
    renewalDate: "2026-11-01",
    notificationLeadDays: 30,
    termMonths: 12,
    monthlyRent: 1120,
    status: "active",
    achEnabled: true,
    signedDocId: "d5",
  },
  {
    id: "ls2",
    direction: "tenant",
    customerId: "c1",
    propertyId: "prop-16",
    lotNumbers: ["Lot 1", "Lot 2"],
    startDate: "2024-03-15",
    renewalDate: "2026-11-15",
    notificationLeadDays: 30,
    monthlyRent: 450,
    status: "active",
    achEnabled: false,
    signedDocId: "d1",
    notes: "Month-to-month — annual rate review / renewal notice",
  },
  {
    id: "ls3",
    direction: "tenant",
    customerId: "c8",
    propertyId: "prop-16",
    lotNumbers: ["P-01"],
    startDate: "2026-08-07",
    renewalDate: "2027-08-07",
    notificationLeadDays: 30,
    monthlyRent: 225,
    status: "active",
    achEnabled: false,
    signedDocId: "d6",
  },
  {
    id: "ls4",
    direction: "tenant",
    customerId: "c4",
    propertyId: "prop-325",
    lotNumbers: ["Lot 2"],
    startDate: "2024-01-01",
    endDate: "2026-12-31",
    renewalDate: "2026-12-31",
    notificationLeadDays: 60,
    termMonths: 36,
    monthlyRent: 520,
    status: "active",
    achEnabled: false,
    signedDocId: "d4",
    notes: "Fixed term — 60-day renewal notice to customer",
  },
  {
    id: "ls5",
    direction: "tenant",
    customerId: "c2",
    propertyId: "prop-16",
    lotNumbers: ["P-02"],
    startDate: "2023-11-01",
    renewalDate: "2026-10-01",
    notificationLeadDays: 30,
    monthlyRent: 650,
    status: "active",
    achEnabled: false,
    signedDocId: "d2",
    notes: "Renewal notice overdue — follow up with customer",
  },
  {
    id: "ls6",
    direction: "tenant",
    customerId: "c3",
    propertyId: "prop-325",
    lotNumbers: ["B1", "B2"],
    startDate: "2025-06-01",
    renewalDate: "2026-12-01",
    notificationLeadDays: 45,
    monthlyRent: 780,
    status: "active",
    achEnabled: true,
  },
  {
    id: "ls-demo",
    direction: "tenant",
    customerId: "c-portal-demo",
    propertyId: "prop-16",
    lotNumbers: ["P-D1", "P-D2"],
    startDate: "2026-06-01",
    endDate: "2027-05-31",
    renewalDate: "2027-05-31",
    notificationLeadDays: 30,
    termMonths: 12,
    monthlyRent: 450,
    status: "active",
    achEnabled: true,
    signedDocId: "d-demo-lease",
  },
];

/** Tenant COIs — additional insured must match the yard's legalEntityName */
export const certificates: CertificateOfInsurance[] = [
  {
    id: "coi1",
    customerId: "c2",
    propertyId: "prop-16",
    carrier: "Progressive Commercial",
    policyNumber: "PC-884421",
    effectiveDate: "2025-01-10",
    expirationDate: "2027-01-10",
    additionalInsuredName: "Paddock Parking 16 LLC",
    documentId: "d3",
  },
  {
    id: "coi2",
    customerId: "c4",
    propertyId: "prop-325",
    carrier: "State Farm",
    policyNumber: "SF-229910",
    effectiveDate: "2024-06-01",
    expirationDate: "2026-11-15",
    // Wrong entity — should be Paddock Parking 325 LLC
    additionalInsuredName: "Paddock Parking LLC",
    notes: "Additional insured missing property entity — reject / request rewrite",
  },
  {
    id: "coi3",
    customerId: "c5",
    propertyId: "prop-6060",
    carrier: "Travelers",
    policyNumber: "TR-551002",
    effectiveDate: "2025-11-01",
    expirationDate: "2026-11-01",
    additionalInsuredName: "Paddock Parking 6060 LLC",
  },
  {
    id: "coi4",
    customerId: "c1",
    propertyId: "prop-16",
    carrier: "Nationwide",
    policyNumber: "NW-110288",
    effectiveDate: "2024-03-15",
    expirationDate: "2026-03-15",
    additionalInsuredName: "Paddock Parking 16 LLC",
    notes: "Expired — customer must send current COI",
  },
];

export const bookings: Booking[] = [
  {
    id: "bk-demo",
    propertyId: "prop-16",
    lotType: "truck_trailer",
    customerName: "Demo Tenant LLC",
    email: "demo.portal@paddockparking.com",
    phone: "(602) 555-0199",
    status: "converted",
    monthlyRate: 450,
    createdAt: "2026-05-20",
    lotId: "elw-demo-1",
    customerId: "c-portal-demo",
    productType: "parking_spot",
    spotCount: 2,
    acreSize: 0.5,
    storageDescription: "Two trucks, trailers, and spare equipment",
    leaseStart: "2026-06-01",
    wizardStep: 5,
    paymentMethod: "ach",
    autoPullAgreed: true,
    decision: "approved",
    decidedAt: "2026-05-22",
    portalStatus: "active",
    referredBy: "Website",
    vehicles: [
      {
        make: "Peterbilt",
        color: "White",
        truckNumber: "DT-1",
        licensePlate: "AZ-24681",
        submitLater: false,
      },
      {
        make: "Utility",
        color: "Silver",
        truckNumber: "DT-2",
        licensePlate: "",
        submitLater: true,
      },
    ],
  },
  {
    id: "bk1",
    propertyId: "prop-16",
    lotType: "truck_trailer",
    customerName: "Chris Binder Hauling",
    email: "chris@binderhauling.example",
    phone: "(602) 555-0201",
    status: "new",
    monthlyRate: 225,
    createdAt: "2026-10-05",
    notes: "From Book Now — Truck and Trailer",
    productType: "parking_spot",
    spotCount: 2,
    leaseStart: "2026-11-01",
    wizardStep: 4,
    paymentMethod: "ach",
    autoPullAgreed: true,
    decision: "pending",
    portalStatus: "not_invited",
    referredBy: "Yard walk-in",
    vehicles: [
      {
        make: "Peterbilt",
        color: "White",
        truckNumber: "CB-12",
        licensePlate: "",
        submitLater: true,
      },
    ],
    docsSubmitLater: true,
  },
  {
    id: "bk2",
    propertyId: "prop-325",
    lotType: "acre",
    customerName: "Ava Monroe Fleet",
    email: "ava@monroefleet.example",
    phone: "(480) 555-0202",
    status: "reserved",
    monthlyRate: 2400,
    createdAt: "2026-10-03",
    lotId: "p325-Lot5",
    productType: "storage_acre",
    acreSize: 1,
    storageDescription: "Empty containers",
    leaseStart: "2026-11-15",
    wizardStep: 5,
    paymentMethod: "card",
    autoPullAgreed: true,
    decision: "pending",
    portalStatus: "not_invited",
    vehicles: [
      {
        make: "Freightliner",
        color: "Blue",
        truckNumber: "AM-4",
        licensePlate: "AZ-99821",
        submitLater: false,
      },
    ],
  },
  {
    id: "bk3",
    propertyId: "prop-6060",
    lotType: "truck_trailer",
    customerName: "Desert Line Logistics",
    email: "ops@desertline.example",
    phone: "(623) 555-0203",
    status: "new",
    monthlyRate: 250,
    createdAt: "2026-10-28",
    notes: "From Book Now — Truck and Trailer",
    productType: "parking_spot",
    spotCount: 1,
    leaseStart: "2026-11-10",
    wizardStep: 4,
    paymentMethod: "ach",
    autoPullAgreed: true,
    decision: "pending",
    portalStatus: "not_invited",
    referredBy: "Website",
    vehicles: [
      {
        make: "Kenworth",
        color: "Black",
        truckNumber: "DL-7",
        licensePlate: "AZ-44102",
        submitLater: false,
      },
    ],
  },
];

/** Dashboard money figures (QB-style), keyed by property */
export const propertyMetrics: Record<
  string,
  {
    revenue30d: number;
    projectedMonthly: number;
    monthlyMortgage: number;
    outstandingDue: number;
    overdue: number;
    overdueInvoices: number;
    revenueTrend: number[];
  }
> = {
  "prop-16": {
    revenue30d: 76486.51,
    projectedMonthly: 62983.33,
    monthlyMortgage: 28500,
    outstandingDue: 57676.93,
    overdue: 42260.84,
    overdueInvoices: 46,
    revenueTrend: [42638, 61912, 63883, 56579, 62666, 27600],
  },
  "prop-325": {
    revenue30d: 62401.88,
    projectedMonthly: 62190.95,
    monthlyMortgage: 31200,
    outstandingDue: 42011.27,
    overdue: 21533.93,
    overdueInvoices: 16,
    revenueTrend: [63698, 62201, 84733, 59011, 59868, 7999],
  },
  "prop-6060": {
    revenue30d: 84733,
    projectedMonthly: 82010,
    monthlyMortgage: 41000,
    outstandingDue: 9800,
    overdue: 2150,
    overdueInvoices: 7,
    revenueTrend: [56579, 62666, 7999, 84733, 82010, 83110],
  },
};

export const LOT_TYPE_LABELS: Record<LotType, string> = {
  truck_trailer: "Truck and Trailer",
  general_storage: "General Storage",
  bobtail: "Bobtail",
  drop_yard: "Drop Yard",
  acre: "Land / Acre",
};

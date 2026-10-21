const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pp_token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, `API unreachable at ${API_URL}`);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

export type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  legalEntityName?: string;
};

export type LeaseDirection = "tenant" | "landlord";

export type CoiStatus =
  | "valid"
  | "expiring"
  | "expired"
  | "mismatch"
  | "missing";

export type LeaseRecord = {
  id: string;
  direction: LeaseDirection;
  propertyId: string;
  propertyName?: string;
  legalEntityName?: string;
  customerId?: string;
  customerName?: string;
  landlordName?: string;
  landlordContact?: string;
  landlordEmail?: string;
  partyName: string;
  lotNumbers: string[];
  startDate: string;
  endDate?: string;
  renewalDate?: string;
  notificationLeadDays: number;
  termMonths?: number;
  monthlyRent: number;
  status: "active" | "pending" | "expired" | "terminated";
  achEnabled: boolean;
  notes?: string;
  daysToRenewal: number | null;
  noticeDue: boolean;
  urgency: "overdue" | "due" | "upcoming" | "ok";
  notifyByDate?: string;
};

export type LeaseSummary = {
  total: number;
  tenant: number;
  landlord: number;
  renewalsDue: number;
  renewalsOverdue: number;
};

export type CertificateInfo = {
  id?: string;
  customerId?: string;
  propertyId?: string;
  carrier?: string;
  policyNumber?: string;
  effectiveDate?: string;
  expirationDate?: string;
  additionalInsuredName?: string;
  documentId?: string;
  notes?: string;
  status: CoiStatus;
  matchesEntity: boolean;
  requiredAdditionalInsured: string;
  daysToExpiry: number | null;
};

export type LotType =
  | "truck_trailer"
  | "general_storage"
  | "bobtail"
  | "drop_yard"
  | "acre";

export type LotStatus = "available" | "occupied" | "reserved" | "maintenance";

export type Lot = {
  id: string;
  propertyId: string;
  number: string;
  size: string;
  lotType: LotType;
  lotTypeLabel: string;
  monthlyRate: number;
  status: LotStatus;
  customerId?: string;
  customerName?: string;
  qbItemName?: string;
  acres?: number;
};

export type CustomerSummary = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  propertyId: string;
  contractType: string;
  paymentStatus: "current" | "past_due" | "notice";
  balanceDue: number;
  securityDeposit: number;
  leaseStatus: string;
  insuranceOk: boolean;
  coiStatus?: CoiStatus;
  achEnabled: boolean;
  gateCode: string;
  isActive: boolean;
  lotNumbers: string[];
  hasAssignedLot: boolean;
};

export type CustomerDetail = CustomerSummary & {
  lotIds: string[];
  leaseStart: string;
  leaseEnd?: string;
  portalLastLogin?: string;
  documents: {
    id: string;
    name: string;
    kind: string;
    uploadedAt: string;
    sizeKb: number;
    storagePath?: string;
  }[];
  notes?: string;
  property?: Property;
  lots: Lot[];
  invoices: Invoice[];
  payments: {
    id: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string;
    reference?: string;
  }[];
  lease?: {
    id: string;
    direction: LeaseDirection;
    lotNumbers: string[];
    monthlyRent: number;
    status: string;
    achEnabled: boolean;
    startDate: string;
    endDate?: string;
    renewalDate?: string;
    notificationLeadDays: number;
    daysToRenewal: number | null;
    noticeDue: boolean;
    urgency: "overdue" | "due" | "upcoming" | "ok";
    notes?: string;
  };
  certificate: CertificateInfo;
};

export type Invoice = {
  id: string;
  customerId: string;
  propertyId: string;
  amount: number;
  balance?: number;
  status: "paid" | "open" | "overdue" | "partial";
  dueDate: string;
  issuedAt: string;
};

export type CollectionAccount = {
  id: string;
  customerId: string;
  customerName: string;
  propertyId: string;
  balance: number;
  daysOverdue: number;
  invoiceCount: number;
  queue:
    | "need_email"
    | "need_text"
    | "owner_call"
    | "promised"
    | "dispute"
    | "notice"
    | "in_cure"
    | "lockout";
  nextAction: string;
  emails: number;
  texts: number;
  calls: number;
};

export type CollectionsData = {
  yards: {
    propertyId: string;
    name: string;
    address: string;
    balance: number;
    invoiceCount: number;
  }[];
  totals: { atRisk: number; accounts: number; emails: number };
  accounts: CollectionAccount[];
};

export type DashboardProperty = {
  id: string;
  name: string;
  address: string;
  legalEntityName?: string;
  occupancy: number;
  inventory: {
    occupied: number;
    available: number;
    reserved: number;
    total: number;
    availableSpots: string[];
  };
  money: {
    revenue30d: number;
    projectedMonthly: number;
    outstandingDue: number;
    overdue: number;
    overdueInvoices: number;
  };
  tenantHealth: {
    totalActive: number;
    goodStandingPct: number;
    pastDue: number;
    notice: number;
  };
  revenueTrend: number[];
};

export type DashboardData = {
  totals: {
    revenue30d: number;
    projectedMonthly: number;
    outstandingDue: number;
    overdue: number;
    occupied: number;
    available: number;
    totalLots: number;
    tenants: number;
  };
  properties: DashboardProperty[];
  newBookings: number;
  renewalsDue: number;
  coiIssues: number;
};

export type Booking = {
  id: string;
  propertyId: string;
  propertyName?: string;
  lotType: LotType;
  lotTypeLabel: string;
  customerName: string;
  email: string;
  phone: string;
  status: "new" | "reserved" | "converted" | "cancelled";
  monthlyRate?: number;
  createdAt: string;
  notes?: string;
  lotId?: string;
  customerId?: string;
};

export const endpoints = {
  login: (body: { username: string; password: string }) =>
    api<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => api<AuthUser>("/auth/me"),
  updateProfile: (body: { name: string; email: string; phone?: string }) =>
    api<AuthUser>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  updatePassword: (body: {
    currentPassword: string;
    newPassword: string;
  }) =>
    api<{ ok: boolean }>("/auth/password", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  dashboard: (propertyId?: string) =>
    api<DashboardData>(
      `/dashboard${propertyId ? `?propertyId=${propertyId}` : ""}`,
    ),
  properties: () => api<Property[]>("/properties"),
  lots: (propertyId?: string) =>
    api<Lot[]>(`/lots${propertyId ? `?propertyId=${propertyId}` : ""}`),
  patchLot: (
    id: string,
    body: {
      status?: LotStatus;
      monthlyRate?: number;
      customerId?: string | null;
      qbItemName?: string;
    },
  ) =>
    api<Lot>(`/lots/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  customers: (params?: { propertyId?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.propertyId) qs.set("propertyId", params.propertyId);
    if (params?.q) qs.set("q", params.q);
    const q = qs.toString();
    return api<CustomerSummary[]>(`/customers${q ? `?${q}` : ""}`);
  },
  customer: (id: string) => api<CustomerDetail>(`/customers/${id}`),
  collections: (params?: { propertyId?: string; queue?: string }) => {
    const qs = new URLSearchParams();
    if (params?.propertyId) qs.set("propertyId", params.propertyId);
    if (params?.queue) qs.set("queue", params.queue);
    const q = qs.toString();
    return api<CollectionsData>(`/collections${q ? `?${q}` : ""}`);
  },
  patchCollection: (
    id: string,
    body: {
      queue?: CollectionAccount["queue"];
      nextAction?: string;
      logCall?: boolean;
      logEmail?: boolean;
    },
  ) =>
    api<CollectionAccount>(`/collections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  sendCollectionEmailsDue: (propertyId?: string) =>
    api<{ sent: number; accounts: CollectionAccount[] }>(
      `/collections/send-emails-due${propertyId ? `?propertyId=${propertyId}` : ""}`,
      { method: "POST" },
    ),
  invoices: (params?: { propertyId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.propertyId) qs.set("propertyId", params.propertyId);
    if (params?.status) qs.set("status", params.status);
    const q = qs.toString();
    return api<Invoice[]>(`/invoices${q ? `?${q}` : ""}`);
  },
  bookings: (propertyId?: string) =>
    api<Booking[]>(
      `/bookings${propertyId ? `?propertyId=${propertyId}` : ""}`,
    ),
  createBooking: (body: {
    propertyId: string;
    lotType: LotType;
    customerName: string;
    email: string;
    phone: string;
    monthlyRate?: number;
    notes?: string;
  }) =>
    api<Booking>("/bookings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  convertBooking: (id: string, lotId: string) =>
    api<{ booking: Booking; customerId: string; lotId: string }>(
      `/bookings/${id}/convert`,
      { method: "POST", body: JSON.stringify({ lotId }) },
    ),
  leases: (params?: { propertyId?: string; direction?: LeaseDirection }) => {
    const qs = new URLSearchParams();
    if (params?.propertyId) qs.set("propertyId", params.propertyId);
    if (params?.direction) qs.set("direction", params.direction);
    const q = qs.toString();
    return api<LeaseRecord[]>(`/leases${q ? `?${q}` : ""}`);
  },
  leaseRenewalsDue: (propertyId?: string) =>
    api<LeaseRecord[]>(
      `/leases/renewals-due${propertyId ? `?propertyId=${propertyId}` : ""}`,
    ),
  leaseSummary: (propertyId?: string) =>
    api<LeaseSummary>(
      `/leases/summary${propertyId ? `?propertyId=${propertyId}` : ""}`,
    ),
  patchLease: (
    id: string,
    body: {
      startDate?: string;
      endDate?: string;
      renewalDate?: string;
      notificationLeadDays?: number;
      termMonths?: number;
      monthlyRent?: number;
      status?: LeaseRecord["status"];
      landlordName?: string;
      landlordContact?: string;
      landlordEmail?: string;
      notes?: string;
    },
  ) =>
    api<LeaseRecord>(`/leases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  upsertCertificate: (
    customerId: string,
    body: {
      carrier: string;
      policyNumber: string;
      effectiveDate: string;
      expirationDate: string;
      additionalInsuredName: string;
      notes?: string;
      documentId?: string;
    },
  ) =>
    api<CertificateInfo>(`/customers/${customerId}/certificate`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  uploadDocument: (
    customerId: string,
    body: {
      fileName: string;
      kind: "lease" | "insurance" | "other";
      contentBase64: string;
    },
  ) =>
    api<{
      id: string;
      name: string;
      kind: string;
      uploadedAt: string;
      sizeKb: number;
      storagePath?: string;
    }>(`/customers/${customerId}/documents`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  notifications: (params?: {
    status?: "pending" | "sent" | "failed";
    propertyId?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.propertyId) qs.set("propertyId", params.propertyId);
    const q = qs.toString();
    return api<OpsNotification[]>(`/notifications${q ? `?${q}` : ""}`);
  },
  notificationSummary: (propertyId?: string) =>
    api<{ pending: number; sent: number; failed: number }>(
      `/notifications/summary${propertyId ? `?propertyId=${propertyId}` : ""}`,
    ),
  generateNotifications: (propertyId?: string) =>
    api<{ created: number; items: OpsNotification[] }>(
      `/notifications/generate${propertyId ? `?propertyId=${propertyId}` : ""}`,
      { method: "POST" },
    ),
  sendNotification: (id: string) =>
    api<OpsNotification>(`/notifications/${id}/send`, { method: "POST" }),
  sendAllNotifications: () =>
    api<OpsNotification[]>("/notifications/send-all", { method: "POST" }),
};

export type OpsNotification = {
  id: string;
  dedupeKey: string;
  kind: "lease_renewal" | "coi_issue";
  channel: "email" | "sms";
  status: "pending" | "sent" | "failed";
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

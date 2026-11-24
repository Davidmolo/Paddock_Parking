import type { ComponentType, ReactNode } from "react";

export type PortalSignInProps = {
  onSignedIn: (session: PortalSession) => void;
};

export type PortalSession = {
  name: string;
  email: string;
  gateCode: string;
};

export type PortalVehicle = {
  make: string;
  color: string;
  truckNumber: string;
  licensePlate: string;
  submitLater: boolean;
};

export type PortalBooking = {
  reference: string;
  companyName: string;
  bookedOn: string;
  spaceType: string;
  spotCount: number | null;
  acreSize: number | null;
  storing: string;
  leaseStart: string;
  monthlyRate: number | null;
  paymentMethod: "" | "card" | "ach" | "pending";
  decision: "" | "pending" | "approved" | "conditional" | "denied";
  yardName?: string;
  vehicles: PortalVehicle[];
  spaces: string[];
  docsLater: boolean;
};

export type PortalStatProps = {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
};

export type PortalEmailProps = {
  email: string;
  children: ReactNode;
};

export type PortalGateProps = {
  children: ReactNode;
};

export type PortalShellProps = {
  session: PortalSession;
  onSignOut: () => void;
  children: ReactNode;
};

export type PortalInvoicesProps = {
  home: PortalHome;
};

export type PortalPayFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "numeric" | "decimal" | "text";
  onFocus?: () => void;
  onBlur?: () => void;
};

export type PortalBookingCardProps = {
  home: PortalHome;
};

export type PortalHome = {
  name: string;
  email: string;
  phone: string;
  gateCode: string;
  propertyId: string;
  yardName: string;
  yardAddress: string;
  monthlyRate: number | null;
  spaces: string[];
  leaseStart: string;
  daysHere: number | null;
  daysLeft: number | null;
  invoices: PortalInvoice[];
  booking: PortalBooking | null;
  bookings: PortalBooking[];
  contactName: string;
  balanceDue: number;
  paymentStatus: "current" | "past_due" | "notice";
  securityDeposit: number;
  achEnabled: boolean;
  autoPull: boolean;
  payMethod: "card" | "ach";
  contractType: "month_to_month" | "fixed";
  renewalDate: string;
  termMonths: number | null;
  legalEntityName: string;
  insuranceStatus: "valid" | "expiring" | "expired" | "mismatch" | "missing";
  plots: PortalPlot[];
  documents: PortalDocument[];
  payments: PortalPayment[];
  owedPlates: PortalOwedPlate[];
  docsOwed: boolean;
  signedLease: PortalSignedLease | null;
  yards: PortalYard[];
};

export type PortalYard = {
  propertyId: string;
  name: string;
  address: string;
  lotNumbers: string[];
  monthlyRent: number;
  startDate: string;
  documents: PortalDocument[];
  signedLease: PortalSignedLease | null;
};

export type PortalSignedLease = {
  lesseeName: string;
  lesseeSignature: string;
  guarantorName: string;
  guarantorSignature: string;
  signatureDate: string;
};

export type PortalSignatureBlockProps = {
  label: string;
  name: string;
  signature: string;
};

export type PortalYardLeaseProps = {
  yard: PortalYard;
};

export type PortalInvoice = {
  id: string;
  amount: number;
  balance: number;
  status: "paid" | "open" | "overdue" | "partial";
  dueDate: string;
  issuedAt: string;
  collectionMethod: "ach_debit" | "send_invoice";
};

export type PortalDocument = {
  id: string;
  name: string;
  kind: "lease" | "insurance" | "other";
  uploadedAt: string;
  storagePath: string;
  propertyId?: string;
};

export type PortalPayment = {
  id: string;
  amount: number;
  method: "ach" | "card" | "check" | "cash";
  status: "cleared" | "pending" | "failed";
  paidAt: string;
  reference: string;
};

export type PortalPlot = {
  number: string;
  size: string;
  monthlyRate: number;
  propertyId?: string;
  yardName?: string;
};

export type PortalOwedPlate = {
  index: number;
  truckNumber: string;
  make: string;
};

export type PortalAccountProps = {
  home: PortalHome;
};

export type PortalPaymentsProps = {
  home: PortalHome;
};

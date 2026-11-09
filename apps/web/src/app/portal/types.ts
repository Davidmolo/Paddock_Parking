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
  vehicles: PortalVehicle[];
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

export type PortalBookingCardProps = {
  home: PortalHome;
};

export type PortalHome = {
  name: string;
  email: string;
  phone: string;
  gateCode: string;
  yardName: string;
  yardAddress: string;
  monthlyRate: number | null;
  spaces: string[];
  leaseStart: string;
  daysHere: number | null;
  daysLeft: number | null;
  invoices: PortalInvoice[];
  booking: PortalBooking | null;
};

export type PortalInvoice = {
  id: string;
  amount: number;
  balance: number;
  status: "paid" | "open" | "overdue" | "partial";
  dueDate: string;
  issuedAt: string;
};

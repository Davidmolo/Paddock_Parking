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

export type PortalDashboardProps = {
  email: string;
};

export type PortalShellProps = {
  session: PortalSession;
  onSignOut: () => void;
  children: ReactNode;
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
  booking: PortalBooking | null;
};

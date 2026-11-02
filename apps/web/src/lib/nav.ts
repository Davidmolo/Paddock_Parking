import {
  LayoutDashboard,
  Building2,
  Grid3X3,
  Users,
  Wallet,
  FileText,
  UserPlus,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  /** Section label in sidebar; omit for ungrouped top items */
  label?: string;
  /** Icon for expandable group button (same look as nav items) */
  icon?: LucideIcon;
  /** Expandable parent (Properties / Customers) */
  expandable?: boolean;
  items: NavItem[];
};

/**
 * FMS-like ops nav (David Oct 27):
 * Overview · Customers (+ Compliance) · Onboarding · Invoices · Properties
 * Leases stay reachable under Customers for landlord/tenant chase.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/collections", label: "Collections", icon: Wallet },
    ],
  },
  {
    label: "Customers",
    icon: Users,
    expandable: true,
    items: [
      { href: "/customers", label: "All customers", icon: Users },
      { href: "/customers/compliance", label: "Compliance", icon: ShieldCheck },
      { href: "/leases", label: "Leases", icon: ScrollText },
    ],
  },
  {
    label: "Properties",
    icon: Building2,
    expandable: true,
    items: [
      { href: "/lots", label: "Inventory", icon: Grid3X3 },
      { href: "/properties", label: "All properties", icon: Building2 },
    ],
  },
  {
    items: [
      { href: "/bookings", label: "Onboarding", icon: UserPlus },
      { href: "/invoices", label: "Invoices", icon: FileText },
    ],
  },
];

/** Flat list for prefetch / warm routes */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

import {
  LayoutDashboard,
  Building2,
  Grid3X3,
  Users,
  Wallet,
  FileText,
  Receipt,
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
 * FMS-like ops nav (David meeting):
 * Overview · Customers · Properties · Invoices (Invoices + Collections) · Onboarding
 * David: “side menu should have invoice and then underneath collections”
 * Invoices = billing / on-time. Collections = past-due QB aging.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }],
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
    label: "Invoices",
    icon: FileText,
    expandable: true,
    items: [
      { href: "/invoices", label: "Billing", icon: Receipt },
      { href: "/collections", label: "Collections", icon: Wallet },
    ],
  },
  {
    items: [{ href: "/bookings", label: "Onboarding", icon: UserPlus }],
  },
];

/** Flat list for prefetch / warm routes */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

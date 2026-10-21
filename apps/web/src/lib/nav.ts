import {
  LayoutDashboard,
  Building2,
  Grid3X3,
  Users,
  Wallet,
  FileText,
  CalendarPlus,
  ScrollText,
  Bell,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** David scope: tenants, lots, money, aging, bookings, lease + COI + notices */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collections", label: "Collections", icon: Wallet },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/lots", label: "Lots", icon: Grid3X3 },
  { href: "/leases", label: "Leases", icon: ScrollText },
  { href: "/notifications", label: "Notices", icon: Bell },
  { href: "/bookings", label: "Book Now inbox", icon: CalendarPlus },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/invoices", label: "Invoices", icon: FileText },
];

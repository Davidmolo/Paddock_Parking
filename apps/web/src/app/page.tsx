import { redirect } from "next/navigation";

/**
 * Three surfaces:
 * - Customer website → /book
 * - Customer portal → /portal
 * - Admin portal → /login → /dashboard
 */
export default function RootPage() {
  redirect("/login");
}

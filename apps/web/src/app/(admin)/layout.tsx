import { AppShell } from "@/components/app-shell";

/** Admin workspace only. Portal, book, and login stay outside this frame. */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

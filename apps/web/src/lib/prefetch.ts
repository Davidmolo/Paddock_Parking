import type { QueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";

export function propertyParam(propertyId: string | "all") {
  return propertyId === "all" ? undefined : propertyId;
}

export const queryKeys = {
  dashboard: (propertyId: string | "all") =>
    ["dashboard", propertyId] as const,
  properties: () => ["properties"] as const,
  lots: (propertyId: string | "all") => ["lots", propertyId] as const,
  customers: (propertyId: string | "all", q = "") =>
    ["customers", propertyId, q] as const,
  customer: (id: string) => ["customer", id] as const,
  collections: (propertyId: string | "all") =>
    ["collections", propertyId] as const,
  invoices: (propertyId: string | "all") => ["invoices", propertyId] as const,
  bookings: (propertyId: string | "all") => ["bookings", propertyId] as const,
  leases: (propertyId: string | "all") => ["leases", propertyId] as const,
  leaseSummary: (propertyId: string | "all") =>
    ["lease-summary", propertyId] as const,
  notifications: (propertyId: string | "all" = "all") =>
    ["notifications", propertyId] as const,
  notificationSummary: (propertyId: string | "all" = "all") =>
    ["notification-summary", propertyId] as const,
};

export async function prefetchScreenData(
  client: QueryClient,
  href: string,
  propertyId: string | "all",
) {
  const pid = propertyParam(propertyId);

  switch (href) {
    case "/dashboard":
      await client.prefetchQuery({
        queryKey: queryKeys.dashboard(propertyId),
        queryFn: () => endpoints.dashboard(pid),
      });
      break;
    case "/collections":
      await client.prefetchQuery({
        queryKey: queryKeys.collections(propertyId),
        queryFn: () => endpoints.collections({ propertyId: pid }),
      });
      break;
    case "/customers":
      await client.prefetchQuery({
        queryKey: queryKeys.customers(propertyId),
        queryFn: () => endpoints.customers({ propertyId: pid }),
      });
      break;
    case "/lots":
      await client.prefetchQuery({
        queryKey: queryKeys.lots(propertyId),
        queryFn: () => endpoints.lots(pid),
      });
      break;
    case "/leases":
      await Promise.all([
        client.prefetchQuery({
          queryKey: queryKeys.leases(propertyId),
          queryFn: () => endpoints.leases({ propertyId: pid }),
        }),
        client.prefetchQuery({
          queryKey: queryKeys.leaseSummary(propertyId),
          queryFn: () => endpoints.leaseSummary(pid),
        }),
      ]);
      break;
    case "/notifications":
      await Promise.all([
        client.prefetchQuery({
          queryKey: queryKeys.notifications(propertyId),
          queryFn: () =>
            endpoints.notifications({ propertyId: pid }),
        }),
        client.prefetchQuery({
          queryKey: queryKeys.notificationSummary(propertyId),
          queryFn: () => endpoints.notificationSummary(pid),
        }),
      ]);
      break;
    case "/bookings":
      await client.prefetchQuery({
        queryKey: queryKeys.bookings(propertyId),
        queryFn: () => endpoints.bookings(pid),
      });
      break;
    case "/properties":
      await client.prefetchQuery({
        queryKey: queryKeys.properties(),
        queryFn: () => endpoints.properties(),
      });
      break;
    case "/invoices":
      await client.prefetchQuery({
        queryKey: ["invoices", propertyId, "all"],
        queryFn: () => endpoints.invoices({ propertyId: pid }),
      });
      break;
    default:
      break;
  }
}

export async function prefetchAllScreens(
  client: QueryClient,
  propertyId: string | "all",
) {
  const hrefs = [
    "/dashboard",
    "/collections",
    "/customers",
    "/lots",
    "/leases",
    "/notifications",
    "/bookings",
    "/properties",
    "/invoices",
  ] as const;
  await Promise.all(
    hrefs.map((href) => prefetchScreenData(client, href, propertyId)),
  );
}

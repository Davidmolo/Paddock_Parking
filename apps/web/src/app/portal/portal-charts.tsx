"use client";

import { text } from "@/constants/text";
import { PortalChartCard } from "./portal-chart-card";
import type { PortalChartsProps } from "./types";

const statusFill = {
  paid: "#1f7a4d",
  open: "#0a1628",
  overdue: "#b42318",
  partial: "#c9891a",
} as const;

const statusName = {
  paid: text.portal.paid,
  open: text.portal.open,
  overdue: text.portal.overdue,
  partial: text.portal.partial,
} as const;

export function PortalCharts({ home }: PortalChartsProps) {
  const statusRows = (["paid", "open", "overdue", "partial"] as const)
    .map((status) => ({
      name: statusName[status],
      amount: home.invoices
        .filter((invoice) => invoice.status === status)
        .reduce((sum, invoice) => sum + invoice.amount, 0),
      fill: statusFill[status],
    }))
    .filter((row) => row.amount > 0);
  const months = new Map<string, number>();
  for (const payment of home.payments) {
    const key = payment.paidAt.slice(0, 7);
    months.set(key, (months.get(key) ?? 0) + payment.amount);
  }
  const paymentRows = [...months.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, amount]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        name: new Date(year, (month || 1) - 1, 1).toLocaleDateString("en-US", { month: "short" }),
        amount,
      };
    });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PortalChartCard title={text.portal.invoices} subtitle={text.portal.byStatus} rows={statusRows} fills />
      <PortalChartCard title={text.portal.payments} subtitle={text.portal.byMonth} rows={paymentRows} />
    </div>
  );
}

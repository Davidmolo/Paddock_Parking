"use client";

import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/utils";

const Chart = dynamic(() => import("./mini-trend-chart"), {
  ssr: false,
  loading: () => <div className="h-16 w-full rounded-lg bg-[var(--surface-muted)]" />,
});

export function MiniTrend({ data }: { data: number[] }) {
  return <Chart data={data} />;
}

export function formatTrendTip(value: number) {
  return formatCurrency(value);
}

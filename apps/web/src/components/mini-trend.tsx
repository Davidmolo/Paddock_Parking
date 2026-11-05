"use client";

import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const Chart = dynamic(() => import("./mini-trend-chart"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export function MiniTrend({
  data,
  dark,
}: {
  data: number[];
  dark?: boolean;
}) {
  return (
    <div className={cn("w-full", dark ? "h-40" : "h-16")}>
      <Chart data={data} dark={dark} />
    </div>
  );
}

export function formatTrendTip(value: number) {
  return formatCurrency(value);
}

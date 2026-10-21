"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

export default function MiniTrendChart({ data }: { data: number[] }) {
  const chartData = data.map((value, index) => ({ index, value }));
  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #d5dee8",
              background: "#f8fafc",
              fontSize: 12,
            }}
            formatter={(value) => [
              formatCurrency(Number(value ?? 0)),
              "Revenue",
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#0f766e"
            strokeWidth={2}
            fill="url(#trendFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

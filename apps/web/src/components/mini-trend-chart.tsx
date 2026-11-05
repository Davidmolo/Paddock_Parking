"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

export default function MiniTrendChart({
  data,
  dark,
}: {
  data: number[];
  dark?: boolean;
}) {
  const chartData = data.map((value, index) => ({ index, value }));
  const stroke = dark ? "#ff6b57" : "#0078d4";
  const tipBg = dark ? "#0a1628" : "#f8fafc";
  const tipBorder = dark ? "#1e2d45" : "#d5dee8";
  const tipColor = dark ? "#ff6b57" : "#10283f";
  return (
    <div className={dark ? "h-40 w-full" : "h-16 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={dark ? "trendFillDark" : "trendFill"} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={dark ? 0.35 : 0.2} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${tipBorder}`,
              background: tipBg,
              color: tipColor,
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
            stroke={stroke}
            strokeWidth={2.5}
            fill={`url(#${dark ? "trendFillDark" : "trendFill"})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

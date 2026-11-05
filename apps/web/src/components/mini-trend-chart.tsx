"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
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
  const stroke = dark ? "#f5d04a" : "#0a1628";
  const tipBg = dark ? "#0a1628" : "#f8fafc";
  const tipBorder = dark ? "#1e2d45" : "#d5dee8";
  const tipColor = dark ? "#f5d04a" : "#0a1628";
  const fillId = useId().replace(/:/g, "");
  const frame = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const mark = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) setReady(true);
    };
    mark();
    const observer = new ResizeObserver(mark);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frame} className="h-full w-full">
      {ready && (
      <div className="h-full w-full motion-safe:animate-[chart-in_280ms_ease-out]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
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
            fill={`url(#${fillId})`}
            isAnimationActive
            animationDuration={420}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}

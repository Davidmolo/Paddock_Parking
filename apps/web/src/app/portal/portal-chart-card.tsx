"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { text } from "@/constants/text";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { PortalChartCardProps } from "./types";

export function PortalChartCard({ title, subtitle, rows, fills }: PortalChartCardProps) {
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
    <Card interactive={false}>
      <CardHeader>
        <div>
          <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
          <p className="text-[12px] text-[var(--muted)]">{subtitle}</p>
        </div>
      </CardHeader>
      <CardBody>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{text.portal.noChart}</p>
        ) : (
          <div ref={frame} className="h-56 w-full">
            {ready ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={rows} barSize={28}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: "#0a1628", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(10,22,40,0.04)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #d5dee8",
                      background: "#ffffff",
                      color: "#0a1628",
                      fontSize: 12,
                    }}
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), text.portal.amount]}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="#f5d04a" isAnimationActive animationDuration={420}>
                    {fills ? rows.map((row) => <Cell key={row.name} fill={row.fill ?? "#f5d04a"} />) : null}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

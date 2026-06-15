"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { CategorySummary } from "@/lib/types";

// Grayscale ramp + a single muted slate accent (used for the top segment only).
const GRAYS = ["#2b2b2e", "#4d4d52", "#6b6b70", "#8a8a90", "#a9a9ad", "#c7c6c2", "#dcdbd7"];
const ACCENT = "#7c8aa0";

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function SpendingChart({ data }: { data: CategorySummary[] }) {
  // Spending only (exclude Income), absolute amounts, sorted desc.
  const spend = data
    .filter((d) => d.category !== "Income")
    .map((d) => ({ ...d, value: Math.abs(d.totalAmount) }))
    .sort((a, b) => b.value - a.value);

  const colorFor = (i: number) =>
    i === 0 ? ACCENT : GRAYS[i % GRAYS.length];

  if (spend.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-2">
        No spending data yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Pie */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={spend}
              dataKey="value"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={2}
              stroke="none"
            >
              {spend.map((_, i) => (
                <Cell key={i} fill={colorFor(i)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => fmt(v)}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(12,12,13,0.1)",
                background: "#fbfaf7",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + Bar */}
      <div className="flex flex-col justify-center">
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
          {spend.map((s, i) => (
            <div key={s.category} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ background: colorFor(i) }}
              />
              <span className="text-ink">{s.category}</span>
              <span className="text-gray-2">{fmt(s.value)}</span>
            </div>
          ))}
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spend} margin={{ left: -16, right: 8 }}>
              <CartesianGrid vertical={false} stroke="rgba(12,12,13,0.06)" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: "#9a9a9f" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={40}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9a9a9f" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmt(v)}
                width={48}
              />
              <Tooltip
                cursor={{ fill: "rgba(12,12,13,0.04)" }}
                formatter={(v: number) => fmt(v)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(12,12,13,0.1)",
                  background: "#fbfaf7",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {spend.map((_, i) => (
                  <Cell key={i} fill={colorFor(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

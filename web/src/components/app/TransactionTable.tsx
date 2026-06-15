"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, AlertTriangle } from "lucide-react";
import type { Transaction } from "@/lib/types";

type SortKey = "date" | "description" | "category" | "amount";

function fmtAmount(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TransactionTable({ rows }: { rows: Transaction[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "amount") cmp = a.amount - b.amount;
      else cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      return asc ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, asc]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  const headers: { key: SortKey; label: string; align?: string }[] = [
    { key: "date", label: "Date" },
    { key: "description", label: "Description" },
    { key: "category", label: "Category" },
    { key: "amount", label: "Amount", align: "text-right" },
  ];

  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-2">
        No transactions yet — upload a CSV to begin.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-gray-2">
            {headers.map((h) => (
              <th
                key={h.key}
                className={`py-3 pr-4 font-medium ${h.align ?? ""}`}
              >
                <button
                  onClick={() => toggle(h.key)}
                  className={`inline-flex items-center gap-1.5 transition-colors hover:text-ink ${
                    h.align === "text-right" ? "flex-row-reverse" : ""
                  }`}
                >
                  {h.label}
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr
              key={t.id}
              className="border-b border-[var(--line)] transition-colors hover:bg-cream-card/60"
            >
              <td className="whitespace-nowrap py-3.5 pr-4 text-gray-1">
                {t.date}
              </td>
              <td className="py-3.5 pr-4">
                <div className="flex items-center gap-2">
                  {t.anomaly && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-ink" />
                  )}
                  <span className="text-ink">{t.description}</span>
                </div>
              </td>
              <td className="py-3.5 pr-4">
                <span className="inline-flex rounded-full border border-[var(--line)] bg-cream-card px-2.5 py-1 text-xs font-medium text-ink-soft">
                  {t.category}
                </span>
              </td>
              <td
                className={`whitespace-nowrap py-3.5 pr-4 text-right font-medium tabular-nums ${
                  t.amount < 0 ? "text-gray-1" : "text-ink"
                }`}
              >
                {fmtAmount(t.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

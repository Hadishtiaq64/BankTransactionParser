"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { Anomaly } from "@/lib/types";

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AnomalyList({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--line)] bg-cream-card/60 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/5 text-ink">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-ink">No anomalies detected</p>
        <p className="max-w-xs text-xs text-gray-1">
          Anomalies appear once a category has enough transactions to establish
          a typical spending pattern.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {anomalies.map((a, i) => (
        <motion.div
          key={a.transactionId}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.06 }}
          className="rounded-3xl border border-[var(--line)] bg-cream-card p-6 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.4)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-cream">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold leading-tight text-ink">
                  {a.description}
                </p>
                <p className="text-xs text-gray-2">
                  {a.category} · {a.date}
                </p>
              </div>
            </div>
            <span className="whitespace-nowrap text-lg font-semibold tabular-nums text-ink">
              {fmt(a.amount)}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-gray-1">
            {a.explanation}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

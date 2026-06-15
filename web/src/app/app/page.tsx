"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, RefreshCw, Receipt, Wallet, AlertTriangle } from "lucide-react";
import SmokeBackground from "@/components/SmokeBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import CsvUpload from "@/components/app/CsvUpload";
import SpendingChart from "@/components/app/SpendingChart";
import TransactionTable from "@/components/app/TransactionTable";
import AnomalyList from "@/components/app/AnomalyList";
import { transactionApi } from "@/lib/api";
import type { Anomaly, CategorySummary, Transaction } from "@/lib/types";

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-cream-card/70 p-6 backdrop-blur sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function AppPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<CategorySummary[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [txns, sum, anom] = await Promise.all([
        transactionApi.getAll(),
        transactionApi.getSummary(),
        transactionApi.getAnomalies(),
      ]);
      setTransactions(txns);
      setSummary(sum);
      setAnomalies(anom);
    } catch {
      // backend may be offline; leave state empty
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async () => {
    if (!confirm("Delete all transactions?")) return;
    await transactionApi.deleteAll();
    refresh();
  };

  const totalSpend = summary
    .filter((s) => s.category !== "Income")
    .reduce((acc, s) => acc + Math.abs(s.totalAmount), 0);

  const stats = [
    {
      icon: Receipt,
      label: "Transactions",
      value: transactions.length.toLocaleString(),
    },
    {
      icon: Wallet,
      label: "Total spend",
      value: `$${totalSpend.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}`,
    },
    {
      icon: AlertTriangle,
      label: "Anomalies",
      value: anomalies.length.toLocaleString(),
    },
  ];

  return (
    <>
      <SmokeBackground />
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-24 pt-8">
        <Reveal>
          <div className="mb-10">
            <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Dashboard
            </h1>
            <p className="mt-3 max-w-lg text-gray-1">
              Upload a bank CSV. Lustre categorizes every transaction with AI
              and flags anomalies automatically.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="mb-8">
            <CsvUpload onUploaded={() => refresh()} />
          </div>
        </Reveal>

        {/* Stat cards */}
        <Reveal>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-4 rounded-3xl border border-[var(--line)] bg-cream-card/70 p-6 backdrop-blur"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-cream">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-gray-2">
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="flex flex-col gap-8">
          <Reveal>
            <Panel title="Spending breakdown">
              <SpendingChart data={summary} />
            </Panel>
          </Reveal>

          <Reveal>
            <Panel title="Anomalies">
              <AnomalyList anomalies={anomalies} />
            </Panel>
          </Reveal>

          <Reveal>
            <Panel
              title="Transactions"
              action={
                <div className="flex items-center gap-2">
                  <button
                    onClick={refresh}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3.5 py-2 text-xs font-medium text-ink-soft transition-colors hover:bg-ink/5 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                  {transactions.length > 0 && (
                    <button
                      onClick={handleDelete}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3.5 py-2 text-xs font-medium text-ink-soft transition-colors hover:bg-ink/5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  )}
                </div>
              }
            >
              <TransactionTable rows={transactions} />
            </Panel>
          </Reveal>
        </div>
      </main>

      <Footer />
    </>
  );
}

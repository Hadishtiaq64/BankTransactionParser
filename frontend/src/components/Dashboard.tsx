import { useState, useEffect } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { transactionApi } from '../api/transactionApi';
import SpendingChart from './SpendingChart';
import AnomalyList from './AnomalyList';
import TransactionTable from './TransactionTable';
import type { Transaction, CategorySummary, Anomaly } from '../types';

interface DashboardProps {
  refreshTrigger: number;
}

export default function Dashboard({ refreshTrigger }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<CategorySummary[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [txns, sum, anom] = await Promise.all([
        transactionApi.getAll(),
        transactionApi.getSummary(),
        transactionApi.getAnomalies(),
      ]);
      setTransactions(txns);
      setSummary(sum);
      setAnomalies(anom);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-[var(--color-danger)]">{error}</p>
        <button className="btn-primary mt-4" onClick={fetchData}>
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="glass-card p-12 text-center fade-in-up" id="dashboard-empty">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[var(--color-bg-card)] flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
          No Transactions Yet
        </h3>
        <p className="text-[var(--color-text-secondary)] mt-2 max-w-md mx-auto">
          Upload a CSV file of your bank transactions to see your spending breakdown,
          AI-powered categorization, and anomaly detection.
        </p>
      </div>
    );
  }

  // Compute stats
  const totalSpent = transactions
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalIncome = transactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <div className="space-y-8" id="dashboard">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 stagger-children">
        <StatCard
          label="Total Transactions"
          value={transactions.length.toString()}
          color="var(--color-accent)"
          id="stat-total-transactions"
        />
        <StatCard
          label="Total Spending"
          value={formatCurrency(totalSpent)}
          color="var(--color-danger)"
          id="stat-total-spending"
        />
        <StatCard
          label="Total Income"
          value={formatCurrency(totalIncome)}
          color="var(--color-success)"
          id="stat-total-income"
        />
        <StatCard
          label="Anomalies Found"
          value={anomalies.length.toString()}
          color={anomalies.length > 0 ? 'var(--color-warning)' : 'var(--color-success)'}
          id="stat-anomalies"
        />
      </div>

      {/* Charts + Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SpendingChart data={summary} />
        <AnomalyList anomalies={anomalies} />
      </div>

      {/* Transaction Table */}
      <TransactionTable transactions={transactions} />
    </div>
  );
}

// --- Helper Components ---

function StatCard({ label, value, color, id }: { label: string; value: string; color: string; id: string }) {
  return (
    <div className="glass-card p-5" id={id}>
      <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold mt-2" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

import { AlertTriangle, TrendingUp } from 'lucide-react';
import type { Anomaly } from '../types';

interface AnomalyListProps {
  anomalies: Anomaly[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Math.abs(value));

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: '#22c55e',
  Subscriptions: '#8b5cf6',
  Transport: '#3b82f6',
  Dining: '#f59e0b',
  Utilities: '#6366f1',
  Entertainment: '#ec4899',
  Income: '#10b981',
  Other: '#64748b',
};

export default function AnomalyList({ anomalies }: AnomalyListProps) {
  if (anomalies.length === 0) {
    return (
      <div className="glass-card p-8 text-center fade-in-up" id="anomaly-list-empty">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[rgba(34,197,94,0.1)] flex items-center justify-center mb-4">
          <TrendingUp className="w-7 h-7 text-[var(--color-success)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          No Anomalies Detected
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2 max-w-sm mx-auto">
          All your transactions fall within normal spending patterns. Great financial discipline!
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in-up" id="anomaly-list">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-[var(--color-danger)]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Flagged Anomalies
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {anomalies.length} unusual transaction{anomalies.length !== 1 ? 's' : ''} detected
          </p>
        </div>
      </div>

      <div className="space-y-4 stagger-children">
        {anomalies.map((anomaly) => (
          <div key={anomaly.transactionId} className="anomaly-card" id={`anomaly-${anomaly.transactionId}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="category-badge"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[anomaly.category] || '#64748b'}18`,
                      color: CATEGORY_COLORS[anomaly.category] || '#64748b',
                      border: `1px solid ${CATEGORY_COLORS[anomaly.category] || '#64748b'}30`,
                    }}
                  >
                    {anomaly.category}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {new Date(anomaly.date).toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] mt-2 truncate">
                  {anomaly.description}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2 leading-relaxed">
                  💡 {anomaly.explanation}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-[var(--color-danger)]">
                  {formatCurrency(anomaly.amount)}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center justify-end gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Unusual
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

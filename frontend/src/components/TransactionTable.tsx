import { useState } from 'react';
import { ArrowUpDown, AlertTriangle } from 'lucide-react';
import type { Transaction } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
}

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);

type SortKey = 'date' | 'description' | 'amount' | 'category';
type SortDir = 'asc' | 'desc';

export default function TransactionTable({ transactions }: TransactionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...transactions].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'date':
        cmp = a.date.localeCompare(b.date);
        break;
      case 'description':
        cmp = a.description.localeCompare(b.description);
        break;
      case 'amount':
        cmp = a.amount - b.amount;
        break;
      case 'category':
        cmp = (a.category || '').localeCompare(b.category || '');
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="glass-card overflow-hidden fade-in-up" id="transaction-table">
      <div className="p-6 pb-0">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          All Transactions
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {(['date', 'description', 'amount', 'category'] as SortKey[]).map((key) => (
                <th
                  key={key}
                  className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)]
                           uppercase tracking-wider cursor-pointer hover:text-[var(--color-text-secondary)]
                           transition-colors select-none"
                  onClick={() => handleSort(key)}
                >
                  <span className="flex items-center gap-1.5">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    <ArrowUpDown className={`w-3 h-3 ${sortKey === key ? 'text-[var(--color-accent)]' : ''}`} />
                  </span>
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx) => (
              <tr
                key={tx.id}
                className={`border-b border-[var(--color-border)] hover:bg-[rgba(139,92,246,0.04)]
                          transition-colors ${tx.anomaly ? 'bg-[rgba(239,68,68,0.03)]' : ''}`}
                id={`tx-row-${tx.id}`}
              >
                <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
                  {new Date(tx.date).toLocaleDateString('en-CA', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-text-primary)] max-w-xs truncate">
                  {tx.description}
                </td>
                <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${
                  tx.amount < 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]'
                }`}>
                  {formatCurrency(tx.amount)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className="category-badge"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[tx.category] || '#64748b'}18`,
                      color: CATEGORY_COLORS[tx.category] || '#64748b',
                      border: `1px solid ${CATEGORY_COLORS[tx.category] || '#64748b'}30`,
                    }}
                  >
                    {tx.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {tx.anomaly && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-danger)]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Flagged
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

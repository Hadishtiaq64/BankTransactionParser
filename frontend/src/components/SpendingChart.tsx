import { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { PieChartIcon, BarChart3 } from 'lucide-react';
import type { CategorySummary } from '../types';

interface SpendingChartProps {
  data: CategorySummary[];
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
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Math.abs(value));

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const { category, totalAmount, transactionCount } = payload[0].payload;
  return (
    <div className="glass-card p-3" style={{ border: `1px solid ${CATEGORY_COLORS[category] || '#64748b'}40` }}>
      <p className="font-semibold text-sm" style={{ color: CATEGORY_COLORS[category] }}>
        {category}
      </p>
      <p className="text-[var(--color-text-primary)] text-sm mt-1">
        {formatCurrency(totalAmount)}
      </p>
      <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
        {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export default function SpendingChart({ data }: SpendingChartProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // Filter out income for the spending chart
  const spendingData = data.filter(d => d.category !== 'Income' && d.totalAmount > 0);
  const totalSpending = spendingData.reduce((sum, d) => sum + d.totalAmount, 0);

  if (spendingData.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-[var(--color-text-secondary)]">No spending data to display</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 fade-in-up" id="spending-chart">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Spending Breakdown
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Total: {formatCurrency(totalSpending)}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-bg-primary)]">
          <button
            className={`tab ${chartType === 'pie' ? 'active' : ''}`}
            onClick={() => setChartType('pie')}
            id="btn-pie-chart"
          >
            <PieChartIcon className="w-4 h-4" />
          </button>
          <button
            className={`tab ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
            id="btn-bar-chart"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer>
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={spendingData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                paddingAngle={3}
                dataKey="totalAmount"
                nameKey="category"
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {spendingData.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category] || '#64748b'}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={10}
                formatter={(value: string) => (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          ) : (
            <BarChart data={spendingData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
              <XAxis
                dataKey="category"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
              <Bar
                dataKey="totalAmount"
                radius={[8, 8, 0, 0]}
                animationBegin={0}
                animationDuration={800}
              >
                {spendingData.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category] || '#64748b'}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

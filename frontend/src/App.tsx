import { useState, useCallback } from 'react';
import { Trash2, Zap } from 'lucide-react';
import CsvUpload from './components/CsvUpload';
import Dashboard from './components/Dashboard';
import { transactionApi } from './api/transactionApi';
import type { UploadResponse } from './types';
import './index.css';

export default function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard'>('upload');

  const handleUploadSuccess = useCallback((_data: UploadResponse) => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab('dashboard');
  }, []);

  const handleReset = async () => {
    if (!confirm('Delete all transactions? This cannot be undone.')) return;
    try {
      await transactionApi.deleteAll();
      setRefreshTrigger((prev) => prev + 1);
      setActiveTab('upload');
    } catch (err) {
      console.error('Failed to delete transactions:', err);
    }
  };

  return (
    <div className="gradient-bg min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[rgba(15,15,35,0.8)] backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-purple-700
                          flex items-center justify-center shadow-lg shadow-[var(--color-accent-glow)]">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">
                SmartCategorizer
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] -mt-0.5">
                AI-Powered Transaction Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Navigation Tabs */}
            <nav className="flex gap-1 p-1 rounded-xl bg-[var(--color-bg-secondary)]" id="main-nav">
              <button
                className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
                id="nav-upload"
              >
                Upload
              </button>
              <button
                className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
                id="nav-dashboard"
              >
                Dashboard
              </button>
            </nav>

            <button className="btn-danger" onClick={handleReset} id="btn-reset">
              <Trash2 className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'upload' ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8 fade-in-up">
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">
                Upload Your Transactions
              </h2>
              <p className="text-[var(--color-text-secondary)] mt-3 max-w-lg mx-auto">
                Drop a CSV file with your bank transactions. Our AI will automatically categorize
                each transaction and flag any unusual spending patterns.
              </p>
            </div>
            <CsvUpload onUploadSuccess={handleUploadSuccess} />

            {/* Sample format hint */}
            <div className="glass-card p-5 mt-8 fade-in-up">
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                Expected CSV Format
              </h4>
              <div className="bg-[var(--color-bg-primary)] rounded-lg p-4 font-mono text-xs text-[var(--color-text-secondary)] overflow-x-auto">
                <div className="text-[var(--color-accent)]">date,description,amount</div>
                <div>2025-01-03,LOBLAWS #1042 TORONTO ON,67.42</div>
                <div>2025-01-05,TIM HORTONS #8821,6.45</div>
                <div>2025-01-15,PAYROLL DEPOSIT - CIBC,-3250.00</div>
              </div>
            </div>
          </div>
        ) : (
          <Dashboard refreshTrigger={refreshTrigger} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            Smart Transaction Categorizer • Powered by Claude Sonnet 4.6 • Built with Spring Boot & React
          </p>
        </div>
      </footer>
    </div>
  );
}

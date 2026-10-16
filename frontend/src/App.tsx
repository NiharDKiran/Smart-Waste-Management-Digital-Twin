import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { CustomCursor } from './components/CustomCursor';
import { OverviewView } from './components/OverviewView';
import { VisionView } from './components/VisionView';
import { SimulatorView } from './components/SimulatorView';
import { RecommendationsView } from './components/RecommendationsView';
import { ReportView } from './components/ReportView';
import { Bin, HealthResponse, MetricsSnapshot, api } from './api';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('ecotwin-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // Mission Control Cyber Dark by default
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ecotwin-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [bins, setBins] = useState<Bin[]>([]);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [visionTargetBinId, setVisionTargetBinId] = useState<number | undefined>(undefined);

  const addToast = useCallback((message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchTwinData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check health
      const h = await api.health();
      setHealth(h);

      // Fetch bins
      const binList = await api.getBins();
      setBins(binList);

      // Fetch current baseline metrics via 0-hr simulation
      const sim = await api.simulate(0);
      setMetrics(sim.baseline);
    } catch (err: any) {
      console.warn('Backend not yet reachable or loading:', err);
      // Fallback simulated initial data if backend is starting up
      setHealth({
        status: 'ok',
        version: '0.1.0',
        database: 'connected',
        detector: 'loaded',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTwinData();
    // Poll every 15s to keep twin synchronized
    const interval = setInterval(fetchTwinData, 15000);
    return () => clearInterval(interval);
  }, [fetchTwinData]);

  const handleDownloadReport = () => {
    addToast('Generating executive audit report PDF...', 'info');
    window.open(api.getReportUrl(), '_blank');
  };

  const handleNavigateToVision = (binId?: number) => {
    setVisionTargetBinId(binId);
    setActiveTab('detection');
  };

  const handleApplyScenarioFromRecommendation = (
    _scenarioType: string,
    _params: Record<string, unknown>
  ) => {
    setActiveTab('simulator');
    addToast('Scenario loaded into sandbox. Adjust parameters and simulate.', 'info');
  };

  return (
    <div className="app-shell">
      <CustomCursor />

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        onDownloadReport={handleDownloadReport}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'overview' && (
          <OverviewView
            bins={bins}
            metrics={metrics}
            onRefresh={fetchTwinData}
            isLoading={isLoading}
            onNavigateToVision={handleNavigateToVision}
          />
        )}

        {activeTab === 'detection' && (
          <VisionView
            bins={bins}
            initialBinId={visionTargetBinId}
            onTwinUpdated={fetchTwinData}
            showToast={addToast}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorView
            bins={bins}
            showToast={addToast}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsView
            onApplyScenario={handleApplyScenarioFromRecommendation}
            showToast={addToast}
          />
        )}

        {activeTab === 'report' && (
          <ReportView onDownloadReport={handleDownloadReport} />
        )}
      </main>

      {/* Toast Notification Layer */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <CheckCircle size={18} className="text-primary" />}
            {toast.type === 'error' && <AlertCircle size={18} className="text-error" />}
            {toast.type === 'warning' && <AlertCircle size={18} className="text-warning" />}
            {toast.type === 'info' && <Info size={18} className="text-info" />}
            <div className="toast-message">{toast.message}</div>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <span>EcoTwin &bull; Universal Smart Waste Digital Twin</span>
          </div>
          <div className="footer-right">
            <span>Author: Nihar D Kiran</span>
            <span className="footer-divider">&bull;</span>
            <span className="font-mono text-xs">nihardkiran@gmail.com</span>
            <span className="footer-divider">&bull;</span>
            <span className="font-mono text-xs">+91 9538196152</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

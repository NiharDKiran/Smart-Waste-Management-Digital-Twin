import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { CustomCursor } from './components/CustomCursor';
import { OverviewView } from './components/OverviewView';
import { VisionView } from './components/VisionView';
import { SimulatorView } from './components/SimulatorView';
import { RecommendationsView } from './components/RecommendationsView';
import { ReportView } from './components/ReportView';
import { AboutView } from './components/AboutView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { NotFoundView } from './components/NotFoundView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Bin, HealthResponse, MetricsSnapshot, api } from './api';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export const App: React.FC = () => {
  const navigate = useNavigate();
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

  const [bins, setBins] = useState<Bin[]>([]);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [visionTargetBinId, setVisionTargetBinId] = useState<number | undefined>(undefined);

  const addToast = useCallback(
    (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

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

      // Fetch current baseline metrics via 1-hr simulation step
      const sim = await api.simulate(1);
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
      setMetrics({
        overflow_incidents: 0,
        total_truck_distance_km: 12.4,
        avg_contamination_rate: 0.21,
        estimated_co2_kg: 3.35,
        bins_at_risk: 1,
        avg_fill_level: 38.5,
        data_source: 'simulated',
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
    navigate('/vision');
  };

  const handleApplyScenarioFromRecommendation = (
    _scenarioType: string,
    _params: Record<string, unknown>
  ) => {
    navigate('/simulator');
    addToast('Scenario loaded into sandbox. Adjust parameters and simulate.', 'info');
  };

  return (
    <div className="app-shell">
      <CustomCursor />

      {/* Navigation Header */}
      <Navbar
        health={health}
        onDownloadReport={handleDownloadReport}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <ErrorBoundary>
          <Routes>
            <Route
              path="/"
              element={
                <OverviewView
                  bins={bins}
                  metrics={metrics}
                  onRefresh={fetchTwinData}
                  isLoading={isLoading}
                  onNavigateToVision={handleNavigateToVision}
                />
              }
            />
            <Route
              path="/vision"
              element={
                <VisionView
                  bins={bins}
                  initialBinId={visionTargetBinId}
                  onTwinUpdated={fetchTwinData}
                  showToast={addToast}
                />
              }
            />
            <Route path="/simulator" element={<SimulatorView bins={bins} showToast={addToast} />} />
            <Route
              path="/recommendations"
              element={
                <RecommendationsView
                  onApplyScenario={handleApplyScenarioFromRecommendation}
                  showToast={addToast}
                />
              }
            />
            <Route
              path="/report"
              element={<ReportView onDownloadReport={handleDownloadReport} />}
            />
            <Route path="/about" element={<AboutView />} />
            <Route path="/privacy" element={<PrivacyView />} />
            <Route path="/terms" element={<TermsView />} />
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        </ErrorBoundary>
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
          <div
            className="footer-left"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
          >
            <span>EcoTwin &bull; Universal Smart Waste Digital Twin</span>
            <span className="footer-divider">&bull;</span>
            <Link
              to="/about"
              style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}
            >
              About
            </Link>
            <span className="footer-divider">&bull;</span>
            <Link
              to="/privacy"
              style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}
            >
              Privacy Policy
            </Link>
            <span className="footer-divider">&bull;</span>
            <Link
              to="/terms"
              style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}
            >
              Terms of Service
            </Link>
          </div>
          <div className="footer-right">
            <span>Author: Nihar D Kiran</span>
            <span className="footer-divider">&bull;</span>
            <a
              href="mailto:nihardkiran@gmail.com"
              className="font-mono text-xs"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              nihardkiran@gmail.com
            </a>
            <span className="footer-divider">&bull;</span>
            <span className="font-mono text-xs">+91 9538196152</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

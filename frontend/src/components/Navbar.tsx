import React from 'react';
import { 
  Activity, 
  Scan, 
  GitBranch, 
  Sparkles, 
  FileText, 
  Download,
  Sun,
  Moon,
  Radio
} from 'lucide-react';
import { HealthResponse } from '../api';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: HealthResponse | null;
  onDownloadReport: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  health,
  onDownloadReport,
  theme,
  onToggleTheme,
}) => {
  const isHealthy = health?.status === 'ok';

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand-group">
          <div className="brand-icon">
            <Radio className="icon-pulse" size={20} />
          </div>
          <div>
            <div className="brand-title">
              Eco<span>Twin</span>
            </div>
            <div className="brand-subtitle">
              Universal Smart Waste Digital Twin
            </div>
          </div>
          <div className={`status-badge ${isHealthy ? 'status-online' : 'status-offline'}`}>
            <span className="status-dot-wrapper">
              <span className="status-ping-ring"></span>
              <span className="status-dot"></span>
            </span>
            <span>{isHealthy ? 'Twin Synchronized' : 'Connecting Engine...'}</span>
          </div>
        </div>

        <nav className="nav-tabs" role="tablist">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'overview' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('overview')}
            role="tab"
            aria-selected={activeTab === 'overview'}
          >
            <Activity size={16} />
            <span>Digital Twin</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'detection' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('detection')}
            role="tab"
            aria-selected={activeTab === 'detection'}
          >
            <Scan size={16} />
            <span>Computer Vision</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'simulator' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('simulator')}
            role="tab"
            aria-selected={activeTab === 'simulator'}
          >
            <GitBranch size={16} />
            <span>Scenario Sandbox</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'recommendations' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
            role="tab"
            aria-selected={activeTab === 'recommendations'}
          >
            <Sparkles size={16} />
            <span>AI Recommendations</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'report' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('report')}
            role="tab"
            aria-selected={activeTab === 'report'}
          >
            <FileText size={16} />
            <span>Audit & Report</span>
          </button>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle visual theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={16} className="theme-icon-sun" />
                <span className="theme-toggle-label">Light</span>
              </>
            ) : (
              <>
                <Moon size={16} className="theme-icon-moon" />
                <span className="theme-toggle-label">Dark</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm export-btn"
            onClick={onDownloadReport}
            title="Download executive audit PDF"
          >
            <Download size={14} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
};

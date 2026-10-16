import React, { useState, useEffect } from 'react';
import {
  Activity,
  Scan,
  GitBranch,
  Sparkles,
  FileText,
  Download,
  Sun,
  Moon,
  Radio,
  Info,
  Menu,
  X,
} from 'lucide-react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { HealthResponse } from '../api';

interface NavbarProps {
  health: HealthResponse | null;
  onDownloadReport: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  onDownloadReport,
  theme,
  onToggleTheme,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHealthy = health?.status === 'ok';

  // Automatically collapse menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand-group" style={{ textDecoration: 'none' }} onClick={closeMenu}>
          <div className="brand-icon">
            <Radio className="icon-pulse" size={20} />
          </div>
          <div>
            <div className="brand-title">
              Eco<span>Twin</span>
            </div>
            <div className="brand-subtitle">Universal Smart Waste Digital Twin</div>
          </div>
          <div className={`status-badge ${isHealthy ? 'status-online' : 'status-offline'}`}>
            <span className="status-dot-wrapper">
              <span className="status-ping-ring"></span>
              <span className="status-dot"></span>
            </span>
            <span className="status-text">
              {isHealthy ? 'Twin Synchronized' : 'Connecting Engine...'}
            </span>
          </div>
        </Link>

        {/* Desktop Tab Strip */}
        <nav className="nav-tabs" role="tablist">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `tab-btn ${isActive ? 'tab-btn-active' : ''}`}
            role="tab"
          >
            <Activity size={16} />
            <span>Digital Twin</span>
          </NavLink>

          <NavLink
            to="/vision"
            className={({ isActive }) => `tab-btn ${isActive ? 'tab-btn-active' : ''}`}
            role="tab"
          >
            <Scan size={16} />
            <span>Computer Vision</span>
          </NavLink>

          <NavLink
            to="/simulator"
            className={({ isActive }) => `tab-btn ${isActive ? 'tab-btn-active' : ''}`}
            role="tab"
          >
            <GitBranch size={16} />
            <span>Scenario Sandbox</span>
          </NavLink>

          <NavLink
            to="/recommendations"
            className={({ isActive }) => `tab-btn ${isActive ? 'tab-btn-active' : ''}`}
            role="tab"
          >
            <Sparkles size={16} />
            <span>AI Recommendations</span>
          </NavLink>

          <NavLink
            to="/report"
            className={({ isActive }) => `tab-btn ${isActive ? 'tab-btn-active' : ''}`}
            role="tab"
          >
            <FileText size={16} />
            <span>Audit &amp; Report</span>
          </NavLink>

          <NavLink
            to="/about"
            className={({ isActive }) => `tab-btn ${isActive ? 'tab-btn-active' : ''}`}
            role="tab"
          >
            <Info size={16} />
            <span>About</span>
          </NavLink>
        </nav>

        {/* Header Actions */}
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
            className="btn btn-secondary btn-sm export-btn desktop-only"
            onClick={onDownloadReport}
            title="Download executive audit PDF"
          >
            <Download size={14} />
            <span>Export PDF</span>
          </button>

          {/* Mobile Collapsing Menu Trigger (< 900px) */}
          <button
            type="button"
            className="menu-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsing Menu Panel */}
      {isMobileMenuOpen && (
        <nav className="mobile-nav-panel" role="navigation" aria-label="Mobile Navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'tab-btn-active' : ''}`}
            onClick={closeMenu}
          >
            <Activity size={18} />
            <span>Digital Twin</span>
          </NavLink>

          <NavLink
            to="/vision"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'tab-btn-active' : ''}`}
            onClick={closeMenu}
          >
            <Scan size={18} />
            <span>Computer Vision</span>
          </NavLink>

          <NavLink
            to="/simulator"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'tab-btn-active' : ''}`}
            onClick={closeMenu}
          >
            <GitBranch size={18} />
            <span>Scenario Sandbox</span>
          </NavLink>

          <NavLink
            to="/recommendations"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'tab-btn-active' : ''}`}
            onClick={closeMenu}
          >
            <Sparkles size={18} />
            <span>AI Recommendations</span>
          </NavLink>

          <NavLink
            to="/report"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'tab-btn-active' : ''}`}
            onClick={closeMenu}
          >
            <FileText size={18} />
            <span>Audit &amp; Report</span>
          </NavLink>

          <NavLink
            to="/about"
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'tab-btn-active' : ''}`}
            onClick={closeMenu}
          >
            <Info size={18} />
            <span>About EcoTwin</span>
          </NavLink>

          <div className="mobile-nav-divider" />

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => {
              closeMenu();
              onDownloadReport();
            }}
          >
            <Download size={14} />
            <span>Download Audit PDF</span>
          </button>
        </nav>
      )}
    </header>
  );
};

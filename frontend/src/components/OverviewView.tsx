import React, { useState } from 'react';
import {
  AlertTriangle,
  Truck,
  Leaf,
  Trash2,
  Filter,
  Search,
  RefreshCw,
  Building,
  Activity,
  Layers,
} from 'lucide-react';
import { Bin, MetricsSnapshot } from '../api';
import { FacilityMap } from './FacilityMap';
import { BinDetailModal } from './BinDetailModal';

interface OverviewViewProps {
  bins: Bin[];
  metrics: MetricsSnapshot | null;
  onRefresh: () => void;
  isLoading: boolean;
  onNavigateToVision: (binId?: number) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  bins,
  metrics,
  onRefresh,
  isLoading,
  onNavigateToVision,
}) => {
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Zone list
  const zones = Array.from(new Set(bins.map((b) => b.zone_name)));

  const getBinFillPct = (b: Bin) => {
    if (!b.capacity_liters || b.capacity_liters <= 0)
      return Math.min(100, Math.round(b.fill_level));
    return Math.min(100, Math.max(0, Math.round((b.fill_level / b.capacity_liters) * 100)));
  };

  // Filtered bins
  const filteredBins = bins.filter((b) => {
    const pct = getBinFillPct(b);
    if (selectedZone !== 'all' && b.zone_name !== selectedZone) return false;
    if (statusFilter === 'risk' && !b.overflow_risk && pct < 80) return false;
    if (statusFilter === 'warning' && (pct < 50 || pct >= 80)) return false;
    if (statusFilter === 'normal' && (pct >= 50 || b.overflow_risk)) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.zone_name.toLowerCase().includes(q);
    }
    return true;
  });

  // Calculate zone stats
  const zoneStats = zones.map((zName) => {
    const zBins = bins.filter((b) => b.zone_name === zName);
    const avgFill = zBins.reduce((acc, b) => acc + getBinFillPct(b), 0) / (zBins.length || 1);
    const riskCount = zBins.filter((b) => b.overflow_risk || getBinFillPct(b) >= 80).length;
    return {
      name: zName,
      type: zBins[0]?.zone_type || 'facility',
      count: zBins.length,
      avgFill,
      riskCount,
    };
  });

  return (
    <div className="tab-view-container">
      {/* Top Banner & Refresh */}
      <div className="view-toolbar">
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              marginBottom: '4px',
            }}
          >
            <h1 className="view-title" style={{ margin: 0 }}>
              Digital Twin Operations Center
            </h1>
            <span
              className="badge-pill badge-warning"
              style={{ fontWeight: 600, letterSpacing: '0.04em' }}
            >
              Simulated Data
            </span>
          </div>
          <p className="view-description">
            Universal real-time digital twin monitoring 20 telemetry nodes across 5 facility sectors
            &bull; Simulated Data
          </p>
        </div>
        <div className="toolbar-controls">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'icon-spin' : ''} />
            <span>{isLoading ? 'Syncing...' : 'Sync Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Snapshot KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Overflow Incidents</span>
            <div className="kpi-icon-badge badge-error">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="kpi-value font-mono">{metrics?.overflow_incidents ?? 0}</div>
          <div className="kpi-footnote">
            {metrics?.bins_at_risk ?? 0} bins currently at immediate risk
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Truck Route</span>
            <div className="kpi-icon-badge badge-warning">
              <Truck size={16} />
            </div>
          </div>
          <div className="kpi-value font-mono">
            {(metrics?.total_truck_distance_km ?? 0).toFixed(1)}{' '}
            <span className="kpi-unit">km</span>
          </div>
          <div className="kpi-footnote">Nearest-neighbour optimized collection route</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Avg Contamination</span>
            <div className="kpi-icon-badge badge-warning">
              <Activity size={16} />
            </div>
          </div>
          <div className="kpi-value font-mono">
            {Math.round((metrics?.avg_contamination_rate ?? 0) * 100)}%
          </div>
          <div className="kpi-footnote">Cross-stream improper disposal index</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Estimated CO2 Footprint</span>
            <div className="kpi-icon-badge badge-primary">
              <Leaf size={16} />
            </div>
          </div>
          <div className="kpi-value font-mono">
            {(metrics?.estimated_co2_kg ?? 0).toFixed(1)} <span className="kpi-unit">kg</span>
          </div>
          <div className="kpi-footnote">Based on diesel fleet & landfill emissions factors</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Average Fill Level</span>
            <div className="kpi-icon-badge badge-primary">
              <Trash2 size={16} />
            </div>
          </div>
          <div className="kpi-value font-mono">{Math.round(metrics?.avg_fill_level ?? 0)}%</div>
          <div className="kpi-footnote">Across all 20 active facility receptacles</div>
        </div>
      </div>

      {/* Main Twin Layout: Map + Sector List */}
      <div className="twin-main-grid">
        <div className="twin-map-column">
          <div className="panel-card">
            <div className="panel-card-header">
              <div className="panel-card-title">
                <Layers size={16} />
                <span>Facility Spatial Twin Map</span>
              </div>
              <span className="badge-pill">Click any bin node to inspect</span>
            </div>
            <div className="panel-card-body p-0">
              <FacilityMap
                bins={filteredBins}
                selectedBin={selectedBin}
                onSelectBin={(bin) => setSelectedBin(bin)}
              />
            </div>
          </div>

          {/* Zone Sector Breakdown Row */}
          <div className="zones-summary-grid">
            {zoneStats.map((z) => (
              <div
                key={z.name}
                className={`zone-pill-card ${selectedZone === z.name ? 'zone-active' : ''}`}
                onClick={() => setSelectedZone(selectedZone === z.name ? 'all' : z.name)}
              >
                <div className="zone-pill-header">
                  <span className="zone-pill-name">{z.name}</span>
                  <span className="zone-pill-type font-mono">{z.type}</span>
                </div>
                <div className="zone-pill-metrics">
                  <span>
                    Fill: <strong className="font-mono">{Math.round(z.avgFill)}%</strong>
                  </span>
                  {z.riskCount > 0 ? (
                    <span className="badge-critical font-mono">{z.riskCount} Alert</span>
                  ) : (
                    <span className="badge-normal font-mono">Optimal</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bins Directory Column */}
        <div className="twin-directory-column">
          <div className="panel-card h-full">
            <div className="panel-card-header">
              <div className="panel-card-title">
                <Trash2 size={16} />
                <span>Bin Telemetry Feed ({filteredBins.length})</span>
              </div>
            </div>

            {/* Filter controls */}
            <div className="filter-bar">
              <div className="search-input-wrapper">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search bin or zone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-select-group">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All States</option>
                  <option value="risk">Critical / Risk (&gt;80%)</option>
                  <option value="warning">Warning (50-80%)</option>
                  <option value="normal">Normal (&lt;50%)</option>
                </select>
              </div>
            </div>

            {/* Bin Cards List */}
            <div className="bin-list-scrollable">
              {filteredBins.length === 0 ? (
                <div className="empty-state">
                  <p>No bins match filter criteria.</p>
                </div>
              ) : (
                filteredBins.map((bin) => {
                  const pct = getBinFillPct(bin);
                  const isCritical = pct >= 80 || bin.overflow_risk;
                  const isWarning = pct >= 50 && pct < 80;

                  return (
                    <div
                      key={bin.id}
                      className={`bin-item-card ${selectedBin?.id === bin.id ? 'bin-item-selected' : ''}`}
                      onClick={() => setSelectedBin(bin)}
                    >
                      <div className="bin-item-header">
                        <div className="bin-item-name-group">
                          <span className="bin-item-name">{bin.name}</span>
                          <span className="bin-item-zone">{bin.zone_name}</span>
                        </div>
                        <div
                          className={`bin-item-badge ${
                            isCritical
                              ? 'badge-error'
                              : isWarning
                                ? 'badge-warning'
                                : 'badge-primary'
                          }`}
                        >
                          <span className="font-mono">{pct}%</span>
                        </div>
                      </div>

                      <div className="bin-item-progress">
                        <div
                          className="bin-item-progress-fill"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isCritical
                              ? 'var(--color-error)'
                              : isWarning
                                ? 'var(--color-warning)'
                                : 'var(--color-primary-500)',
                          }}
                        />
                      </div>

                      <div className="bin-item-footer">
                        <span>
                          {bin.overflow_risk ? (
                            <span className="text-error font-mono font-semibold">
                              Overflow in {bin.hours_until_overflow ?? 1}h
                            </span>
                          ) : (
                            <span className="text-muted">Rate: +{bin.per_hour_fill_rate}L/h</span>
                          )}
                        </span>
                        <span className="text-muted">
                          Contam: {Math.round(bin.contamination_score * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedBin && (
        <BinDetailModal
          bin={selectedBin}
          onClose={() => setSelectedBin(null)}
          onNavigateToVision={(binId) => {
            setSelectedBin(null);
            onNavigateToVision(binId);
          }}
        />
      )}
    </div>
  );
};

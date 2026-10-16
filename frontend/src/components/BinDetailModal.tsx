import React from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  BarChart2, 
  MapPin, 
  TrendingUp, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Bin } from '../api';

interface BinDetailModalProps {
  bin: Bin | null;
  onClose: () => void;
  onNavigateToVision: (binId: number) => void;
}

export const BinDetailModal: React.FC<BinDetailModalProps> = ({
  bin,
  onClose,
  onNavigateToVision,
}) => {
  if (!bin) return null;

  const wetPct = Math.round((bin.waste_type_mix?.wet || 0) * 100);
  const dryPct = Math.round((bin.waste_type_mix?.dry || 0) * 100);
  const recPct = Math.round((bin.waste_type_mix?.recyclable || 0) * 100);
  const hazPct = Math.round((bin.waste_type_mix?.hazardous || 0) * 100);
  const contaminationPct = Math.round(bin.contamination_score * 100);

  const fillPct = bin.capacity_liters > 0
    ? Math.min(100, Math.max(0, (bin.fill_level / bin.capacity_liters) * 100))
    : Math.min(100, bin.fill_level);

  let fillStatusClass = 'status-normal';
  if (fillPct >= 80 || bin.overflow_risk) {
    fillStatusClass = 'status-critical';
  } else if (fillPct >= 50) {
    fillStatusClass = 'status-warning';
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="bin-avatar">
              <Trash2 size={20} />
            </div>
            <div>
              <div className="modal-title">{bin.name}</div>
              <div className="modal-subtitle">
                <MapPin size={12} /> {bin.zone_name} ({bin.zone_type}) &bull; Lat {bin.latitude.toFixed(4)}, Lng {bin.longitude.toFixed(4)}
              </div>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {bin.overflow_risk && (
            <div className="alert-banner alert-critical">
              <AlertTriangle size={16} />
              <div>
                <strong>Overflow Alert:</strong> Projected to overflow in{' '}
                <span className="font-mono">{bin.hours_until_overflow ?? 1} hours</span>. Priority collection recommended.
              </div>
            </div>
          )}

          {/* Primary metrics grid */}
          <div className="metrics-grid-2">
            <div className="metric-box">
              <div className="metric-box-label">Fill Level</div>
              <div className="metric-box-value font-mono">
                {fillPct.toFixed(1)}%
              </div>
              <div className="progress-bar-bg">
                <div
                  className={`progress-bar-fill ${fillStatusClass}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <div className="metric-subtext">
                Current: <span className="font-mono">{bin.fill_level.toFixed(1)}L / {bin.capacity_liters}L</span> &bull; Rate: <span className="font-mono">+{bin.per_hour_fill_rate}L/hr</span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-box-label">Contamination Score</div>
              <div className="metric-box-value font-mono">
                {contaminationPct}%
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${contaminationPct}%`,
                    backgroundColor: contaminationPct > 30 ? 'var(--color-error)' : 'var(--color-primary-500)',
                  }}
                />
              </div>
              <div className="metric-subtext">
                {contaminationPct > 25 ? 'High cross-contamination risk' : 'Healthy segregation level'}
              </div>
            </div>
          </div>

          {/* Waste Composition Breakdown */}
          <div className="section-block">
            <div className="section-heading">
              <BarChart2 size={15} />
              <span>Waste Mix Breakdown (Digital Twin Telemetry)</span>
            </div>

            <div className="waste-mix-stacked-bar">
              <div className="mix-segment mix-wet" style={{ width: `${wetPct}%` }} title={`Wet: ${wetPct}%`} />
              <div className="mix-segment mix-dry" style={{ width: `${dryPct}%` }} title={`Dry: ${dryPct}%`} />
              <div className="mix-segment mix-recyclable" style={{ width: `${recPct}%` }} title={`Recyclable: ${recPct}%`} />
              <div className="mix-segment mix-hazardous" style={{ width: `${hazPct}%` }} title={`Hazardous: ${hazPct}%`} />
            </div>

            <div className="waste-mix-legend">
              <div className="mix-legend-item">
                <span className="dot dot-wet"></span>
                <span>Wet ({wetPct}%)</span>
              </div>
              <div className="mix-legend-item">
                <span className="dot dot-dry"></span>
                <span>Dry ({dryPct}%)</span>
              </div>
              <div className="mix-legend-item">
                <span className="dot dot-recyclable"></span>
                <span>Recyclable ({recPct}%)</span>
              </div>
              <div className="mix-legend-item">
                <span className="dot dot-hazardous"></span>
                <span>Hazardous ({hazPct}%)</span>
              </div>
            </div>
          </div>

          {/* Telemetry info */}
          <div className="telemetry-info-row">
            <div>
              <span className="label-dim">Last Collection:</span>{' '}
              <span className="font-mono">{new Date(bin.last_collected).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div>
              <span className="label-dim">Twin Mode:</span>{' '}
              <span className="font-mono text-xs">{bin.data_source}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigateToVision(bin.id)}
          >
            <span>Scan Waste for this Bin</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

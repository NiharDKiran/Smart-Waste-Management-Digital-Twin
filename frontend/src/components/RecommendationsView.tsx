import React, { useState } from 'react';
import { 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  Layers, 
  Zap, 
  TrendingDown,
  Info
} from 'lucide-react';
import { RecommendationResponse, api } from '../api';

interface RecommendationsViewProps {
  onApplyScenario: (scenarioType: string, params: Record<string, unknown>) => void;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  onApplyScenario,
  showToast,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecommendationResponse | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const resp = await api.getRecommendations();
      setData(resp);
      showToast('Generative AI recommendations generated successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.detail || 'Failed to fetch AI recommendations from backend.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-view-container">
      <div className="view-toolbar">
        <div>
          <h1 className="view-title">Generative AI Facility Advisory (Google Gemini)</h1>
          <p className="view-description">
            Autonomous intelligence synthesizing real-time telemetry, contamination patterns, and route bottlenecks into prioritized facility interventions.
          </p>
        </div>

        <div className="toolbar-controls">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading}
          >
            <Sparkles size={16} className={loading ? 'icon-spin' : ''} />
            <span>{loading ? 'Synthesizing with Gemini...' : 'Generate AI Insights'}</span>
          </button>
        </div>
      </div>

      {!data ? (
        <div className="empty-state-large">
          <Sparkles size={48} className="empty-state-icon" />
          <h3>Generate Operational Strategy</h3>
          <p>
            Click "Generate AI Insights" above to dispatch the current digital twin telemetry snapshot to Google Gemini. Gemini will evaluate overflow vectors and produce structured, actionable recommendations.
          </p>
        </div>
      ) : (
        <div className="recommendations-container">
          {/* Header Bar */}
          <div className="ai-status-banner">
            <div className="banner-badge">
              <span className="dot dot-active"></span>
              <span>{data.is_cached ? 'Served from Engine Cache' : 'Live Google Gemini Flash Inference'}</span>
            </div>
            <div className="banner-meta font-mono text-xs text-muted">
              Source: {data.data_source}
            </div>
          </div>

          {/* Expected Overall Impact KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">Projected Overflow Reduction</span>
                <TrendingDown size={16} className="text-primary" />
              </div>
              <div className="kpi-value font-mono text-primary">
                -{data.expected_impact?.overflow_reduction_pct ?? 0}%
              </div>
              <div className="kpi-footnote">Through targeted bin reallocation</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">Contamination Reduction</span>
                <TrendingDown size={16} className="text-primary" />
              </div>
              <div className="kpi-value font-mono text-primary">
                -{data.expected_impact?.contamination_reduction_pct ?? 0}%
              </div>
              <div className="kpi-footnote">Via awareness & signage interventions</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">Emissions Abatement (CO2)</span>
                <TrendingDown size={16} className="text-primary" />
              </div>
              <div className="kpi-value font-mono text-primary">
                -{data.expected_impact?.co2_reduction_pct ?? 0}%
              </div>
              <div className="kpi-footnote">Fuel conservation from route tuning</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">Logistics Efficiency Gain</span>
                <Zap size={16} className="text-warning" />
              </div>
              <div className="kpi-value font-mono text-warning">
                +{data.expected_impact?.efficiency_improvement_pct ?? 0}%
              </div>
              <div className="kpi-footnote">Optimized collection truck cycles</div>
            </div>
          </div>

          {/* Issues & Actions 2-column layout */}
          <div className="ai-content-columns">
            {/* Detected Vulnerabilities */}
            <div className="panel-card">
              <div className="panel-card-header">
                <div className="panel-card-title">
                  <AlertCircle size={16} />
                  <span>Detected Operational Vulnerabilities ({data.issues?.length || 0})</span>
                </div>
              </div>

              <div className="panel-card-body p-0">
                <div className="issues-list">
                  {data.issues?.map((issue, idx) => {
                    const isHigh = issue.severity.toLowerCase() === 'high';
                    return (
                      <div key={idx} className="issue-row">
                        <div className="issue-header">
                          <span className="issue-title">{issue.title}</span>
                          <span
                            className={`badge-pill ${
                              isHigh ? 'badge-error' : 'badge-warning'
                            }`}
                          >
                            {issue.severity.toUpperCase()} SEVERITY
                          </span>
                        </div>
                        <p className="issue-desc">{issue.description}</p>
                        <div className="issue-meta">
                          <span>
                            <strong>Affected Zones:</strong> {issue.affected_zones?.join(', ') || 'Facility-wide'}
                          </span>
                          {issue.affected_bins?.length > 0 && (
                            <span className="font-mono text-xs">
                              Bins: [{issue.affected_bins.join(', ')}]
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recommended Interventions */}
            <div className="panel-card">
              <div className="panel-card-header">
                <div className="panel-card-title">
                  <Zap size={16} />
                  <span>Recommended Strategic Interventions ({data.actions?.length || 0})</span>
                </div>
              </div>

              <div className="panel-card-body p-0">
                <div className="actions-list">
                  {data.actions?.map((act, idx) => (
                    <div key={idx} className="action-row">
                      <div className="action-header">
                        <span className="action-title">{act.title}</span>
                        <span className="badge-pill badge-primary">
                          {act.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                      <p className="action-desc">{act.description}</p>
                      <div className="action-impact-tag">
                        <strong>Projected Impact:</strong> {act.estimated_impact}
                      </div>

                      {act.scenario_type && (
                        <div className="action-footer">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() =>
                              onApplyScenario(act.scenario_type!, act.scenario_parameters || {})
                            }
                          >
                            <Sliders size={13} />
                            <span>Apply as Twin Scenario</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Model Assumptions Disclosure */}
          {data.assumptions && data.assumptions.length > 0 && (
            <div className="assumptions-card">
              <div className="assumptions-header">
                <Info size={14} />
                <span>AI Governance &amp; Model Assumptions</span>
              </div>
              <ul className="assumptions-list">
                {data.assumptions.map((asm, i) => (
                  <li key={i}>{asm}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

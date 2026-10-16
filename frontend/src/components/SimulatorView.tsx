import React, { useState } from 'react';
import {
  GitBranch,
  Play,
  Sliders,
  TrendingDown,
  TrendingUp,
  Save,
  Clock,
  Check,
  Sparkles,
  BarChart2,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Bin, ScenarioRequest, SimulationResponse, api } from '../api';

interface SimulatorViewProps {
  bins: Bin[];
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({ bins, showToast }) => {
  const [simulationHours, setSimulationHours] = useState<number>(24);
  const [scenarioType, setScenarioType] = useState<string>('add_bins');
  const [scenarioName, setScenarioName] = useState<string>('Optimized Food Court & Medical Route');
  const [targetZone, setTargetZone] = useState<string>('Food Court');
  const [addedBinsCount, setAddedBinsCount] = useState<number>(3);
  const [frequencyMultiplier, setFrequencyMultiplier] = useState<number>(2.0);
  const [contaminationReduction, setContaminationReduction] = useState<number>(35);

  const [isSimulating, setIsSimulating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);

  // Available unique zones
  const zones = Array.from(new Set(bins.map((b) => b.zone_name)));

  // Preset quick scenarios
  const applyPreset = (type: 'food_court' | 'frequency' | 'awareness') => {
    if (type === 'food_court') {
      setScenarioName('High-Capacity Overflow Prevention in Food Court');
      setScenarioType('add_bins');
      setTargetZone('Food Court');
      setAddedBinsCount(3);
    } else if (type === 'frequency') {
      setScenarioName('Intensive Pickup Schedule for High-Density Wings');
      setScenarioType('change_frequency');
      setFrequencyMultiplier(2.0);
      setTargetZone('Medical Center');
    } else {
      setScenarioName('Facility-wide Segregation Awareness Intervention');
      setScenarioType('awareness_campaign');
      setContaminationReduction(40);
    }
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);

    let parameters: Record<string, unknown> = {};
    if (scenarioType === 'add_bins') {
      parameters = {
        zone_name: targetZone,
        count: addedBinsCount,
        capacity_liters: 120,
      };
    } else if (scenarioType === 'change_frequency') {
      parameters = {
        zone_name: targetZone,
        frequency_multiplier: frequencyMultiplier,
      };
    } else if (scenarioType === 'awareness_campaign') {
      parameters = {
        contamination_reduction_factor: contaminationReduction / 100,
      };
    }

    const scenarioPayload: ScenarioRequest = {
      name: scenarioName,
      scenario_type: scenarioType,
      parameters,
      simulation_hours: simulationHours,
    };

    try {
      const result = await api.simulate(simulationHours, scenarioPayload);
      setSimulationResult(result);
      showToast(`Simulation completed for ${simulationHours}-hour forecast window.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.detail || 'Simulation failed.', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!simulationResult) return;
    setIsSaving(true);
    try {
      await api.saveScenario({
        name: scenarioName,
        scenario_type: scenarioType,
        parameters: {
          targetZone,
          addedBinsCount,
          frequencyMultiplier,
          contaminationReduction,
        },
        simulation_hours: simulationHours,
      });
      showToast('Scenario successfully archived into Digital Twin repository.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.detail || 'Failed to archive scenario.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Prepare chart comparison data if result exists
  const chartData =
    simulationResult && simulationResult.scenario
      ? [
          {
            metric: 'Overflows',
            Baseline: simulationResult.baseline.overflow_incidents,
            Scenario: simulationResult.scenario.overflow_incidents,
          },
          {
            metric: 'Route Dist (km)',
            Baseline: Math.round(simulationResult.baseline.total_truck_distance_km * 10) / 10,
            Scenario: Math.round(simulationResult.scenario.total_truck_distance_km * 10) / 10,
          },
          {
            metric: 'Contam (%)',
            Baseline: Math.round(simulationResult.baseline.avg_contamination_rate * 100),
            Scenario: Math.round(simulationResult.scenario.avg_contamination_rate * 100),
          },
          {
            metric: 'CO2 (kg)',
            Baseline: Math.round(simulationResult.baseline.estimated_co2_kg * 10) / 10,
            Scenario: Math.round(simulationResult.scenario.estimated_co2_kg * 10) / 10,
          },
          {
            metric: 'Bins at Risk',
            Baseline: simulationResult.baseline.bins_at_risk,
            Scenario: simulationResult.scenario.bins_at_risk,
          },
        ]
      : [];

  return (
    <div className="tab-view-container">
      <div className="view-toolbar">
        <div>
          <h1 className="view-title">Digital Twin Scenario Sandbox &amp; Simulator</h1>
          <p className="view-description">
            Run forward-looking temporal simulations to stress-test collection frequency,
            infrastructure additions, and segregation policies before physical deployment.
          </p>
        </div>
      </div>

      <div className="simulator-grid">
        {/* Left Column: Scenario Configuration */}
        <div className="simulator-config-col">
          <div className="panel-card">
            <div className="panel-card-header">
              <div className="panel-card-title">
                <Sliders size={16} />
                <span>Simulation Parameters</span>
              </div>
            </div>

            <div className="panel-card-body">
              {/* Presets */}
              <div className="presets-block">
                <label className="text-xs text-muted font-medium uppercase tracking-wider block mb-2">
                  Quick Scenario Presets:
                </label>
                <div className="preset-buttons-row">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => applyPreset('food_court')}
                  >
                    +3 Bins Food Court
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => applyPreset('frequency')}
                  >
                    2x Pickup Rate
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => applyPreset('awareness')}
                  >
                    -40% Contamination
                  </button>
                </div>
              </div>

              {/* Scenario Name */}
              <div className="form-group">
                <label className="form-label">Scenario Name</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Time Horizon */}
              <div className="form-group">
                <label className="form-label">
                  <Clock size={14} />
                  <span>Forecast Time Horizon</span>
                </label>
                <div className="time-chips-group">
                  {[4, 8, 12, 24, 48].map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`time-chip ${simulationHours === h ? 'time-chip-active' : ''}`}
                      onClick={() => setSimulationHours(h)}
                    >
                      +{h} Hours
                    </button>
                  ))}
                </div>
              </div>

              {/* Scenario Type */}
              <div className="form-group">
                <label className="form-label">Intervention Archetype</label>
                <select
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value)}
                  className="filter-select w-full"
                >
                  <option value="add_bins">Add Supplementary Receptacles</option>
                  <option value="change_frequency">Alter Pickup Frequency Multiplier</option>
                  <option value="awareness_campaign">
                    Awareness Intervention (Reduce Contamination)
                  </option>
                </select>
              </div>

              {/* Dynamic conditional fields */}
              {scenarioType === 'add_bins' && (
                <div className="conditional-fields-group">
                  <div className="form-group">
                    <label className="form-label">Target Sector Zone</label>
                    <select
                      value={targetZone}
                      onChange={(e) => setTargetZone(e.target.value)}
                      className="filter-select w-full"
                    >
                      {zones.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Additional Receptacles: <span className="font-mono">{addedBinsCount}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={addedBinsCount}
                      onChange={(e) => setAddedBinsCount(Number(e.target.value))}
                      className="form-range"
                    />
                  </div>
                </div>
              )}

              {scenarioType === 'change_frequency' && (
                <div className="conditional-fields-group">
                  <div className="form-group">
                    <label className="form-label">Target Sector Zone</label>
                    <select
                      value={targetZone}
                      onChange={(e) => setTargetZone(e.target.value)}
                      className="filter-select w-full"
                    >
                      {zones.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Pickup Multiplier: <span className="font-mono">{frequencyMultiplier}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.5"
                      value={frequencyMultiplier}
                      onChange={(e) => setFrequencyMultiplier(Number(e.target.value))}
                      className="form-range"
                    />
                  </div>
                </div>
              )}

              {scenarioType === 'awareness_campaign' && (
                <div className="conditional-fields-group">
                  <div className="form-group">
                    <label className="form-label">
                      Contamination Reduction:{' '}
                      <span className="font-mono">-{contaminationReduction}%</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      step="5"
                      value={contaminationReduction}
                      onChange={(e) => setContaminationReduction(Number(e.target.value))}
                      className="form-range"
                    />
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="mt-6">
                <button
                  type="button"
                  className="btn btn-primary btn-lg w-full"
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                >
                  <Play size={18} className={isSimulating ? 'icon-spin' : ''} />
                  <span>
                    {isSimulating ? 'Computing Digital Twin Trajectory...' : 'Run Twin Simulation'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Comparative Results & Charts */}
        <div className="simulator-results-col">
          <div className="panel-card h-full">
            <div className="panel-card-header">
              <div className="panel-card-title">
                <BarChart2 size={16} />
                <span>Simulation Impact &amp; Comparative Diff</span>
              </div>
              {simulationResult?.scenario && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSaveScenario}
                  disabled={isSaving}
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Archiving...' : 'Archive Scenario'}</span>
                </button>
              )}
            </div>

            <div className="panel-card-body">
              {!simulationResult ? (
                <div className="empty-state-large">
                  <GitBranch size={48} className="empty-state-icon" />
                  <h3>No Active Simulation Run</h3>
                  <p>
                    Configure intervention parameters or select a preset, then click "Run Twin
                    Simulation" to project the waste network state and calculate delta metrics.
                  </p>
                </div>
              ) : (
                <div className="simulation-content">
                  {/* Diff Scorecard Row */}
                  <div className="diff-scorecard-grid">
                    <div className="diff-card">
                      <div className="diff-label">Overflow Incidents</div>
                      <div className="diff-comparison font-mono">
                        <span>{simulationResult.baseline.overflow_incidents}</span>
                        <span className="diff-arrow">&rarr;</span>
                        <span className="diff-scenario-val">
                          {simulationResult.scenario?.overflow_incidents ?? '-'}
                        </span>
                      </div>
                      {simulationResult.diff?.overflow_incidents !== undefined && (
                        <div
                          className={`diff-pill ${
                            simulationResult.diff.overflow_incidents <= 0 ? 'diff-good' : 'diff-bad'
                          }`}
                        >
                          {simulationResult.diff.overflow_incidents <= 0 ? (
                            <TrendingDown size={13} />
                          ) : (
                            <TrendingUp size={13} />
                          )}
                          <span>{simulationResult.diff.overflow_incidents} incidents</span>
                        </div>
                      )}
                    </div>

                    <div className="diff-card">
                      <div className="diff-label">CO2 Footprint</div>
                      <div className="diff-comparison font-mono">
                        <span>{simulationResult.baseline.estimated_co2_kg.toFixed(1)}kg</span>
                        <span className="diff-arrow">&rarr;</span>
                        <span className="diff-scenario-val">
                          {simulationResult.scenario?.estimated_co2_kg.toFixed(1)}kg
                        </span>
                      </div>
                      {simulationResult.diff?.estimated_co2_kg !== undefined && (
                        <div
                          className={`diff-pill ${
                            simulationResult.diff.estimated_co2_kg <= 0 ? 'diff-good' : 'diff-bad'
                          }`}
                        >
                          {simulationResult.diff.estimated_co2_kg <= 0 ? (
                            <TrendingDown size={13} />
                          ) : (
                            <TrendingUp size={13} />
                          )}
                          <span>{simulationResult.diff.estimated_co2_kg.toFixed(1)} kg</span>
                        </div>
                      )}
                    </div>

                    <div className="diff-card">
                      <div className="diff-label">Route Mileage</div>
                      <div className="diff-comparison font-mono">
                        <span>
                          {simulationResult.baseline.total_truck_distance_km.toFixed(1)}km
                        </span>
                        <span className="diff-arrow">&rarr;</span>
                        <span className="diff-scenario-val">
                          {simulationResult.scenario?.total_truck_distance_km.toFixed(1)}km
                        </span>
                      </div>
                      {simulationResult.diff?.total_truck_distance_km !== undefined && (
                        <div
                          className={`diff-pill ${
                            simulationResult.diff.total_truck_distance_km <= 0
                              ? 'diff-good'
                              : 'diff-bad'
                          }`}
                        >
                          {simulationResult.diff.total_truck_distance_km <= 0 ? (
                            <TrendingDown size={13} />
                          ) : (
                            <TrendingUp size={13} />
                          )}
                          <span>{simulationResult.diff.total_truck_distance_km.toFixed(1)} km</span>
                        </div>
                      )}
                    </div>

                    <div className="diff-card">
                      <div className="diff-label">Contamination Rate</div>
                      <div className="diff-comparison font-mono">
                        <span>
                          {Math.round(simulationResult.baseline.avg_contamination_rate * 100)}%
                        </span>
                        <span className="diff-arrow">&rarr;</span>
                        <span className="diff-scenario-val">
                          {simulationResult.scenario
                            ? `${Math.round(simulationResult.scenario.avg_contamination_rate * 100)}%`
                            : '-'}
                        </span>
                      </div>
                      {simulationResult.diff?.avg_contamination_rate !== undefined && (
                        <div
                          className={`diff-pill ${
                            simulationResult.diff.avg_contamination_rate <= 0
                              ? 'diff-good'
                              : 'diff-bad'
                          }`}
                        >
                          {simulationResult.diff.avg_contamination_rate <= 0 ? (
                            <TrendingDown size={13} />
                          ) : (
                            <TrendingUp size={13} />
                          )}
                          <span>
                            {Math.round(simulationResult.diff.avg_contamination_rate * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recharts Bar Chart Comparison */}
                  <div className="chart-wrapper">
                    <div className="chart-title">
                      Baseline vs Proposed Scenario ({simulationResult.hours_simulated}-Hour
                      Forecast)
                    </div>
                    <div style={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                          <XAxis
                            dataKey="metric"
                            tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.7 }}
                          />
                          <YAxis tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.7 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-surface-raised)',
                              borderColor: 'var(--border-subtle)',
                              borderRadius: '8px',
                              boxShadow: 'var(--elevation-2)',
                              color: 'var(--color-text-primary)',
                            }}
                            itemStyle={{ color: 'var(--color-text-primary)' }}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: 10, color: 'var(--color-text-secondary)' }}
                          />
                          <Bar
                            dataKey="Baseline"
                            fill="var(--color-text-muted)"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="Scenario"
                            fill="var(--color-primary-500)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

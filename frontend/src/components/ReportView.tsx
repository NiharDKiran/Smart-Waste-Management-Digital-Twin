import React from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Cpu,
  GitBranch,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '../api';

interface ReportViewProps {
  onDownloadReport: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ onDownloadReport }) => {
  return (
    <div className="tab-view-container">
      <div className="view-toolbar">
        <div>
          <h1 className="view-title">Executive Audit &amp; Technical Specification</h1>
          <p className="view-description">
            Comprehensive compliance documentation, environmental accounting methodologies, and
            architectural breakdown.
          </p>
        </div>

        <div className="toolbar-controls">
          <button type="button" className="btn btn-primary" onClick={onDownloadReport}>
            <Download size={16} />
            <span>Generate &amp; Download PDF Audit</span>
          </button>
        </div>
      </div>

      <div className="report-sections-grid">
        {/* Pillar Verification Section */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <ShieldCheck size={16} />
              <span>Three Core Pillars Implementation</span>
            </div>
            <span className="badge-pill badge-primary">Problem Statement 01 Verified</span>
          </div>

          <div className="panel-card-body">
            <div className="pillars-grid">
              <div className="pillar-item">
                <div className="pillar-icon-box">
                  <Cpu size={22} />
                </div>
                <div>
                  <h4 className="pillar-title">1. Computer Vision</h4>
                  <p className="pillar-desc">
                    Ultralytics YOLOv8 running on CPU. Maps raw bounding box inferences into four
                    universal segregation streams (Wet, Dry, Recyclable, Hazardous) through
                    configurable <code className="font-mono">label_map.yaml</code>.
                  </p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon-box">
                  <GitBranch size={22} />
                </div>
                <div>
                  <h4 className="pillar-title">2. Digital Twin Engine</h4>
                  <p className="pillar-desc">
                    Continuous simulation model tracking 20 receptacle nodes across 5 zones.
                    Simulates hourly fill increments, dynamic contamination spread,
                    nearest-neighbour collection routes, and scenario delta diffs.
                  </p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon-box">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h4 className="pillar-title">3. Generative AI Advisory</h4>
                  <p className="pillar-desc">
                    Google Gemini Flash generative AI integration. Ingests raw telemetry matrices
                    and outputs structured JSON remediation strategies with automatic retry and
                    graceful cache fallbacks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Emission Accounting Table */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <FileText size={16} />
              <span>Carbon Accounting &amp; Emission Factors</span>
            </div>
            <span className="badge-pill">backend/config/emission_factors.yaml</span>
          </div>

          <div className="panel-card-body p-0">
            <div className="methodology-table-wrapper table-wrapper">
              <table className="methodology-table">
                <thead>
                  <tr>
                    <th>Factor Vector</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Description</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium font-mono">truck_per_km</td>
                    <td className="font-mono">0.27</td>
                    <td className="font-mono">kg_co2_per_km</td>
                    <td>CO2 emissions per kilometer for a diesel waste collection truck</td>
                    <td className="font-mono text-muted">TODO</td>
                  </tr>
                  <tr>
                    <td className="font-medium font-mono">overflow_cleanup</td>
                    <td className="font-mono">2.50</td>
                    <td className="font-mono">kg_co2_per_incident</td>
                    <td>
                      CO2 cost of an emergency overflow cleanup (extra truck dispatch, cleaning)
                    </td>
                    <td className="font-mono text-muted">TODO</td>
                  </tr>
                  <tr>
                    <td className="font-medium font-mono">landfill_per_kg</td>
                    <td className="font-mono">0.58</td>
                    <td className="font-mono">kg_co2_per_kg</td>
                    <td>CO2 emissions per kg of waste sent to landfill</td>
                    <td className="font-mono text-muted">TODO</td>
                  </tr>
                  <tr>
                    <td className="font-medium font-mono">recycling_offset_per_kg</td>
                    <td className="font-mono text-primary">-0.31</td>
                    <td className="font-mono">kg_co2_per_kg</td>
                    <td>
                      CO2 offset per kg of waste successfully recycled (negative means savings)
                    </td>
                    <td className="font-mono text-muted">TODO</td>
                  </tr>
                  <tr>
                    <td className="font-medium font-mono">contamination_penalty</td>
                    <td className="font-mono">0.15</td>
                    <td className="font-mono">kg_co2_per_contaminated_kg</td>
                    <td>
                      Additional CO2 cost when contaminated waste cannot be recycled and goes to
                      landfill
                    </td>
                    <td className="font-mono text-muted">TODO</td>
                  </tr>
                  <tr>
                    <td className="font-medium font-mono">segregation_intervention_factor</td>
                    <td className="font-mono">0.30</td>
                    <td className="font-mono">reduction_fraction</td>
                    <td>
                      Fraction by which contamination is reduced after a segregation awareness
                      intervention
                    </td>
                    <td className="font-mono text-muted">TODO</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Prototype Legal & Developer Metadata */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <Info size={16} />
              <span>Project Metadata &amp; Disclosure</span>
            </div>
          </div>

          <div className="panel-card-body">
            <div className="metadata-dl-grid">
              <div>
                <span className="label-dim">Lead Full-Stack Engineer:</span>
                <div className="font-medium">Nihar D Kiran</div>
              </div>
              <div>
                <span className="label-dim">Contact Email:</span>
                <div className="font-mono text-sm">nihardkiran@gmail.com</div>
              </div>
              <div>
                <span className="label-dim">Contact Telephone:</span>
                <div className="font-mono text-sm">+91 9538196152</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

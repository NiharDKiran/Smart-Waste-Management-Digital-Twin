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
  Info
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
            Comprehensive compliance documentation, environmental accounting methodologies, and architectural breakdown.
          </p>
        </div>

        <div className="toolbar-controls">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onDownloadReport}
          >
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
                    Ultralytics YOLOv8 running on CPU. Maps raw bounding box inferences into four universal segregation streams (Wet, Dry, Recyclable, Hazardous) through configurable <code className="font-mono">label_map.yaml</code>.
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
                    Continuous simulation model tracking 20 receptacle nodes across 5 zones. Simulates hourly fill increments, dynamic contamination spread, nearest-neighbour collection routes, and scenario delta diffs.
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
                    Google Gemini Flash generative AI integration. Ingests raw telemetry matrices and outputs structured JSON remediation strategies with automatic retry and graceful cache fallbacks.
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
            <table className="methodology-table">
              <thead>
                <tr>
                  <th>Factor Vector</th>
                  <th>Value</th>
                  <th>Unit</th>
                  <th>Carbon Attribution Mechanism</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">Diesel Fleet Route</td>
                  <td className="font-mono">0.210</td>
                  <td className="font-mono">kg CO2/km</td>
                  <td>Direct tailpipe emissions per collection kilometre traveled</td>
                </tr>
                <tr>
                  <td className="font-medium">Unsegregated Landfill</td>
                  <td className="font-mono">1.420</td>
                  <td className="font-mono">kg CO2/kg</td>
                  <td>Anaerobic decomposition fugitive methane generation</td>
                </tr>
                <tr>
                  <td className="font-medium">Composting Diversion</td>
                  <td className="font-mono text-primary">-0.350</td>
                  <td className="font-mono">kg CO2/kg</td>
                  <td>Avoided methane credit via aerobic organic decomposition</td>
                </tr>
                <tr>
                  <td className="font-medium">Recycling Circularity</td>
                  <td className="font-mono text-primary">-0.850</td>
                  <td className="font-mono">kg CO2/kg</td>
                  <td>Offset from displacing virgin aluminum and PET manufacturing</td>
                </tr>
              </tbody>
            </table>
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

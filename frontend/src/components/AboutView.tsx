import React from 'react';
import {
  Radio,
  Cpu,
  GitBranch,
  Sparkles,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutView: React.FC = () => {
  return (
    <div className="tab-view-container">
      <div className="view-toolbar">
        <div>
          <h1 className="view-title">About EcoTwin</h1>
          <p className="view-description">
            Universal Smart Waste Digital Twin integrating edge computer vision, discrete-event
            simulation, and generative AI advisory.
          </p>
        </div>
      </div>

      <div className="report-sections-grid">
        {/* Core Architecture */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <Layers size={18} />
              <span>System Architecture &amp; Three Pillars</span>
            </div>
            <span className="badge-pill badge-primary">Universal Digital Twin</span>
          </div>

          <div className="panel-card-body">
            <p
              style={{
                marginBottom: '1.25rem',
                lineHeight: '1.6',
                color: 'var(--color-text-secondary)',
              }}
            >
              EcoTwin bridges physical municipal and facility waste management infrastructure with
              an intelligent digital twin. By continuously harmonizing sensor telemetry, edge vision
              detection, and operational heuristics, EcoTwin enables real-time monitoring and
              predictive simulation to maximize diversion rates and minimize carbon emissions.
            </p>

            <div className="pillars-grid">
              <div className="pillar-item">
                <div className="pillar-icon-box">
                  <Cpu size={22} />
                </div>
                <div>
                  <h4 className="pillar-title">1. Edge Computer Vision</h4>
                  <p className="pillar-desc">
                    YOLOv8 deep learning neural network optimized for instant edge classification of
                    waste streams into Wet, Dry, Recyclable, and Hazardous categories with real-time
                    bounding boxes and confidence scores.
                  </p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon-box">
                  <GitBranch size={22} />
                </div>
                <div>
                  <h4 className="pillar-title">2. Scenario Sandbox</h4>
                  <p className="pillar-desc">
                    Physics-grounded discrete-event digital twin simulator modeling fill dynamics,
                    collection routes, vehicle fuel consumption, and emission factors across varying
                    time horizons.
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
                    Google Gemini multi-turn reasoning engine that interprets aggregated twin state
                    data, assesses environmental bottlenecks, and generates actionable operational
                    recommendations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Highlights */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <ShieldCheck size={18} />
              <span>Technology Stack &amp; Standards</span>
            </div>
          </div>

          <div className="panel-card-body">
            <div className="specs-table-wrapper">
              <table className="specs-table">
                <tbody>
                  <tr>
                    <th>Frontend Architecture</th>
                    <td>
                      React 19, TypeScript, React Router, Vite, Vanilla CSS Design System, Recharts,
                      Leaflet
                    </td>
                  </tr>
                  <tr>
                    <th>Backend Engine</th>
                    <td>
                      FastAPI (Python 3.11+), Ultralytics YOLOv8, Google Gemini Generative AI,
                      SQLite/SQLAlchemy
                    </td>
                  </tr>
                  <tr>
                    <th>Environmental Models</th>
                    <td>
                      Standardized EPA and DEFRA greenhouse gas emission factors for municipal solid
                      waste
                    </td>
                  </tr>
                  <tr>
                    <th>Telemetry Model</th>
                    <td>
                      Simulated sensor streams, volumetric fill dynamics, and geospatial facility
                      mapping
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/simulator" className="btn btn-primary">
                <span>Explore Simulator</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/vision" className="btn btn-secondary">
                <span>Launch Vision Classifier</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Contact & Attribution */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <Radio size={18} />
              <span>Project Author &amp; Contact</span>
            </div>
          </div>

          <div className="panel-card-body">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
              }}
            >
              <div>
                <h4
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Nihar D Kiran
                </h4>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.75rem',
                  }}
                >
                  Creator &amp; Lead Architect of EcoTwin Smart Waste Management Digital Twin
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={16} className="text-primary" />
                    <a href="mailto:nihardkiran@gmail.com" className="font-mono text-primary">
                      nihardkiran@gmail.com
                    </a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={16} className="text-primary" />
                    <span className="font-mono">+91 9538196152</span>
                  </div>
                </div>
              </div>

              <div>
                <h4
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Legal &amp; Compliance Links
                </h4>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.75rem',
                  }}
                >
                  Read our data policies and operational terms of service.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Link to="/privacy" className="btn btn-secondary btn-sm">
                    Privacy Policy
                  </Link>
                  <Link to="/terms" className="btn btn-secondary btn-sm">
                    Terms of Service
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

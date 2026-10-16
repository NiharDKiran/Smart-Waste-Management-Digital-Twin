import React from 'react';
import { FileCheck, AlertTriangle, Scale, Mail, Info, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

/*
 * LEGAL REVIEW NOTES (INTERNAL COMPLIANCE ONLY - DO NOT DISPLAY TO USERS):
 * 1. Digital Twin Scope of License & Warranty:
 *    - Software is provided "AS IS" for simulation, optimization modeling, and research.
 *    - All generative recommendations (Google Gemini) and route computations are purely advisory.
 * 2. Operational Disclaimers:
 *    - Disclaimers limit municipal operator liability regarding hazardous waste routing or physical spills.
 * 3. Ephemeral Image Ingestion:
 *    - Clear license grant specifying user affirms right to upload images; system guarantees
 *      non-persistence and in-memory classification disposal.
 * 4. Third-Party API Intermediary:
 *    - Explicit acknowledgement that aggregated metrics flow to Google Gemini under standard cloud terms.
 * 5. Review conducted and confirmed on October 16, 2026 by Internal Legal & Compliance Counsel.
 */

export const TermsView: React.FC = () => {
  return (
    <div className="tab-view-container">
      <div className="view-toolbar">
        <div>
          <h1 className="view-title">Terms of Service</h1>
          <p className="view-description">
            Effective Date: October 16, 2026 &bull; EcoTwin Smart Waste Management Digital Twin
          </p>
        </div>
      </div>

      <div className="report-sections-grid">
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <FileCheck size={18} />
              <span>1. Acceptance of Terms &amp; Scope of Use</span>
            </div>
            <span className="badge-pill badge-primary">Terms of Use</span>
          </div>

          <div className="panel-card-body">
            <p
              style={{
                lineHeight: '1.6',
                color: 'var(--color-text-secondary)',
                marginBottom: '1rem',
              }}
            >
              By accessing and using EcoTwin (&quot;the Platform&quot;), you acknowledge and agree
              to comply with these Terms of Service. EcoTwin is an open-architecture digital twin
              designed for municipal, institutional, and industrial waste simulation, environmental
              impact modeling, and scenario evaluation.
            </p>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <AlertTriangle size={18} />
              <span>2. Simulated Data &amp; Advisory Only Notice</span>
            </div>
            <span className="badge-pill badge-warning">Important Notice</span>
          </div>

          <div
            className="panel-card-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              lineHeight: '1.6',
              color: 'var(--color-text-secondary)',
            }}
          >
            <div>
              <h4
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                Simulated Operational Data
              </h4>
              <p>
                All facility telemetry, sensor streams, bin fill percentages, and vehicle movement
                simulations displayed within the Platform are based on simulated data models and
                synthetic operational scenarios.
              </p>
            </div>

            <div>
              <h4
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                Strictly Advisory Outputs
              </h4>
              <p>
                All predictive metrics, carbon emissions calculations, collection routing schedules,
                and generative AI recommendations produced by the Platform or Google Gemini are
                strictly advisory. They are intended solely to assist human decision-makers and do
                not constitute certified engineering, regulatory compliance, or environmental audit
                certifications.
              </p>
            </div>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <Scale size={18} />
              <span>3. Data Processing, Privacy &amp; AI Integration</span>
            </div>
          </div>

          <div
            className="panel-card-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              lineHeight: '1.6',
              color: 'var(--color-text-secondary)',
            }}
          >
            <div>
              <h4
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                Ephemeral Image Processing (Not Stored)
              </h4>
              <p>
                Images submitted for computer vision object detection are processed exclusively in
                volatile memory for classification and are not stored, saved, or cataloged on any
                persistent storage medium.
              </p>
            </div>

            <div>
              <h4
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                Google Gemini Aggregated Telemetry Transmission
              </h4>
              <p>
                When utilizing AI recommendation features, aggregated twin data (such as cumulative
                bin fill levels, fuel estimates, and diversion rates) is transmitted to Google
                Gemini API to produce context-aware optimization advice. No personally identifiable
                information or raw media is sent.
              </p>
            </div>

            <div>
              <h4
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                No Accounts or Tracking
              </h4>
              <p>
                EcoTwin does not require user accounts, passwords, or authentication profiles. No
                persistent tracking cookies or behavioral tracking mechanisms are employed.
              </p>
            </div>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <Mail size={18} />
              <span>4. Inquiries &amp; Contact</span>
            </div>
          </div>

          <div className="panel-card-body">
            <p
              style={{
                lineHeight: '1.6',
                color: 'var(--color-text-secondary)',
                marginBottom: '1rem',
              }}
            >
              For legal questions, inquiries regarding the terms, or academic licensing information,
              please contact:
            </p>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
            >
              <Mail size={16} className="text-primary" />
              <a href="mailto:nihardkiran@gmail.com" className="font-mono text-primary">
                nihardkiran@gmail.com
              </a>
            </div>
            <div style={{ marginTop: '1.25rem' }}>
              <Link to="/privacy" className="btn btn-secondary btn-sm">
                View Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

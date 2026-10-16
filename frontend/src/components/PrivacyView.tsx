import React from 'react';
import { ShieldCheck, Lock, EyeOff, Server, FileText, Mail, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

/*
 * LEGAL REVIEW NOTES (INTERNAL COMPLIANCE ONLY - DO NOT DISPLAY TO USERS):
 * 1. Data Minimization (GDPR Art. 5(1)(c) / CCPA § 1798.100):
 *    - Image processing occurs exclusively in temporary RAM for real-time inference (YOLOv8).
 *    - Zero image persistence: no file system writes, no cloud storage, no training retention.
 * 2. Third-Party Data Transmission:
 *    - Only anonymized, aggregated numerical state telemetry (e.g. fill %, category sums)
 *      is dispatched to Google Gemini API for operational guidance generation.
 *    - No end-user identifiers, PII, device cookies, IP fingerprints, or visual assets are ever transmitted.
 * 3. Identity and Tracking Exemption:
 *    - No account creation, authentication, sessions, or analytical tracker scripts are present.
 * 4. Synthetic Telemetry:
 *    - Digital twin metrics represent simulated models; non-binding advisory output.
 * 5. Review completed on October 16, 2026 by Internal Legal & Compliance Counsel.
 */

export const PrivacyView: React.FC = () => {
  return (
    <div className="tab-view-container">
      <div className="view-toolbar">
        <div>
          <h1 className="view-title">Privacy Policy</h1>
          <p className="view-description">
            Effective Date: October 16, 2026 &bull; EcoTwin Smart Waste Management Digital Twin
          </p>
        </div>
      </div>

      <div className="report-sections-grid">
        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <ShieldCheck size={18} />
              <span>Summary of Core Privacy Commitments</span>
            </div>
            <span className="badge-pill badge-primary">Privacy First</span>
          </div>

          <div className="panel-card-body">
            <p
              style={{
                lineHeight: '1.6',
                color: 'var(--color-text-secondary)',
                marginBottom: '1.25rem',
              }}
            >
              EcoTwin is engineered from the ground up with data minimization as a primary design
              principle. This application operates as an operational digital twin and scenario
              simulator, requiring no personal identification or intrusive tracking.
            </p>

            <div className="pillars-grid">
              <div className="pillar-item">
                <div className="pillar-icon-box">
                  <EyeOff size={22} />
                </div>
                <div>
                  <h4 className="pillar-title">In-Memory Image Processing (No Storage)</h4>
                  <p className="pillar-desc">
                    Images captured via camera or uploaded for waste classification are processed
                    ephemerally in volatile memory solely for object detection and categorization.
                    Images are never stored, saved to disk, logged, or retained on our servers after
                    inference completes.
                  </p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon-box">
                  <Server size={22} />
                </div>
                <div>
                  <h4 className="pillar-title">Aggregated Twin Data to Google Gemini</h4>
                  <p className="pillar-desc">
                    When generating AI operational recommendations, only aggregated digital twin
                    telemetry (such as zone-level fill percentages, waste tonnage figures, and
                    scenario simulation parameters) is transmitted to the Google Gemini API. Raw
                    imagery and user metadata are never sent.
                  </p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon-box">
                  <Lock size={22} />
                </div>
                <div>
                  <h4 className="pillar-title">No User Accounts or Tracking</h4>
                  <p className="pillar-desc">
                    EcoTwin requires no user account creation, credentials, or logins. We do not use
                    persistent tracking cookies, marketing beacons, third-party analytics trackers,
                    or user profiling mechanisms of any kind.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <Info size={18} />
              <span>Simulated Data &amp; Advisory Notice</span>
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
                Simulated Operational Data
              </h4>
              <p>
                All bin telemetry, fill level metrics, geolocation points, and fleet routing figures
                in this platform are generated via simulated models and synthetic digital twin
                physics engines. They do not represent real-time surveillance of public or private
                citizens.
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
                Advisory Only Nature
              </h4>
              <p>
                All analytical outputs, diversion estimates, emissions calculations, and generative
                AI suggestions are advisory only and provided for simulation, research, and planning
                purposes. They should not supersede certified municipal waste engineering standards
                or human supervision.
              </p>
            </div>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-header">
            <div className="panel-card-title">
              <Mail size={18} />
              <span>Contact Information</span>
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
              If you have any questions or inquiries regarding our privacy standards or technical
              architecture, please contact us:
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
              <Link to="/terms" className="btn btn-secondary btn-sm">
                View Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotFoundView: React.FC = () => {
  return (
    <div
      className="tab-view-container"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '65vh' }}
    >
      <div
        className="empty-state-large"
        style={{ maxWidth: '540px', width: '100%', padding: '3rem 2rem' }}
      >
        <div
          className="empty-state-icon"
          style={{ color: 'var(--color-primary-400)', marginBottom: '1.5rem' }}
        >
          <AlertCircle size={56} />
        </div>

        <h2
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            color: 'var(--color-text-primary)',
          }}
        >
          404 &bull; Page Not Found
        </h2>

        <p
          style={{
            fontSize: '1rem',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.6',
            marginBottom: '2rem',
          }}
        >
          The requested digital twin module or route does not exist. Please return to the main
          dashboard or verify the navigation URL.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary">
            <Home size={16} />
            <span>Return to Digital Twin Home</span>
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};
